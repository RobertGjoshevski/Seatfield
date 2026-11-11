import { useCallback, useRef, useState } from 'react'
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

interface PanState {
  startX: number
  startY: number
  view: ViewBox
}

export function useSvgViewport(initial: ViewBox) {
  const [view, setView] = useState<ViewBox>(initial)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const panRef = useRef<PanState | null>(null)

  const onWheel = useCallback((event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    setView((current) => {
      const fractionX = (event.clientX - rect.left) / rect.width
      const fractionY = (event.clientY - rect.top) / rect.height
      const worldX = current.x + fractionX * current.w
      const worldY = current.y + fractionY * current.h
      const scale = Math.exp(event.deltaY * 0.001)
      const nextW = current.w * scale
      const nextH = current.h * scale
      return {
        x: worldX - fractionX * nextW,
        y: worldY - fractionY * nextH,
        w: nextW,
        h: nextH,
      }
    })
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 1 && !event.shiftKey) return
      event.currentTarget.setPointerCapture(event.pointerId)
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        view,
      }
    },
    [view],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const pan = panRef.current
      if (!pan) return
      const rect = event.currentTarget.getBoundingClientRect()
      const dx = ((event.clientX - pan.startX) / rect.width) * pan.view.w
      const dy = ((event.clientY - pan.startY) / rect.height) * pan.view.h
      setView({
        ...pan.view,
        x: pan.view.x - dx,
        y: pan.view.y - dy,
      })
    },
    [],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      panRef.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    [],
  )

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const transformed = point.matrixTransform(matrix.inverse())
    return { x: transformed.x, y: -transformed.y }
  }, [])

  return {
    view,
    setView,
    svgRef,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    screenToWorld,
  }
}
