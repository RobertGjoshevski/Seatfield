import { CircleHelp } from 'lucide-react'
import { useRef, useState } from 'react'
import { polygonArea } from '../../core/geometry/polygon'
import { captureProjectSnapshot } from '../../hooks/useProjectPersistence'
import {
  downloadPersistedProject,
  parsePersistedProject,
  savePersistedProject,
} from '../../lib/persistence'
import { useProjectStore } from '../../store/projectStore'
import type { PersistenceStatus } from '../../hooks/useProjectPersistence'

interface TopBarProps {
  persistenceStatus?: PersistenceStatus
  onSave?: () => boolean
  onShowGuide?: () => void
}

export function TopBar({
  persistenceStatus = 'saved',
  onSave,
  onShowGuide,
}: TopBarProps) {
  const project = useProjectStore((state) => state.project)
  const roomDraft = useProjectStore((state) => state.roomDraft)
  const viewMode = useProjectStore((state) => state.viewMode)
  const setViewMode = useProjectStore((state) => state.setViewMode)
  const reset = useProjectStore((state) => state.reset)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const busy = persistenceStatus === 'loading'

  const boundary = project.room.boundary
  const area = boundary.length >= 3 ? Math.abs(polygonArea(boundary)) : 0

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-800 px-4">
      <h1 className="text-sm font-semibold tracking-wide">Seatfield</h1>
      <span data-testid="room-status" className="text-xs text-slate-400">
        {boundary.length >= 3
          ? `${project.room.kind === 'open' ? 'Open' : 'Room'}: ${boundary.length} vertices · ${area.toFixed(1)} m²`
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
      <span
        data-testid="persistence-status"
        className={`text-[11px] ${
          persistenceStatus === 'error' ? 'text-rose-400' : 'text-slate-500'
        }`}
      >
        {persistenceStatus === 'loading'
          ? 'Loading…'
          : persistenceStatus === 'saving'
            ? 'Saving…'
            : persistenceStatus === 'error'
              ? 'Save failed'
              : 'Saved'}
      </span>
      {loadError ? (
        <span data-testid="setup-error" className="text-[11px] text-rose-400">
          {loadError}
        </span>
      ) : null}
      <button
        type="button"
        data-testid="show-guide"
        className="inline-flex items-center gap-1 rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
        onClick={() => onShowGuide?.()}
      >
        <CircleHelp size={14} />
        Guide
      </button>
      <button
        data-testid="save-setup"
        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        disabled={busy}
        onClick={() => {
          setLoadError(null)
          if (onSave) onSave()
          else savePersistedProject(captureProjectSnapshot())
        }}
      >
        Save
      </button>
      <button
        data-testid="export-setup"
        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        disabled={busy}
        onClick={() => {
          setLoadError(null)
          downloadPersistedProject(captureProjectSnapshot())
        }}
      >
        Export
      </button>
      <button
        data-testid="load-setup"
        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
      >
        Load
      </button>
      <input
        ref={fileInputRef}
        data-testid="load-setup-file"
        className="hidden"
        type="file"
        accept="application/json,.json,.rrs.json"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          void file.text().then((raw) => {
            const snapshot = parsePersistedProject(raw)
            if (!snapshot) {
              setLoadError('Could not load that setup')
              return
            }
            useProjectStore.getState().applySnapshot(snapshot)
            savePersistedProject(snapshot)
            setLoadError(null)
          })
        }}
      />
      <button
        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
        onClick={reset}
      >
        New
      </button>
    </header>
  )
}
