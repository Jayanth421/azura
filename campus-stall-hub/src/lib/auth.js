import { apiFetch } from './api.js'

export function isValidEmail(email) {
  const value = String(email ?? '').trim().toLowerCase()
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value)
}

export function getPasswordIssues(password) {
  const value = String(password ?? '')
  const issues = []

  if (value.length < 8) issues.push('Use at least 8 characters.')
  if (!/[a-z]/i.test(value)) issues.push('Add at least 1 letter.')
  if (!/\d/.test(value)) issues.push('Add at least 1 number.')

  return issues
}

export async function getMe() {
  const data = await apiFetch('/api/auth/me')
  return data?.user ?? null
}

export async function signUpWithEmailPassword({ email, password, remember = true }) {
  try {
    const data = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: { email, password, remember },
    })
    return {
      ok: true,
      user: data?.user ?? null,
      needsVerification: Boolean(data?.needsVerification),
      mailFailed: Boolean(data?.mailFailed),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Signup failed.' }
  }
}

export async function signInWithEmailPassword({ email, password, remember = true }) {
  try {
    const data = await apiFetch('/api/auth/signin', {
      method: 'POST',
      body: { email, password, remember },
    })
    return {
      ok: true,
      user: data?.user ?? null,
      needsVerification: Boolean(data?.needsVerification),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Login failed.' }
  }
}

export async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  }
}

export async function resendVerificationEmail() {
  try {
    await apiFetch('/api/auth/resend-verification', { method: 'POST' })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to resend.' }
  }
}

export async function verifyEmailToken(token) {
  try {
    await apiFetch('/api/auth/verify-email', { method: 'POST', body: { token } })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Verification failed.' }
  }
}

export async function requestPasswordReset(email) {
  try {
    await apiFetch('/api/auth/request-password-reset', { method: 'POST', body: { email } })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed.' }
  }
}

export async function resetPassword({ token, password }) {
  try {
    await apiFetch('/api/auth/reset-password', { method: 'POST', body: { token, password } })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Reset failed.' }
  }
}
