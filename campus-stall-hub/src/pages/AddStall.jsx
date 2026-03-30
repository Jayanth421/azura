import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context.js'
import { STALL_CATEGORIES, createStall } from '../lib/stalls.js'
import { uploadToCloudinary } from '../lib/uploads.js'
import { imageFileToOptimizedDataUrl } from '../lib/images.js'
import { getCategoryGradient, placeholderImageDataUrl } from '../lib/placeholders.js'

function normalizeHttpUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  if (value.startsWith('data:image/')) return value
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function isValidHttpUrl(raw) {
  const value = String(raw ?? '').trim()
  if (!value) return true
  if (value.startsWith('data:image/')) return true

  try {
    const url = new URL(normalizeHttpUrl(value))
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validate(values) {
  const nextErrors = {}
  if (!values.name.trim()) nextErrors.name = 'Stall name is required.'
  if (!values.description.trim()) nextErrors.description = 'Description is required.'

  if (!values.imageDataUrl && values.imageUrl.trim() && !isValidHttpUrl(values.imageUrl)) {
    nextErrors.imageUrl = 'Please enter a valid image URL (https://...).'
  }

  if (values.registerUrl.trim() && !isValidHttpUrl(values.registerUrl)) {
    nextErrors.registerUrl = 'Please enter a valid registration URL (https://...).'
  }

  return nextErrors
}

function StallPreview({ values, ownerEmail }) {
  const name = values.name.trim() || 'Your Stall Name'
  const category = values.category || 'Other'
  const description =
    values.description.trim() ||
    'A short preview of your description will appear here. Keep it clear and catchy.'

  const imageSrc =
    values.imageDataUrl ||
    normalizeHttpUrl(values.imageUrl) ||
    placeholderImageDataUrl({ title: name, category })

  const { from, to } = getCategoryGradient(category)
  const registerUrl = normalizeHttpUrl(values.registerUrl)

  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-slate-900">Live preview</div>
        <span className="badge">Card</span>
      </div>

      <div
        className="card-outer group"
        style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <div className="card-inner overflow-hidden">
          <div className="relative">
            <img
              src={imageSrc}
              alt={name}
              className="h-44 w-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = placeholderImageDataUrl({ title: name, category })
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-extrabold text-slate-900">{name}</h3>
                {values.location.trim() ? (
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {values.location.trim()}
                  </p>
                ) : null}
              </div>

              <span
                className="shrink-0 rounded-full px-3 py-1 text-xs font-extrabold text-white shadow-lg"
                style={{ backgroundImage: `linear-gradient(90deg, ${from}, ${to})` }}
              >
                {category}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-600 line-clamp-3">{description}</p>

            {registerUrl ? (
              <div className="mt-4">
                <span className="chip inline-flex">Register link added</span>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="btn btn-secondary opacity-60" type="button" disabled>
                View
              </button>
              <button className="btn btn-primary opacity-60" type="button" disabled>
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="frame p-4">
        <div className="text-xs font-extrabold text-slate-900">Posting email</div>
        <div className="mt-1 break-all text-sm font-semibold text-slate-700">
          {ownerEmail || 'Not logged in'}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Tip: Upload a small photo for the best-looking cards.
        </p>
      </div>
    </aside>
  )
}

export default function AddStall() {
  const navigate = useNavigate()
  const categories = useMemo(() => STALL_CATEGORIES, [])
  const { user } = useAuth()

  const [values, setValues] = useState({
    name: '',
    category: categories[0] ?? 'Other',
    description: '',
    imageUrl: '',
    imageDataUrl: '',
    registerUrl: '',
    location: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    instagram: '',
  })
  const [errors, setErrors] = useState({})
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState('')
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function setField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function onPickImage(file) {
    if (!file) return
    setImageError('')
    setImageBusy(true)
    try {
      const dataUrl = await imageFileToOptimizedDataUrl(file)
      setField('imageDataUrl', dataUrl)
      setField('imageUrl', '')
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to upload image.')
    } finally {
      setImageBusy(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitError('')

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (submitBusy) return

    setSubmitBusy(true)
    try {
      let imageUrl = values.imageDataUrl || normalizeHttpUrl(values.imageUrl)
      if (values.imageDataUrl) {
        const upload = await uploadToCloudinary(values.imageDataUrl)
        if (!upload?.url) {
          setSubmitError('Image upload failed. Please try again.')
          return
        }
        imageUrl = upload.url
      }

      const payload = {
        name: values.name,
        category: values.category,
        description: values.description,
        imageUrl,
        registerUrl: normalizeHttpUrl(values.registerUrl),
        location: values.location,
        ownerName: values.ownerName,
        phone: values.phone,
        whatsapp: values.whatsapp,
        instagram: values.instagram,
      }
      const stall = await createStall(payload)
      if (!stall?.id) {
        setSubmitError('Could not create stall. Please try again.')
        return
      }
      navigate(`/stalls/${stall.id}`, { state: { created: true } })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create stall.')
    } finally {
      setSubmitBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-up">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Add Your Stall</h1>
          <p className="mt-1 text-sm text-slate-600">
            Login required to post. Your stall appears instantly in the stall listing.
          </p>
          {user?.email ? (
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Logged in as <span className="text-slate-900">{user.email}</span>
            </p>
          ) : null}
        </div>
        <Link to="/stalls" className="btn btn-secondary">
          Explore Stalls
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card-outer-static bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-600">
            <div className="card-inner p-6 sm:p-8">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Stall Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className="input mt-2"
                      value={values.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="e.g., Chai and Snacks Corner"
                    />
                    {errors.name ? (
                      <p className="mt-2 text-sm font-medium text-red-600">{errors.name}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Category</label>
                    <select
                      className="input mt-2"
                      value={values.category}
                      onChange={(e) => setField('category', e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Location</label>
                    <input
                      className="input mt-2"
                      value={values.location}
                      onChange={(e) => setField('location', e.target.value)}
                      placeholder="e.g., Main Quad, Block B"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="input mt-2 min-h-28 resize-none"
                      value={values.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="What are you offering? Prices, highlights, timings, etc."
                    />
                    {errors.description ? (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {errors.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Stall Photo (Upload)</label>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white hover:file:bg-slate-800"
                        type="file"
                        accept="image/*"
                        onChange={(e) => onPickImage(e.target.files?.[0])}
                      />
                      {values.imageDataUrl ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setField('imageDataUrl', '')}
                        >
                          Remove upload
                        </button>
                      ) : null}
                    </div>
                    {imageBusy ? (
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Optimizing image...
                      </p>
                    ) : null}
                    {imageError ? (
                      <p className="mt-2 text-sm font-medium text-red-600">{imageError}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      Uploaded images are optimized and saved with your stall (size limits apply).
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Or paste Image URL</label>
                    <input
                      className="input mt-2"
                      value={values.imageUrl}
                      onChange={(e) => {
                        setField('imageUrl', e.target.value)
                        if (e.target.value) setField('imageDataUrl', '')
                      }}
                      placeholder="https://..."
                    />
                    {errors.imageUrl ? (
                      <p className="mt-2 text-sm font-medium text-red-600">{errors.imageUrl}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-extrabold text-slate-900">Contact + Links</h2>
                    <span className="text-xs font-semibold text-slate-500">Email login required</span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Email (from login)</label>
                      <input
                        className="input mt-2 cursor-not-allowed bg-slate-100/70 opacity-80"
                        value={user?.email ?? ''}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Registration Link (Google Sheet / Form)
                      </label>
                      <input
                        className="input mt-2"
                        value={values.registerUrl}
                        onChange={(e) => setField('registerUrl', e.target.value)}
                        placeholder="https://docs.google.com/..."
                      />
                      {errors.registerUrl ? (
                        <p className="mt-2 text-sm font-medium text-red-600">
                          {errors.registerUrl}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        Optional: add a link where students can register (Google Sheets, Google Forms, etc.).
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">Owner Name</label>
                      <input
                        className="input mt-2"
                        value={values.ownerName}
                        onChange={(e) => setField('ownerName', e.target.value)}
                        placeholder="e.g., Ajay"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Phone</label>
                      <input
                        className="input mt-2"
                        value={values.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        placeholder="e.g., +91 98765 43210"
                        inputMode="tel"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">WhatsApp Number</label>
                      <input
                        className="input mt-2"
                        value={values.whatsapp}
                        onChange={(e) => setField('whatsapp', e.target.value)}
                        placeholder="Use country code (e.g., 919876543210)"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700">Instagram</label>
                      <input
                        className="input mt-2"
                        value={values.instagram}
                        onChange={(e) => setField('instagram', e.target.value)}
                        placeholder="@yourhandle or link"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setValues({
                        name: '',
                        category: categories[0] ?? 'Other',
                        description: '',
                        imageUrl: '',
                        imageDataUrl: '',
                        registerUrl: '',
                        location: '',
                        ownerName: '',
                        phone: '',
                        whatsapp: '',
                        instagram: '',
                      })
                      setErrors({})
                      setImageError('')
                      setSubmitError('')
                    }}
                  >
                    Reset
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitBusy}>
                    {submitBusy ? 'Submitting...' : 'Submit Stall'}
                  </button>
                </div>

                {submitError ? (
                  <p className="text-sm font-medium text-red-600">{submitError}</p>
                ) : null}
              </form>
            </div>
          </div>
        </div>

        <StallPreview values={values} ownerEmail={user?.email ?? ''} />
      </div>
    </div>
  )
}
