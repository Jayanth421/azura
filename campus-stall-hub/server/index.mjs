import http from 'node:http'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { getCollections } from './db.mjs'
import {
  ADMIN_TOKEN,
  BODY_LIMIT_BYTES,
  CLOUDINARY_URL,
  FRONTEND_BASE_URL,
  PORT,
  RESET_TOKEN_TTL_MS,
  SESSION_COOKIE_NAME,
  SESSION_REMEMBER_TTL_MS,
  SESSION_TEMP_TTL_MS,
  VERIFY_TOKEN_TTL_MS,
} from './env.mjs'
import { sendMail, sendPasswordResetEmail, sendVerificationEmail } from './mailer.mjs'
import {
  createId,
  createToken,
  getPasswordIssues,
  isValidEmail,
  normalizeEmail,
  hashPassword,
  verifyPassword,
} from './security.mjs'

const STALL_CATEGORIES = ['Food', 'Games', 'Crafts', 'Tech', 'Books', 'Services', 'Other']

const trafficStats = {
  total: 0,
  byRoute: new Map(),
  byMethod: new Map(),
}

const isMain = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return path.resolve(entry).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()
  } catch {
    return false
  }
})()

function parseCookies(header) {
  const raw = String(header ?? '')
  const pairs = raw.split(/;\s*/g).filter(Boolean)
  const cookies = {}
  for (const pair of pairs) {
    const index = pair.indexOf('=')
    if (index === -1) continue
    const key = pair.slice(0, index).trim()
    const value = pair.slice(index + 1).trim()
    if (!key) continue
    cookies[key] = decodeURIComponent(value)
  }
  return cookies
}

function setCookie(res, { name, value, maxAgeSeconds }) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (typeof maxAgeSeconds === 'number') parts.push(`Max-Age=${Math.max(0, maxAgeSeconds)}`)
  res.setHeader('Set-Cookie', parts.join('; '))
}

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

function applyCors(req, res) {
  const origin = req.headers.origin
  if (!origin) return
  if (origin !== FRONTEND_BASE_URL) return
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
}

function sendJson(req, res, status, payload) {
  applyCors(req, res)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > BODY_LIMIT_BYTES) {
      const err = new Error('Payload too large')
      err.status = 413
      throw err
    }
    chunks.push(chunk)
  }

  if (chunks.length === 0) return null

  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return null
  try {
    return JSON.parse(raw)
  } catch {
    const err = new Error('Invalid JSON body')
    err.status = 400
    throw err
  }
}

async function getSessionUser(req) {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[SESSION_COOKIE_NAME]
  if (!token) return null

  const { sessions, users } = await getCollections()

  const session = await sessions.findOne(
    { token },
    { projection: { token: 1, userId: 1, expiresAt: 1 } },
  )
  if (!session) return null

  if (Date.now() > Number(session.expiresAt ?? 0)) {
    await sessions.deleteOne({ token })
    return null
  }

  const user = await users.findOne(
    { id: session.userId },
    { projection: { id: 1, email: 1, verified: 1 } },
  )
  if (!user) {
    await sessions.deleteOne({ token })
    return null
  }

  return { id: user.id, email: user.email, verified: Boolean(user.verified) }
}

async function requireAuth(req, res) {
  const user = await getSessionUser(req)
  if (!user) {
    sendJson(req, res, 401, { ok: false, error: 'Not authenticated.' })
    return null
  }
  return user
}

function requireVerified(req, res, user) {
  if (!user.verified) {
    sendJson(req, res, 403, { ok: false, error: 'Please verify your email first.' })
    return false
  }
  return true
}

function requireAdmin(req, res) {
  if (!ADMIN_TOKEN) {
    sendJson(req, res, 503, { ok: false, error: 'Admin access is not configured.' })
    return false
  }
  const token = req.headers['x-admin-token']
  if (!token || token !== ADMIN_TOKEN) {
    sendJson(req, res, 401, { ok: false, error: 'Admin token required.' })
    return false
  }
  return true
}

function sanitizeString(value, { max = 5000 } = {}) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  return v.slice(0, max)
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseCloudinaryUrl(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const cloudName = parsed.hostname
    const apiKey = parsed.username
    const apiSecret = parsed.password
    if (!cloudName || !apiKey || !apiSecret) return null
    return { cloudName, apiKey, apiSecret }
  } catch {
    return null
  }
}

function normalizeCategory(category) {
  const value = String(category ?? '').trim()
  if (STALL_CATEGORIES.includes(value)) return value
  return 'Other'
}

function rowToStall(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    imageUrl: row.imageUrl ?? '',
    registerUrl: row.registerUrl ?? '',
    location: row.location ?? '',
    ownerName: row.ownerName ?? '',
    ownerEmail: row.ownerEmail ?? '',
    phone: row.phone ?? '',
    whatsapp: row.whatsapp ?? '',
    instagram: row.instagram ?? '',
    createdAt: Number(row.createdAt ?? 0) || 0,
  }
}

async function createSession(res, { userId, email, verified, remember }) {
  const now = Date.now()
  const ttlMs = remember ? SESSION_REMEMBER_TTL_MS : SESSION_TEMP_TTL_MS
  const expiresAt = now + ttlMs
  const { sessions } = await getCollections()

  let token = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = createToken()
    try {
      await sessions.insertOne({ token: candidate, userId, createdAt: now, expiresAt })
      token = candidate
      break
    } catch (err) {
      if (err?.code === 11000 && attempt < 2) continue
      throw err
    }
  }
  if (!token) throw new Error('Failed to create session.')

  const maxAge = remember ? Math.floor(ttlMs / 1000) : undefined
  setCookie(res, { name: SESSION_COOKIE_NAME, value: token, maxAgeSeconds: maxAge })

  return { user: { email, verified }, expiresAt }
}

export async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const { pathname } = url

  trafficStats.total += 1
  const routeKey = `${req.method} ${pathname}`
  trafficStats.byRoute.set(routeKey, (trafficStats.byRoute.get(routeKey) ?? 0) + 1)
  trafficStats.byMethod.set(req.method, (trafficStats.byMethod.get(req.method) ?? 0) + 1)

  if (pathname.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      applyCors(req, res)
      res.statusCode = 204
      res.end()
      return
    }

    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(req, res, 200, { ok: true })
      return
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = await getSessionUser(req)
      sendJson(req, res, 200, { ok: true, user: user ? { email: user.email, verified: user.verified } : null })
      return
    }

    if (pathname === '/api/auth/signup' && req.method === 'POST') {
      const body = await readJson(req)
      const email = normalizeEmail(body?.email)
      const password = String(body?.password ?? '')
      const remember = Boolean(body?.remember ?? true)

      if (!isValidEmail(email)) {
        sendJson(req, res, 400, { ok: false, error: 'Please enter a valid email address.' })
        return
      }

      const issues = getPasswordIssues(password)
      if (issues.length > 0) {
        sendJson(req, res, 400, { ok: false, error: issues[0] })
        return
      }

      const { users } = await getCollections()
      const existing = await users.findOne({ email }, { projection: { id: 1 } })
      if (existing) {
        sendJson(req, res, 409, { ok: false, error: 'An account with this email already exists.' })
        return
      }

      const now = Date.now()
      const userId = createId()
      const passwordData = hashPassword(password)
      const verificationToken = createToken()
      const verificationExpiresAt = now + VERIFY_TOKEN_TTL_MS

      try {
        await users.insertOne({
          id: userId,
          email,
          passwordSalt: passwordData.salt,
          passwordHash: passwordData.hash,
          verified: false,
          verificationToken,
          verificationExpiresAt,
          resetToken: null,
          resetExpiresAt: null,
          createdAt: now,
          updatedAt: now,
        })
      } catch (err) {
        if (err?.code === 11000) {
          sendJson(req, res, 409, { ok: false, error: 'An account with this email already exists.' })
          return
        }
        throw err
      }

      let mailFailed = false
      try {
        await sendVerificationEmail({ to: email, token: verificationToken })
      } catch (err) {
        mailFailed = true
        console.error('[mail] verification failed:', err)
      }

      const session = await createSession(res, { userId, email, verified: false, remember })
      sendJson(req, res, 201, { ok: true, ...session, needsVerification: true, mailFailed })
      return
    }

    if (pathname === '/api/auth/signin' && req.method === 'POST') {
      const body = await readJson(req)
      const email = normalizeEmail(body?.email)
      const password = String(body?.password ?? '')
      const remember = Boolean(body?.remember ?? true)

      if (!isValidEmail(email)) {
        sendJson(req, res, 400, { ok: false, error: 'Please enter a valid email address.' })
        return
      }

      if (!password) {
        sendJson(req, res, 400, { ok: false, error: 'Please enter your password.' })
        return
      }

      const { users } = await getCollections()
      const record = await users.findOne(
        { email },
        { projection: { id: 1, email: 1, verified: 1, passwordSalt: 1, passwordHash: 1 } },
      )
      if (!record) {
        sendJson(req, res, 401, { ok: false, error: 'Invalid email or password.' })
        return
      }

      const ok = verifyPassword({
        password,
        saltBase64: record.passwordSalt,
        hashBase64: record.passwordHash,
      })
      if (!ok) {
        sendJson(req, res, 401, { ok: false, error: 'Invalid email or password.' })
        return
      }

      const session = await createSession(res, {
        userId: record.id,
        email: record.email,
        verified: Boolean(record.verified),
        remember,
      })

      sendJson(req, res, 200, { ok: true, ...session, needsVerification: !Boolean(record.verified) })
      return
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const cookies = parseCookies(req.headers.cookie)
      const token = cookies[SESSION_COOKIE_NAME]
      if (token) {
        const { sessions } = await getCollections()
        await sessions.deleteOne({ token })
      }
      clearCookie(res, SESSION_COOKIE_NAME)
      sendJson(req, res, 200, { ok: true })
      return
    }

    if (pathname === '/api/auth/resend-verification' && req.method === 'POST') {
      const user = await requireAuth(req, res)
      if (!user) return

      const { users } = await getCollections()
      const record = await users.findOne(
        { id: user.id },
        { projection: { id: 1, email: 1, verified: 1 } },
      )
      if (!record) {
        sendJson(req, res, 401, { ok: false, error: 'Not authenticated.' })
        return
      }
      if (record.verified) {
        sendJson(req, res, 200, { ok: true, alreadyVerified: true })
        return
      }

      const now = Date.now()
      const token = createToken()
      await users.updateOne(
        { id: record.id },
        {
          $set: {
            verificationToken: token,
            verificationExpiresAt: now + VERIFY_TOKEN_TTL_MS,
            updatedAt: now,
          },
        },
      )

      try {
        await sendVerificationEmail({ to: record.email, token })
        sendJson(req, res, 200, { ok: true })
      } catch (err) {
        sendJson(req, res, 502, {
          ok: false,
          error: err?.message || 'Failed to send verification email.',
        })
      }
      return
    }

    if (pathname === '/api/auth/verify-email' && req.method === 'POST') {
      const body = await readJson(req)
      const token = String(body?.token ?? '').trim()
      if (!token) {
        sendJson(req, res, 400, { ok: false, error: 'Missing token.' })
        return
      }

      const { users } = await getCollections()
      const record = await users.findOne(
        { verificationToken: token },
        { projection: { id: 1, email: 1, verificationExpiresAt: 1, verified: 1 } },
      )
      if (!record) {
        sendJson(req, res, 400, { ok: false, error: 'Invalid verification token.' })
        return
      }
      if (record.verified) {
        sendJson(req, res, 200, { ok: true, alreadyVerified: true })
        return
      }
      if (Date.now() > Number(record.verificationExpiresAt ?? 0)) {
        sendJson(req, res, 400, { ok: false, error: 'Verification token expired.' })
        return
      }

      const now = Date.now()
      await users.updateOne(
        { id: record.id },
        {
          $set: { verified: true, updatedAt: now },
          $unset: { verificationToken: '', verificationExpiresAt: '' },
        },
      )

      sendJson(req, res, 200, { ok: true })
      return
    }

    if (pathname === '/api/auth/request-password-reset' && req.method === 'POST') {
      const body = await readJson(req)
      const email = normalizeEmail(body?.email)
      if (!isValidEmail(email)) {
        sendJson(req, res, 200, { ok: true })
        return
      }

      const { users } = await getCollections()
      const record = await users.findOne({ email }, { projection: { id: 1, email: 1 } })
      if (!record) {
        sendJson(req, res, 200, { ok: true })
        return
      }

      const now = Date.now()
      const token = createToken()
      await users.updateOne(
        { id: record.id },
        {
          $set: {
            resetToken: token,
            resetExpiresAt: now + RESET_TOKEN_TTL_MS,
            updatedAt: now,
          },
        },
      )

      try {
        await sendPasswordResetEmail({ to: record.email, token })
        sendJson(req, res, 200, { ok: true })
      } catch (err) {
        sendJson(req, res, 502, {
          ok: false,
          error: err?.message || 'Failed to send reset email.',
        })
      }
      return
    }

    if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
      const body = await readJson(req)
      const token = String(body?.token ?? '').trim()
      const password = String(body?.password ?? '')

      if (!token) {
        sendJson(req, res, 400, { ok: false, error: 'Missing token.' })
        return
      }

      const issues = getPasswordIssues(password)
      if (issues.length > 0) {
        sendJson(req, res, 400, { ok: false, error: issues[0] })
        return
      }

      const { users } = await getCollections()
      const record = await users.findOne(
        { resetToken: token },
        { projection: { id: 1, resetExpiresAt: 1 } },
      )
      if (!record) {
        sendJson(req, res, 400, { ok: false, error: 'Invalid reset token.' })
        return
      }
      if (Date.now() > Number(record.resetExpiresAt ?? 0)) {
        sendJson(req, res, 400, { ok: false, error: 'Reset token expired.' })
        return
      }

      const passwordData = hashPassword(password)
      const now = Date.now()
      await users.updateOne(
        { id: record.id },
        {
          $set: {
            passwordSalt: passwordData.salt,
            passwordHash: passwordData.hash,
            updatedAt: now,
          },
          $unset: { resetToken: '', resetExpiresAt: '' },
        },
      )

      sendJson(req, res, 200, { ok: true })
      return
    }

    if (pathname === '/api/admin/overview' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return
      const { users, stalls, sessions } = await getCollections()
      const [usersCount, stallsCount, sessionsCount] = await Promise.all([
        users.countDocuments(),
        stalls.countDocuments(),
        sessions.countDocuments(),
      ])
      sendJson(req, res, 200, {
        ok: true,
        stats: { users: usersCount, stalls: stallsCount, sessions: sessionsCount },
        traffic: {
          total: trafficStats.total,
          methods: Object.fromEntries(trafficStats.byMethod),
        },
      })
      return
    }

    if (pathname === '/api/admin/traffic' && req.method === 'GET') {
      if (!requireAdmin(req, res)) return
      const routes = Array.from(trafficStats.byRoute.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([route, count]) => ({ route, count }))
      sendJson(req, res, 200, { ok: true, routes })
      return
    }

    if (pathname === '/api/admin/send-test' && req.method === 'POST') {
      if (!requireAdmin(req, res)) return
      const body = await readJson(req)
      const to = sanitizeString(body?.to, { max: 200 })
      if (!to || !isValidEmail(to)) {
        sendJson(req, res, 400, { ok: false, error: 'Valid email required.' })
        return
      }
      await sendMail({
        to,
        subject: 'Azera test email',
        text: 'This is a test email from the Azera admin console.',
      })
      sendJson(req, res, 200, { ok: true })
      return
    }

    if (pathname === '/api/uploads/cloudinary' && req.method === 'POST') {
      const body = await readJson(req)
      const dataUrl = sanitizeString(body?.dataUrl, { max: 4_000_000 })
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        sendJson(req, res, 400, { ok: false, error: 'Image data is required.' })
        return
      }

      const config = parseCloudinaryUrl(CLOUDINARY_URL)
      if (!config) {
        sendJson(req, res, 503, { ok: false, error: 'Cloudinary is not configured.' })
        return
      }

      const timestamp = Math.floor(Date.now() / 1000)
      const signatureBase = `timestamp=${timestamp}${config.apiSecret}`
      const signature = crypto.createHash('sha1').update(signatureBase).digest('hex')

      const form = new FormData()
      form.append('file', dataUrl)
      form.append('timestamp', String(timestamp))
      form.append('api_key', config.apiKey)
      form.append('signature', signature)
      form.append('folder', 'azera')

      const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`
      const response = await fetch(uploadUrl, { method: 'POST', body: form })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        sendJson(req, res, 400, {
          ok: false,
          error: result?.error?.message || 'Cloudinary upload failed.',
        })
        return
      }

      sendJson(req, res, 200, {
        ok: true,
        url: result?.secure_url || result?.url || '',
        publicId: result?.public_id || '',
      })
      return
    }

    if (pathname === '/api/stalls' && req.method === 'GET') {
      const q = sanitizeString(url.searchParams.get('q'), { max: 120 })
      const categoryRaw = sanitizeString(url.searchParams.get('category'), { max: 40 })
      const category = categoryRaw && categoryRaw !== 'All' ? normalizeCategory(categoryRaw) : ''

      const { stalls } = await getCollections()
      const filter = {}

      if (category) filter.category = category

      if (q) {
        const regex = new RegExp(escapeRegExp(q), 'i')
        filter.$or = [
          { name: regex },
          { description: regex },
          { location: regex },
          { ownerEmail: regex },
          { ownerName: regex },
        ]
      }

      const rows = await stalls.find(filter).sort({ createdAt: -1 }).limit(200).toArray()
      sendJson(req, res, 200, { ok: true, stalls: rows.map(rowToStall) })
      return
    }

    if (pathname === '/api/stalls' && req.method === 'POST') {
      const user = await requireAuth(req, res)
      if (!user) return
      if (!requireVerified(req, res, user)) return

      const body = await readJson(req)

      const name = sanitizeString(body?.name, { max: 120 })
      const description = sanitizeString(body?.description, { max: 2000 })
      const category = normalizeCategory(body?.category)

      if (!name) {
        sendJson(req, res, 400, { ok: false, error: 'Stall name is required.' })
        return
      }
      if (!description) {
        sendJson(req, res, 400, { ok: false, error: 'Description is required.' })
        return
      }

      const now = Date.now()
      const id = createId()
      const imageUrl = sanitizeString(body?.imageUrl, { max: 2_000_000 })
      const registerUrl = sanitizeString(body?.registerUrl, { max: 400 })
      const location = sanitizeString(body?.location, { max: 160 })
      const ownerName = sanitizeString(body?.ownerName, { max: 120 })
      const phone = sanitizeString(body?.phone, { max: 60 })
      const whatsapp = sanitizeString(body?.whatsapp, { max: 60 })
      const instagram = sanitizeString(body?.instagram, { max: 120 })

      const { stalls } = await getCollections()
      const stall = {
        id,
        userId: user.id,
        name,
        category,
        description,
        imageUrl,
        registerUrl,
        location,
        ownerName,
        ownerEmail: user.email,
        phone,
        whatsapp,
        instagram,
        createdAt: now,
        updatedAt: now,
      }

      await stalls.insertOne(stall)

      sendJson(req, res, 201, { ok: true, stall: rowToStall(stall) })
      return
    }

    if (pathname.startsWith('/api/stalls/') && req.method === 'GET') {
      const stallId = pathname.split('/').pop()
      const { stalls } = await getCollections()
      const stall = await stalls.findOne({ id: stallId })
      if (!stall) {
        sendJson(req, res, 404, { ok: false, error: 'Stall not found.' })
        return
      }

      sendJson(req, res, 200, { ok: true, stall: rowToStall(stall) })
      return
    }

    if (pathname.startsWith('/api/stalls/') && req.method === 'DELETE') {
      const user = await requireAuth(req, res)
      if (!user) return
      if (!requireVerified(req, res, user)) return

      const stallId = pathname.split('/').pop()
      const { stalls } = await getCollections()
      const stall = await stalls.findOne({ id: stallId }, { projection: { id: 1, userId: 1 } })
      if (!stall) {
        sendJson(req, res, 404, { ok: false, error: 'Stall not found.' })
        return
      }
      if (stall.userId !== user.id) {
        sendJson(req, res, 403, { ok: false, error: 'Not allowed.' })
        return
      }

      await stalls.deleteOne({ id: stallId })
      sendJson(req, res, 200, { ok: true })
      return
    }

    sendJson(req, res, 404, { ok: false, error: 'Not found.' })
    return
  }

  res.statusCode = 404
  res.end('Not found')
}

if (isMain) {
  const server = http.createServer((req, res) => {
    Promise.resolve(handleRequest(req, res)).catch((err) => {
      const status = Number(err?.status ?? 500) || 500
      sendJson(req, res, status, { ok: false, error: err?.message || 'Server error.' })
    })
  })

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[api] listening on http://127.0.0.1:${PORT}`)
  })
}
