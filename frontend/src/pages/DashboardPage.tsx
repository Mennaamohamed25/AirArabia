import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import type { Dashboard, DashRow } from '../api/types'
import { duration, km, money, time } from '../lib/format'
import RouteMap, { colorFor } from '../components/RouteMap'
import { Alert, errorText, Flag, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { Icon, type IconName } from '../components/icons'

const POLL_MS = Number(import.meta.env.VITE_POLL_MS ?? 12000)

export default function DashboardPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const seen = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const d = await api<Dashboard>('/api/dashboard')
        if (!alive) return
        // Highlight rows that were not in the previous poll (key = section + id + status).
        const keys = new Set([...d.active, ...d.awaitingSubmit, ...d.submissions, ...d.approvedUnpaid].map((r) => `${r.id}:${r.status}`))
        if (seen.current) setFresh(new Set([...keys].filter((k) => !seen.current!.has(k))))
        seen.current = keys
        setData(d)
        setError(null)
        setUpdatedAt(new Date().toISOString())
      } catch (e) {
        if (alive) setError(e)
      }
    }
    void load()
    const id = setInterval(() => void load(), POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!data && !error) return <Spinner />

  const isNew = (r: DashRow) => fresh.has(`${r.id}:${r.status}`)
  const activeMarkers = (data?.active ?? []).map((r) => ({
    lat: r.lastLat ?? r.startLat, lng: r.lastLng ?? r.startLng, name: r.driverName, color: colorFor(r.driverName),
    label: `${r.driverName} · ${t('dashboard.since', { time: time(r.startedAt) })} · ${t('dashboard.lastFix', { time: time(r.lastPointAt) })}`,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.title')}
        subtitle={<span className="inline-flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-emerald-500" />{t('dashboard.auto')} · {t('dashboard.updated', { time: time(updatedAt) })}</span>} />
      {error ? <Alert>{errorText(error, t('common.error'))}</Alert> : null}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Counter label={t('dashboard.active')} value={data.active.length} icon="radar" accent />
            <Counter label={t('dashboard.submissions')} value={data.submissions.length} icon="list" />
            <Counter label={t('dashboard.approved')} value={data.approvedUnpaid.length} icon="wallet" />
            <Counter label={t('dashboard.flagged')} value={data.flagged.length} icon="alert" />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <Section title={t('dashboard.active')} rows={data.active} isNew={isNew} testId="active-rides" className="lg:col-span-2"
              meta={(r) => (
                <>
                  <span className="font-mono font-bold text-brand-600">{duration(r.startedAt)}</span>
                  <span>{t('dashboard.since', { time: time(r.startedAt) })}</span>
                  <span>{t('dashboard.lastFix', { time: time(r.lastPointAt) })}</span>
                  {r.longRide && <Flag>{t('dashboard.longRide')}</Flag>}
                </>
              )} />
            <div className="card p-3 lg:col-span-3">
              <RouteMap markers={activeMarkers} className="h-80" />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title={t('dashboard.submissions')} rows={data.submissions} isNew={isNew} testId="submissions"
              meta={(r) => (
                <>
                  <span>{km(r.paidKm)}</span><b>{money(r.total)}</b>
                  {r.mismatchFlag && <Flag>{t('ride.mismatch')}</Flag>}
                  {r.gapFlag && <Flag>{t('ride.gap')}</Flag>}
                </>
              )} />
            <Section title={t('dashboard.approved')} rows={data.approvedUnpaid} isNew={isNew} testId="approved"
              meta={(r) => <><span>{km(r.paidKm)}</span><b>{money(r.total)}</b></>} />
          </div>
          {data.awaitingSubmit.length > 0 && (
            <Section title={t('dashboard.awaiting')} rows={data.awaitingSubmit} isNew={isNew} testId="awaiting"
              meta={(r) => <span>{time(r.endedAt)}</span>} />
          )}
        </>
      )}
    </div>
  )
}

function Counter({ label, value, icon, accent }: { label: string; value: number; icon: IconName; accent?: boolean }) {
  return (
    <div className={`card flex items-center gap-4 p-5 ${accent ? 'bg-gradient-to-br from-brand-600 to-brand-800 text-white ring-0' : ''}`}>
      <span className={`grid size-12 place-items-center rounded-2xl ${accent ? 'bg-white/15' : 'bg-brand-50 text-brand-600'}`}><Icon name={icon} /></span>
      <div>
        <div className="text-3xl font-extrabold tabular-nums">{value}</div>
        <div className={`text-xs font-semibold ${accent ? 'text-white/80' : 'text-slate-500'}`}>{label}</div>
      </div>
    </div>
  )
}

function Section({ title, rows, meta, isNew, testId, className = '' }: {
  title: string
  rows: DashRow[]
  meta: (r: DashRow) => React.ReactNode
  isNew: (r: DashRow) => boolean
  testId: string
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={`card p-5 ${className}`} data-testid={testId}>
      <h2 className="mb-3 font-extrabold">{title} <span className="text-slate-400">({rows.length})</span></h2>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">{t('common.none')}</p> : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className={`-mx-2 rounded-xl px-2 ${isNew(r) ? 'flash-new' : ''}`}>
              <Link to={`/rides/${r.id}`} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {r.status === 'InProgress' && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(r.driverName) }} />}
                    <span className="font-bold">{r.driverName}</span>
                    <span className="text-xs text-slate-400">#{r.id}</span>
                    {isNew(r) && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">{t('dashboard.new')}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">{meta(r)}</div>
                  {r.purpose && <div className="mt-1 truncate text-xs text-slate-400">{r.purpose}</div>}
                </div>
                <StatusBadge status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
