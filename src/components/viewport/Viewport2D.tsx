import { useEffect, useState } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useSvgViewport } from '../../hooks/useSvgViewport'
import { CoverageOverlay2D } from './CoverageOverlay2D'
import { degToRad, snap } from '../../lib/math'

type DragTarget = { kind: 'speaker' | 'listener'; id: string }

export function Viewport2D() {
  const project = useProjectStore((state) => state.project)
  const activeTool = useProjectStore((state) => state.activeTool)
  const roomDraft = useProjectStore((state) => state.roomDraft)
  const selectedId = useProjectStore((state) => state.selectedId)
  const addRoomPoint = useProjectStore((state) => state.addRoomPoint)
  const closeRoom = useProjectStore((state) => state.closeRoom)
  const cancelRoom = useProjectStore((state) => state.cancelRoom)
  const addSpeaker = useProjectStore((state) => state.addSpeaker)
  const updateSpeaker = useProjectStore((state) => state.updateSpeaker)
  const setListener = useProjectStore((state) => state.setListener)
  const select = useProjectStore((state) => state.select)
  const setTool = useProjectStore((state) => state.setTool)
  const [drag, setDrag] = useState<DragTarget | null>(null)
  const {
    view,
    svgRef,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    screenToWorld,
  } = useSvgViewport({ x: -2, y: -8, w: 12, h: 10 })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && activeTool === 'room') {
        closeRoom()
      }
      if (event.key === 'Escape') {
        setDrag(null)
        cancelRoom()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTool, closeRoom, cancelRoom])

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.shiftKey) return
    const point = screenToWorld(event.clientX, event.clientY)
    const snapped = { x: snap(point.x, 0.25), y: snap(point.y, 0.25) }
    if (activeTool === 'room') addRoomPoint(snapped)
    if (activeTool === 'speaker') addSpeaker(snapped)
    if (activeTool === 'listener') setListener(snapped)
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drag) return
    onPointerDown(event)
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) {
      onPointerMove(event)
      return
    }

    const point = screenToWorld(event.clientX, event.clientY)
    const snapped = { x: snap(point.x, 0.25), y: snap(point.y, 0.25) }
    if (drag.kind === 'speaker') {
      const speaker = project.speakers.find((item) => item.id === drag.id)
      if (speaker) {
        updateSpeaker(drag.id, {
          position: { ...speaker.position, x: snapped.x, y: snapped.y },
        })
      }
    } else {
      setListener(snapped)
    }
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
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
    event: React.PointerEvent<SVGGElement>,
    target: DragTarget,
  ) => {
    if (event.button !== 0 || event.shiftKey) return
    event.stopPropagation()
    event.preventDefault()
    select(target.id)
    if (activeTool !== 'select') setTool('select')
    setDrag(target)
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
      />,
    )
  }

  const roomPoints = project.room.boundary
    .map((point) => `${point.x},${-point.y}`)
    .join(' ')
  const draftPoints = roomDraft
    .map((point) => `${point.x},${-point.y}`)
    .join(' ')

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
        style={{ cursor: activeTool === 'room' ? 'crosshair' : 'default' }}
      >
        <rect
          x={view.x}
          y={view.y}
          width={view.w}
          height={view.h}
          fill="#0b0f14"
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
          />
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
          const angle = degToRad(speaker.yawDeg)
          const dx = -Math.sin(angle)
          const dy = -Math.cos(angle)
          const selected = selectedId === speaker.id
          const dragging = drag?.id === speaker.id
          return (
            <g
              key={speaker.id}
              data-testid="speaker-marker"
              transform={`translate(${speaker.position.x},${-speaker.position.y})`}
              className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
              onPointerDown={(event) =>
                startDrag(event, { kind: 'speaker', id: speaker.id })
              }
            >
              {selected && (
                <circle
                  r={view.w * 0.019}
                  fill="none"
                  stroke="#fde68a"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              <circle
                data-testid="speaker-dot"
                r={view.w * 0.012}
                fill="#f59e0b"
                stroke="#fbbf24"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={0}
                y1={0}
                x2={dx * view.w * 0.04}
                y2={dy * view.w * 0.04}
                stroke="#fbbf24"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
        <g
          data-testid="listener-marker"
          transform={`translate(${project.listener.position.x},${-project.listener.position.y})`}
          className={drag?.id === project.listener.id ? 'cursor-grabbing' : 'cursor-grab'}
          onPointerDown={(event) =>
            startDrag(event, { kind: 'listener', id: project.listener.id })
          }
        >
          {selectedId === project.listener.id && (
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
      </svg>
      {activeTool !== 'select' && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-900/90 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700">
          {activeTool === 'room'
            ? 'Click to place points. Press Enter to close. Esc to cancel.'
            : activeTool === 'speaker'
              ? 'Click to place a speaker.'
              : 'Click to place the listener.'}
        </div>
      )}
    </div>
  )
}
