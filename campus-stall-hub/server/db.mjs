import { MongoClient } from 'mongodb'
import dns from 'node:dns'
import { MONGODB_DB_NAME, MONGODB_URI } from './env.mjs'
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
    const client = new MongoClient(MONGODB_URI)
    state.clientPromise = client
      .connect()
      .then((connected) => {
        state.client = connected
        state.db = connected.db(MONGODB_DB_NAME)
        return state.db
      })
      .catch(async (err) => {
        state.clientPromise = null
        state.client = null
        state.db = null
        state.collections = null
        state.indexesPromise = null
        await client.close().catch(() => {})
        throw addConnectionHints(err)
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
