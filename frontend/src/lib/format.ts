import i18n from '../i18n'

const locale = () => (i18n.language === 'ar' ? 'ar-EG' : 'en-GB')
const TZ = 'Africa/Cairo'

export const money = (n: number) =>
  `${n.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${i18n.t('common.egp')}`

export const km = (n: number) => `${n.toLocaleString(locale(), { maximumFractionDigits: 2 })} ${i18n.t('common.km')}`

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(locale(), { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const date = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(locale(), { timeZone: TZ, dateStyle: 'medium' }) : '—'

export const time = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString(locale(), { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '—'

export const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function duration(fromIso: string, toIso?: string | null) {
  const ms = Math.max(0, (toIso ? new Date(toIso).getTime() : Date.now()) - new Date(fromIso).getTime())
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Current month in Cairo time as yyyy-MM. */
export function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export const bytes = (n: number) =>
  n > 1 << 20 ? `${(n / (1 << 20)).toFixed(1)} MB` : `${Math.max(0, n / 1024).toFixed(0)} KB`
