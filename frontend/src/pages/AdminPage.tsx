import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import type { FuelPrice, Role, Settings, Storage, User } from '../api/types'
import { bytes, date, money } from '../lib/format'
import PasswordInput from '../components/PasswordInput'
import Select from '../components/Select'
import { Icon } from '../components/icons'
import { useAuth } from '../api/auth'
import { Alert, errorText, PageHeader, Spinner, Stat, useLoad } from '../components/ui'

type Tab = 'users' | 'fuel' | 'settings' | 'storage'
const ROLES: Role[] = ['Driver', 'Manager', 'HR']
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

function useAction() {
  const { t } = useTranslation()
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const run = async <T,>(fn: () => Promise<T>, ok?: (result: T) => string) => {
    try {
      const result = await fn()
      setMsg({ kind: 'success', text: ok ? ok(result) : t('admin.saved') })
      return true
    } catch (e) {
      setMsg({ kind: 'error', text: errorText(e, t('common.error')) })
      return false
    }
  }
  return { msg, run, view: msg && <Alert kind={msg.kind}>{msg.text}</Alert> }
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-lg font-extrabold">{title}</h2>
      {children}
    </div>
  )
}

export default function AdminPage() {
  const { t } = useTranslation()
  const tabs: Tab[] = ['users', 'fuel', 'settings', 'storage']
  const [tab, setTab] = useState<Tab>(tabs[0])

  return (
    <div>
      <PageHeader title={t('admin.title')} />
      {(
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((x) => (
            <button key={x} onClick={() => setTab(x)} className={`tab shrink-0 ${tab === x ? 'tab-active' : 'bg-white ring-1 ring-slate-200'}`}>
              {t(`admin.${x}`)}
            </button>
          ))}
        </div>
      )}
      {tab === 'users' && <UsersTab />}
      {tab === 'fuel' && <FuelTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'storage' && <StorageTab />}
    </div>
  )
}

function UsersTab() {
  const { t } = useTranslation()
  const { data, loading, reload } = useLoad(() => api<User[]>('/api/admin/users'), [])
  const { run, view } = useAction()
  const roleOptions = ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))
  const [form, setForm] = useState({ email: '', fullName: '', role: 'Driver' as Role, password: '', kmPerLiter: '' })
  const [editing, setEditing] = useState<(Omit<User, 'kmPerLiter'> & { password: string; kmPerLiter: string }) | null>(null)
  const kpl = (v: string) => (v.trim() === '' ? null : Number(v))
  const [deleting, setDeleting] = useState<User | null>(null)
  const list = useAction()
  const { user: me } = useAuth()

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (await run(() => api('/api/admin/users', { method: 'POST', json: { ...form, kmPerLiter: kpl(form.kmPerLiter) } }))) {
      setForm({ email: '', fullName: '', role: 'Driver', password: '', kmPerLiter: '' })
      void reload()
    }
  }
  const save = async () => {
    if (!editing) return
    if (await list.run(() => api(`/api/admin/users/${editing.id}`, { method: 'PUT', json: { ...editing, kmPerLiter: kpl(editing.kmPerLiter) } }))) {
      setEditing(null)
      void reload()
    }
  }
  const remove = async (u: User) => {
    setDeleting(null)
    if (await list.run(() => api(`/api/admin/users/${u.id}`, { method: 'DELETE' }), () => t('admin.deleted', { name: u.fullName })))
      void reload()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Panel title={t('admin.users')}>
          {list.view && <div className="mb-3">{list.view}</div>}
          {loading ? <Spinner /> : (
            <ul className="divide-y divide-slate-100">
              {data?.map((u) => (
                <li key={u.id} className="py-3">
                  {editing?.id === u.id ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="input" type="email" aria-label={t('login.email')} value={editing.email}
                        onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                      <input className="input" aria-label={t('admin.fullName')} value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
                      <Select ariaLabel={t('admin.role')} value={editing.role} options={roleOptions}
                        onChange={(role) => setEditing({ ...editing, role })} />
                      <PasswordInput placeholder={t('admin.resetPassword')} value={editing.password} autoComplete="new-password"
                        onChange={(password) => setEditing({ ...editing, password })} />
                      {editing.role === 'Driver' && (
                        <KmPerLiterInput value={editing.kmPerLiter} onChange={(kmPerLiter) => setEditing({ ...editing, kmPerLiter })} />
                      )}
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
                        {t('common.active')}
                      </label>
                      <div className="flex gap-2 sm:col-span-2">
                        <button className="btn-primary" onClick={() => void save()}>{t('common.save')}</button>
                        <button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
                      </div>
                    </div>
                  ) : deleting?.id === u.id ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-200" data-testid="confirm-delete">
                      <div className="text-sm">
                        <div className="font-bold text-brand-800">{t('admin.confirmDelete', { name: u.fullName })}</div>
                        <div className="text-brand-700">{t('admin.deleteHint')}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-ghost" onClick={() => setDeleting(null)}>{t('common.cancel')}</button>
                        <button className="btn-primary" onClick={() => void remove(u)}>{t('admin.delete')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold">{u.fullName} {!u.isActive && <span className="text-xs text-brand-700">({t('common.inactive')})</span>}</div>
                        <div className="text-xs text-slate-500">{u.email} · {t(`role.${u.role}`)}{u.role === 'Driver' && ` · ${u.kmPerLiter ?? t('admin.defaultShort')} km/L`}</div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button className="btn-ghost" onClick={() => setEditing({ ...u, password: '', kmPerLiter: u.kmPerLiter?.toString() ?? '' })}>{t('common.edit')}</button>
                        {u.id !== me?.id && (
                          <button className="btn-danger px-3" onClick={() => setDeleting(u)} aria-label={`${t('admin.delete')} ${u.fullName}`}
                            title={t('admin.delete')} data-testid="delete-user">
                            <Icon name="trash" className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title={t('admin.newUser')}>
        <form onSubmit={create} className="space-y-3">
          {view}
          <input className="input" type="email" placeholder={t('login.email')} value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder={t('admin.fullName')} value={form.fullName} required onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Select ariaLabel={t('admin.role')} value={form.role} options={roleOptions} onChange={(role) => setForm({ ...form, role })} />
          <PasswordInput placeholder={t('login.password')} value={form.password} required minLength={6} autoComplete="new-password"
            onChange={(password) => setForm({ ...form, password })} />
          {form.role === 'Driver' && <KmPerLiterInput value={form.kmPerLiter} onChange={(kmPerLiter) => setForm({ ...form, kmPerLiter })} />}
          <button className="btn-primary w-full">{t('common.add')}</button>
        </form>
      </Panel>
    </div>
  )
}

function KmPerLiterInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <label className="block sm:col-span-2">
      <span className="label">{t('admin.driverKpl')}</span>
      <input className="input" inputMode="decimal" placeholder={t('admin.kplPlaceholder')} value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^d.]/g, ''))} />
      <span className="mt-1 block text-xs text-slate-400">{t('admin.kplHint')}</span>
    </label>
  )
}

/** Shows what any distance costs with the current 92 price, so HR knows what to pay. */
function TripCalculator({ price }: { price: number }) {
  const { t } = useTranslation()
  const settings = useLoad(() => api<Settings>('/api/admin/settings'), [])
  const [distance, setDistance] = useState('100')
  const [kplText, setKplText] = useState('')
  const kpl = Number(kplText) || settings.data?.defaultKmPerLiter || 10
  const km = Number(distance) || 0
  const liters = km / kpl
  const perKm = price / kpl
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
  return (
    <Panel title={t('calc.title')}>
      <p className="-mt-2 mb-4 text-sm text-slate-500">{t('calc.subtitle')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">{t('calc.distance')}</span>
          <input className="input" inputMode="decimal" value={distance} data-testid="calc-km"
            onChange={(e) => setDistance(e.target.value.replace(/[^d.]/g, ''))} />
        </label>
        <label className="block"><span className="label">{t('calc.kpl')}</span>
          <input className="input" inputMode="decimal" value={kplText} placeholder={String(settings.data?.defaultKmPerLiter ?? 10)}
            onChange={(e) => setKplText(e.target.value.replace(/[^d.]/g, ''))} />
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label={t('calc.perKm')} value={<span data-testid="calc-per-km">{money(r2(perKm))}</span>} icon="route" />
        <Stat label={t('calc.liters')} value={`${r2(liters)} ${t('pay.l')}`} icon="fuel" />
        <Stat label={t('calc.pay')} value={<span data-testid="calc-total">{money(r2(km * perKm))}</span>} icon="wallet" accent />
      </div>
      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600" dir="ltr">
        {km} km ÷ {kpl} km/L = {r2(liters)} L × {price} EGP = {r2(km * perKm).toFixed(2)} EGP
      </p>
    </Panel>
  )
}

function FuelTab() {
  const { t } = useTranslation()
  const { data, loading, reload } = useLoad(() => api<FuelPrice[]>('/api/admin/fuel-prices'), [])
  const { run, view } = useAction()
  const [price, setPrice] = useState('')
  const [from, setFrom] = useState(today())
  const current = data?.find((p) => p.effectiveFrom <= today())

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (await run(() => api('/api/admin/fuel-prices', { method: 'POST', json: { pricePerLiter: Number(price), effectiveFrom: from } }))) {
      setPrice('')
      void reload()
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {current && <Stat label={`${t('admin.current')} · ${t('ride.fuelPrice')}`} value={<span data-testid="current-price">{money(current.pricePerLiter)}</span>} icon="fuel" accent />}
        {current && <TripCalculator price={current.pricePerLiter} />}
        <Panel title={t('admin.fuel')}>
          {loading ? <Spinner /> : (
            <ul className="divide-y divide-slate-100">
              {data?.map((p) => (
                <li key={p.id} className="flex justify-between py-3 text-sm">
                  <span>{t('admin.effectiveFrom')} {date(`${p.effectiveFrom}T12:00:00Z`)}</span>
                  <b>{money(p.pricePerLiter)}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <Panel title={t('admin.addPrice')}>
        <form onSubmit={add} className="space-y-3">
          {view}
          <label className="block"><span className="label">{t('admin.price')}</span>
            <input className="input" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} data-testid="price-input" />
          </label>
          <label className="block"><span className="label">{t('admin.effectiveFrom')}</span>
            <input className="input" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <button className="btn-primary w-full">{t('common.save')}</button>
        </form>
      </Panel>
    </div>
  )
}

function SettingsTab() {
  const { t } = useTranslation()
  const { data, loading, setData } = useLoad(() => api<Settings>('/api/admin/settings'), [])
  const { run, view } = useAction()
  if (loading || !data) return <Spinner />
  const field = (key: keyof Settings, label: string) => (
    <label className="block"><span className="label">{label}</span>
      <input className="input" inputMode="decimal" value={data[key]} onChange={(e) => setData({ ...data, [key]: Number(e.target.value) || 0 })} />
    </label>
  )
  return (
    <div className="max-w-lg">
      <Panel title={t('admin.settings')}>
        <div className="space-y-3">
          {view}
          {field('retentionMonths', t('admin.retention'))}
          {field('mismatchPercent', t('admin.mismatch'))}
          {field('longRideHours', t('admin.longRide'))}
          {field('defaultKmPerLiter', t('admin.defaultKpl'))}
          <p className="text-xs text-slate-400">{t('admin.defaultKplHint')}</p>
          <button className="btn-primary w-full" onClick={() => void run(() => api('/api/admin/settings', { method: 'PUT', json: data }))}>
            {t('common.save')}
          </button>
        </div>
      </Panel>
    </div>
  )
}

function StorageTab() {
  const { t } = useTranslation()
  const { data, loading, reload } = useLoad(() => api<Storage>('/api/admin/storage'), [])
  const { run, view } = useAction()
  if (loading || !data) return <Spinner />
  const pct = Math.min(100, (data.databaseBytes / data.limitBytes) * 100)
  const cleanup = async () => {
    await run(() => api<{ photosDeleted: number; routesCleared: number }>('/api/admin/cleanup', { method: 'POST' }),
      (r) => t('admin.cleanupDone', { photos: r.photosDeleted, routes: r.routesCleared }))
    void reload()
  }
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex justify-between text-sm font-semibold">
          <span>{t('admin.dbSize')}: {bytes(data.databaseBytes)}</span>
          <span className="text-slate-500">{t('admin.limit')}: {bytes(data.limitBytes)}</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${pct > 80 ? 'bg-brand-600' : 'bg-emerald-500'}`} style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('admin.photoSize')} value={`${bytes(data.photoBytes)} · ${data.photoCount}`} icon="camera" />
        <Stat label={t('admin.ridesStored')} value={data.rideCount} icon="route" />
        <Stat label={t('admin.pointsStored')} value={data.pointCount} icon="pin" />
      </div>
      {view}
      <button className="btn-primary" onClick={() => void cleanup()}>{t('admin.runCleanup')}</button>
    </div>
  )
}
