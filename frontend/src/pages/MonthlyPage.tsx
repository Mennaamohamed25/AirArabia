import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../api/auth'
import { api } from '../api/client'
import type { MonthSummary } from '../api/types'
import { currentMonth, date, km, money, monthLabel, shiftMonth } from '../lib/format'
import { exportMonthExcel } from '../lib/exporters'
import { MonthReport, PdfButton } from '../components/Receipt'
import { RideCard } from './RidesPage'
import { Alert, Empty, errorText, PageHeader, Spinner, Stat, useLoad } from '../components/ui'
import { Icon } from '../components/icons'

export default function MonthlyPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isDriver = user?.role === 'Driver'
  const [month, setMonth] = useState(currentMonth())
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const { data, error, loading, setData } = useLoad(() => api<MonthSummary>(`/api/months/${month}`), [month])

  const close = async () => {
    if (!data || !window.confirm(`${t('monthly.confirmClose', { month: monthLabel(month) })}${data.unapprovedCount ? `\n${t('monthly.unapproved', { count: data.unapprovedCount })}` : ''}`)) return
    setBusy(true)
    try {
      setData(await api<MonthSummary>(`/api/months/${month}/close`, { method: 'POST' }))
      setMsg({ kind: 'success', text: t('monthly.closedOk') })
    } catch (e) {
      setMsg({ kind: 'error', text: errorText(e, t('common.error')) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={isDriver ? t('monthly.statement') : t('monthly.title')}
        actions={data && (
          <>
            <PdfButton filename={`${isDriver ? 'statement' : 'monthly-report'}-${month}.pdf`} label={t('monthly.exportPdf')} testId="export-pdf"
              render={() => <MonthReport summary={data} driverName={isDriver ? user?.fullName : undefined} />} />
            {!isDriver && (
              <button className="btn-ghost" onClick={() => exportMonthExcel(data)} data-testid="export-excel">
                <Icon name="download" className="size-4" />{t('monthly.exportExcel')}
              </button>
            )}
          </>
        )} />

      <div className="card flex items-center justify-between gap-3 p-3">
        <button className="btn-ghost size-11 p-0" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="previous month">
          <Icon name="chevron" className="size-5 rotate-180 rtl:rotate-0" />
        </button>
        <div className="text-center">
          <div className="text-lg font-extrabold" data-testid="month-label">{monthLabel(month)}</div>
          {data && (
            <span className={`text-xs font-bold ${data.closed ? 'text-violet-700' : 'text-emerald-700'}`} data-testid="month-state">
              {data.closed ? t('monthly.closed') : t('monthly.open')}
            </span>
          )}
        </div>
        <button className="btn-ghost size-11 p-0" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="next month">
          <Icon name="chevron" className="size-5 rtl:rotate-180" />
        </button>
      </div>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error ? <Alert>{errorText(error, t('common.error'))}</Alert> : null}
      {loading ? <Spinner /> : data && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label={t('monthly.ridesCount')} value={data.grandTotal.rides} icon="list" />
            <Stat label={t('common.distance')} value={km(data.grandTotal.km)} icon="route" />
            <Stat label={t('common.fuel')} value={money(data.grandTotal.fuel)} icon="fuel" />
            <Stat label={t('monthly.grand')} value={<span data-testid="grand-total">{money(data.grandTotal.total)}</span>} accent />
          </div>

          {data.closed && data.closedBy && (
            <Alert kind="info">{t('monthly.closedBy', { name: data.closedBy, date: date(data.closedAt) })}</Alert>
          )}

          {!isDriver && (
            <div className="card overflow-x-auto p-5">
              <h2 className="mb-3 font-extrabold">{t('monthly.perDriver')}</h2>
              {data.drivers.length === 0 ? <p className="text-sm text-slate-400">{t('common.none')}</p> : (
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="text-start text-xs uppercase tracking-wide text-slate-500">
                    {[t('common.driver'), t('monthly.ridesCount'), t('common.distance'), t('common.fuel'), t('common.fees'), t('common.total')].map((h) => (
                      <th key={h} className="pb-2 text-start font-bold">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.drivers.map((d) => (
                      <tr key={d.driverId} className="border-t border-slate-100">
                        <td className="py-3 font-semibold">{d.name}</td><td>{d.rides}</td><td>{km(d.km)}</td>
                        <td>{money(d.fuel)}</td><td>{money(d.fees)}</td><td className="font-extrabold">{money(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!data.closed && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <p className="text-sm text-slate-500">{data.unapprovedCount > 0 && t('monthly.unapproved', { count: data.unapprovedCount })}</p>
                  <button className="btn-primary" onClick={() => void close()} disabled={busy} data-testid="close-month">
                    <Icon name="check" className="size-4" />{t('monthly.close')}
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <h2 className="mb-3 font-extrabold">{t('monthly.ridesInMonth')}</h2>
            {data.rides.length ? (
              <div className="grid gap-3">{data.rides.map((r) => <RideCard key={r.id} ride={r} showDriver={!isDriver} />)}</div>
            ) : <Empty>{t('rides.empty')}</Empty>}
          </div>
        </>
      )}
    </div>
  )
}
