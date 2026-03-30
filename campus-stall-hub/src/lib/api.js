export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function readJsonSafe(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function apiFetch(path, { method = 'GET', body, headers } = {}) {
  const init = {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }

  const res = await fetch(path, init)
  const data = await readJsonSafe(res)

  if (!res.ok) {
    const message = (data && typeof data === 'object' && data.error) || 'Request failed.'
    throw new ApiError(String(message), { status: res.status, data })
  }

  return data
}

