import { useId } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit,
}: NumberFieldProps) {
  const id = useId()

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
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(next)
          }}
        />
        {unit && <span className="w-5 text-[10px] text-slate-500">{unit}</span>}
      </div>
    </div>
  )
}
