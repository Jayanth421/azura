import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminFetch, loadAdminToken, saveAdminToken } from '../lib/admin.js'

export default function Admin() {
  const [token, setToken] = useState(() => loadAdminToken())
  const [overview, setOverview] = useState(null)
  const [traffic, setTraffic] = useState([])
  const [testEmail, setTestEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const canLoad = useMemo(() => Boolean(token.trim()), [token])

  const loadAll = useCallback(async () => {
    if (!canLoad) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const [overviewRes, trafficRes] = await Promise.all([
        adminFetch('/api/admin/overview', token),
        adminFetch('/api/admin/traffic', token),
      ])
      setOverview(overviewRes?.stats ?? null)
      setTraffic(Array.isArray(trafficRes?.routes) ? trafficRes.routes : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data.')
    } finally {
      setBusy(false)
    }
  }, [canLoad, token])

  useEffect(() => {
    if (canLoad) {
      void loadAll()
    }
  }, [canLoad, loadAll])

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Admin Control Room</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage mailing, review traffic, and keep Azera running smoothly.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void loadAll()}
          disabled={busy || !canLoad}
        >
          Refresh
        </button>
      </div>

      <div className="frame p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Admin token</label>
            <input
              className="input mt-2"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onBlur={() => saveAdminToken(token.trim())}
              placeholder="Paste ADMIN_TOKEN from server/.env"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={() => {
                saveAdminToken(token.trim())
                void loadAll()
              }}
              disabled={busy || !canLoad}
            >
              Save & Load
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="frame p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-xl font-extrabold text-slate-900">Mailing Console</h2>
          <p className="mt-1 text-sm text-slate-600">
            Send a test email to confirm SMTP delivery.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">Test email</label>
              <input
                className="input mt-2"
                placeholder="admin@college.edu"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={busy || !canLoad}
                onClick={async () => {
                  setBusy(true)
                  setError('')
                  setNotice('')
                  try {
                    await adminFetch('/api/admin/send-test', token, {
                      method: 'POST',
                      body: { to: testEmail },
                    })
                    setNotice('Test email queued.')
                    setTestEmail('')
                    void loadAll()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to send test email.')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Send Test
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            SMTP-only mode enabled. Use the test email to validate delivery.
          </div>
        </section>

        <section className="space-y-6">
          <div className="frame p-5 sm:p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Live Stats</h2>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Users</span>
                <span className="font-extrabold text-slate-900">{overview?.users ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Stalls</span>
                <span className="font-extrabold text-slate-900">{overview?.stalls ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Sessions</span>
                <span className="font-extrabold text-slate-900">{overview?.sessions ?? '-'}</span>
              </div>
            </div>
          </div>

          <div className="frame p-5 sm:p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Traffic</h2>
            <p className="mt-1 text-xs text-slate-500">
              Since server boot. Refresh to update.
            </p>
            <div className="mt-4 space-y-2">
              {traffic.length === 0 ? (
                <p className="text-sm font-semibold text-slate-600">No traffic yet.</p>
              ) : (
                traffic.slice(0, 8).map((row) => (
                  <div
                    key={row.route}
                    className="flex items-center justify-between text-sm font-semibold text-slate-700"
                  >
                    <span className="truncate">{row.route}</span>
                    <span className="font-extrabold text-slate-900">{row.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
