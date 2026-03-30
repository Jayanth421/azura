import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="frame mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-2xl font-extrabold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="btn btn-primary mt-6">
        Go Home
      </Link>
    </div>
  )
}
