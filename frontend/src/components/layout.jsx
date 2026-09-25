import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Wallet,
  Inbox,
  MessagesSquare,
  Package,
  LifeBuoy,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Flag,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/formatters'
import { IconButton } from './ui'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users & Bands', icon: Users },
  { to: '/bookings', label: 'Bookings', icon: CalendarClock },
  { to: '/payouts', label: 'Payouts', icon: Wallet },
  { to: '/open-requests', label: 'Open Requests', icon: Inbox },
  { to: '/posts', label: 'Posts & Comments', icon: MessagesSquare },
  { to: '/reports', label: 'Reports', icon: Flag },
  { to: '/band-packages', label: 'Band Packages', icon: Package },
  { to: '/support-messages', label: 'Support', icon: LifeBuoy },
  { to: '/analytics', label: 'Band Analytics', icon: BarChart3 },
  { to: '/config', label: 'Platform Config', icon: Settings },
]

function NavList({ onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'brand-gradient text-white shadow-lg shadow-brand-600/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
            )
          }
        >
          <item.icon className="h-4.5 w-4.5 shrink-0" />
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-lg shadow-brand-600/30">
        <img src="/Vector.png" alt="" className="h-5 w-5 object-contain" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-tight text-white">BookABand</p>
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-brand-300/80">Admin Console</p>
      </div>
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="border-t border-white/8 p-3">
      <div className="glass-card flex items-center gap-3 rounded-xl p-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-semibold text-white">
          {initials(user?.fullName || user?.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">{user?.fullName || 'Admin'}</p>
          <p className="truncate text-xs text-slate-500">{user?.email || ''}</p>
        </div>
        <IconButton
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          title="Sign out"
          className="hover:text-danger-400"
        >
          <LogOut className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}

export function AdminLayout({ children, title, description, actions }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="app-shell-bg flex min-h-screen w-full text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/8 lg:flex">
        <Brand />
        <NavList />
        <UserMenu />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="glass-panel relative z-10 flex h-full w-72 max-w-[80%] flex-col">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <IconButton onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <NavList onNavigate={() => setMobileOpen(false)} />
            <UserMenu />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/8 bg-ink-950/70 px-4 py-4 backdrop-blur-xl sm:px-6">
          <IconButton className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">{title}</h1>
            {description && <p className="truncate text-xs text-slate-400 sm:text-sm">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  )
}
