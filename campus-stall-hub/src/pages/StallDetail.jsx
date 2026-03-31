import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import ImageModal from '../components/ImageModal.jsx'
import { useAuth } from '../lib/auth-context.js'
import { buildContactLinks, deleteStallById, fetchStallById } from '../lib/stalls.js'
import { getCategoryGradient, placeholderImageDataUrl } from '../lib/placeholders.js'

export default function StallDetail() {
  const { stallId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user: viewer } = useAuth()

  const [stall, setStall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)
  const [shareNote, setShareNote] = useState('')
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const shareTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current && typeof window !== 'undefined') {
        window.clearTimeout(shareTimeoutRef.current)
      }
      shareTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setShareMenuOpen(false)

    async function load() {
      setLoading(true)
      setError('')
      try {
        const next = await fetchStallById(stallId)
        if (cancelled) return
        if (!next) {
          setStall(null)
          setError('Stall not found.')
          return
        }
        setStall(next)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load stall.')
        setStall(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [stallId])

  const contacts = useMemo(() => buildContactLinks(stall), [stall])
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}${location.pathname}${location.search}`
  }, [location.pathname, location.search])

  const shareText = useMemo(() => {
    if (!stall) return ''
    return `Azera: ${stall.name} — ${stall.category}${stall.department ? ` • ${stall.department}` : ''}${stall.location ? ` • ${stall.location}` : ''}`
  }, [stall])

  const preferred =
    contacts.find((l) => l.label === 'WhatsApp') ??
    contacts.find((l) => l.label === 'Call') ??
    contacts.find((l) => l.label === 'Email') ??
    contacts[0]

  if (loading) {
    return (
      <div className="frame mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Loading stall...</h1>
        <p className="mt-2 text-sm text-slate-600">Fetching details from the server.</p>
      </div>
    )
  }

  if (!stall) {
    return (
      <div className="frame mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Stall not found</h1>
        <p className="mt-2 text-sm font-semibold text-red-700">{error || 'Not found.'}</p>
        <Link to="/stalls" className="btn btn-primary mt-6">
          Back to Stalls
        </Link>
      </div>
    )
  }

  const { from, to } = getCategoryGradient(stall.category)
  const isOwner =
    Boolean(viewer?.email) &&
    viewer.email === String(stall.ownerEmail ?? '').trim().toLowerCase()
  const registerUrl = String(stall.registerUrl ?? '').trim()
  const imageSrc =
    stall.imageUrl || placeholderImageDataUrl({ title: stall.name, category: stall.category })
  const shareMessage = shareUrl && shareText ? `${shareText}\n${shareUrl}` : ''
  const whatsappShareUrl = shareMessage ? `https://wa.me/?text=${encodeURIComponent(shareMessage)}` : ''
  const telegramShareUrl =
    shareUrl && shareText
      ? `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
      : ''
  const xShareUrl =
    shareUrl && shareText
      ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
      : ''

  function pushShareNote(note) {
    setShareNote(note)
    if (typeof window === 'undefined') return
    if (shareTimeoutRef.current) window.clearTimeout(shareTimeoutRef.current)
    shareTimeoutRef.current = window.setTimeout(() => {
      setShareNote('')
      shareTimeoutRef.current = null
    }, 2500)
  }

  async function copyShareLink() {
    if (!shareUrl) {
      pushShareNote('Unable to copy link.')
      return
    }

    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        pushShareNote('Link copied.')
        return
      } catch {
        // ignore and fall back to prompt
      }
    }

    if (typeof window !== 'undefined') {
      window.prompt('Copy this link:', shareUrl)
      pushShareNote('Link ready to copy.')
      return
    }

    pushShareNote('Unable to copy link.')
  }

  async function handleShare() {
    if (shareBusy) return
    setShareBusy(true)
    setShareNote('')

    try {
      if (!shareUrl) {
        pushShareNote('Unable to share.')
        return
      }

      const shareData = {
        title: stall.name,
        text: shareText,
        url: shareUrl,
      }

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share(shareData)
          setShareMenuOpen(false)
          pushShareNote('Shared.')
          return
        } catch (err) {
          if (err?.name === 'AbortError') return
        }
      }

      setShareMenuOpen(true)
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        try {
          await navigator.clipboard.writeText(shareUrl)
          pushShareNote('Link copied.')
          return
        } catch {
          // ignore and fall back to share menu
        }
      }

      pushShareNote('Share options ready.')
    } finally {
      setShareBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/stalls" className="text-sm font-extrabold text-blue-700 hover:underline">
            {'<- Back to stalls'}
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{stall.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-extrabold text-white shadow-lg"
              style={{ backgroundImage: `linear-gradient(90deg, ${from}, ${to})` }}
            >
              {stall.category}
            </span>
            {stall.department ? <span className="badge">{stall.department}</span> : null}
            {stall.location ? (
              <span className="text-sm font-semibold text-slate-600">{stall.location}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {preferred ? (
              <a
                className="btn text-white"
                href={preferred.href}
                target="_blank"
                rel="noreferrer"
                style={{ backgroundImage: `linear-gradient(90deg, ${from}, ${to})` }}
              >
                Contact
              </a>
            ) : (
              <button className="btn btn-secondary opacity-50" type="button" disabled>
                No contact
              </button>
            )}
            {registerUrl ? (
              <a className="btn btn-secondary" href={registerUrl} target="_blank" rel="noreferrer">
                Register
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={shareBusy}
              onClick={handleShare}
              title="Share this stall"
            >
              {shareBusy ? 'Sharing...' : 'Share'}
            </button>
            <Link to="/add" className="btn btn-secondary">
              Add Another Stall
            </Link>
          </div>
          {shareNote ? (
            <div className="text-xs font-semibold text-slate-600">{shareNote}</div>
          ) : null}
          {shareMenuOpen && shareUrl ? (
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                className="chip shrink-0"
                onClick={() => void copyShareLink()}
              >
                Copy link
              </button>
              {whatsappShareUrl ? (
                <a
                  className="chip shrink-0"
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Share on WhatsApp"
                >
                  WhatsApp
                </a>
              ) : null}
              {telegramShareUrl ? (
                <a
                  className="chip shrink-0"
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Share on Telegram"
                >
                  Telegram
                </a>
              ) : null}
              {xShareUrl ? (
                <a
                  className="chip shrink-0"
                  href={xShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Share on X"
                >
                  X
                </a>
              ) : null}
              <button
                type="button"
                className="chip shrink-0"
                onClick={() => setShareMenuOpen(false)}
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {location.state?.created ? (
        <div className="frame border border-emerald-200 bg-emerald-50/70 p-4 text-sm font-extrabold text-emerald-800">
          Success: Stall posted and visible in the listing.
        </div>
      ) : null}

      <div className="card-outer-static" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}>
        <div className="card-inner overflow-hidden">
          <div className="relative">
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => setImageOpen(true)}
              aria-label="View full image"
            >
              <img
                src={imageSrc}
                alt={stall.name}
                className="h-[50vh] w-full cursor-zoom-in object-cover sm:h-[60vh] lg:h-[70vh]"
                onError={(e) => {
                  e.currentTarget.src = placeholderImageDataUrl({
                    title: stall.name,
                    category: stall.category,
                  })
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
              <div className="pointer-events-none absolute bottom-4 right-4">
                <span className="chip bg-white/85">Tap to expand</span>
              </div>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-base text-slate-700">{stall.description}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <h2 className="text-base font-extrabold text-slate-900">Details</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-600">Owner</dt>
                    <dd className="text-right font-extrabold text-slate-900">
                      {stall.ownerName || '-'}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-600">Email</dt>
                    <dd className="text-right font-extrabold text-slate-900">
                      {stall.ownerEmail || '-'}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-600">Department</dt>
                    <dd className="text-right font-extrabold text-slate-900">
                      {stall.department || '-'}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-600">Location</dt>
                    <dd className="text-right font-extrabold text-slate-900">
                      {stall.location || '-'}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="font-semibold text-slate-600">Register link</dt>
                    <dd className="text-right font-extrabold text-slate-900">
                      {registerUrl ? (
                        <a
                          href={registerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        '-'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <h2 className="text-base font-extrabold text-slate-900">Contact Links</h2>
                {contacts.length === 0 ? (
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No contact methods provided.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {contacts.map((c) => (
                      <a
                        key={c.href}
                        href={c.href}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                      >
                        {c.label}
                      </a>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Tip: WhatsApp works best with a country-code number.
                </p>
              </div>
            </div>

            {isOwner ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Owner actions</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      Only the logged-in owner can manage this stall.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary ring-1 ring-red-200 text-red-700 hover:bg-red-50"
                    disabled={deleteBusy}
                    onClick={async () => {
                      if (deleteBusy) return
                      const ok = window.confirm('Delete this stall? This removes it from the database.')
                      if (!ok) return
                      setDeleteBusy(true)
                      try {
                        const result = await deleteStallById(stall.id)
                        if (!result?.ok) {
                          window.alert(result?.error || 'Could not delete stall.')
                          return
                        }
                        navigate('/stalls', { replace: true, state: { deleted: true } })
                      } finally {
                        setDeleteBusy(false)
                      }
                    }}
                  >
                    {deleteBusy ? 'Deleting...' : 'Delete stall'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ImageModal
        open={imageOpen}
        src={imageSrc}
        alt={stall.name}
        onClose={() => setImageOpen(false)}
      />
    </div>
  )
}
