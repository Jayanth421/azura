import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const SERVER_ROOT = __dirname

export const PORT = Number(process.env.PORT ?? 5174)

export const MONGODB_URI = process.env.MONGODB_URI ?? ''
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? 'azera'

export const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL ?? 'http://127.0.0.1:5173'

export const SESSION_COOKIE_NAME = 'csh_session'

export const SMTP_HOST = process.env.SMTP_HOST ?? ''
export const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587)
export const SMTP_USER = process.env.SMTP_USER ?? ''
export const SMTP_PASS = process.env.SMTP_PASS ?? ''
export const SMTP_FROM = process.env.SMTP_FROM ?? ''

export const MAIL_MODE = (process.env.MAIL_MODE ?? 'smtp').toLowerCase()
const DEFAULT_OUTBOX_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'outbox') : path.join(SERVER_ROOT, 'outbox')
export const OUTBOX_DIR = process.env.OUTBOX_DIR ?? DEFAULT_OUTBOX_DIR

export const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? ''

export const CLOUDINARY_URL = process.env.CLOUDINARY_URL ?? ''

export const SESSION_REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const SESSION_TEMP_TTL_MS = 24 * 60 * 60 * 1000

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000

export const BODY_LIMIT_BYTES = Number(process.env.BODY_LIMIT_BYTES ?? 6_000_000)
