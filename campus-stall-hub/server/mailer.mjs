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

function normalizeBaseUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, '')
  return `https://${value.replace(/\/+$/, '')}`
}

function escapeHtml(raw) {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderEmailHtml({ subject, preheader, heading, bodyLines, ctaLabel, ctaUrl, footerLines }) {
  const safeSubject = escapeHtml(subject)
  const safePreheader = escapeHtml(preheader)
  const safeHeading = escapeHtml(heading)
  const safeCtaLabel = escapeHtml(ctaLabel)
  const safeCtaUrl = escapeHtml(ctaUrl)

  const body = (Array.isArray(bodyLines) ? bodyLines : [])
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px; color:#334155; font-size:14px; line-height:1.65;">${escapeHtml(line)}</p>`)
    .join('')

  const footer = (Array.isArray(footerLines) ? footerLines : [])
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 8px; color:#64748b; font-size:12px; line-height:1.6;">${escapeHtml(line)}</p>`)
    .join('')

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${safeSubject}</title>`,
    '</head>',
    '<body style="margin:0; padding:0; background-color:#f1f5f9;">',
    `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${safePreheader}</div>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:24px 0;">',
    '<tr>',
    '<td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%; margin:0 auto;">',
    '<tr>',
    '<td style="padding:0 16px;">',
    '<div style="border-radius:24px; overflow:hidden; border:1px solid rgba(15,23,42,0.08); box-shadow:0 18px 35px rgba(15,23,42,0.08);">',
    '<div style="padding:24px; background:linear-gradient(135deg,#2563eb,#4f46e5,#d946ef);">',
    '<div style="font-size:12px; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.85);">Azera</div>',
    `<h1 style="margin:14px 0 0; font-size:24px; line-height:1.25; color:#ffffff; font-weight:900;">${safeHeading}</h1>`,
    '</div>',
    '<div style="padding:24px; background-color:#ffffff;">',
    body,
    '<div style="margin-top:16px;">',
    `<a href="${safeCtaUrl}" style="display:inline-block; text-decoration:none; background-color:#0f172a; color:#ffffff; padding:12px 16px; border-radius:14px; font-weight:900; font-size:14px;">${safeCtaLabel}</a>`,
    '</div>',
    '<p style="margin:16px 0 0; color:#64748b; font-size:12px; line-height:1.6;">Button not working? Copy and paste this link:</p>',
    `<p style="margin:8px 0 0; font-size:12px; line-height:1.6; word-break:break-all;"><a href="${safeCtaUrl}" style="color:#2563eb; text-decoration:underline;">${safeCtaUrl}</a></p>`,
    '</div>',
    '<div style="padding:18px 24px; background-color:#f8fafc; border-top:1px solid rgba(15,23,42,0.06);">',
    footer,
    '<p style="margin:14px 0 0; color:#94a3b8; font-size:11px; line-height:1.6;">You are receiving this email because an action was requested for your Azera account.</p>',
    '</div>',
    '</div>',
    '</td>',
    '</tr>',
    '</table>',
    '</td>',
    '</tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('')
}

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

function writeOutboxMail({ to, subject, text, html }) {
  fs.mkdirSync(OUTBOX_DIR, { recursive: true })
  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const id = crypto.randomUUID()
  const baseName = `${safeTimestamp}_${id}`
  const textPath = path.join(OUTBOX_DIR, `${baseName}.txt`)
  const body = [`To: ${to}`, `Subject: ${subject}`, '', text, ''].join('\n')
  fs.writeFileSync(textPath, body, 'utf8')

  let htmlPath = null
  if (html) {
    htmlPath = path.join(OUTBOX_DIR, `${baseName}.html`)
    fs.writeFileSync(htmlPath, html, 'utf8')
  }

  console.log(`[mail] outbox wrote ${textPath}${htmlPath ? ` + ${htmlPath}` : ''}`)
  return { transport: 'outbox', path: textPath, htmlPath }
}

export async function sendMail({ to, subject, text, html }) {
  if (MAIL_MODE === 'outbox') {
    return writeOutboxMail({ to, subject, text, html })
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
      html,
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
  const base = normalizeBaseUrl(FRONTEND_BASE_URL)
  const link = `${base}/verify?token=${encodeURIComponent(token)}`
  const subject = 'Verify your Azera account'
  return sendMail({
    to,
    subject,
    text: [
      'Verify your email to unlock posting and owner actions.',
      '',
      `Verify link: ${link}`,
      '',
      'If you did not create this account, you can ignore this email.',
    ].join('\n'),
    html: renderEmailHtml({
      subject,
      preheader: 'Verify your email to start posting stalls.',
      heading: 'Verify your email',
      bodyLines: [
        'Verify your email to unlock posting and owner actions in Azera.',
        'This link will verify your account instantly.',
      ],
      ctaLabel: 'Verify account',
      ctaUrl: link,
      footerLines: ['If you did not create this account, you can safely ignore this email.'],
    }),
  })
}

export async function sendPasswordResetEmail({ to, token }) {
  const base = normalizeBaseUrl(FRONTEND_BASE_URL)
  const link = `${base}/reset?token=${encodeURIComponent(token)}`
  const subject = 'Reset your Azera password'
  return sendMail({
    to,
    subject,
    text: [
      'A password reset was requested for your account.',
      '',
      `Reset link: ${link}`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: renderEmailHtml({
      subject,
      preheader: 'Reset your password to regain access to Azera.',
      heading: 'Reset your password',
      bodyLines: [
        'A password reset was requested for your Azera account.',
        'If this was you, click the button below to choose a new password.',
      ],
      ctaLabel: 'Reset password',
      ctaUrl: link,
      footerLines: ['If you did not request this, you can safely ignore this email.'],
    }),
  })
}
