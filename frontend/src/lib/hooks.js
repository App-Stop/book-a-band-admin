import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

/**
 * Keeps a detail drawer's open/closed state in the URL (`?open=<id>`) so the browser Back
 * button closes the drawer instead of leaving the page. Opening pushes a history entry;
 * closing pops it (or just strips the param when the page was loaded with it already set).
 */
export function useOpenParam(key = 'open') {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const value = searchParams.get(key)
  const pushed = Boolean(location.state?.[`${key}Pushed`])

  const open = useCallback(
    (id) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set(key, id)
          return next
        },
        { state: { [`${key}Pushed`]: true } },
      )
    },
    [key, setSearchParams],
  )

  const close = useCallback(() => {
    if (pushed) {
      navigate(-1)
      return
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(key)
        return next
      },
      { replace: true },
    )
  }, [key, navigate, pushed, setSearchParams])

  return [value, open, close]
}

/** Client-side paging for lists the API returns in full (e.g. the arrays inside a user detail). */
export function usePagedList(items, limit = 10) {
  const [page, setPage] = useState(1)
  const list = items || []
  const totalPages = Math.max(1, Math.ceil(list.length / limit))
  const current = Math.min(page, totalPages)
  return {
    rows: list.slice((current - 1) * limit, current * limit),
    pagination: { page: current, totalPages, total: list.length, limit, onPageChange: setPage },
  }
}

/**
 * Filters and page number kept in the URL query string, so they survive Back/Forward and reloads.
 * `defaults` must be a stable object (declare it at module level). Use `prefix` when two lists
 * share one page. Filter changes replace the history entry; page changes push one.
 */
export function useListParams(defaults, prefix = '') {
  const [searchParams, setSearchParams] = useSearchParams()
  const pageKey = `${prefix}page`
  const keys = Object.keys(defaults)

  const serialized = JSON.stringify(keys.map((k) => searchParams.get(prefix + k)))
  const filters = useMemo(() => {
    const values = JSON.parse(serialized)
    return Object.fromEntries(keys.map((k, i) => [k, values[i] ?? defaults[k]]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized])
  const page = Math.max(1, parseInt(searchParams.get(pageKey), 10) || 1)

  const setPage = useCallback(
    (p) =>
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (p > 1) next.set(pageKey, String(p))
        else next.delete(pageKey)
        return next
      }),
    [pageKey, setSearchParams],
  )

  const updateFilter = useCallback(
    (key, value) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(prefix + key, value)
          else next.delete(prefix + key)
          next.delete(pageKey)
          return next
        },
        { replace: true },
      ),
    [prefix, pageKey, setSearchParams],
  )

  const clearFilters = useCallback(
    () =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          Object.keys(defaults).forEach((k) => next.delete(prefix + k))
          next.delete(pageKey)
          return next
        },
        { replace: true },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prefix, pageKey, setSearchParams],
  )

  return { filters, page, setPage, updateFilter, clearFilters }
}
