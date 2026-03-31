import { handleRequest } from '../server/index.mjs'

function rebuildApiUrlFromQuery(req) {
  const query = req?.query
  if (!query || typeof query !== 'object') return

  const rawPath = query.path
  if (!rawPath) return

  const segments = (Array.isArray(rawPath) ? rawPath : [rawPath])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)

  const pathname = segments.length > 0 ? `/api/${segments.join('/')}` : '/api'

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (key === 'path') continue
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item))
    } else {
      params.append(key, String(value))
    }
  }

  const queryString = params.toString()
  req.url = queryString ? `${pathname}?${queryString}` : pathname
}

export default async function handler(req, res) {
  try {
    rebuildApiUrlFromQuery(req)
    await handleRequest(req, res)
  } catch (err) {
    const status = Number(err?.status ?? 500) || 500
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: err?.message || 'Server error.' }))
  }
}

