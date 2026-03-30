import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context.js'

export default function VerifyEmail() {
  const location = useLocation()
  const { verifyEmail } = useAuth()

  const token = new URLSearchParams(location.search).get('token') ?? ''

  const [state, setState] = useState({ status: 'idle', error: '' })

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!token) {
        setState({ status: 'error', error: 'Missing verification token.' })
        return
      }

      setState({ status: 'loading', error: '' })
      const result = await verifyEmail(token)
      if (cancelled) return

      if (!result?.ok) {
        setState({ status: 'error', error: result?.error || 'Verification failed.' })
        return
      }

      setState({ status: 'success', error: '' })
    }

    run()
    return () => {
      cancelled = true
    }
  }, [token, verifyEmail])

  return (
    <div className="frame mx-auto max-w-2xl p-8 text-center animate-fade-up">
      {state.status === 'loading' ? (
        <>
          <h1 className="text-2xl font-extrabold text-slate-900">Verifying...</h1>
          <p className="mt-2 text-sm text-slate-600">Please wait.</p>
        </>
      ) : null}

      {state.status === 'success' ? (
        <>
          <h1 className="text-2xl font-extrabold text-slate-900">Email verified</h1>
          <p className="mt-2 text-sm text-slate-600">You can post and manage stalls now.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link to="/add" className="btn btn-primary">
              Add a stall
            </Link>
            <Link to="/stalls" className="btn btn-secondary">
              Explore stalls
            </Link>
          </div>
        </>
      ) : null}

      {state.status === 'error' ? (
        <>
          <h1 className="text-2xl font-extrabold text-slate-900">Verification failed</h1>
          <p className="mt-2 text-sm font-semibold text-red-700">{state.error}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link to="/verify-account" className="btn btn-primary">
              Try again
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Login
            </Link>
          </div>
        </>
      ) : null}

      {state.status === 'idle' ? (
        <>
          <h1 className="text-2xl font-extrabold text-slate-900">Verify email</h1>
          <p className="mt-2 text-sm text-slate-600">
            Open the verification link from your email to continue.
          </p>
        </>
      ) : null}
    </div>
  )
}
