import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getPasswordIssues, isValidEmail } from '../lib/auth.js'
import { useAuth } from '../lib/auth-context.js'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, user, signIn, signOut, signUp } = useAuth()
  const [mode, setMode] = useState('signin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function goNext() {
    const target = location.state?.from?.pathname || '/add'
    navigate(target, { replace: true })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (mode === 'signup') {
      const issues = getPasswordIssues(password)
      if (issues.length > 0) {
        setError(issues[0])
        return
      }

      if (!confirmPassword || confirmPassword !== password) {
        setError('Passwords do not match.')
        return
      }
    } else if (!password) {
      setError('Please enter your password.')
      return
    }

    setBusy(true)
    try {
      const result =
        mode === 'signup'
          ? await signUp({ email, password, remember })
          : await signIn({ email, password, remember })

      if (!result?.ok) {
        setError(result?.error || 'Login failed. Please try again.')
        return
      }

      if (result.needsVerification) {
        navigate('/verify-account', {
          replace: true,
          state: { from: location, mailFailed: Boolean(result.mailFailed) },
        })
        if (result.mailFailed) {
          setError('Account created, but the verification email failed. Ask admin to resend.')
        }
        return
      }

      goNext()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Login</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign in to post your stall and manage your listings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card-outer group bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-600 lg:col-span-2">
          <div className="relative overflow-hidden rounded-2xl bg-white/10 p-6 text-white ring-1 ring-white/15">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/25" />
            <div className="absolute bottom-6 right-6 h-12 w-12 rotate-12 rounded-2xl bg-white/15" />
            <div className="relative">
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold ring-1 ring-white/20">
                Secure access
              </span>
              <h2 className="mt-3 text-xl font-extrabold tracking-tight">Post with trust</h2>
              <p className="mt-2 text-sm text-white/90">
                Your account email is attached to your stall so others can contact you.
              </p>
              <ul className="mt-5 space-y-2 text-sm font-semibold text-white/95">
                <li>- Browse stalls without login</li>
                <li>- Login only needed to add stalls</li>
                <li>- Mobile-first experience</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card-outer-static bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-600 lg:col-span-3">
          <div className="card-inner p-6 sm:p-8">
            {status !== 'ready' ? (
              <div className="space-y-3">
                <div className="text-sm font-extrabold text-slate-900">Loading...</div>
                <p className="text-sm text-slate-600">Checking your session.</p>
              </div>
            ) : user ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-700">Logged in as</p>
                  <p className="mt-1 break-all text-base font-extrabold text-slate-900">
                    {user.email}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link to="/add" className="btn btn-primary">
                    Continue to Add Stall
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      void signOut()
                      setEmail('')
                      setPassword('')
                      setConfirmPassword('')
                      setError('')
                    }}
                  >
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="flex gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200">
                  <button
                    type="button"
                    className={[
                      'flex-1 rounded-xl px-3 py-2 text-sm font-extrabold transition duration-300',
                      mode === 'signin'
                        ? 'bg-white text-slate-900 shadow ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900',
                    ].join(' ')}
                    onClick={() => {
                      setMode('signin')
                      setError('')
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className={[
                      'flex-1 rounded-xl px-3 py-2 text-sm font-extrabold transition duration-300',
                      mode === 'signup'
                        ? 'bg-white text-slate-900 shadow ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900',
                    ].join(' ')}
                    onClick={() => {
                      setMode('signup')
                      setError('')
                    }}
                  >
                    Create account
                  </button>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700" htmlFor="login-email">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="login-email"
                    className="input mt-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    inputMode="email"
                    autoComplete="email"
                    disabled={busy}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label
                      className="text-sm font-semibold text-slate-700"
                      htmlFor="login-password"
                    >
                      Password <span className="text-red-500">*</span>
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
                    id="login-password"
                    className="input mt-2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Create a strong password' : 'Your password'}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    disabled={busy}
                  />
                  {mode === 'signup' ? (
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Minimum 8 characters, with letters and numbers.
                    </p>
                  ) : null}
                </div>

                {mode === 'signup' ? (
                  <div>
                    <label
                      className="text-sm font-semibold text-slate-700"
                      htmlFor="login-confirm"
                    >
                      Confirm password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="login-confirm"
                      className="input mt-2"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={busy}
                    />
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      disabled={busy}
                    />
                    Remember me
                  </label>
                  <div className="flex items-center gap-4">
                    {mode === 'signin' ? (
                      <Link
                        to="/forgot"
                        className="text-sm font-extrabold text-blue-700 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    ) : null}
                    <Link to="/" className="text-sm font-extrabold text-blue-700 hover:underline">
                      Back Home
                    </Link>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                  {busy
                    ? 'Please wait...'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Sign in'}
                </button>

                {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
