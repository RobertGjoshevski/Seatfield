import { useEffect } from 'react'
import { useProjectStore } from '../../store/projectStore'
import { useSvgViewport } from '../../hooks/useSvgViewport'
import { snap } from '../../lib/math'

export function Viewport2D() {
  const project = useProjectStore((state) => state.project)
  const activeTool = useProjectStore((state) => state.activeTool)
  const roomDraft = useProjectStore((state) => state.roomDraft)
  const addRoomPoint = useProjectStore((state) => state.addRoomPoint)
  const closeRoom = useProjectStore((state) => state.closeRoom)
  const cancelRoom = useProjectStore((state) => state.cancelRoom)
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
        cancelRoom()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTool, closeRoom, cancelRoom])

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.shiftKey) return
    if (activeTool !== 'room') return
    const point = screenToWorld(event.clientX, event.clientY)
    addRoomPoint({ x: snap(point.x, 0.25), y: snap(point.y, 0.25) })
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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
      </svg>
      {activeTool === 'room' && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-900/90 px-3 py-2 text-xs text-slate-300 ring-1 ring-slate-700">
          Click to place points. Press Enter to close. Esc to cancel.
        </div>
      )}
    </div>
  )
}
