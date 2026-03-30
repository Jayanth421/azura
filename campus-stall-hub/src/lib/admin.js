import { apiFetch } from './api.js'

export function loadAdminToken() {
  try {
    return localStorage.getItem('azera_admin_token') || ''
  } catch {
    return ''
  }
}

export function saveAdminToken(token) {
  try {
    localStorage.setItem('azera_admin_token', token)
  } catch {
    // ignore storage errors
  }
}

export async function adminFetch(path, token, options = {}) {
  return apiFetch(path, {
    ...options,
    headers: {
      'X-Admin-Token': token,
      ...(options.headers || {}),
    },
  })
}
