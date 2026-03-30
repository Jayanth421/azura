import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getPasswordIssues } from '../lib/auth.js'
import { useAuth } from '../lib/auth-context.js'

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setNewPassword } = useAuth()

  const token = useMemo(() => new URLSearchParams(location.search).get('token') ?? '', [location.search])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Missing reset token.')
      return
    }

    const issues = getPasswordIssues(password)
    if (issues.length > 0) {
      setError(issues[0])
      return
    }

    if (!confirmPassword || confirmPassword !== password) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const result = await setNewPassword({ token, password })
      if (!result?.ok) {
        setError(result?.error || 'Reset failed.')
        return
      }
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Set a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Create a strong password to secure your account.</p>
      </div>

      <div className="frame p-6">
        {done ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
              Password updated successfully.
            </div>
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => navigate('/login', { replace: true })}
            >
              Go to login
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-700" htmlFor="reset-pass">
                  New password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  className="text-xs font-extrabold text-slate-600 hover:text-slate-900"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={busy}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="reset-pass"
                className="input mt-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={busy}
              />
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Minimum 8 characters, with letters and numbers.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700" htmlFor="reset-confirm">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <input
                id="reset-confirm"
                className="input mt-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={busy}
              />
            </div>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Saving...' : 'Update password'}
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
