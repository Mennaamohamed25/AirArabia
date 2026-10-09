import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { compressToDataUrl } from '../lib/photo'
import { Icon } from './icons'

/** Camera/file picker that compresses the image on the phone before upload. */
export default function PhotoInput({ label, value, onChange, testId }: {
  label: string
  value: string | null
  onChange: (dataUrl: string | null) => void
  testId?: string
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      onChange(await compressToDataUrl(file))
    } catch {
      onChange(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="size-16 rounded-xl object-cover ring-1 ring-slate-200" />
          <button type="button" className="btn-ghost" onClick={() => onChange(null)}>{t('common.remove')}</button>
        </div>
      ) : (
        <label className="btn-ghost w-full cursor-pointer border-2 border-dashed border-slate-200 py-4 ring-0">
          <Icon name="camera" className="size-5 text-brand-600" />
          {busy ? t('common.loading') : label}
          <input type="file" accept="image/*" capture="environment" className="sr-only" data-testid={testId}
            onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
      )}
    </div>
  )
}
