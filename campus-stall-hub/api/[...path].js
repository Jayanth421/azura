import { handleRequest } from '../server/index.mjs'

export default async function handler(req, res) {
  try {
    await handleRequest(req, res)
  } catch (err) {
    const status = Number(err?.status ?? 500) || 500
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: err?.message || 'Server error.' }))
  }
}

