import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { RideStatus } from '../api/types'
import { ApiError } from '../api/client'
import { Icon, type IconName } from './icons'

const statusStyle: Record<RideStatus, string> = {
  InProgress: 'bg-brand-50 text-brand-700 ring-brand-200',
  Stopped: 'bg-amber-50 text-amber-700 ring-amber-200',
  Pending: 'bg-sky-50 text-sky-700 ring-sky-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected: 'bg-slate-100 text-slate-600 ring-slate-200',
  Paid: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function StatusBadge({ status }: { status: RideStatus }) {
  const { t } = useTranslation()
  return (
    <span data-testid="status" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle[status]}`}>
      {status === 'InProgress' && <span className="size-1.5 animate-pulse rounded-full bg-brand-600" />}
      {t(`status.${status}`)}
    </span>
  )
}

export function Flag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
      <Icon name="alert" className="size-3.5" />
      {children}
    </span>
  )
}

export function Stat({ label, value, icon, accent }: { label: string; value: ReactNode; icon?: IconName; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? 'bg-brand-600 text-white' : 'bg-slate-50'}`}>
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${accent ? 'text-white/80' : 'text-slate-500'}`}>
        {icon && <Icon name={icon} className="size-4" />}
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold tabular-nums">{value}</div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'warn' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'bg-brand-50 text-brand-800 ring-brand-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    warn: 'bg-amber-50 text-amber-800 ring-amber-200',
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
  }
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium ring-1 ${styles[kind]}`}>
      <Icon name={kind === 'success' ? 'check' : 'alert'} className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border-2 border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500">{children}</div>
}

export function Spinner() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="size-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      {t('common.loading')}
    </div>
  )
}

export function errorText(e: unknown, fallback: string) {
  return e instanceof ApiError || e instanceof Error ? e.message || fallback : fallback
}

/** Loads data with loading/error state and a reload function. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps)
  const reload = useCallback(async () => {
    try {
      setData(await load())
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [load])
  useEffect(() => {
    setLoading(true)
    void reload()
  }, [reload])
  return { data, error, loading, reload, setData }
}
