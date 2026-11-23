import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, FolderTree, Inbox, LayoutDashboard, ListChecks, LogOut, Menu, Plus, Ticket, UserCircle, Users, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Avatar } from './ui'
import { cn } from '../utils/format'
import { ROLE_LABEL } from '../types'

interface NavItem {
  to: string
  label: string
  icon: typeof Inbox
  show: boolean
}

export default function Layout() {
  const { user, isStaff, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  if (!user) return null

  const work: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/my-tickets', label: 'My tickets', icon: Ticket, show: true },
    { to: '/assigned-tickets', label: 'Assigned to me', icon: ListChecks, show: isStaff },
    { to: '/tickets', label: 'All tickets', icon: Inbox, show: isStaff },
    { to: '/reports', label: 'Reports', icon: BarChart3, show: isStaff },
  ]
  const admin: NavItem[] = [
    { to: '/admin/users', label: 'Users', icon: Users, show: isAdmin },
    { to: '/admin/categories', label: 'Categories', icon: FolderTree, show: isAdmin },
  ]

  const renderItems = (items: NavItem[]) =>
    items
      .filter((i) => i.show)
      .map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
              isActive ? 'bg-ink-soft font-medium text-white' : 'text-ink-muted hover:bg-ink-soft/60 hover:text-white',
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))

  const sidebar = (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span aria-hidden className="grid h-7 w-7 place-items-center rounded bg-white/10">
          <span className="block h-3 w-3 rounded-sm bg-[#E5604D]" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">IT Help Desk</span>
      </div>

      <div className="px-3">
        <Link
          to="/tickets/new"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-2 rounded bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-white/90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New ticket
        </Link>
      </div>

      <nav aria-label="Main" className="mt-5 flex-1 space-y-0.5 overflow-y-auto px-3">
        {renderItems(work)}
        {isAdmin && <p className="px-3 pb-1 pt-5 text-xs font-medium text-ink-muted/80">Administration</p>}
        {renderItems(admin)}
      </nav>

      <div className="border-t border-ink-line px-3 py-3">
        <NavLink
          to="/profile"
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn('flex items-center gap-3 rounded px-3 py-2 hover:bg-ink-soft/60', isActive && 'bg-ink-soft')
          }
        >
          <Avatar name={user.fullName} className="bg-white/15" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.fullName}</span>
            <span className="block text-xs text-ink-muted">{ROLE_LABEL[user.role]}</span>
          </span>
          <UserCircle className="h-4 w-4 text-ink-muted" aria-hidden />
        </NavLink>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-ink-muted hover:bg-ink-soft/60 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 text-white lg:hidden">
        <span className="text-[15px] font-semibold">IT Help Desk</span>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded p-1.5 hover:bg-ink-soft">
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 rounded p-1 text-white hover:bg-ink-soft">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8" key={location.pathname.split('/')[1]}>
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
