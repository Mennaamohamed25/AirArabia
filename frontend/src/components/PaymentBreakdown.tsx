import { useTranslation } from 'react-i18next'
import type { FeeType, Ride } from '../api/types'
import { km, money } from '../lib/format'
import { Icon } from './icons'

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Same formula as the server: liters = km ÷ km per liter; fuel cost = liters × 92 price. */
export function fuelFor(distanceKm: number, kmPerLiter: number, pricePerLiter: number) {
  const liters = kmPerLiter > 0 ? distanceKm / kmPerLiter : 0
  return { liters: round2(liters), cost: round2((distanceKm / kmPerLiter) * pricePerLiter || 0) }
}

function Step({ n, title, hint, formula, value }: { n: number; title: string; hint: string; formula?: string; value: string }) {
  return (
    <li className="flex gap-3 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <span className="font-bold">{title}</span>
          <span className="font-extrabold tabular-nums">{value}</span>
        </div>
        <p className="text-xs text-slate-500">{hint}</p>
        {formula && <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700" dir="ltr">{formula}</p>}
      </div>
    </li>
  )
}

/**
 * Explains, step by step and in plain words, how the amount to pay is calculated.
 * `fees` overrides the ride's fees while the driver is still filling the form.
 */
export default function PaymentBreakdown({ ride, fees }: { ride: Ride; fees?: { type: FeeType; amount: number }[] }) {
  const { t } = useTranslation()
  const feeList = fees ?? ride.fees
  const feesTotal = round2(feeList.reduce((s, f) => s + (f.amount || 0), 0))
  const fuel = { liters: fuelFor(ride.paidKm, ride.kmPerLiter, ride.pricePerLiter).liters, cost: ride.fuelCost }
  const total = round2(fuel.cost + feesTotal)
  const undecided = ride.mismatchFlag && (ride.status === 'Stopped' || ride.status === 'Pending')
  const options = undecided
    ? (['Gps', 'Odometer'] as const).map((s) => {
        const d = s === 'Gps' ? ride.gpsKm : ride.odometerKm
        return { source: s, km: d, total: round2(fuelFor(d, ride.kmPerLiter, ride.pricePerLiter).cost + feesTotal) }
      })
    : []

  return (
    <div className="card p-5" data-testid="payment-breakdown">
      <h2 className="flex items-center gap-2 text-lg font-extrabold"><Icon name="wallet" className="size-5 text-brand-600" />{t('pay.title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('pay.subtitle')}</p>

      <ol className="mt-2 divide-y divide-slate-100">
        <Step n={1} title={t('pay.distance')} value={km(ride.paidKm)}
          hint={ride.distanceSource === 'Gps' ? t('pay.distanceGps') : t('pay.distanceOdo')} />
        <Step n={2} title={t('pay.liters')} value={`${fuel.liters} ${t('pay.l')}`} hint={t('pay.litersHint', { kpl: ride.kmPerLiter })}
          formula={`${ride.paidKm} km ÷ ${ride.kmPerLiter} km/L = ${fuel.liters} L`} />
        <Step n={3} title={t('pay.fuelCost')} value={money(fuel.cost)} hint={t('pay.fuelCostHint', { price: ride.pricePerLiter, perKm: round2(ride.pricePerLiter / ride.kmPerLiter) })}
          formula={`${fuel.liters} L × ${ride.pricePerLiter} EGP = ${fuel.cost.toFixed(2)} EGP`} />
        <Step n={4} title={t('pay.fees')} value={money(feesTotal)}
          hint={feeList.length ? feeList.map((f) => `${t(`feeType.${f.type}`)}: ${money(f.amount || 0)}`).join(' · ') : t('pay.noFees')} />
      </ol>

      <div className="mt-2 flex items-center justify-between rounded-2xl bg-brand-600 px-5 py-4 text-white">
        <div>
          <div className="text-sm font-semibold text-white/80">{t('pay.total')}</div>
          <div className="text-xs text-white/70" dir="ltr">{fuel.cost.toFixed(2)} + {feesTotal.toFixed(2)}</div>
        </div>
        <div className="text-2xl font-extrabold tabular-nums" data-testid="pay-total">{money(total)}</div>
      </div>

      {undecided && (
        <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <div className="font-bold">{t('pay.mismatchTitle')}</div>
          <p className="mt-0.5">{t('pay.mismatchText')}</p>
          <ul className="mt-2 space-y-1">
            {options.map((o) => (
              <li key={o.source} className="flex justify-between gap-3">
                <span>{t(`pay.if${o.source}`, { km: o.km })}</span>
                <b className="tabular-nums">{money(o.total)}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
