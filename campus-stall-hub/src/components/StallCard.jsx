import { useState } from 'react'
import { Link } from 'react-router-dom'
import { buildContactLinks } from '../lib/stalls.js'
import { getCategoryGradient, placeholderImageDataUrl } from '../lib/placeholders.js'
import ImageModal from './ImageModal.jsx'

function PrimaryContactButton({ stall }) {
  const links = buildContactLinks(stall)
  if (links.length === 0) {
    return (
      <button className="btn btn-secondary opacity-50" type="button" disabled>
        No contact
      </button>
    )
  }

  const preferred =
    links.find((l) => l.label === 'WhatsApp') ??
    links.find((l) => l.label === 'Call') ??
    links.find((l) => l.label === 'Email') ??
    links[0]

  return (
    <a className="btn btn-primary" href={preferred.href} target="_blank" rel="noreferrer">
      Contact
    </a>
  )
}

export default function StallCard({ stall }) {
  const [imageOpen, setImageOpen] = useState(false)
  const imageSrc =
    stall.imageUrl ||
    placeholderImageDataUrl({ title: stall.name, category: stall.category })

  const { from, to } = getCategoryGradient(stall.category)

  return (
    <div
      className="card-outer group"
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div className="card-inner overflow-hidden">
        <div className="relative">
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => setImageOpen(true)}
            aria-label={`View image for ${stall.name}`}
          >
            <img
              src={imageSrc}
              alt={stall.name}
              className="h-52 w-full cursor-zoom-in object-cover transition duration-500 group-hover:scale-110 sm:h-56"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = placeholderImageDataUrl({
                  title: stall.name,
                  category: stall.category,
                })
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
          </button>

          <div className="pointer-events-none absolute bottom-3 right-3">
            <span className="chip bg-white/85">Tap to expand</span>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-extrabold text-slate-900">
                {stall.name}
              </h3>
              {stall.department || stall.location ? (
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                  {stall.department || ''}
                  {stall.department && stall.location ? ' • ' : ''}
                  {stall.location || ''}
                </p>
              ) : null}
            </div>

            <span
              className="shrink-0 rounded-full px-3 py-1 text-xs font-extrabold text-white shadow-lg"
              style={{ backgroundImage: `linear-gradient(90deg, ${from}, ${to})` }}
            >
              {stall.category}
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-600 line-clamp-3">
            {stall.description}
          </p>

          {stall.registerUrl ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={stall.registerUrl}
                target="_blank"
                rel="noreferrer"
                className="chip"
                title="Open registration link"
              >
                Register
              </a>
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <Link to={`/stalls/${stall.id}`} className="btn btn-secondary flex-1">
              View
            </Link>
            <div className="flex-1">
              <PrimaryContactButton stall={stall} />
            </div>
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
