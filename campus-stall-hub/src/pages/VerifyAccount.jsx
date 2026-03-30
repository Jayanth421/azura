import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context.js'

export default function VerifyAccount() {
  const { status, user, refresh, resendVerification } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const mailFailed = Boolean(location.state?.mailFailed)

  const target = location.state?.from?.pathname || '/add'

  useEffect(() => {
    if (status === 'ready' && user?.verified) {
      navigate(target, { replace: true })
    }
  }, [status, user, navigate, target])

  if (status !== 'ready') {
    return (
      <div className="frame mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Verifying...</h1>
        <p className="mt-2 text-sm text-slate-600">Checking your account status.</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.state?.from ?? location }} />
  }

  if (user.verified) {
    return (
      <div className="frame mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Account verified</h1>
        <p className="mt-2 text-sm text-slate-600">You can post and manage stalls now.</p>
        <Link to={target} className="btn btn-primary mt-6">
          Continue
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a verification link to <span className="font-extrabold text-slate-900">{user.email}</span>.
          Open the link to unlock posting.
        </p>
          <p className="mt-2 text-xs text-slate-500">
            {mailFailed
              ? 'Email delivery failed. Use "Resend email" after admin fixes SMTP.'
              : 'Check your inbox for the verification email.'}
          </p>
      </div>

      <div className="frame p-6">
        {notice ? (
          <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              setNotice('')
              try {
                const result = await resendVerification()
                if (!result?.ok) {
                  setError(result?.error || 'Could not resend email.')
                  return
                }
                    setNotice('Verification email sent. Check your inbox.')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Sending...' : 'Resend email'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              setNotice('')
              try {
                await refresh()
                if (user?.verified) navigate(target, { replace: true })
                else setNotice("Still not verified. Open the link we emailed you, then tap 'I've verified'.")
              } finally {
                setBusy(false)
              }
            }}
          >
            I&apos;ve verified
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/login" className="btn btn-secondary">
            Back to login
          </Link>
          <Link to="/stalls" className="btn btn-secondary">
            Explore stalls
          </Link>
        </div>
      </div>
    </div>
  )
}
