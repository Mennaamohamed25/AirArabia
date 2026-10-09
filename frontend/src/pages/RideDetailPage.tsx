import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../api/auth'
import { api } from '../api/client'
import type { DistanceSource, Ride } from '../api/types'
import { dateTime, km, money } from '../lib/format'
import AuthImage from '../components/AuthImage'
import RouteMap from '../components/RouteMap'
import PaymentBreakdown from '../components/PaymentBreakdown'
import { PdfButton, RideReceipt } from '../components/Receipt'
import { Alert, errorText, Flag, Spinner, Stat, StatusBadge, useLoad } from '../components/ui'
import { Icon } from '../components/icons'

function Line({ label, hint, value }: { label: string; hint?: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <div>
        <div className="font-semibold text-slate-700">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      <span className="shrink-0 text-end font-bold">{value}</span>
    </div>
  )
}

export default function RideDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: ride, error, loading, setData } = useLoad(() => api<Ride>(`/api/rides/${id}`), [id])

  if (loading) return <Spinner />
  if (error || !ride) return <Alert>{errorText(error, t('common.error'))}</Alert>

  const canDecide = user?.role === 'Manager' && ride.status === 'Pending'
  const markers = [
    { lat: ride.startLat, lng: ride.startLng, label: t('ride.started'), color: '#16a34a' },
    ...(ride.endLat != null && ride.endLng != null ? [{ lat: ride.endLat, lng: ride.endLng, label: t('ride.ended') }] : []),
  ]
  const photos = [
    ride.startOdometerPhotoId && { id: ride.startOdometerPhotoId, label: t('ride.startPhoto') },
    ride.endOdometerPhotoId && { id: ride.endOdometerPhotoId, label: t('ride.endPhoto') },
    ...ride.fees.filter((f) => f.photoId).map((f) => ({ id: f.photoId!, label: `${t(`feeType.${f.type}`)} · ${money(f.amount)}` })),
  ].filter(Boolean) as { id: number; label: string }[]

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-ink">
        <Icon name="chevron" className="size-4 rotate-180 rtl:rotate-0" />{t('common.back')}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">{t('ride.title', { id: ride.id })}</h1>
            <StatusBadge status={ride.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{ride.driverName} · {dateTime(ride.startedAt)}</p>
        </div>
        {ride.status !== 'InProgress' && ride.status !== 'Stopped' && (
          <PdfButton filename={`receipt-RT-${ride.id}.pdf`} label={t('ride.receipt')} className="btn-primary" testId="download-receipt"
            render={() => <RideReceipt ride={ride} />} />
        )}
      </div>

      {(ride.mismatchFlag || ride.gapFlag) && (
        <div className="flex flex-wrap gap-2">
          {ride.mismatchFlag && <Flag>{t('ride.mismatch')}: GPS {km(ride.gpsKm)} / {t('ride.Odometer')} {km(ride.odometerKm)}</Flag>}
          {ride.gapFlag && <Flag>{t('ride.gap')}</Flag>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={t('ride.paidDistance')} value={km(ride.paidKm)} icon="route" />
        <Stat label={t('driver.fuelCost')} value={money(ride.fuelCost)} icon="fuel" />
        <Stat label={t('common.fees')} value={money(ride.feesTotal)} icon="wallet" />
        <Stat label={t('common.total')} value={<span data-testid="ride-total">{money(ride.total)}</span>} accent />
      </div>

      {canDecide && <DecisionPanel ride={ride} onDecided={setData} />}

      {ride.status !== 'InProgress' && <PaymentBreakdown ride={ride} />}

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="card p-4 lg:col-span-3">
          <h2 className="mb-3 px-1 font-extrabold">{t('ride.route')}</h2>
          {ride.routePolyline || markers.length ? <RouteMap polyline={ride.routePolyline} markers={markers} className="h-80" />
            : <p className="text-sm text-slate-500">{t('ride.noRoute')}</p>}
        </div>
        <div className="card p-5 lg:col-span-2">
          <Line label={t('common.purpose')} hint={t('hint.purpose')} value={ride.purpose ?? '—'} />
          <Line label={t('ride.started')} hint={t('hint.started')} value={dateTime(ride.startedAt)} />
          <Line label={t('ride.ended')} hint={t('hint.ended')} value={dateTime(ride.endedAt)} />
          <Line label={t('ride.odometer')} hint={t('hint.odometer')} value={`${ride.startOdometer} → ${ride.endOdometer ?? '—'}`} />
          <Line label={t('driver.gpsKm')} hint={t('hint.gps')} value={km(ride.gpsKm)} />
          <Line label={t('driver.odoKm')} hint={t('hint.odo')} value={km(ride.odometerKm)} />
          <Line label={t('ride.source')} hint={t('hint.source')} value={t(`ride.${ride.distanceSource}`)} />
          <Line label={t('ride.fuelPrice')} hint={t('hint.price')} value={money(ride.pricePerLiter)} />
          <Line label={t('ride.consumption')} hint={t('hint.kpl')} value={`${ride.kmPerLiter} km/L`} />
          {ride.fees.map((f) => <Line key={f.id} label={t(`feeType.${f.type}`)} hint={t('hint.fee')} value={money(f.amount)} />)}
        </div>
      </div>

      {ride.decision && (
        <Alert kind={ride.decision.approved ? 'success' : 'error'}>
          <b>{t('ride.decision')}:</b> {ride.decision.approved ? t('ride.approve') : t('ride.reject')} — {t('ride.by', { name: ride.decision.managerName })} · {dateTime(ride.decision.decidedAt)}
          {ride.decision.comment && <div className="mt-1" data-testid="decision-comment">“{ride.decision.comment}”</div>}
        </Alert>
      )}

      {photos.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 font-extrabold">{t('ride.photos')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <figure key={p.id}>
                <AuthImage id={p.id} alt={p.label} className="aspect-square w-full rounded-2xl object-cover ring-1 ring-slate-200" />
                <figcaption className="mt-1 text-xs text-slate-500">{p.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DecisionPanel({ ride, onDecided }: { ride: Ride; onDecided: (r: Ride) => void }) {
  const { t } = useTranslation()
  const [comment, setComment] = useState('')
  const [source, setSource] = useState<DistanceSource | null>(ride.mismatchFlag ? null : 'Gps')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const decide = async (approve: boolean) => {
    if (!approve && !comment.trim()) return setError(t('ride.commentRequired'))
    if (approve && !source) return setError(t('ride.chooseSource'))
    setBusy(true)
    setError(null)
    try {
      onDecided(await api<Ride>(`/api/rides/${ride.id}/decide`, {
        method: 'POST', json: { approve, comment, distanceSource: source ?? 'Gps' },
      }))
    } catch (e) {
      setError(errorText(e, t('common.error')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card space-y-4 border-s-4 border-brand-600 p-5" data-testid="decision-panel">
      <h2 className="text-lg font-extrabold">{t('ride.decide')}</h2>
      {error && <Alert>{error}</Alert>}
      {ride.mismatchFlag && (
        <div>
          <span className="label">{t('ride.chooseSource')}</span>
          <div className="grid grid-cols-2 gap-3">
            {(['Gps', 'Odometer'] as DistanceSource[]).map((s) => (
              <button key={s} type="button" onClick={() => setSource(s)} data-testid={`source-${s}`}
                className={`rounded-2xl p-4 text-start ring-2 transition ${source === s ? 'bg-brand-50 ring-brand-600' : 'bg-slate-50 ring-transparent'}`}>
                <div className="text-sm font-semibold text-slate-500">{t(`ride.${s}`)}</div>
                <div className="text-xl font-extrabold">{km(s === 'Gps' ? ride.gpsKm : ride.odometerKm)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="comment">{t('ride.comment')}</label>
        <textarea id="comment" className="input min-h-20" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-danger py-3" onClick={() => void decide(false)} disabled={busy} data-testid="reject">
          <Icon name="x" className="size-4" />{t('ride.reject')}
        </button>
        <button className="btn-primary py-3" onClick={() => void decide(true)} disabled={busy} data-testid="approve">
          <Icon name="check" className="size-4" />{t('ride.approve')}
        </button>
      </div>
    </div>
  )
}
