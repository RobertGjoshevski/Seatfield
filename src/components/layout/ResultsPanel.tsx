import { Headphones, RefreshCw } from 'lucide-react'
import { powerSumDb, splAtPoint } from '../../core/acoustics/directField'
import { useCoverageHeatmap } from '../../hooks/useCoverageHeatmap'
import { useProjectStore } from '../../store/projectStore'

function formatDb(value: number | undefined, digits = 1): string {
  return value === undefined || !Number.isFinite(value)
    ? '—'
    : `${value.toFixed(digits)} dB`
}

interface StatProps {
  label: string
  value: string
  testId: string
}

function Stat({ label, value, testId }: StatProps) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div data-testid={testId} className="font-mono text-sm text-slate-100">
        {value}
      </div>
    </div>
  )
}

export function ResultsPanel() {
  const { status, stats, gradientCss, minDb, maxDb } = useCoverageHeatmap()
  const coverage = useProjectStore((state) => state.coverage)
  const speakers = useProjectStore((state) => state.project.speakers)
  const listener = useProjectStore((state) => state.project.listener)
  const bumpPreview = useProjectStore((state) => state.bumpPreview)

  const enabledSpeakers = speakers.filter((speaker) => speaker.enabled)
  const listenerLevel =
    enabledSpeakers.length > 0
      ? powerSumDb(
          enabledSpeakers.map((speaker) =>
            splAtPoint(speaker, {
              x: listener.position.x,
              y: listener.position.y,
              z: listener.earHeight,
            }),
          ),
        )
      : undefined

  const statusLabel =
    status === 'running'
      ? 'Computing…'
      : status === 'ready'
        ? 'Ready'
        : status === 'error'
          ? 'Error'
          : 'Waiting for a room'
  const statusTone =
    status === 'error'
      ? 'text-rose-400'
      : status === 'ready'
        ? 'text-emerald-400'
        : 'text-slate-400'

  return (
    <footer
      data-testid="results-panel"
      className="flex h-40 shrink-0 gap-8 overflow-hidden border-t border-slate-800 px-4 py-3"
    >
      <section className="w-56 shrink-0 space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </h2>
        <div className="flex items-center gap-2">
          <span
            data-testid="coverage-status"
            className={`text-xs font-medium ${statusTone}`}
          >
            {statusLabel}
          </span>
          <button
            data-testid="recompute"
            className="ml-auto flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
            onClick={bumpPreview}
          >
            <RefreshCw size={12} />
            Recompute
          </button>
        </div>
        <div className="text-[11px] text-slate-500">
          {coverage.elapsedMs !== null
            ? `${coverage.elapsedMs.toFixed(0)} ms`
            : 'Direct-field preview'}
        </div>
        <div className="max-h-14 space-y-1 overflow-y-auto">
          {coverage.warnings.map((warning) => (
            <div key={warning} className="text-[11px] text-amber-300">
              {warning}
            </div>
          ))}
          {coverage.error && (
            <div className="text-[11px] text-rose-400">{coverage.error}</div>
          )}
        </div>
      </section>

      <section className="min-w-0 flex-1">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Coverage
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <Stat
            label="Minimum"
            value={formatDb(stats?.minDb)}
            testId="coverage-min"
          />
          <Stat
            label="Mean"
            value={formatDb(stats?.meanDb)}
            testId="coverage-mean"
          />
          <Stat
            label="Maximum"
            value={formatDb(stats?.maxDb)}
            testId="coverage-max"
          />
          <Stat
            label="Std dev"
            value={formatDb(stats?.stdDevDb)}
            testId="coverage-stddev"
          />
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500">
          <span>
            Points <span data-testid="coverage-points">{stats?.count ?? '—'}</span>
          </span>
          <span>Relative dB · direct field only</span>
        </div>
      </section>

      <section className="w-64 shrink-0">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Level
        </h2>
        <div
          className="h-3 rounded ring-1 ring-slate-700"
          style={{ background: gradientCss }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>{minDb} dB</span>
          <span>{maxDb} dB</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Headphones size={14} />
          Listener
          <span
            data-testid="listener-level"
            className="ml-auto font-mono text-slate-100"
          >
            {formatDb(listenerLevel)}
          </span>
        </div>
      </section>
    </footer>
  )
}
