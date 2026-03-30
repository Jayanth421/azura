import { apiFetch } from './api.js'

export const STALL_CATEGORIES = ['Food', 'Games', 'Crafts', 'Tech', 'Books', 'Services', 'Other']

export const STALL_DEPARTMENTS = [
  'General',
  'CSE',
  'ECE',
  'EEE',
  'Mechanical',
  'Civil',
  'IT',
  'AIML',
  'AIDS',
  'MBA',
  'BBA',
  'Science',
  'Arts',
  'Other',
]

export async function fetchStalls({ q, category, department } = {}) {
  const params = new URLSearchParams()
  if (q && String(q).trim()) params.set('q', String(q).trim())
  if (category && String(category).trim() && category !== 'All') params.set('category', String(category).trim())
  if (department && String(department).trim() && department !== 'All')
    params.set('department', String(department).trim())

  const qs = params.toString()
  const data = await apiFetch(`/api/stalls${qs ? `?${qs}` : ''}`)
  return data?.stalls ?? []
}

export async function fetchStallById(stallId) {
  const id = String(stallId ?? '').trim()
  if (!id) return null
  const data = await apiFetch(`/api/stalls/${encodeURIComponent(id)}`)
  return data?.stall ?? null
}

export async function createStall(stallInput) {
  const data = await apiFetch('/api/stalls', { method: 'POST', body: stallInput })
  return data?.stall ?? null
}

export async function deleteStallById(stallId) {
  const id = String(stallId ?? '').trim()
  if (!id) return { ok: false, error: 'Missing stall id.' }

  try {
    await apiFetch(`/api/stalls/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed.' }
  }
}

export function buildContactLinks(stall) {
  const rawPhone = String(stall?.phone ?? '').trim()
  const rawWhatsapp = String(stall?.whatsapp ?? '').trim()
  const rawInstagram = String(stall?.instagram ?? '').trim()
  const rawEmail = String(stall?.ownerEmail ?? '').trim().toLowerCase()

  const phoneDigits = rawPhone.replace(/[^\d+]/g, '')
  const whatsappDigits = rawWhatsapp.replace(/\D/g, '')

  const phoneUrl = phoneDigits ? `tel:${phoneDigits}` : null

  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Hi! I'm interested in your stall "${stall?.name ?? 'Campus Stall'}".`,
      )}`
    : null

  const emailUrl = rawEmail
    ? `mailto:${rawEmail}?subject=${encodeURIComponent(
        `Azera: ${stall?.name ?? 'Stall'} enquiry`,
      )}&body=${encodeURIComponent(
        `Hi!\n\nI'm interested in your stall "${stall?.name ?? 'Campus Stall'}".\n\nThanks!`,
      )}`
    : null

  let instagramUrl = null
  if (rawInstagram) {
    instagramUrl = rawInstagram.startsWith('http')
      ? rawInstagram
      : `https://instagram.com/${rawInstagram.replace(/^@/, '')}`
  }

  return [
    phoneUrl ? { label: 'Call', href: phoneUrl } : null,
    whatsappUrl ? { label: 'WhatsApp', href: whatsappUrl } : null,
    emailUrl ? { label: 'Email', href: emailUrl } : null,
    instagramUrl ? { label: 'Instagram', href: instagramUrl } : null,
  ].filter(Boolean)
}
