import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export const GUIDE_STORAGE_KEY = 'seatfield:guide:v1'

const steps = [
  {
    title: 'Draw the room',
    body: 'A 5 × 4 m room is already here. To draw your own, choose Room on the left, click the corners, then press Enter. For a box, choose Rectangle in the side panel and drag two corners.',
  },
  {
    title: 'Place sound',
    body: 'Left and Right already face the listener. Choose Speaker or Listener and click in the view to add another. Drag a marker to move it.',
  },
  {
    title: 'Read the map',
    body: 'Color is relative loudness. The bottom bar shows minimum, mean, and maximum. Move a speaker to compare placements.',
  },
  {
    title: 'Look around',
    body: 'Switch 2D / 3D at the top. Scroll to zoom. Middle-drag, or Shift-drag, to pan. Esc cancels a drawing.',
  },
]

export function guideWasDismissed(): boolean {
  try {
    return localStorage.getItem(GUIDE_STORAGE_KEY) === 'dismissed'
  } catch {
    return false
  }
}

export function rememberGuideDismissed(): void {
  try {
    localStorage.setItem(GUIDE_STORAGE_KEY, 'dismissed')
  } catch {
    // Private browsing can block storage. The card still closes for this visit.
  }
}

export function useGuideOpen(): {
  open: boolean
  show: () => void
  dismiss: () => void
} {
  const [open, setOpen] = useState(() => !guideWasDismissed())
  const show = useCallback(() => setOpen(true), [])
  const dismiss = useCallback(() => {
    rememberGuideDismissed()
    setOpen(false)
  }, [])
  return { open, show, dismiss }
}

interface GuideProps {
  open: boolean
  onDismiss: () => void
}

export function Guide({ open, onDismiss }: GuideProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onDismiss()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, onDismiss])

  if (!open) return null

  return (
    <section
      data-testid="guide"
      role="dialog"
      aria-labelledby="guide-title"
      className="absolute bottom-4 left-4 z-20 w-80 max-w-[calc(100%-2rem)] rounded-lg border border-slate-700 bg-slate-900/95 p-4 shadow-xl shadow-black/40"
    >
      <div className="mb-3 flex items-start gap-3">
        <h2 id="guide-title" className="text-sm font-semibold text-slate-100">
          Start here
        </h2>
        <button
          type="button"
          aria-label="Close guide"
          className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          onClick={onDismiss}
        >
          <X size={14} />
        </button>
      </div>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-2 text-xs leading-snug">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500 text-[11px] font-semibold text-slate-950">
              {index + 1}
            </span>
            <span>
              <span className="font-medium text-slate-100">{step.title}. </span>
              <span className="text-slate-400">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] leading-snug text-slate-500">
        Objects block and reflect sound. Reflection order is in the side panel.
        New restores this room.
      </p>
      <button
        type="button"
        data-testid="dismiss-guide"
        className="mt-3 rounded bg-teal-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-teal-400"
        onClick={onDismiss}
      >
        Got it
      </button>
    </section>
  )
}
