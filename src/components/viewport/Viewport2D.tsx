import { useEffect, useRef, useState } from 'react'
import { edgeLength, pointAtDistance, rectangleFromCorner } from '../../core/geometry/dimensions'
import { polygonBounds } from '../../core/geometry/polygon'
import { idsInsideMarquee } from '../../core/geometry/selection'
import type { Speaker, Vec2 } from '../../core/types'
import type { SelectionEdit } from '../../store/projectStore'
import { useProjectStore } from '../../store/projectStore'
import { useSvgViewport } from '../../hooks/useSvgViewport'
import { CoverageOverlay2D } from './CoverageOverlay2D'
import { degToRad, snap } from '../../lib/math'

function DimensionLabel({
  a,
  b,
  fontSize,
}: {
  a: Vec2
  b: Vec2
  fontSize: number
}) {
  const length = edgeLength(a, b)
  if (!Number.isFinite(length) || length <= 0) return null
  const midX = (a.x + b.x) / 2
  const midY = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const span = Math.hypot(dx, dy) || 1
  const offset = fontSize * 0.75
  return (
    <text
      x={midX + (-dy / span) * offset}
      y={-(midY + (dx / span) * offset)}
      fill="#e2e8f0"
      stroke="#0b0f14"
      strokeWidth={fontSize * 0.14}
      paintOrder="stroke"
      fontSize={fontSize}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ pointerEvents: 'none' }}
    >
      {length.toFixed(2)} m
    </text>
  )
}

/** Local +X is the front width. Local −Y is the aim, matching yaw 0. */
function speakerPlanPoints(
  speaker: Speaker,
  corners: ReadonlyArray<readonly [number, number]>,
): string {
  const theta = degToRad(speaker.yawDeg)
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  return corners
    .map(([lx, ly]) => {
      const x = speaker.position.x + lx * cos + ly * sin
      const y = speaker.position.y - lx * sin + ly * cos
      return `${x},${-y}`
    })
    .join(' ')
}

function EdgeDimensions({
  points,
  closed,
  fontSize,
}: {
  points: Vec2[]
  closed: boolean
  fontSize: number
}) {
  if (points.length < 2) return null
  const count = closed ? points.length : points.length - 1
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <DimensionLabel
          key={`edge-${index}-${points[index].x}-${points[index].y}`}
          a={points[index]}
          b={points[(index + 1) % points.length]}
          fontSize={fontSize}
        />
      ))}
    </>
  )
}

type PlanPoint = { id: string; x: number; y: number }

type DragTarget = {
  id: string
  anchorX: number
  anchorY: number
  speakers: PlanPoint[]
  objects: PlanPoint[]
  listener: { x: number; y: number } | null
}

type DragStart =
  | { kind: 'speaker' | 'listener'; id: string }
  | { kind: 'object'; id: string; pointerX: number; pointerY: number }

type MarqueeDrag = {
  start: Vec2
  current: Vec2
  originX: number
  originY: number
  mode: SelectionEdit
  armed: boolean
}

const MARQUEE_DRAG_PX = 4

export function Viewport2D() {
  const project = useProjectStore((state) => state.project)
  const activeTool = useProjectStore((state) => state.activeTool)
  const roomShape = useProjectStore((state) => state.roomShape)
  const roomDraft = useProjectStore((state) => state.roomDraft)
  const rectangleAnchor = useProjectStore((state) => state.rectangleAnchor)
  const rectangleWidth = useProjectStore((state) => state.rectangleWidth)
  const rectangleDepth = useProjectStore((state) => state.rectangleDepth)
  const segmentLengthM = useProjectStore((state) => state.segmentLengthM)
  const cursorWorld = useProjectStore((state) => state.cursorWorld)
  const selectedIds = useProjectStore((state) => state.selectedIds)
  const addRoomPoint = useProjectStore((state) => state.addRoomPoint)
  const closeRoom = useProjectStore((state) => state.closeRoom)
  const cancelRoom = useProjectStore((state) => state.cancelRoom)
  const beginRectangle = useProjectStore((state) => state.beginRectangle)
  const updateRectanglePointer = useProjectStore(
    (state) => state.updateRectanglePointer,
  )
  const commitRectangle = useProjectStore((state) => state.commitRectangle)
  const commitObject = useProjectStore((state) => state.commitObject)
  const objectSquare = useProjectStore((state) => state.objectSquare)
  const placeTypedSegment = useProjectStore((state) => state.placeTypedSegment)
  const setCursorWorld = useProjectStore((state) => state.setCursorWorld)
  const addSpeaker = useProjectStore((state) => state.addSpeaker)
  const movePlanItems = useProjectStore((state) => state.movePlanItems)
  const setListener = useProjectStore((state) => state.setListener)
  const select = useProjectStore((state) => state.select)
  const selectMany = useProjectStore((state) => state.selectMany)
  const setTool = useProjectStore((state) => state.setTool)
  const [drag, setDrag] = useState<DragTarget | null>(null)
  const [marquee, setMarquee] = useState<MarqueeDrag | null>(null)
  const marqueeRef = useRef<MarqueeDrag | null>(null)
  const {
    view,
    setView,
    svgRef,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    screenToWorld,
  } = useSvgViewport({ x: -2, y: -8, w: 12, h: 10 })

  const roomKind = project.room.kind

  useEffect(() => {
    if (roomKind !== 'open') return
    const outline = useProjectStore.getState().project.room.boundary
    if (outline.length < 3) return
    const bounds = polygonBounds(outline)
    const spanX = bounds.maxX - bounds.minX
    const spanY = bounds.maxY - bounds.minY
    if (!(spanX > 0) || !(spanY > 0)) return
    const padX = spanX * 0.15
    const padY = spanY * 0.15
    setView({
      x: bounds.minX - padX,
      y: -(bounds.maxY + padY),
      w: spanX + padX * 2,
      h: spanY + padY * 2,
    })
  }, [roomKind, setView])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrag(null)
        marqueeRef.current = null
        setMarquee(null)
        cancelRoom()
        select(null)
        return
      }
      if (event.key !== 'Enter') return
      if (activeTool === 'object' && rectangleAnchor) {
        event.preventDefault()
        commitObject()
        return
      }
      if (activeTool !== 'room') return

      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        const role = target.dataset.role
        if (role !== 'segment-length' && role !== 'rectangle-size') return
      }

      if (roomShape === 'rectangle' && rectangleAnchor) {
        event.preventDefault()
        commitRectangle()
        return
      }

      if (
        roomShape === 'polygon' &&
        segmentLengthM !== null &&
        segmentLengthM > 0 &&
        roomDraft.length > 0
      ) {
        event.preventDefault()
        placeTypedSegment()
        return
      }

      closeRoom()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    activeTool,
    roomShape,
    rectangleAnchor,
    segmentLengthM,
    roomDraft.length,
    closeRoom,
    cancelRoom,
    commitRectangle,
    commitObject,
    placeTypedSegment,
    select,
    setMarquee,
  ])

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.shiftKey) return
    const point = screenToWorld(event.clientX, event.clientY)
    const snapped = { x: snap(point.x, 0.25), y: snap(point.y, 0.25) }
    if (activeTool === 'object') {
      if (!rectangleAnchor) beginRectangle(snapped)
      else commitObject(snapped, objectSquare)
      return
    }
    if (activeTool === 'room') {
      if (roomShape === 'rectangle') {
        if (!rectangleAnchor) beginRectangle(snapped)
        else commitRectangle(snapped)
        return
      }
      addRoomPoint(snapped)
    }
    if (activeTool === 'speaker') addSpeaker(snapped)
    if (activeTool === 'listener') setListener(snapped)
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drag) return
    onPointerDown(event)
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = screenToWorld(event.clientX, event.clientY)
    setCursorWorld(point)
    const marqueeDrag = marqueeRef.current
    if (marqueeDrag) {
      const armed =
        marqueeDrag.armed ||
        Math.hypot(event.clientX - marqueeDrag.originX, event.clientY - marqueeDrag.originY) >=
          MARQUEE_DRAG_PX
      const next = { ...marqueeDrag, current: point, armed }
      marqueeRef.current = next
      setMarquee(next)
      return
    }
    if (
      !drag &&
      rectangleAnchor &&
      ((activeTool === 'room' && roomShape === 'rectangle') ||
        activeTool === 'object')
    ) {
      updateRectanglePointer(
        {
          x: snap(point.x, 0.25),
          y: snap(point.y, 0.25),
        },
        activeTool === 'object' && objectSquare,
      )
    }
    if (!drag) {
      onPointerMove(event)
      return
    }

    const snapped = { x: snap(point.x, 0.25), y: snap(point.y, 0.25) }
    const dx = snapped.x - drag.anchorX
    const dy = snapped.y - drag.anchorY
    movePlanItems({
      speakers: drag.speakers.map((item) => ({
        id: item.id,
        x: item.x + dx,
        y: item.y + dy,
      })),
      objects: drag.objects.map((item) => ({
        id: item.id,
        x: item.x + dx,
        y: item.y + dy,
      })),
      listener: drag.listener
        ? { x: drag.listener.x + dx, y: drag.listener.y + dy }
        : null,
    })
  }

  const finishMarquee = (pending: MarqueeDrag) => {
    if (pending.armed) {
      const listenerRadius = view.w * 0.02
      selectMany(
        idsInsideMarquee(
          useProjectStore.getState().project,
          pending.start,
          pending.current,
          listenerRadius,
        ),
        pending.mode,
      )
      return
    }
    if (pending.mode === 'replace') select(null)
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const pending = marqueeRef.current
    if (pending) {
      marqueeRef.current = null
      setMarquee(null)
      finishMarquee(pending)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }
    if (!drag) {
      onPointerUp(event)
      return
    }
    setDrag(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const startDrag = (
    event: React.PointerEvent<SVGElement>,
    target: DragStart,
  ) => {
    if (event.button !== 0) return
    if (event.altKey) {
      event.stopPropagation()
      event.preventDefault()
      selectMany([target.id], 'subtract')
      if (activeTool !== 'select') setTool('select')
      return
    }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
      event.stopPropagation()
      event.preventDefault()
      select(target.id, 'toggle')
      if (activeTool !== 'select') setTool('select')
      return
    }
    if (event.shiftKey) return
    event.stopPropagation()
    event.preventDefault()

    const snapshot = useProjectStore.getState()
    const keep = snapshot.selectedIds.includes(target.id)
    if (!keep) select(target.id)
    const ids = new Set(keep ? snapshot.selectedIds : [target.id])
    const speakers = snapshot.project.speakers
      .filter((speaker) => ids.has(speaker.id))
      .map((speaker) => ({
        id: speaker.id,
        x: speaker.position.x,
        y: speaker.position.y,
      }))
    const objects = snapshot.project.objects
      .filter((object) => ids.has(object.id))
      .map((object) => ({
        id: object.id,
        x: object.position.x,
        y: object.position.y,
      }))
    const listener = ids.has(snapshot.project.listener.id)
      ? {
          x: snapshot.project.listener.position.x,
          y: snapshot.project.listener.position.y,
        }
      : null
    const anchor =
      target.kind === 'object'
        ? { x: target.pointerX, y: target.pointerY }
        : target.kind === 'speaker'
          ? speakers.find((item) => item.id === target.id)
          : listener
    setDrag({
      id: target.id,
      anchorX: anchor?.x ?? 0,
      anchorY: anchor?.y ?? 0,
      speakers,
      objects,
      listener,
    })

    if (activeTool !== 'select') setTool('select')
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  const step = view.w > 24 ? 2 : view.w > 12 ? 1 : 0.25
  const gridLines: React.ReactNode[] = []
  const startX = Math.floor(view.x / step) * step
  const endX = view.x + view.w
  for (let x = startX; x <= endX; x += step) {
    gridLines.push(
      <line
        key={`x-${x}`}
        x1={x}
        y1={view.y}
        x2={x}
        y2={view.y + view.h}
        stroke="#1e293b"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'none' }}
      />,
    )
  }
  const startY = Math.floor(view.y / step) * step
  const endY = view.y + view.h
  for (let y = startY; y <= endY; y += step) {
    gridLines.push(
      <line
        key={`y-${y}`}
        x1={view.x}
        y1={y}
        x2={view.x + view.w}
        y2={y}
        stroke="#1e293b"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'none' }}
      />,
    )
  }

  const roomPoints = project.room.boundary
    .map((point) => `${point.x},${-point.y}`)
    .join(' ')
  const draftPoints = roomDraft
    .map((point) => `${point.x},${-point.y}`)
    .join(' ')
  const fontSize = view.w * 0.02
  const rectanglePreview =
    rectangleAnchor !== null
      ? rectangleFromCorner(rectangleAnchor, rectangleWidth, rectangleDepth)
      : null
  const rectanglePreviewPoints = rectanglePreview
    ?.map((point) => `${point.x},${-point.y}`)
    .join(' ')
  const draftEnd = roomDraft[roomDraft.length - 1]
  const rubberEnd =
    draftEnd && cursorWorld && activeTool === 'room' && roomShape === 'polygon'
      ? segmentLengthM !== null && segmentLengthM > 0
        ? (pointAtDistance(draftEnd, cursorWorld, segmentLengthM) ?? cursorWorld)
        : cursorWorld
      : null

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        data-testid="viewport-2d"
        className="h-full w-full touch-none"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onWheel={onWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        style={{
          cursor:
            activeTool === 'room' ||
            activeTool === 'object' ||
            activeTool === 'select'
              ? 'crosshair'
              : 'default',
        }}
      >
        <rect
          x={view.x}
          y={view.y}
          width={view.w}
          height={view.h}
          fill="#0b0f14"
          onPointerDown={(event) => {
            if (activeTool !== 'select' || event.button !== 0 || event.shiftKey) {
              return
            }
            event.stopPropagation()
            event.preventDefault()
            const point = screenToWorld(event.clientX, event.clientY)
            const mode: SelectionEdit = event.altKey
              ? 'subtract'
              : event.ctrlKey || event.metaKey
                ? 'toggle'
                : 'replace'
            const next: MarqueeDrag = {
              start: point,
              current: point,
              originX: event.clientX,
              originY: event.clientY,
              mode,
              armed: false,
            }
            marqueeRef.current = next
            setMarquee(next)
            svgRef.current?.setPointerCapture(event.pointerId)
          }}
        />
        {gridLines}
        <CoverageOverlay2D />
        {project.room.boundary.length >= 3 && (
          <polygon
            points={roomPoints}
            fill="rgba(20, 184, 166, 0.08)"
            stroke="#2dd4bf"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
        )}
        <EdgeDimensions
          points={project.room.boundary}
          closed
          fontSize={fontSize}
        />
        {project.objects.map((object) => {
          const footprint = rectangleFromCorner(
            object.position,
            object.width,
            object.depth,
          )
          if (!footprint) return null
          const selected = selectedIds.includes(object.id)
          const centerX = object.position.x + object.width / 2
          const centerY = object.position.y + object.depth / 2
          return (
            <g key={object.id}>
              <polygon
                data-testid="room-object"
                points={footprint.map((point) => `${point.x},${-point.y}`).join(' ')}
                fill={selected ? 'rgba(251, 191, 36, 0.45)' : 'rgba(194, 65, 12, 0.4)'}
                stroke={selected ? '#fde68a' : '#fb923c'}
                strokeWidth={selected ? 2.5 : 1.5}
                vectorEffect="non-scaling-stroke"
                className={
                  drag?.objects.some((item) => item.id === object.id)
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
                }
                style={{ pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
                onPointerDown={(event) => {
                  const point = screenToWorld(event.clientX, event.clientY)
                  const snapped = {
                    x: snap(point.x, 0.25),
                    y: snap(point.y, 0.25),
                  }
                  startDrag(event, {
                    kind: 'object',
                    id: object.id,
                    pointerX: snapped.x,
                    pointerY: snapped.y,
                  })
                }}
              />
              {selected && (
                <text
                  x={centerX}
                  y={-centerY}
                  fill="#fde68a"
                  stroke="#0b0f14"
                  strokeWidth={fontSize * 0.14}
                  paintOrder="stroke"
                  fontSize={fontSize}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {object.height.toFixed(2)} m
                </text>
              )}
            </g>
          )
        })}
        {rectanglePreview && rectanglePreviewPoints && (
          <polygon
            data-testid="rectangle-preview"
            points={rectanglePreviewPoints}
            fill="rgba(251, 191, 36, 0.08)"
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {rectanglePreview && (
          <EdgeDimensions points={rectanglePreview} closed fontSize={fontSize} />
        )}
        {roomDraft.length >= 2 && (
          <polyline
            points={draftPoints}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={2}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <EdgeDimensions points={roomDraft} closed={false} fontSize={fontSize} />
        {draftEnd && rubberEnd && (
          <>
            <line
              x1={draftEnd.x}
              y1={-draftEnd.y}
              x2={rubberEnd.x}
              y2={-rubberEnd.y}
              stroke="#fbbf24"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <DimensionLabel a={draftEnd} b={rubberEnd} fontSize={fontSize} />
          </>
        )}
        {roomDraft.map((point, index) => (
          <circle
            key={`draft-${index}`}
            cx={point.x}
            cy={-point.y}
            r={view.w * 0.006}
            fill="#fbbf24"
          />
        ))}
        {project.speakers.map((speaker) => {
          const selected = selectedIds.includes(speaker.id)
          const dragging = drag?.speakers.some((item) => item.id === speaker.id) ?? false
          const halfWidth = speaker.widthM / 2
          const halfDepth = speaker.depthM / 2
          const pad = 0.08
          const cabinet = speakerPlanPoints(speaker, [
            [-halfWidth, -halfDepth],
            [halfWidth, -halfDepth],
            [halfWidth, halfDepth],
            [-halfWidth, halfDepth],
          ])
          const arrowReach = speaker.depthM * 0.65
          const arrowHalf = speaker.widthM * 0.28
          const arrow = speakerPlanPoints(speaker, [
            [0, -halfDepth - arrowReach],
            [-arrowHalf, -halfDepth],
            [arrowHalf, -halfDepth],
          ])
          return (
            <g
              key={speaker.id}
              data-testid="speaker-marker"
              role="button"
              aria-label={speaker.name}
              className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
              onPointerDown={(event) =>
                startDrag(event, { kind: 'speaker', id: speaker.id })
              }
            >
              {selected && (
                <polygon
                  points={speakerPlanPoints(speaker, [
                    [-halfWidth - pad, -halfDepth - pad],
                    [halfWidth + pad, -halfDepth - pad],
                    [halfWidth + pad, halfDepth + pad],
                    [-halfWidth - pad, halfDepth + pad],
                  ])}
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <polygon
                data-testid="speaker-dot"
                points={cabinet}
                fill="#f59e0b"
                stroke="#fbbf24"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <polygon
                data-testid="speaker-arrow"
                points={arrow}
                fill="#fbbf24"
                stroke="#fbbf24"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
        <g
          data-testid="listener-marker"
          transform={`translate(${project.listener.position.x},${-project.listener.position.y})`}
          className={drag?.listener ? 'cursor-grabbing' : 'cursor-grab'}
          onPointerDown={(event) =>
            startDrag(event, { kind: 'listener', id: project.listener.id })
          }
        >
          {selectedIds.includes(project.listener.id) && (
            <circle
              r={view.w * 0.019}
              fill="none"
              stroke="#7dd3fc"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <circle
            data-testid="listener-dot"
            r={view.w * 0.012}
            fill="#0b0f14"
            stroke="#38bdf8"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={-view.w * 0.008}
            y1={0}
            x2={view.w * 0.008}
            y2={0}
            stroke="#38bdf8"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={-view.w * 0.008}
            x2={0}
            y2={view.w * 0.008}
            stroke="#38bdf8"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
        {marquee?.armed && (
          <rect
            data-testid="selection-marquee"
            data-marquee={marquee.current.x < marquee.start.x ? 'crossing' : 'window'}
            x={Math.min(marquee.start.x, marquee.current.x)}
            y={-Math.max(marquee.start.y, marquee.current.y)}
            width={Math.abs(marquee.current.x - marquee.start.x)}
            height={Math.abs(marquee.current.y - marquee.start.y)}
            fill={
              marquee.current.x < marquee.start.x
                ? 'rgba(52, 211, 153, 0.16)'
                : 'rgba(56, 189, 248, 0.16)'
            }
            stroke={marquee.current.x < marquee.start.x ? '#34d399' : '#38bdf8'}
            strokeWidth={1}
            strokeDasharray={marquee.current.x < marquee.start.x ? '5 4' : undefined}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>
      {activeTool === 'select' ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-900/90 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700">
          Drag left to right to select what is fully inside. Drag right to left to select anything the rectangle crosses. Ctrl toggles, Alt removes, Shift+drag pans. Ctrl+C copies speakers.
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-900/90 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700">
          {activeTool === 'room'
            ? roomKind === 'open'
              ? roomShape === 'rectangle'
                ? 'Click two corners of the audience, or type width and depth and press Enter.'
                : 'Click points around the audience. Enter closes. Esc cancels.'
              : roomShape === 'rectangle'
                ? 'Click two corners, or type width and depth and press Enter.'
                : 'Click points, or type a segment length and press Enter. Enter again closes. Esc cancels.'
            : activeTool === 'object'
              ? 'Click two corners. Turn on Square in the side panel for equal sides. Set height and X Y Z there too. Esc cancels.'
              : activeTool === 'speaker'
                ? 'Click to place a speaker.'
                : 'Click to place the listener.'}
        </div>
      )}
    </div>
  )
}
