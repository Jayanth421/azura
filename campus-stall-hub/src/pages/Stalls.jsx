import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StallCard from '../components/StallCard.jsx'
import { STALL_CATEGORIES, STALL_DEPARTMENTS, fetchStalls } from '../lib/stalls.js'

export default function Stalls() {
  const [stalls, setStalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? 'All'
  const department = searchParams.get('department') ?? 'All'
  const categories = useMemo(() => ['All', ...STALL_CATEGORIES], [])
  const departments = useMemo(() => ['All', ...STALL_DEPARTMENTS], [])

  function updateParams({ q, category: nextCategory, department: nextDepartment }) {
    const params = new URLSearchParams(searchParams)
    const nextQuery = q !== undefined ? String(q) : query
    const nextCat = nextCategory !== undefined ? String(nextCategory) : category
    const nextDept = nextDepartment !== undefined ? String(nextDepartment) : department

    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    else params.delete('q')

    if (nextCat && nextCat !== 'All') params.set('category', nextCat)
    else params.delete('category')

    if (nextDept && nextDept !== 'All') params.set('department', nextDept)
    else params.delete('department')

    setSearchParams(params, { replace: true })
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const rows = await fetchStalls({ q: query, category, department })
        if (cancelled) return
        setStalls(Array.isArray(rows) ? rows : [])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load stalls.')
        setStalls([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [query, category, department])

  const hasFilters = Boolean(query.trim()) || category !== 'All' || department !== 'All'

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Explore Stalls</h1>
          <p className="mt-1 text-sm text-slate-600">
            Search and filter stalls in a modern card/grid layout.
          </p>
        </div>
        <Link to="/add" className="btn btn-primary">
          Add Your Stall
        </Link>
      </div>


          <div className="mt-4 space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => {
                const active = c === category
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateParams({ category: c })}
                    className={['chip shrink-0', active ? 'chip-active' : ''].join(' ')}
                  >
                    {c}
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {departments.map((d) => {
                const active = d === department
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => updateParams({ department: d })}
                    className={['chip shrink-0', active ? 'chip-active' : ''].join(' ')}
                  >
                    {d}
                  </button>
                )
              })}

              {hasFilters ? (
                <button
                  type="button"
                  className="chip shrink-0"
                  onClick={() => setSearchParams({}, { replace: true })}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-600">
              Showing{' '}
              <span className="font-extrabold text-slate-900">{stalls.length}</span>{' '}
              stall{stalls.length === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-slate-500">Saved to the database.</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="frame p-6">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="frame p-8 text-center">
          <h2 className="text-xl font-extrabold text-slate-900">Loading stalls...</h2>
          <p className="mt-2 text-sm text-slate-600">Fetching the latest from the server.</p>
        </div>
      ) : stalls.length === 0 ? (
        <div className="frame p-8 text-center">
          <h2 className="text-xl font-extrabold text-slate-900">No stalls found</h2>
          <p className="mt-2 text-sm text-slate-600">
            Try a different search or add the first stall for your campus.
          </p>
          <Link to="/add" className="btn btn-primary mt-6">
            Add Your Stall
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stalls.map((stall) => (
            <StallCard key={stall.id} stall={stall} />
          ))}
        </div>
      )}
    </div>
  )
}
