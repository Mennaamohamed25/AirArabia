import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from './icons'

export interface Option<T extends string> {
  value: T
  label: string
}

/** Branded dropdown (the native <select> popup can't be styled). Keyboard: ↑ ↓ Enter Esc. */
export default function Select<T extends string>({ value, onChange, options, ariaLabel, className = '', testId }: {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  ariaLabel?: string
  className?: string
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const choose = (i: number) => {
    onChange(options[i].value)
    setOpen(false)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return setOpen(false)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return show()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a + step + options.length) % options.length)
    }
    if ((e.key === 'Enter' || e.key === ' ') && open) {
      e.preventDefault()
      choose(active)
    }
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      <button type="button" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-controls={listId} data-testid={testId}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}
        className={`input flex items-center justify-between gap-3 text-start ${open ? 'bg-white ring-2 ring-brand-500' : 'hover:bg-slate-200/70'}`}>
        <span className="truncate">{selected?.label ?? ''}</span>
        <Icon name="chevron" className={`size-4 shrink-0 text-slate-500 transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={ariaLabel}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
          {options.map((o, i) => {
            const isSelected = o.value === value
            return (
              <li key={o.value} role="option" aria-selected={isSelected}
                onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm transition
                  ${i === active ? 'bg-brand-50' : ''} ${isSelected ? 'font-bold text-brand-700' : 'font-medium text-ink'}`}>
                {o.label}
                {isSelected && <Icon name="check" className="size-4 text-brand-600" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
