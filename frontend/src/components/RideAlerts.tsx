import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import type { Dashboard, DashRow } from '../api/types'
import { money } from '../lib/format'
import { playChime, unlockAudio } from '../lib/sound'
import { Icon } from './icons'

const POLL_MS = Number(import.meta.env.VITE_POLL_MS ?? 12000)
const KEY = 'rt.alerts'

type Kind = 'start' | 'end' | 'submit'
interface Toast { id: string; kind: Kind; text: string; rideId: number }

function readPref() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

/**
 * Watches the dashboard feed (same polling as the live dashboard, no paid push service) and
 * announces rides that start, end or are submitted — with a toast, a chime and, when the tab is
 * in the background, a system notification.
 */
export function useRideAlerts(enabled: boolean) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [soundOn, setSoundOn] = useState(readPref)
  const prev = useRef<Map<number, DashRow> | null>(null)
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn

  const dismiss = useCallback((id: string) => setToasts((ts) => ts.filter((x) => x.id !== id)), [])

  useEffect(() => {
    if (!enabled) return
    let alive = true

    const announce = (kind: Kind, text: string, rideId: number) => {
      const id = `${kind}-${rideId}-${Date.now()}`
      setToasts((ts) => [...ts.slice(-3), { id, kind, text, rideId }])
      setTimeout(() => dismiss(id), 10000)
      if (soundRef.current) playChime(kind)
      try {
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted')
          new Notification(t('app.name'), { body: text, icon: '/icon-192.png', tag: id })
      } catch {
        /* notifications unsupported */
      }
    }

    const poll = async () => {
      let d: Dashboard
      try {
        d = await api<Dashboard>('/api/dashboard')
      } catch {
        return
      }
      if (!alive) return
      const rows = [...d.active, ...d.awaitingSubmit, ...d.submissions, ...d.approvedUnpaid]
      const now = new Map(rows.map((r) => [r.id, r]))
      const before = prev.current
      prev.current = now
      if (!before) return // first load is the baseline: nothing to announce

      for (const r of d.active)
        if (before.get(r.id)?.status !== 'InProgress') announce('start', t('alerts.started', { name: r.driverName }), r.id)
      for (const [id, old] of before)
        if (old.status === 'InProgress' && now.get(id)?.status !== 'InProgress')
          announce('end', t('alerts.ended', { name: old.driverName }), id)
      for (const r of d.submissions)
        if (before.get(r.id)?.status !== 'Pending')
          announce('submit', t('alerts.submitted', { name: r.driverName, id: r.id, total: money(r.total) }), r.id)
    }

    void poll()
    const timer = setInterval(() => void poll(), POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [enabled, t, dismiss])

  const toggleSound = () => {
    unlockAudio()
    const next = !soundOn
    setSoundOn(next)
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off')
    } catch {
      /* ignore */
    }
    if (next) {
      playChime('start')
      if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    }
  }

  return { toasts, dismiss, soundOn, toggleSound }
}

export function AlertBell({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const { t } = useTranslation()
  return (
    <button onClick={onToggle} data-testid="alerts-toggle" title={on ? t('alerts.soundOn') : t('alerts.soundOff')}
      aria-label={on ? t('alerts.soundOn') : t('alerts.soundOff')}
      className={`btn px-3 ${on ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
      <Icon name={on ? 'bell' : 'bellOff'} className="size-4" />
    </button>
  )
}

const kindStyle: Record<Kind, { icon: 'play' | 'stop' | 'list'; cls: string }> = {
  start: { icon: 'play', cls: 'bg-emerald-500' },
  end: { icon: 'stop', cls: 'bg-ink' },
  submit: { icon: 'list', cls: 'bg-brand-600' },
}

export function AlertToasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const navigate = useNavigate()
  if (!toasts.length) return null
  return (
    <div className="fixed end-3 top-20 z-[2000] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} data-testid="toast" role="status"
          className="card flex animate-[slidein_.25s_ease-out] cursor-pointer items-center gap-3 p-3 pe-2"
          onClick={() => { onDismiss(x.id); navigate(`/rides/${x.rideId}`) }}>
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${kindStyle[x.kind].cls}`}>
            <Icon name={kindStyle[x.kind].icon} className="size-4 fill-white" />
          </span>
          <span className="flex-1 text-sm font-semibold">{x.text}</span>
          <button className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" aria-label="close"
            onClick={(e) => { e.stopPropagation(); onDismiss(x.id) }}>
            <Icon name="x" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
