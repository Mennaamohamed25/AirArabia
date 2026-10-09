import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MonthSummary, Ride } from '../api/types'
import { dateTime, km, money, monthLabel } from '../lib/format'
import { elementToPdf } from '../lib/pdf'
import { Icon } from './icons'
import Logo from './Logo'

function Sheet({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t, i18n } = useTranslation()
  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="w-[794px] bg-white text-ink" style={{ fontFamily: 'Inter, Cairo, sans-serif' }}>
      <div className="flex items-center justify-between bg-gradient-to-br from-brand-600 to-brand-800 px-10 py-8 text-white">
        <div>
          <Logo white className="h-9" />
          <div className="mt-2 text-sm font-semibold text-white/80">{t('app.name')}</div>
        </div>
        <div className="text-end">
          <div className="text-2xl font-extrabold">{title}</div>
          <div className="text-sm text-white/80">{subtitle}</div>
        </div>
      </div>
      <div className="px-10 py-8">{children}</div>
      <div className="border-t border-slate-200 px-10 py-4 text-xs text-slate-500">
        {t('receipt.footer')} · {t('receipt.generated')}: {dateTime(new Date().toISOString())}
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 border-b border-slate-100 py-2.5 ${strong ? 'text-lg font-extrabold' : 'text-sm'}`}>
      <span className={strong ? '' : 'text-slate-500'}>{label}</span>
      <span className="text-end font-semibold">{value}</span>
    </div>
  )
}

export function RideReceipt({ ride }: { ride: Ride }) {
  const { t } = useTranslation()
  return (
    <Sheet title={t('receipt.title')} subtitle={`${t('receipt.number')} RT-${String(ride.id).padStart(6, '0')}`}>
      <div className="grid grid-cols-2 gap-x-10">
        <div>
          <Row label={t('common.driver')} value={ride.driverName} />
          <Row label={t('ride.consumption')} value={`${ride.kmPerLiter} km/L`} />
          <Row label={t('ride.started')} value={dateTime(ride.startedAt)} />
          <Row label={t('ride.ended')} value={dateTime(ride.endedAt)} />
          <Row label={t('common.status')} value={t(`status.${ride.status}`)} />
        </div>
        <div>
          <Row label={t('ride.odometer')} value={`${ride.startOdometer} → ${ride.endOdometer ?? '—'}`} />
          <Row label={t('driver.gpsKm')} value={km(ride.gpsKm)} />
          <Row label={t('driver.odoKm')} value={km(ride.odometerKm)} />
          <Row label={t('ride.paidDistance')} value={`${km(ride.paidKm)} (${t(`ride.${ride.distanceSource}`)})`} />
          <Row label={t('ride.fuelPrice')} value={money(ride.pricePerLiter)} />
        </div>
      </div>
      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('common.purpose')}</div>
        <div className="mt-1">{ride.purpose ?? '—'}</div>
      </div>
      <div className="mt-6">
        <Row label={`${t('common.fuel')} (${t('ride.calc', { km: ride.paidKm, kpl: ride.kmPerLiter, price: ride.pricePerLiter })})`} value={money(ride.fuelCost)} />
        {ride.fees.map((f) => <Row key={f.id} label={`${t('common.fees')}: ${t(`feeType.${f.type}`)}`} value={money(f.amount)} />)}
        <Row label={t('common.total')} value={<span className="text-brand-600">{money(ride.total)}</span>} strong />
      </div>
      <div className="mt-10 grid grid-cols-2 gap-10 text-sm">
        <div>
          <div className="text-slate-500">{t('receipt.approvedBy')}</div>
          <div className="mt-1 font-semibold">{ride.decision?.approved ? `${ride.decision.managerName} · ${dateTime(ride.decision.decidedAt)}` : '—'}</div>
        </div>
        <div>
          <div className="text-slate-500">{t('receipt.signature')}</div>
          <div className="mt-8 border-b border-slate-300" />
        </div>
      </div>
    </Sheet>
  )
}

export function MonthReport({ summary, driverName }: { summary: MonthSummary; driverName?: string }) {
  const { t } = useTranslation()
  const th = 'px-3 py-2 text-start text-xs font-bold uppercase tracking-wide text-slate-500'
  const td = 'px-3 py-2 text-sm'
  const paid = summary.rides.filter((r) => r.status === 'Approved' || r.status === 'Paid')
  return (
    <Sheet title={driverName ? t('receipt.statement') : t('monthly.title')} subtitle={`${monthLabel(summary.month)}${driverName ? ` · ${driverName}` : ''}`}>
      {!driverName && (
        <table className="mb-8 w-full">
          <thead className="bg-slate-50"><tr>
            <th className={th}>{t('common.driver')}</th><th className={th}>{t('monthly.ridesCount')}</th><th className={th}>{t('common.distance')}</th>
            <th className={th}>{t('common.fuel')}</th><th className={th}>{t('common.fees')}</th><th className={th}>{t('common.total')}</th>
          </tr></thead>
          <tbody>
            {summary.drivers.map((d) => (
              <tr key={d.driverId} className="border-b border-slate-100">
                <td className={td}>{d.name}</td><td className={td}>{d.rides}</td><td className={td}>{km(d.km)}</td>
                <td className={td}>{money(d.fuel)}</td><td className={td}>{money(d.fees)}</td><td className={`${td} font-bold`}>{money(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <table className="w-full">
        <thead className="bg-slate-50"><tr>
          <th className={th}>#</th><th className={th}>{t('common.date')}</th>{!driverName && <th className={th}>{t('common.driver')}</th>}
          <th className={th}>{t('common.purpose')}</th><th className={th}>{t('common.distance')}</th><th className={th}>{t('common.total')}</th>
        </tr></thead>
        <tbody>
          {paid.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className={td}>{r.id}</td><td className={td}>{dateTime(r.startedAt)}</td>{!driverName && <td className={td}>{r.driverName}</td>}
              <td className={td}>{r.purpose}</td><td className={td}>{km(r.paidKm)}</td><td className={`${td} font-semibold`}>{money(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 flex justify-end">
        <div className="w-80">
          <Row label={t('common.distance')} value={km(summary.grandTotal.km)} />
          <Row label={t('common.fuel')} value={money(summary.grandTotal.fuel)} />
          <Row label={t('common.fees')} value={money(summary.grandTotal.fees)} />
          <Row label={t('monthly.grand')} value={<span className="text-brand-600">{money(summary.grandTotal.total)}</span>} strong />
        </div>
      </div>
    </Sheet>
  )
}

/** Button that renders content off-screen, captures it, and downloads a PDF. */
export function PdfButton({ filename, label, render, className = 'btn-ghost', testId }: {
  filename: string
  label: string
  render: () => ReactNode
  className?: string
  testId?: string
}) {
  const [content, setContent] = useState<ReactNode>(null)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const run = async () => {
    setBusy(true)
    setContent(render())
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    try {
      if (ref.current?.firstElementChild) await elementToPdf(ref.current.firstElementChild as HTMLElement, filename)
    } finally {
      setContent(null)
      setBusy(false)
    }
  }

  return (
    <>
      <button className={className} onClick={() => void run()} disabled={busy} data-testid={testId}>
        <Icon name="download" className="size-4" />
        {label}
      </button>
      {content && <div ref={ref} aria-hidden style={{ position: 'fixed', left: -10000, top: 0 }}>{content}</div>}
    </>
  )
}
