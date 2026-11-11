import { polygonArea } from '../../core/geometry/polygon'
import { useProjectStore } from '../../store/projectStore'
import { NumberField } from '../ui/NumberField'

export function Inspector() {
  const project = useProjectStore((state) => state.project)
  const selectedId = useProjectStore((state) => state.selectedId)
  const updateRoom = useProjectStore((state) => state.updateRoom)
  const updateSpeaker = useProjectStore((state) => state.updateSpeaker)
  const updateListener = useProjectStore((state) => state.updateListener)
  const setCoverageSpacing = useProjectStore((state) => state.setCoverageSpacing)
  const coverageSpacing = useProjectStore((state) => state.coverageSpacing)

  const speaker = project.speakers.find((item) => item.id === selectedId)
  const boundary = project.room.boundary
  const area = boundary.length >= 3 ? Math.abs(polygonArea(boundary)) : 0

  return (
    <aside
      data-testid="inspector"
      className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-slate-800 p-4"
    >
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Room
        </h2>
        <div className="text-xs text-slate-500">
          {boundary.length >= 3
            ? `${boundary.length} vertices · ${area.toFixed(2)} m²`
            : 'Draw a room in the 2D view.'}
        </div>
        <NumberField
          label="Room height"
          value={project.room.height}
          min={1}
          max={20}
          onChange={(value) => {
            updateRoom({ height: value })
          }}
          unit="m"
        />
        <NumberField
          label="Wall thickness"
          value={project.room.wallThickness}
          min={0.01}
          max={1}
          step={0.01}
          onChange={(value) => {
            updateRoom({ wallThickness: value })
          }}
          unit="m"
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {speaker ? 'Speaker' : 'Listener'}
        </h2>
        {speaker ? (
          <>
            <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
              Speaker name
              <input
                className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
                value={speaker.name}
                onChange={(event) =>
                  updateSpeaker(speaker.id, { name: event.target.value })
                }
              />
            </label>
            <NumberField
              label="Gain"
              value={speaker.gainDb}
              min={-60}
              max={20}
              step={0.5}
              onChange={(value) => updateSpeaker(speaker.id, { gainDb: value })}
              unit="dB"
            />
            <NumberField
              label="Acoustic height"
              value={speaker.position.z}
              min={0.1}
              max={project.room.height}
              step={0.05}
              onChange={(value) =>
                updateSpeaker(speaker.id, {
                  position: { ...speaker.position, z: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Yaw"
              value={speaker.yawDeg}
              min={-180}
              max={180}
              step={5}
              onChange={(value) => updateSpeaker(speaker.id, { yawDeg: value })}
              unit="°"
            />
            <NumberField
              label="Coverage"
              value={speaker.coverageHorizontalDeg}
              min={30}
              max={180}
              step={5}
              onChange={(value) =>
                updateSpeaker(speaker.id, { coverageHorizontalDeg: value })
              }
              unit="°"
            />
          </>
        ) : (
          <>
            <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
              Listener name
              <input
                className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
                value={project.listener.name}
                onChange={(event) =>
                  updateListener({ name: event.target.value })
                }
              />
            </label>
            <NumberField
              label="Ear height"
              value={project.listener.earHeight}
              min={0.5}
              max={2.5}
              step={0.05}
              onChange={(value) => updateListener({ earHeight: value })}
              unit="m"
            />
            <div className="text-xs text-slate-500">
              Select a speaker in the 2D or 3D view to edit it.
            </div>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </h2>
        <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
          Grid spacing
          <select
            className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
            value={coverageSpacing}
            onChange={(event) => setCoverageSpacing(Number(event.target.value))}
          >
            <option value={0.1}>0.10 m</option>
            <option value={0.25}>0.25 m</option>
            <option value={0.5}>0.50 m</option>
            <option value={1}>1.00 m</option>
          </select>
        </label>
      </section>
    </aside>
  )
}
