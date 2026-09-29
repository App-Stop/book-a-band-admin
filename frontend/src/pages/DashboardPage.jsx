import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  CalendarClock,
  Wallet,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  Landmark,
} from 'lucide-react'
import { AdminLayout } from '../components/layout'
import { Card, StatCard, ErrorState, Spinner } from '../components/ui'
import { DashboardAPI } from '../lib/api'
import { formatCurrency, formatNumber } from '../lib/formatters'

const SECTIONS = [
  { key: 'users', label: 'Total Users', icon: Users, accent: 'brand', to: '/users' },
  { key: 'bookings', label: 'Total Bookings', icon: CalendarClock, accent: 'accent', to: '/bookings' },
  { key: 'payouts', label: 'Total Payouts', icon: Wallet, accent: 'success', to: '/payouts' },
  { key: 'openRequests', label: 'Open Requests', icon: Inbox, accent: 'warning', to: '/open-requests' },
  { key: 'openDisputes', label: 'Open Disputes', icon: ShieldAlert, accent: 'warning', to: '/disputes' },
  { key: 'pendingReports', label: 'Pending Reports', icon: ShieldCheck, accent: 'info', to: '/moderation' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    DashboardAPI.summary()
      .then((res) => {
        if (!cancelled) setSummary(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load dashboard data.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = summary?.counts
  const revenue = summary?.revenue
  const escrow = summary?.escrow

  return (
    <AdminLayout title="Dashboard" description="Platform overview at a glance">
      {loading && !summary && (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {error && !summary && <ErrorState message={error} />}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SECTIONS.map((s) => (
              <button key={s.key} type="button" onClick={() => navigate(s.to)} className="text-left">
                <StatCard icon={s.icon} label={s.label} value={formatNumber(counts?.[s.key])} accent={s.accent} />
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success-400" />
                <h3 className="text-sm font-semibold text-slate-200">Platform revenue</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Metric label="All time" value={formatCurrency(revenue?.platformRevenueAllTime)} />
                <Metric label="This month" value={formatCurrency(revenue?.platformRevenueThisMonth)} />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Realized revenue: platform fee on payouts that have actually transferred to a band.
              </p>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-warning-400" />
                <h3 className="text-sm font-semibold text-slate-200">Escrow</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Metric
                  label="Owed to bands"
                  value={formatCurrency(escrow?.owedToBands?.amount)}
                  hint={`${formatNumber(escrow?.owedToBands?.payoutCount)} payouts`}
                />
                <Metric
                  label="Held for upcoming events"
                  value={formatCurrency(escrow?.heldForUpcomingEvents?.amount)}
                  hint={`${formatNumber(escrow?.heldForUpcomingEvents?.paymentCount)} payments`}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Money already collected for bookings that haven&apos;t completed yet.
              </p>
            </Card>
          </div>

          <Card className="mt-6 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">Quick actions</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Review open requests', to: '/open-requests', icon: Inbox },
                { label: 'Check failed payouts', to: '/payouts', icon: Wallet },
                { label: 'Triage open disputes', to: '/disputes', icon: ShieldAlert },
                { label: 'Moderate reports & support', to: '/moderation', icon: ShieldCheck },
                { label: 'Look up users & bands', to: '/users', icon: Users },
                { label: 'View platform config', to: '/config', icon: ShieldCheck },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className="focus-ring flex items-center justify-between gap-2 rounded-xl border border-slate-900/8 bg-slate-900/[0.02] px-4 py-3 text-left text-sm text-slate-300 transition hover:border-brand-500/40 hover:bg-slate-900/[0.05] hover:text-slate-900"
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

function Metric({ label, value, hint }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
