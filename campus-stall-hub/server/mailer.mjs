import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import {
  FRONTEND_BASE_URL,
  MAIL_MODE,
  OUTBOX_DIR,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} from './env.mjs'
let smtpTransport = null

function getSmtpTransport() {
  if (!SMTP_HOST) return null
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
          }
        : undefined,
    })
  }
  return smtpTransport
}

function writeOutboxMail({ to, subject, text }) {
  fs.mkdirSync(OUTBOX_DIR, { recursive: true })
  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const id = crypto.randomUUID()
  const filename = `${safeTimestamp}_${id}.txt`
  const filePath = path.join(OUTBOX_DIR, filename)
  const body = [`To: ${to}`, `Subject: ${subject}`, '', text, ''].join('\n')
  fs.writeFileSync(filePath, body, 'utf8')
  console.log(`[mail] outbox wrote ${filePath}`)
  return { transport: 'outbox', path: filePath }
}

export async function sendMail({ to, subject, text }) {
  if (MAIL_MODE === 'outbox') {
    return writeOutboxMail({ to, subject, text })
  }

  const transport = getSmtpTransport()
  if (!transport) {
    throw new Error('SMTP is not configured. Set SMTP_HOST in server/.env.')
  }
  try {
    await transport.sendMail({
      from: SMTP_FROM || SMTP_USER || 'no-reply@azera.local',
      to,
      subject,
      text,
    })
  } catch (err) {
    if (err?.responseCode === 553) {
      throw new Error(
        [
          err?.message || 'Message failed: 553 Sender is not allowed to relay emails',
          '',
          'Your SMTP provider rejected the From/sender address.',
          'Fix: verify/allow the sender email in your SMTP provider (ZeptoMail Mail Agent), then set SMTP_FROM to that exact address.',
          'Workaround (local dev): set MAIL_MODE=outbox in server/.env to write emails to server/outbox instead of sending.',
        ].join('\n'),
        { cause: err },
      )
    }
    throw err
  }
  console.log(`[mail] smtp sent to ${to}`)
  return { transport: 'smtp' }
}

export async function sendVerificationEmail({ to, token }) {
  const link = `${FRONTEND_BASE_URL}/verify?token=${encodeURIComponent(token)}`
  return sendMail({
    to,
    subject: 'Verify your Azera account',
    text: [
      'Verify your email to unlock posting and owner actions.',
      '',
      `Verify link: ${link}`,
      '',
      'If you did not create this account, you can ignore this email.',
    ].join('\n'),
  })
}

export async function sendPasswordResetEmail({ to, token }) {
  const link = `${FRONTEND_BASE_URL}/reset?token=${encodeURIComponent(token)}`
  return sendMail({
    to,
    subject: 'Reset your Azera password',
    text: [
      'A password reset was requested for your account.',
      '',
      `Reset link: ${link}`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  })
}
