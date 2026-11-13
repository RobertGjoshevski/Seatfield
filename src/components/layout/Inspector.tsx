import { useEffect, useState } from 'react'
import { coverageSpacingFor } from '../../core/geometry/coverage'
import {
  axisAlignedRectangle,
  edgeLengths,
} from '../../core/geometry/dimensions'
import { polygonArea, polygonBounds } from '../../core/geometry/polygon'
import type { ResolutionMultiplier, RoomShape, SpaceKind } from '../../core/types'
import { useProjectStore } from '../../store/projectStore'
import { NumberField } from '../ui/NumberField'

const FREQUENCY_PRESETS = [63, 125, 250, 500, 1000, 2000, 4000]

function formatPreset(frequencyHz: number): string {
  return frequencyHz >= 1000 ? `${frequencyHz / 1000} kHz` : `${frequencyHz}`
}

export function Inspector() {
  const project = useProjectStore((state) => state.project)
  const selectedId = useProjectStore((state) => state.selectedId)
  const selectedIds = useProjectStore((state) => state.selectedIds)
  const canPasteSpeakers = useProjectStore(
    (state) => (state.speakerClipboard?.speakers.length ?? 0) > 0,
  )
  const activeTool = useProjectStore((state) => state.activeTool)
  const roomShape = useProjectStore((state) => state.roomShape)
  const rectangleAnchor = useProjectStore((state) => state.rectangleAnchor)
  const rectangleWidth = useProjectStore((state) => state.rectangleWidth)
  const rectangleDepth = useProjectStore((state) => state.rectangleDepth)
  const segmentLengthM = useProjectStore((state) => state.segmentLengthM)
  const roomDraft = useProjectStore((state) => state.roomDraft)
  const updateRoom = useProjectStore((state) => state.updateRoom)
  const setRoomShape = useProjectStore((state) => state.setRoomShape)
  const setRectangleWidth = useProjectStore((state) => state.setRectangleWidth)
  const setRectangleDepth = useProjectStore((state) => state.setRectangleDepth)
  const setSegmentLength = useProjectStore((state) => state.setSegmentLength)
  const setRoomWidth = useProjectStore((state) => state.setRoomWidth)
  const setRoomDepth = useProjectStore((state) => state.setRoomDepth)
  const resizeRoomEdge = useProjectStore((state) => state.resizeRoomEdge)
  const updateSpeaker = useProjectStore((state) => state.updateSpeaker)
  const removeSpeakers = useProjectStore((state) => state.removeSpeakers)
  const copySpeakers = useProjectStore((state) => state.copySpeakers)
  const pasteSpeakers = useProjectStore((state) => state.pasteSpeakers)
  const updateListener = useProjectStore((state) => state.updateListener)
  const resolutionMultiplier = useProjectStore(
    (state) => state.resolutionMultiplier,
  )
  const setResolutionMultiplier = useProjectStore(
    (state) => state.setResolutionMultiplier,
  )
  const setSpaceKind = useProjectStore((state) => state.setSpaceKind)
  const previewFrequencyHz = useProjectStore((state) => state.previewFrequencyHz)
  const setPreviewFrequencyHz = useProjectStore(
    (state) => state.setPreviewFrequencyHz,
  )
  const [segmentDraft, setSegmentDraft] = useState('')

  useEffect(() => {
    if (segmentLengthM === null) setSegmentDraft('')
  }, [segmentLengthM])

  const speaker = project.speakers.find((item) => item.id === selectedId)
  const selectedSpeakerIds = project.speakers
    .filter((item) => selectedIds.includes(item.id))
    .map((item) => item.id)
  const selectedObjectIds = project.objects
    .filter((item) => selectedIds.includes(item.id))
    .map((item) => item.id)
  const roomKind = project.room.kind
  const boundary = project.room.boundary
  const resolution =
    boundary.length >= 3
      ? coverageSpacingFor(polygonBounds(boundary), resolutionMultiplier)
      : null
  const area = boundary.length >= 3 ? Math.abs(polygonArea(boundary)) : 0
  const rectangle = axisAlignedRectangle(boundary)
  const walls = edgeLengths(boundary)
  const drawingRectangle =
    rectangleAnchor !== null &&
    (activeTool === 'room' || activeTool === 'object')
  const drawingPolygon =
    activeTool === 'room' && roomShape === 'polygon' && roomDraft.length > 0
  const reflectionOrder = useProjectStore((state) => state.reflectionOrder)
  const setReflectionOrder = useProjectStore((state) => state.setReflectionOrder)
  const updateObject = useProjectStore((state) => state.updateObject)
  const removeObjects = useProjectStore((state) => state.removeObjects)
  const objectSquare = useProjectStore((state) => state.objectSquare)
  const setObjectSquare = useProjectStore((state) => state.setObjectSquare)
  const object = project.objects.find((item) => item.id === selectedId)

  return (
    <aside
      data-testid="inspector"
      className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-slate-800 p-4"
    >
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Room
        </h2>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Space">
          {(
            [
              ['room', 'Room'],
              ['open', 'Open'],
            ] as const
          ).map(([kind, label]) => (
            <button
              key={kind}
              type="button"
              data-testid={`space-${kind}`}
              aria-pressed={roomKind === kind}
              className={`rounded px-2 py-1 text-xs ${
                roomKind === kind
                  ? 'bg-teal-500 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              onClick={() => setSpaceKind(kind as SpaceKind)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {(['polygon', 'rectangle'] as RoomShape[]).map((shape) => (
            <button
              key={shape}
              type="button"
              data-testid={`room-shape-${shape}`}
              aria-pressed={roomShape === shape}
              className={`rounded px-2 py-1 text-xs capitalize ${
                roomShape === shape
                  ? 'bg-teal-500 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              onClick={() => setRoomShape(shape)}
            >
              {shape}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          {boundary.length >= 3
            ? `${boundary.length} vertices · ${area.toFixed(2)} m²`
            : roomKind === 'open'
              ? 'The outline is the audience area.'
              : 'Draw a room in the 2D view.'}
        </div>
        {roomKind === 'open' && (
          <p className="text-[11px] leading-snug text-slate-500">
            Open space has no walls. The outline is the area you are mapping.
            Speakers can sit outside it.
          </p>
        )}
        {activeTool === 'object' && (
          <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
            Square
            <input
              type="checkbox"
              data-testid="object-square"
              className="h-4 w-4 accent-teal-500"
              checked={objectSquare}
              onChange={(event) => setObjectSquare(event.target.checked)}
            />
          </label>
        )}
        {drawingRectangle && activeTool === 'object' && (
          <div className="text-xs text-slate-500">New object footprint</div>
        )}
        {drawingRectangle && (
          <>
            <NumberField
              label="Width"
              value={rectangleWidth}
              step={0.01}
              inputRole="rectangle-size"
              onChange={setRectangleWidth}
              unit="m"
            />
            <NumberField
              label="Depth"
              value={rectangleDepth}
              step={0.01}
              inputRole="rectangle-size"
              onChange={setRectangleDepth}
              unit="m"
            />
          </>
        )}
        {!drawingRectangle && rectangle && (
          <>
            <NumberField
              label="Width"
              value={rectangle.width}
              min={0.05}
              step={0.01}
              onChange={setRoomWidth}
              unit="m"
            />
            <NumberField
              label="Depth"
              value={rectangle.depth}
              min={0.05}
              step={0.01}
              onChange={setRoomDepth}
              unit="m"
            />
          </>
        )}
        {!drawingRectangle && !rectangle &&
          walls.map((length, index) => (
            <NumberField
              key={`wall-${index}`}
              label={`Wall ${index + 1}`}
              value={length}
              min={0.05}
              step={0.01}
              onChange={(value) => resizeRoomEdge(index, value)}
              unit="m"
            />
          ))}
        {drawingPolygon && (
          <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
            Segment length
            <span className="flex items-center gap-1">
              <input
                data-testid="segment-length"
                data-role="segment-length"
                className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
                inputMode="decimal"
                value={segmentDraft}
                placeholder="m"
                onChange={(event) => {
                  const raw = event.target.value
                  setSegmentDraft(raw)
                  if (raw.trim() === '') {
                    setSegmentLength(null)
                    return
                  }
                  const next = Number(raw)
                  setSegmentLength(Number.isFinite(next) ? next : null)
                }}
              />
              <span className="w-5 text-[10px] text-slate-500">m</span>
            </span>
          </label>
        )}
        {roomKind === 'room' && (
          <>
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
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {object
            ? selectedObjectIds.length > 1
              ? 'Objects'
              : 'Object'
            : speaker
              ? selectedSpeakerIds.length > 1
                ? 'Speakers'
                : 'Speaker'
              : 'Listener'}
        </h2>
        {object ? (
          <>
            {selectedObjectIds.length > 1 && (
              <p className="text-[11px] leading-snug text-slate-500">
                {`${selectedObjectIds.length} objects selected. Size applies to each of them, and position moves the group. The name stays on ${object.name}.`}
              </p>
            )}
            <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
              Object name
              <input
                className="w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs text-slate-100 outline-none focus:border-teal-500"
                value={object.name}
                onChange={(event) =>
                  updateObject(object.id, { name: event.target.value })
                }
              />
            </label>
            <NumberField
              label="Position X"
              value={object.position.x}
              step={0.05}
              onChange={(value) =>
                updateObject(object.id, {
                  position: { ...object.position, x: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Position Y"
              value={object.position.y}
              step={0.05}
              onChange={(value) =>
                updateObject(object.id, {
                  position: { ...object.position, y: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Position Z"
              value={object.position.z}
              min={0}
              max={Math.max(0, project.room.height - 0.05)}
              step={0.05}
              onChange={(value) =>
                updateObject(object.id, {
                  position: { ...object.position, z: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Object width"
              value={object.width}
              min={0.05}
              step={0.05}
              onChange={(value) => updateObject(object.id, { width: value })}
              unit="m"
            />
            <NumberField
              label="Object depth"
              value={object.depth}
              min={0.05}
              step={0.05}
              onChange={(value) => updateObject(object.id, { depth: value })}
              unit="m"
            />
            <NumberField
              label="Height"
              value={object.height}
              min={0.05}
              max={Math.max(0.05, project.room.height - object.position.z)}
              step={0.05}
              onChange={(value) => updateObject(object.id, { height: value })}
              unit="m"
            />
            <p className="text-[11px] leading-snug text-slate-500">
              Drawn as a rectangle on the floor plan and extruded by height.
              Position Z is the base. The solid blocks sound and reflects it
              like a wall.
            </p>
            <button
              className="mt-1 w-full rounded border border-rose-900/70 px-2 py-1 text-xs text-rose-300 hover:bg-rose-950/40"
              onClick={() =>
                removeObjects(
                  selectedObjectIds.length > 0 ? selectedObjectIds : [object.id],
                )
              }
            >
              {selectedObjectIds.length > 1 ? 'Remove objects' : 'Remove object'}
            </button>
          </>
        ) : speaker ? (
          <>
            {selectedSpeakerIds.length > 1 && (
              <p className="text-[11px] leading-snug text-slate-500">
                {`${selectedSpeakerIds.length} speakers selected. Changes apply to all of them, and position moves the group. The name stays on ${speaker.name}.`}
              </p>
            )}
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
              label="Position X"
              value={speaker.position.x}
              step={0.05}
              onChange={(value) =>
                updateSpeaker(speaker.id, {
                  position: { ...speaker.position, x: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Position Y"
              value={speaker.position.y}
              step={0.05}
              onChange={(value) =>
                updateSpeaker(speaker.id, {
                  position: { ...speaker.position, y: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Acoustic height"
              value={speaker.position.z}
              min={0.1}
              max={roomKind === 'open' ? 40 : project.room.height}
              step={0.05}
              onChange={(value) =>
                updateSpeaker(speaker.id, {
                  position: { ...speaker.position, z: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Cabinet width"
              value={speaker.widthM}
              min={0.05}
              max={5}
              step={0.05}
              onChange={(value) =>
                updateSpeaker(speaker.id, {
                  widthM: Math.min(5, Math.max(0.05, value)),
                })
              }
              unit="m"
            />
            <NumberField
              label="Cabinet depth"
              value={speaker.depthM}
              min={0.05}
              max={5}
              step={0.05}
              onChange={(value) =>
                updateSpeaker(speaker.id, {
                  depthM: Math.min(5, Math.max(0.05, value)),
                })
              }
              unit="m"
            />
            <NumberField
              label="Cabinet height"
              value={speaker.heightM}
              min={0.05}
              max={5}
              step={0.05}
              onChange={(value) =>
                updateSpeaker(speaker.id, {
                  heightM: Math.min(5, Math.max(0.05, value)),
                })
              }
              unit="m"
            />
            <NumberField
              label="Aim"
              value={speaker.yawDeg}
              min={-180}
              max={180}
              step={5}
              onChange={(value) => updateSpeaker(speaker.id, { yawDeg: value })}
              unit="°"
            />
            <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
              Phase flip
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-500"
                checked={speaker.phaseInverted}
                onChange={(event) =>
                  updateSpeaker(speaker.id, {
                    phaseInverted: event.target.checked,
                  })
                }
              />
            </label>
            <NumberField
              label="Delay"
              value={speaker.delayMs}
              min={0}
              max={100}
              step={0.1}
              onChange={(value) => updateSpeaker(speaker.id, { delayMs: value })}
              unit="ms"
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
            <label className="flex items-center justify-between gap-3 text-xs text-slate-400">
              Enabled
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-500"
                checked={speaker.enabled}
                onChange={(event) =>
                  updateSpeaker(speaker.id, { enabled: event.target.checked })
                }
              />
            </label>
            <p className="text-[11px] leading-snug text-slate-500">
              Sound leaves the front face, where the arrow is. Aim steers the
              beam above 200 Hz. At bass the speaker still radiates all around,
              so turning it only moves the source to the other face. Phase flip
              and delay move the peaks and nulls when another speaker is on.
            </p>
            <p className="text-[11px] leading-snug text-slate-500">
              Drag a rectangle in the plan to select speakers and objects.
              Ctrl+click adds or removes one. Ctrl+C copies the speakers and
              Ctrl+V pastes them 0.5 m up and to the right.
            </p>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => copySpeakers()}
              >
                Copy speakers
              </button>
              <button
                type="button"
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canPasteSpeakers}
                onClick={() => pasteSpeakers()}
              >
                Paste speakers
              </button>
            </div>
            <button
              className="mt-1 w-full rounded border border-rose-900/70 px-2 py-1 text-xs text-rose-300 hover:bg-rose-950/40"
              onClick={() =>
                removeSpeakers(
                  selectedSpeakerIds.length > 0
                    ? selectedSpeakerIds
                    : [speaker.id],
                )
              }
            >
              {selectedSpeakerIds.length > 1 ? 'Remove speakers' : 'Remove speaker'}
            </button>
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
            <NumberField
              label="Position X"
              value={project.listener.position.x}
              step={0.05}
              onChange={(value) =>
                updateListener({
                  position: { ...project.listener.position, x: value },
                })
              }
              unit="m"
            />
            <NumberField
              label="Position Y"
              value={project.listener.position.y}
              step={0.05}
              onChange={(value) =>
                updateListener({
                  position: { ...project.listener.position, y: value },
                })
              }
              unit="m"
            />
            <div className="text-xs text-slate-500">
              Drag a marker to move it, or select a speaker to edit it.
              Ctrl+click speakers to select several, then Ctrl+C and Ctrl+V to
              duplicate them.
            </div>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Preview
        </h2>
        <NumberField
          label="Frequency"
          value={previewFrequencyHz}
          min={20}
          max={8000}
          step={1}
          onChange={setPreviewFrequencyHz}
          unit="Hz"
        />
        <div className="text-xs text-slate-400">
          {roomKind === 'open' ? 'Ground' : 'Reflection order'}
        </div>
        {roomKind === 'open' ? (
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="Ground reflection">
            <button
              type="button"
              data-testid="ground-direct"
              aria-pressed={reflectionOrder === 0}
              className={`rounded px-1 py-1 text-[11px] ${
                reflectionOrder === 0
                  ? 'bg-teal-500 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              onClick={() => setReflectionOrder(0)}
            >
              Direct
            </button>
            <button
              type="button"
              data-testid="ground-bounce"
              aria-pressed={reflectionOrder >= 1}
              className={`rounded px-1 py-1 text-[11px] ${
                reflectionOrder >= 1
                  ? 'bg-teal-500 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              onClick={() => {
                if (reflectionOrder < 1) setReflectionOrder(1)
              }}
            >
              Ground
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="Reflection order">
            {(
              [
                [0, 'Direct'],
                [1, '1st'],
                [2, '2nd'],
                [3, '3rd'],
              ] as const
            ).map(([order, label]) => (
              <button
                key={order}
                type="button"
                data-testid={`reflection-order-${order}`}
                aria-pressed={reflectionOrder === order}
                className={`rounded px-1 py-1 text-[11px] ${
                  reflectionOrder === order
                    ? 'bg-teal-500 text-slate-950'
                    : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                onClick={() => setReflectionOrder(order)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] leading-snug text-slate-500">
          {roomKind === 'open'
            ? 'Direct is the straight path. Ground adds the floor bounce. Walls and the ceiling stay off.'
            : 'Direct keeps the straight path. 1st, 2nd, and 3rd add that many bounces off the room and any solid objects. Bass modes ignore this until an object is in the room.'}
        </p>
        <div className="flex flex-wrap gap-1">
          {FREQUENCY_PRESETS.map((frequency) => (
            <button
              key={frequency}
              type="button"
              data-testid={`frequency-${frequency}`}
              className={`rounded px-2 py-1 text-[11px] ${
                previewFrequencyHz === frequency
                  ? 'bg-teal-500 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              onClick={() => setPreviewFrequencyHz(frequency)}
            >
              {formatPreset(frequency)}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-400">Resolution</div>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Resolution">
          {([0.5, 1, 2] as ResolutionMultiplier[]).map((value) => (
            <button
              key={value}
              type="button"
              data-testid={`resolution-${value}`}
              aria-pressed={resolutionMultiplier === value}
              className={`rounded px-1 py-1 text-[11px] ${
                resolutionMultiplier === value
                  ? 'bg-teal-500 text-slate-950'
                  : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              onClick={() => setResolutionMultiplier(value)}
            >
              {value}×
            </button>
          ))}
        </div>
        {resolution && (
          <p className="text-[11px] text-slate-500">
            {resolution.spacing.toFixed(2)} m · {resolution.nx}×{resolution.ny}
          </p>
        )}
        {resolution?.capped && (
          <p className="text-[11px] leading-snug text-slate-500">
            Capped so this area stays responsive.
          </p>
        )}
      </section>
    </aside>
  )
}
