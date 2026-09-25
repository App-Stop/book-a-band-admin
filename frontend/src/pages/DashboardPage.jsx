import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  CalendarClock,
  Wallet,
  Inbox,
  MessagesSquare,
  Package,
  LifeBuoy,
  ArrowUpRight,
} from 'lucide-react'
import { AdminLayout } from '../components/layout'
import { Card, StatCard, ErrorState, Spinner } from '../components/ui'
import { BandPackagesAPI, BookingsAPI, OpenRequestsAPI, PayoutsAPI, PostsAPI, SupportMessagesAPI, UsersAPI } from '../lib/api'
import { formatNumber } from '../lib/formatters'

const SECTIONS = [
  { key: 'users', label: 'Total Users', icon: Users, accent: 'brand', to: '/users' },
  { key: 'bookings', label: 'Total Bookings', icon: CalendarClock, accent: 'accent', to: '/bookings' },
  { key: 'payouts', label: 'Total Payouts', icon: Wallet, accent: 'success', to: '/payouts' },
  { key: 'openRequests', label: 'Open Requests', icon: Inbox, accent: 'warning', to: '/open-requests' },
  { key: 'posts', label: 'Total Posts', icon: MessagesSquare, accent: 'info', to: '/posts' },
  { key: 'bandPackages', label: 'Band Packages', icon: Package, accent: 'brand', to: '/band-packages' },
  { key: 'supportMessages', label: 'Support Messages', icon: LifeBuoy, accent: 'accent', to: '/support-messages' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [users, bookings, payouts, openRequests, posts, bandPackages, supportMessages] = await Promise.all([
          UsersAPI.list({ limit: 1 }),
          BookingsAPI.list({ limit: 1 }),
          PayoutsAPI.list({ limit: 1 }),
          OpenRequestsAPI.list({ limit: 1 }),
          PostsAPI.list({ limit: 1 }),
          BandPackagesAPI.list({ limit: 1 }),
          SupportMessagesAPI.list({ limit: 1 }),
        ])
        if (cancelled) return
        setCounts({
          users: users?.data?.pagination?.total ?? 0,
          bookings: bookings?.data?.pagination?.total ?? 0,
          payouts: payouts?.data?.pagination?.total ?? 0,
          openRequests: openRequests?.data?.pagination?.total ?? 0,
          posts: posts?.data?.pagination?.total ?? 0,
          bandPackages: bandPackages?.data?.pagination?.total ?? 0,
          supportMessages: supportMessages?.data?.pagination?.total ?? 0,
        })
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load dashboard data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AdminLayout title="Dashboard" description="Platform overview at a glance">
      {loading && !counts && (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {error && !counts && <ErrorState message={error} />}

      {counts && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SECTIONS.map((s) => (
              <button key={s.key} type="button" onClick={() => navigate(s.to)} className="text-left">
                <StatCard icon={s.icon} label={s.label} value={formatNumber(counts[s.key])} accent={s.accent} />
              </button>
            ))}
          </div>

          <Card className="mt-6 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">Quick actions</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Review open requests', to: '/open-requests', icon: Inbox },
                { label: 'Check failed payouts', to: '/payouts', icon: Wallet },
                { label: 'Moderate flagged posts', to: '/posts', icon: MessagesSquare },
                { label: 'Respond to support', to: '/support-messages', icon: LifeBuoy },
                { label: 'Look up band analytics', to: '/analytics', icon: Users },
                { label: 'View platform config', to: '/config', icon: Package },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className="focus-ring flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left text-sm text-slate-300 transition hover:border-brand-500/40 hover:bg-white/[0.05] hover:text-white"
                >
                  <span className="flex items-center gap-2.5">
                    <action.icon className="h-4 w-4 text-brand-400" />
                    {action.label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-500" />
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </AdminLayout>
  )
}
