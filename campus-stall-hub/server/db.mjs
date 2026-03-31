import { MongoClient } from 'mongodb'
import dns from 'node:dns'
import {
  MONGODB_DB_NAME,
  MONGODB_REPLICA_SET,
  MONGODB_TLS_SERVERNAME,
  MONGODB_URI,
} from './env.mjs'
import { configureDns } from './dns.mjs'

const GLOBAL_KEY = '__azeraMongoState__'

function getState() {
  const existing = globalThis[GLOBAL_KEY]
  if (existing) return existing
  const state = {
    clientPromise: null,
    client: null,
    db: null,
    collections: null,
    indexesPromise: null,
    tlsServername: null,
    replicaSet: null,
  }
  globalThis[GLOBAL_KEY] = state
  return state
}

function getDnsServersLabel() {
  try {
    const servers = dns.getServers().filter(Boolean)
    if (servers.length === 0) return ''
    return ` (Node DNS servers: ${servers.join(', ')})`
  } catch {
    return ''
  }
}

function addConnectionHints(err) {
  if (!err) return err

  const message = String(err?.message ?? '').toLowerCase()
  const causeMessage = String(err?.cause?.message ?? '').toLowerCase()
  const authFailed =
    message.includes('authentication failed') ||
    message.includes('bad auth') ||
    causeMessage.includes('authentication failed') ||
    causeMessage.includes('bad auth') ||
    err?.code === 18 ||
    err?.cause?.code === 18
  if (authFailed) {
    const hinted = new Error(
      [
        'MongoDB authentication failed.',
        '',
        'Fix: check the username/password in MONGODB_URI and reset the password in MongoDB Atlas (Database Access → Database Users).',
        'If the Atlas user Authentication Database is not "admin", add `authSource=<db>` to MONGODB_URI.',
      ].join('\n'),
      { cause: err },
    )
    hinted.status = 503
    return hinted
  }

  const syscall = String(err?.syscall ?? '')
  if (syscall === 'querySrv' || syscall === 'queryTxt') {
    const suffix = getDnsServersLabel()
    const hinted = new Error(
      `MongoDB Atlas SRV/TXT DNS lookup failed. If you're using a mongodb+srv:// URI, set DNS_SERVERS in server/.env (comma-separated) or fix your system DNS.${suffix}`,
      { cause: err },
    )
    hinted.status = 503
    return hinted
  }

  return err
}

function isMongoSrvUri(uri) {
  return /^mongodb\+srv:\/\//i.test(String(uri ?? ''))
}

function errorMessageContains(err, needle) {
  const target = String(needle ?? '').toLowerCase()
  if (!target) return false
  const message = String(err?.message ?? '').toLowerCase()
  if (message.includes(target)) return true
  const causeMessage = String(err?.cause?.message ?? '').toLowerCase()
  if (causeMessage.includes(target)) return true
  return false
}

function isTlsInternalError(err) {
  return errorMessageContains(err, 'tlsv1 alert internal error')
}

function buildMongoClientOptions(state) {
  const options = {}
  const replicaSet = state?.replicaSet || MONGODB_REPLICA_SET
  const servername = state?.tlsServername || MONGODB_TLS_SERVERNAME
  if (replicaSet) options.replicaSet = replicaSet
  if (servername) options.servername = servername
  return options
}

async function discoverSrvTlsWorkaround(uri) {
  if (!isMongoSrvUri(uri)) return null

  let srvHost = ''
  let srvServiceName = 'mongodb'
  try {
    const parsed = new URL(uri)
    srvHost = parsed.hostname
    srvServiceName = parsed.searchParams.get('srvServiceName') || 'mongodb'
  } catch {
    return null
  }

  if (!srvHost) return null
  const srvLookupName = `_${srvServiceName}._tcp.${srvHost}`

  let records = []
  try {
    records = await dns.promises.resolveSrv(srvLookupName)
  } catch {
    return null
  }

  const seed = records?.[0]
  const seedHost = seed?.name || ''
  const seedPort = Number(seed?.port ?? 27017) || 27017
  if (!seedHost) return null

  let cnames = []
  try {
    cnames = await dns.promises.resolveCname(seedHost)
  } catch {
    cnames = []
  }
  const servername = String(cnames?.[0] || '').trim()
  if (!servername) return null

  const probeUri = `mongodb://${seedHost}:${seedPort}/?directConnection=true&tls=true`
  const probeClient = new MongoClient(probeUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    servername,
  })

  try {
    await probeClient.connect()
    const hello = await probeClient.db('admin').command({ hello: 1 })
    const replicaSet = String(hello?.setName || '').trim()
    return { servername, replicaSet }
  } catch {
    return { servername, replicaSet: '' }
  } finally {
    await probeClient.close().catch(() => {})
  }
}

async function connectDb() {
  const state = getState()
  if (state.db) return state.db

  configureDns()

  if (!MONGODB_URI) {
    const err = new Error('Database is not configured. Set MONGODB_URI.')
    err.status = 503
    throw err
  }

  if (!state.clientPromise) {
    state.clientPromise = (async () => {
      let client = null
      try {
        const options = buildMongoClientOptions(state)
        client = new MongoClient(MONGODB_URI, options)
        const connected = await client.connect()
        state.client = connected
        state.db = connected.db(MONGODB_DB_NAME)
        return state.db
      } catch (err) {
        if (client) await client.close().catch(() => {})

        if (
          isMongoSrvUri(MONGODB_URI) &&
          !state.tlsServername &&
          !MONGODB_TLS_SERVERNAME &&
          isTlsInternalError(err)
        ) {
          console.warn('[db] MongoDB TLS handshake failed; attempting SRV+CNAME SNI workaround.')
          const workaround = await discoverSrvTlsWorkaround(MONGODB_URI)
          if (workaround?.servername) {
            console.warn(
              `[db] Using servername=${workaround.servername}${workaround.replicaSet ? ` replicaSet=${workaround.replicaSet}` : ''}`,
            )
            const retryOptions = {
              ...buildMongoClientOptions(state),
              servername: workaround.servername,
              ...(workaround.replicaSet ? { replicaSet: workaround.replicaSet } : {}),
            }
            const retryClient = new MongoClient(MONGODB_URI, retryOptions)
            try {
              const connected = await retryClient.connect()
              state.client = connected
              state.db = connected.db(MONGODB_DB_NAME)
              state.tlsServername = workaround.servername
              if (workaround.replicaSet) state.replicaSet = workaround.replicaSet
              return state.db
            } catch (retryErr) {
              await retryClient.close().catch(() => {})
              throw addConnectionHints(retryErr)
            }
          }
        }

        throw addConnectionHints(err)
      }
    })().catch((err) => {
      state.clientPromise = null
      state.client = null
      state.db = null
      state.collections = null
      state.indexesPromise = null
      throw err
    })
  }

  return state.clientPromise
}

async function ensureIndexes({ users, sessions, stalls }) {
  await users.createIndex({ id: 1 }, { unique: true })
  await users.createIndex({ email: 1 }, { unique: true })

  await sessions.createIndex({ token: 1 }, { unique: true })
  await sessions.createIndex({ userId: 1 })
  await sessions.createIndex({ expiresAt: 1 })

  await stalls.createIndex({ id: 1 }, { unique: true })
  await stalls.createIndex({ userId: 1 })
  await stalls.createIndex({ createdAt: -1 })
  await stalls.createIndex({ category: 1 })
  await stalls.createIndex({ department: 1 })
}

export async function getCollections() {
  const state = getState()
  if (state.collections) return state.collections

  const db = await connectDb()
  const collections = {
    db,
    users: db.collection('users'),
    sessions: db.collection('sessions'),
    stalls: db.collection('stalls'),
  }
  state.collections = collections

  if (!state.indexesPromise) {
    state.indexesPromise = ensureIndexes(collections).catch((err) => {
      state.collections = null
      state.indexesPromise = null
      throw err
    })
  }

  await state.indexesPromise
  return state.collections
}
