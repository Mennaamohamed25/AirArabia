import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { homeFor, useAuth } from '../api/auth'
import { ApiError } from '../api/client'
import { Brand, LanguageToggle } from '../components/Layout'
import { Alert } from '../components/ui'
import { Icon } from '../components/icons'
import PasswordInput from '../components/PasswordInput'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user.role)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = await login(email, password)
      navigate(homeFor(u.role), { replace: true })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t('login.failed') : err instanceof Error ? err.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Brand light />
        <div className="relative z-10 max-w-md">
          <h2 className="text-5xl font-extrabold leading-tight tracking-tight">{t('driver.ready')}</h2>
          <p className="mt-4 text-lg text-white/80">{t('app.tagline')}</p>
        </div>
        <Icon name="plane" className="absolute -bottom-24 -end-24 size-[30rem] text-white/10" strokeWidth={1} />
        <div className="absolute -top-32 -start-32 size-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <div className="lg:hidden"><Brand /></div>
          <LanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <form onSubmit={submit} className="w-full max-w-sm space-y-5">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{t('login.title')}</h1>
              <p className="mt-1 text-slate-500">{t('login.subtitle')}</p>
            </div>
            {error && <Alert>{error}</Alert>}
            <div>
              <label className="label" htmlFor="email">{t('login.email')}</label>
              <input id="email" type="email" className="input" autoComplete="username" autoCapitalize="none" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="password">{t('login.password')}</label>
              <PasswordInput id="password" autoComplete="current-password" value={password} onChange={setPassword} required />
            </div>
            <button className="btn-primary w-full py-3.5 text-base" disabled={busy}>{busy ? t('common.loading') : t('login.submit')}</button>
          </form>
        </div>
      </div>
    </div>
  )
}
