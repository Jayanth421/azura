import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isValidEmail } from '../lib/auth.js'
import { useAuth } from '../lib/auth-context.js'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    setBusy(true)
    try {
      const result = await forgotPassword(email)
      if (!result?.ok) {
        setError(result?.error || 'Could not send reset email.')
        return
      }
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Reset password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your email and we&apos;ll send a password reset link.
        </p>
          <p className="mt-2 text-xs text-slate-500">
            Check your inbox for the reset email.
          </p>
      </div>

      <div className="frame p-6">
        {sent ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
              If an account exists for <span className="font-extrabold">{email}</span>, a reset link has been sent.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link to="/login" className="btn btn-primary">
                Back to login
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => setSent(false)}>
                Send again
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="forgot-email">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="forgot-email"
                className="input mt-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                inputMode="email"
                autoComplete="email"
                disabled={busy}
              />
              {error ? <p className="mt-2 text-sm font-medium text-red-600">{error}</p> : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Sending...' : 'Send reset link'}
              </button>
              <Link to="/login" className="btn btn-secondary">
                Back
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
