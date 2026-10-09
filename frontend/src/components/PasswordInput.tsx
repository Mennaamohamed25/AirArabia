import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './icons'

/** Password field with a show/hide eye button. */
export default function PasswordInput({ value, onChange, id, placeholder, autoComplete, required, minLength }: {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
}) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={visible ? 'text' : 'password'} className="input pe-12" value={value} placeholder={placeholder}
        autoComplete={autoComplete} required={required} minLength={minLength} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => setVisible((v) => !v)} data-testid="toggle-password"
        aria-label={visible ? t('login.hidePassword') : t('login.showPassword')} title={visible ? t('login.hidePassword') : t('login.showPassword')}
        className="absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-2xl text-slate-400 transition hover:text-brand-600">
        <Icon name={visible ? 'eyeOff' : 'eye'} className="size-5" />
      </button>
    </div>
  )
}
