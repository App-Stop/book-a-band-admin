import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Wallet,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/formatters'
import { IconButton } from './ui'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Users & Bands', icon: Users },
  { to: '/bookings', label: 'Bookings', icon: CalendarClock },
  { to: '/disputes', label: 'Disputes', icon: ShieldAlert },
  { to: '/open-requests', label: 'Open Requests', icon: Inbox },
  { to: '/moderation', label: 'Moderation', icon: ShieldCheck },
  { to: '/payouts', label: 'Payouts', icon: Wallet },
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
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-violet-200 hover:bg-white/10 hover:text-white',
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
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
        <img src="/Vector.png" alt="" className="h-5 w-5 object-contain" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-tight text-white">BookABand</p>
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-violet-300">Admin Console</p>
      </div>
    </div>
  )
}

function UserMenu({ onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="border-t border-white/10 p-3">
      <NavLink
        to="/config"
        onClick={onNavigate}
        className={({ isActive }) =>
          clsx(
            'focus-ring mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            isActive ? 'bg-white/15 text-white shadow-sm' : 'text-violet-200 hover:bg-white/10 hover:text-white',
          )
        }
      >
        <Settings className="h-4.5 w-4.5 shrink-0" />
        <span className="truncate">Settings</span>
      </NavLink>
      <div className="flex items-center gap-3 rounded-xl bg-white/10 p-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-violet-800">
          {initials(user?.fullName || user?.email)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user?.fullName || 'Admin'}</p>
          <p className="truncate text-xs text-violet-300">{user?.email || ''}</p>
        </div>
        <IconButton
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          title="Sign out"
          className="text-violet-200 hover:bg-white/10 hover:text-white"
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
    <div className="app-shell-bg flex h-screen w-full overflow-hidden text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 flex-col bg-[#4c1d95] lg:flex">
        <Brand />
        <NavList />
        <UserMenu />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex h-full w-72 max-w-[80%] flex-col bg-[#4c1d95] shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <IconButton className="text-violet-200 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <NavList onNavigate={() => setMobileOpen(false)} />
            <UserMenu onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="z-30 flex shrink-0 items-center gap-3 border-b border-slate-900/8 bg-ink-950/70 px-4 py-4 backdrop-blur-xl sm:px-6">
          <IconButton className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
            {description && <p className="truncate text-xs text-slate-400 sm:text-sm">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  )
}
