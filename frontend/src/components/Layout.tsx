import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../api/auth'
import { api } from '../api/client'
import type { Role } from '../api/types'
import { setLanguage } from '../i18n'
import { Icon, type IconName } from './icons'
import Logo from './Logo'
import { AlertBell, AlertToasts, useRideAlerts } from './RideAlerts'

const NAV: Record<Role, { to: string; label: string; icon: IconName }[]> = {
  Driver: [
    { to: '/driver', label: 'nav.home', icon: 'home' },
    { to: '/rides', label: 'nav.myRides', icon: 'list' },
    { to: '/monthly', label: 'nav.statement', icon: 'wallet' },
  ],
  Manager: [
    { to: '/approvals', label: 'nav.approvals', icon: 'check' },
    { to: '/dashboard', label: 'nav.dashboard', icon: 'radar' },
    { to: '/rides', label: 'nav.rides', icon: 'list' },
  ],
  HR: [
    { to: '/dashboard', label: 'nav.dashboard', icon: 'radar' },
    { to: '/rides', label: 'nav.rides', icon: 'list' },
    { to: '/monthly', label: 'nav.monthly', icon: 'wallet' },
    { to: '/admin', label: 'nav.admin', icon: 'settings' },
  ],
}

export function Brand({ light = false }: { light?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3" dir="ltr">
      <Logo white={light} className={light ? 'h-9' : 'h-6 sm:h-7'} />
      <span className={`h-6 w-px ${light ? 'bg-white/40' : 'bg-slate-300'}`} />
      <span className={`whitespace-nowrap text-sm font-bold ${light ? 'text-white' : 'text-slate-600'}`}>{t('app.name')}</span>
    </div>
  )
}

export function LanguageToggle({ light = false }: { light?: boolean }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const toggle = () => {
    const next = i18n.language === 'ar' ? 'en' : 'ar'
    setLanguage(next)
    if (user) void api('/api/auth/me/language', { method: 'PUT', json: { language: next } }).catch(() => {})
  }
  return (
    <button onClick={toggle} data-testid="lang-toggle"
      className={`btn px-3 ${light ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-slate-100 text-ink hover:bg-slate-200'}`}>
      <Icon name="globe" className="size-4" />
      {t('common.language')}
    </button>
  )
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export default function Layout() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const online = useOnline()
  // HR and managers get live start/stop alerts on every page.
  const watches = user?.role === 'HR' || user?.role === 'Manager'
  const alerts = useRideAlerts(watches)
  if (!user) return null
  const items = NAV[user.role]

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="sticky top-0 z-[1000] border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-3 py-2 sm:px-5">
          <Brand />
          <nav className="hidden items-center gap-1 rounded-full bg-slate-100 p-1 md:flex">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}>
                {t(i.label)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {watches && <AlertBell on={alerts.soundOn} onToggle={alerts.toggleSound} />}
            <LanguageToggle />
            <div className="hidden text-end text-xs leading-tight sm:block">
              <div className="font-bold" data-testid="user-name">{user.fullName}</div>
              <div className="text-slate-500">{user.role}</div>
            </div>
            <button onClick={logout} className="btn bg-slate-100 px-3 hover:bg-slate-200" title={t('nav.logout')} data-testid="logout">
              <Icon name="logout" className="size-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
        {!online && <div className="bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-800">{t('common.offline')}</div>}
      </header>

      <main className="mx-auto max-w-[1800px] px-3 py-4 sm:px-5 sm:py-5">
        <Outlet />
      </main>
      <AlertToasts toasts={alerts.toasts} onDismiss={alerts.dismiss} />

      <nav className="fixed inset-x-0 bottom-0 z-[1000] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((i) => (
            <NavLink key={i.to} to={i.to}
              className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>
              <Icon name={i.icon} className="size-5" />
              {t(i.label)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
