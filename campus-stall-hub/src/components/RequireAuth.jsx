import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context.js'

export default function RequireAuth({ children, requireVerified = false }) {
  const location = useLocation()
  const { status, user } = useAuth()

  if (status !== 'ready') {
    return (
      <div className="frame mx-auto max-w-xl p-6">
        <div className="text-sm font-extrabold text-slate-900">Loading...</div>
        <p className="mt-2 text-sm text-slate-600">Checking your session.</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requireVerified && !user.verified) {
    return <Navigate to="/verify-account" replace state={{ from: location }} />
  }

  return children
}
