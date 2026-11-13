import { useId, useState } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  inputRole?: string
}

function parseDraft(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') {
    return null
  }
  const next = Number(trimmed)
  return Number.isFinite(next) ? next : null
}

function inRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  return true
}

function clampToRange(value: number, min?: number, max?: number): number {
  let next = value
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  return next
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit,
  inputRole,
}: NumberFieldProps) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')
  const shown = focused ? draft : Number.isFinite(value) ? String(value) : ''

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-xs text-slate-400">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
          value={shown}
          min={min}
          max={max}
          step={step}
          data-role={inputRole}
          onFocus={() => {
            setFocused(true)
            setDraft(Number.isFinite(value) ? String(value) : '')
          }}
          onChange={(event) => {
            const raw = event.target.value
            setDraft(raw)
            // Keep partial numbers such as "5" while typing "50".
            // Clamping here would replace 5 with the minimum before the next digit.
            const next = parseDraft(raw)
            if (next === null || !inRange(next, min, max)) return
            onChange(next)
          }}
          onBlur={() => {
            const next = parseDraft(draft)
            setFocused(false)
            if (next === null) return
            onChange(clampToRange(next, min, max))
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
        {unit && <span className="w-5 text-[10px] text-slate-500">{unit}</span>}
      </div>
    </div>
  )
}
