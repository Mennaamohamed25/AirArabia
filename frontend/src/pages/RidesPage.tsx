import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../api/auth'
import { api } from '../api/client'
import type { Ride, RideStatus } from '../api/types'
import { dateTime, km, money } from '../lib/format'
import { Alert, Empty, errorText, Flag, PageHeader, Spinner, StatusBadge, useLoad } from '../components/ui'
import { Icon } from '../components/icons'

export function RideCard({ ride, showDriver }: { ride: Ride; showDriver: boolean }) {
  const { t } = useTranslation()
  return (
    <Link to={`/rides/${ride.id}`} data-testid="ride-card"
      className="card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name="route" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">#{ride.id}</span>
          {showDriver && <span className="font-semibold text-slate-700">{ride.driverName}</span>}
          <StatusBadge status={ride.status} />
          {ride.mismatchFlag && <Flag>{t('ride.mismatch')}</Flag>}
          {ride.gapFlag && <Flag>{t('ride.gap')}</Flag>}
        </div>
        <div className="mt-1 truncate text-sm text-slate-500">{ride.purpose ?? dateTime(ride.startedAt)}</div>
        <div className="mt-0.5 text-xs text-slate-400">{dateTime(ride.startedAt)} · {km(ride.paidKm)}</div>
      </div>
      <div className="text-end">
        <div className="text-lg font-extrabold tabular-nums">{money(ride.total)}</div>
        <Icon name="chevron" className="ms-auto size-4 text-slate-300 group-hover:text-brand-600 rtl:rotate-180" />
      </div>
    </Link>
  )
}

const FILTERS: (RideStatus | '')[] = ['', 'InProgress', 'Stopped', 'Pending', 'Approved', 'Rejected', 'Paid']

export default function RidesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [status, setStatus] = useState<RideStatus | ''>('')
  const { data, error, loading } = useLoad(() => api<Ride[]>(`/api/rides${status ? `?status=${status}` : ''}`), [status])
  const isDriver = user?.role === 'Driver'

  return (
    <div>
      <PageHeader title={isDriver ? t('rides.mine') : t('rides.title')} />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f || 'all'} onClick={() => setStatus(f)}
            className={`tab shrink-0 ${status === f ? 'tab-active' : 'bg-white ring-1 ring-slate-200'}`}>
            {f ? t(`status.${f}`) : t('rides.filterAll')}
          </button>
        ))}
      </div>
      {error ? <Alert>{errorText(error, t('common.error'))}</Alert> : null}
      {loading ? <Spinner /> : data?.length ? (
        <div className="grid gap-3">{data.map((r) => <RideCard key={r.id} ride={r} showDriver={!isDriver} />)}</div>
      ) : <Empty>{t('rides.empty')}</Empty>}
    </div>
  )
}

export function ApprovalsPage() {
  const { t } = useTranslation()
  const { data, error, loading } = useLoad(() => api<Ride[]>('/api/rides?status=Pending'), [])
  return (
    <div>
      <PageHeader title={t('approvals.title')} />
      {error ? <Alert>{errorText(error, t('common.error'))}</Alert> : null}
      {loading ? <Spinner /> : data?.length ? (
        <div className="grid gap-3">{data.map((r) => <RideCard key={r.id} ride={r} showDriver />)}</div>
      ) : <Empty>{t('approvals.empty')}</Empty>}
    </div>
  )
}
