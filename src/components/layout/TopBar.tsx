import { polygonArea } from '../../core/geometry/polygon'
import { useProjectStore } from '../../store/projectStore'

export function TopBar() {
  const project = useProjectStore((state) => state.project)
  const roomDraft = useProjectStore((state) => state.roomDraft)
  const viewMode = useProjectStore((state) => state.viewMode)
  const setViewMode = useProjectStore((state) => state.setViewMode)
  const reset = useProjectStore((state) => state.reset)

  const boundary = project.room.boundary
  const area = boundary.length >= 3 ? Math.abs(polygonArea(boundary)) : 0

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-800 px-4">
      <h1 className="text-sm font-semibold tracking-wide">Room Response Studio</h1>
      <span data-testid="room-status" className="text-xs text-slate-400">
        {boundary.length >= 3
          ? `Room: ${boundary.length} vertices · ${area.toFixed(1)} m²`
          : roomDraft.length > 0
            ? `Drawing: ${roomDraft.length} points`
            : 'No room yet'}
      </span>
      <div className="ml-auto flex items-center gap-1 rounded bg-slate-900 p-1">
        <button
          data-testid="view-2d"
          className={`rounded px-3 py-1 text-xs ${
            viewMode === '2d' ? 'bg-teal-500 text-slate-950' : 'text-slate-300'
          }`}
          onClick={() => setViewMode('2d')}
        >
          2D
        </button>
        <button
          data-testid="view-3d"
          className={`rounded px-3 py-1 text-xs ${
            viewMode === '3d' ? 'bg-teal-500 text-slate-950' : 'text-slate-300'
          }`}
          onClick={() => setViewMode('3d')}
        >
          3D
        </button>
      </div>
      <button
        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
        onClick={reset}
      >
        New
      </button>
    </header>
  )
}
