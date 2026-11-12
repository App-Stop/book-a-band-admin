import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BadgesAPI } from '../lib/api'

const BADGE_SECTIONS = ['booking', 'open_request', 'dispute', 'moderation', 'payout', 'users']

const PATH_SECTION = {
  '/users': 'users',
  '/bookings': 'booking',
  '/open-requests': 'open_request',
  '/disputes': 'dispute',
  '/moderation': 'moderation',
  '/payouts': 'payout',
}

const EMPTY = Object.fromEntries(BADGE_SECTIONS.map((s) => [s, 0]))
const POLL_MS = 60_000

const BadgesContext = createContext({ groups: EMPTY, total: 0 })

/**
 * Sidebar badge counts (unread events per section). Polled every minute and on window focus;
 * a section's badge clears for this admin as soon as they are on that section's page.
 */
export function BadgesProvider({ children }) {
  const [groups, setGroups] = useState(EMPTY)
  const { pathname } = useLocation()
  const section = PATH_SECTION[pathname] || null
  const clearing = useRef(false)

  const refresh = useCallback(() => {
    BadgesAPI.counts()
      .then((res) => setGroups({ ...EMPTY, ...(res.data?.groups || {}) }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  const count = section ? groups[section] : 0
  useEffect(() => {
    if (!section || count <= 0 || clearing.current) return
    clearing.current = true
    setGroups((g) => ({ ...g, [section]: 0 }))
    BadgesAPI.markRead(section)
      .catch(() => {})
      .finally(() => {
        clearing.current = false
      })
  }, [section, count])

  const value = useMemo(() => ({ groups, total: Object.values(groups).reduce((a, b) => a + b, 0) }), [groups])

  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBadges() {
  return useContext(BadgesContext)
}
