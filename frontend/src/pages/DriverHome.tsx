import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../api/auth'
import { api } from '../api/client'
import type { FeeType, Ride } from '../api/types'
import { currentPosition, RideTracker, toFix, type TrackerStatus } from '../lib/tracker'
import { duration, km, time } from '../lib/format'
import PhotoInput from '../components/PhotoInput'
import PaymentBreakdown from '../components/PaymentBreakdown'
import Select from '../components/Select'
import { Alert, errorText, Spinner, Stat, StatusBadge } from '../components/ui'
import { Icon } from '../components/icons'

function locationError(e: unknown, t: (k: string) => string) {
  if (e instanceof GeolocationPositionError && e.code === e.PERMISSION_DENIED) return t('driver.locationDenied')
  if (e instanceof Error && e.message === 'unsupported') return t('driver.locationUnsupported')
  return errorText(e, t('common.error'))
}

function useTick(active: boolean) {
  const [, setN] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setN((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [active])
}

export default function DriverHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Ride | null>(null)

  useEffect(() => {
    api<Ride | undefined>('/api/rides/active')
      .then((r) => setRide(r ?? null))
      .catch((e) => setError(errorText(e, t('common.error'))))
      .finally(() => setLoading(false))
  }, [t])

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-brand-600">{t('driver.hello', { name: user?.fullName.split(' ')[0] })}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {ride?.status === 'InProgress' ? t('driver.inProgress') : ride?.status === 'Stopped' ? t('driver.summary') : t('driver.ready')}
        </h1>
      </div>
      {error && <Alert>{error}</Alert>}
      {done && !ride && (
        <Alert kind="success">
          {t('driver.submitted')} <Link className="underline" to={`/rides/${done.id}`}>#{done.id}</Link>
        </Alert>
      )}
      {!ride && <StartPanel onStarted={(r) => { setDone(null); setRide(r) }} />}
      {ride?.status === 'InProgress' && <ActivePanel ride={ride} onStopped={setRide} />}
      {ride?.status === 'Stopped' && <SubmitPanel ride={ride} onSubmitted={(r) => { setDone(r); setRide(null) }} />}
    </div>
  )
}

function OdometerDialog({ title, min, confirm, onConfirm, onCancel, dark }: {
  title: string
  min?: number
  confirm: string
  dark?: boolean
  onConfirm: (odometer: number, photo: string | null) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = async () => {
    const n = Number(value)
    if (!value || !Number.isInteger(n) || n < 0 || (min !== undefined && n <= min)) {
      setError(min !== undefined ? t('driver.odometerInvalid', { start: min }) : title)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onConfirm(n, photo)
    } catch (e) {
      setError(e instanceof GeolocationPositionError || (e instanceof Error && e.message === 'unsupported') ? locationError(e, t) : errorText(e, t('common.error')))
      setBusy(false)
    }
  }

  return (
    <div className="card space-y-4 p-5">
      {error && <Alert>{error}</Alert>}
      <div>
        <label className="label" htmlFor="odometer">{title}</label>
        <input id="odometer" inputMode="numeric" className="input text-2xl font-bold tabular-nums" value={value} autoFocus
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} placeholder={min !== undefined ? `> ${min}` : '0'} />
        <p className="mt-1.5 text-xs text-slate-500">{t('driver.odometerHint')}</p>
      </div>
      <PhotoInput label={t('driver.odometerPhoto')} value={photo} onChange={setPhoto} testId="odometer-photo" />
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost py-3" onClick={onCancel} disabled={busy}>{t('common.cancel')}</button>
        <button className={`${dark ? 'btn-dark' : 'btn-primary'} py-3`} onClick={() => void go()} disabled={busy}>
          {busy ? t('common.loading') : confirm}
        </button>
      </div>
    </div>
  )
}

function StartPanel({ onStarted }: { onStarted: (r: Ride) => void }) {
  const { t } = useTranslation()
  const [asking, setAsking] = useState(false)

  const start = async (odometer: number, photo: string | null) => {
    const fix = toFix(await currentPosition())
    onStarted(await api<Ride>('/api/rides/start', { method: 'POST', json: { ...fix, odometer, odometerPhoto: photo } }))
  }

  if (asking) return <OdometerDialog title={t('driver.odometerStart')} confirm={t('driver.confirmStart')} onConfirm={start} onCancel={() => setAsking(false)} />

  return (
    <div className="card relative overflow-hidden p-8 text-center">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-50 to-transparent" />
      <button onClick={() => setAsking(true)} data-testid="start-ride"
        className="pulse-ring relative mx-auto grid size-56 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-2xl shadow-brand-600/40 transition active:scale-95">
        <span className="flex flex-col items-center gap-2">
          <Icon name="play" className="size-12 fill-white rtl:-scale-x-100" />
          <span className="text-2xl font-extrabold">{t('driver.startRide')}</span>
        </span>
      </button>
      <p className="relative mt-6 text-sm text-slate-500">{t('driver.startHint')}</p>
    </div>
  )
}

function ActivePanel({ ride, onStopped }: { ride: Ride; onStopped: (r: Ride) => void }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<TrackerStatus>({ gps: 'waiting', liveKm: 0, queued: 0 })
  const [asking, setAsking] = useState(false)
  const tracker = useRef<RideTracker | null>(null)
  useTick(true)

  useEffect(() => {
    const tr = new RideTracker(ride.id, setStatus)
    tracker.current = tr
    tr.start()
    return () => void tr.stop()
  }, [ride.id])

  const stop = async (odometer: number, photo: string | null) => {
    let fix
    try {
      fix = toFix(await currentPosition(10000))
    } catch {
      fix = { lat: ride.lastLat ?? ride.startLat, lng: ride.lastLng ?? ride.startLng, accuracy: 9999 }
    }
    const pending = tracker.current?.stop() ?? []
    try {
      const r = await api<Ride>(`/api/rides/${ride.id}/stop`, {
        method: 'POST',
        json: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, odometer, odometerPhoto: photo, points: pending },
      })
      tracker.current?.clearQueue()
      onStopped(r)
    } catch (e) {
      tracker.current?.start()
      throw e
    }
  }

  const gpsChip = {
    ok: ['bg-emerald-100 text-emerald-800', t('driver.gpsOk')],
    waiting: ['bg-slate-100 text-slate-600', t('driver.gpsWaiting')],
    gap: ['bg-amber-100 text-amber-800', t('driver.gpsGap')],
    denied: ['bg-brand-100 text-brand-800', t('driver.locationDenied')],
  }[status.gps]

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <StatusBadge status="InProgress" />
            <span className="text-sm text-white/80">{t('ride.started')} {time(ride.startedAt)}</span>
          </div>
          <div className="mt-6 text-center">
            <div className="text-sm font-semibold text-white/70">{t('driver.elapsed')}</div>
            <div className="text-6xl font-extrabold tabular-nums tracking-tight" data-testid="elapsed">{duration(ride.startedAt)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <Stat label={t('driver.liveDistance')} value={km(Math.round(status.liveKm * 100) / 100)} icon="route" />
          <Stat label={t('driver.odometerStart')} value={ride.startOdometer} icon="clock" />
        </div>
        <div className="px-4 pb-4">
          <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${gpsChip[0]}`} data-testid="gps-status">
            <span className="inline-flex items-center gap-2"><Icon name="pin" className="size-4" />{gpsChip[1]}</span>
          </div>
          {status.queued > 0 && <p className="mt-2 text-xs text-slate-500">{t('driver.pendingQueue', { count: status.queued })}</p>}
          <p className="mt-2 text-xs text-slate-500">{t('driver.keepOpen')}</p>
        </div>
      </div>

      {asking ? (
        <OdometerDialog title={t('driver.odometerEnd')} min={ride.startOdometer} confirm={t('driver.confirmStop')} dark
          onConfirm={stop} onCancel={() => setAsking(false)} />
      ) : (
        <button onClick={() => setAsking(true)} data-testid="stop-ride"
          className="btn-dark w-full rounded-3xl py-6 text-xl font-extrabold shadow-xl">
          <Icon name="stop" className="size-6 fill-white" />
          {t('driver.stopRide')}
        </button>
      )}
    </div>
  )
}

interface FeeDraft { type: FeeType; amount: string; photo: string | null }

function SubmitPanel({ ride, onSubmitted }: { ride: Ride; onSubmitted: (r: Ride) => void }) {
  const { t } = useTranslation()
  const [purpose, setPurpose] = useState('')
  const [fees, setFees] = useState<FeeDraft[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (i: number, patch: Partial<FeeDraft>) => setFees((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)))

  const submit = async () => {
    if (!purpose.trim()) return setError(t('driver.purposeRequired'))
    if (fees.some((f) => !(Number(f.amount) > 0) || !f.photo)) return setError(t('driver.receiptRequired'))
    setBusy(true)
    setError(null)
    try {
      onSubmitted(await api<Ride>(`/api/rides/${ride.id}/submit`, {
        method: 'POST',
        json: { purpose, fees: fees.map((f) => ({ type: f.type, amount: Number(f.amount), photo: f.photo })) },
      }))
    } catch (e) {
      setError(errorText(e, t('common.error')))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t('driver.gpsKm')} value={km(ride.gpsKm)} icon="route" />
          <Stat label={t('driver.odoKm')} value={km(ride.odometerKm)} icon="clock" />
        </div>
        {ride.mismatchFlag && <div className="mt-3"><Alert kind="warn">{t('driver.mismatch')}</Alert></div>}
      </div>

      <PaymentBreakdown ride={ride} fees={fees.map((f) => ({ type: f.type, amount: Number(f.amount) || 0 }))} />

      <div className="card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">{t('driver.submitTitle')}</h2>
        {error && <Alert>{error}</Alert>}
        <div>
          <label className="label" htmlFor="purpose">{t('common.purpose')}</label>
          <textarea id="purpose" className="input min-h-24" maxLength={500} value={purpose}
            placeholder={t('driver.purposePh')} onChange={(e) => setPurpose(e.target.value)} />
        </div>

        {fees.map((f, i) => (
          <div key={i} className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200" data-testid="fee-row">
            <div className="grid grid-cols-2 gap-3">
              <Select ariaLabel="fee type" value={f.type} onChange={(type) => update(i, { type })}
                options={(['Parking', 'Toll', 'Purchase', 'Other'] as FeeType[]).map((x) => ({ value: x, label: t(`feeType.${x}`) }))} />
              <input className="input bg-white" inputMode="decimal" placeholder={t('driver.feeAmount')} aria-label={t('driver.feeAmount')}
                value={f.amount} onChange={(e) => update(i, { amount: e.target.value.replace(/[^\d.]/g, '') })} />
            </div>
            <PhotoInput label={t('driver.receipt')} value={f.photo} onChange={(photo) => update(i, { photo })} testId={`fee-photo-${i}`} />
            <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => setFees((fs) => fs.filter((_, j) => j !== i))}>
              {t('common.remove')}
            </button>
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={() => setFees((fs) => [...fs, { type: 'Parking', amount: '', photo: null }])}>
          <Icon name="plus" className="size-4" />{t('driver.addFee')}
        </button>
        <button className="btn-primary w-full py-4 text-base" onClick={() => void submit()} disabled={busy} data-testid="submit-ride">
          {busy ? t('common.loading') : t('driver.submit')}
        </button>
      </div>
    </div>
  )
}
