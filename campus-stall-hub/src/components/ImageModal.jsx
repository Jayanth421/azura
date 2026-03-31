import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ImageModal({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => onClose?.()}
    >
      <div className="absolute inset-0 bg-black/70" />

      <div
        className="frame relative max-h-[90vh] max-w-[95vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-secondary absolute right-4 top-4 z-10 px-3 py-2 text-sm"
          onClick={() => onClose?.()}
        >
          Close
        </button>

        <img
          src={src}
          alt={alt}
          className="block max-h-[90vh] max-w-[95vw] object-contain"
          loading="lazy"
        />
      </div>
    </div>,
    document.body,
  )
}

