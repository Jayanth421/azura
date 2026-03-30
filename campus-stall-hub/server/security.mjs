import crypto from 'node:crypto'

export const PBKDF2_ITERATIONS = 120_000
export const PBKDF2_DIGEST = 'sha256'
export const PBKDF2_KEYLEN = 32

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

export function isValidEmail(email) {
  const value = normalizeEmail(email)
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

export function createId() {
  return crypto.randomUUID()
}

export function createToken() {
  return crypto.randomUUID()
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const derived = crypto.pbkdf2Sync(
    String(password ?? ''),
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST,
  )

  return {
    salt: salt.toString('base64'),
    hash: derived.toString('base64'),
  }
}

export function verifyPassword({ password, saltBase64, hashBase64 }) {
  try {
    const salt = Buffer.from(String(saltBase64 ?? ''), 'base64')
    const expected = Buffer.from(String(hashBase64 ?? ''), 'base64')
    const derived = crypto.pbkdf2Sync(
      String(password ?? ''),
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST,
    )
    return (
      expected.length === derived.length && crypto.timingSafeEqual(expected, derived)
    )
  } catch {
    return false
  }
}

