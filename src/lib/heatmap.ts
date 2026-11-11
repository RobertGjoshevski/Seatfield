import type { CoverageGrid } from '../core/geometry/coverage'
import { clamp } from './math'

export const DEFAULT_HEATMAP_MIN_DB = -30
export const DEFAULT_HEATMAP_MAX_DB = 0

export interface CoverageStats {
  minDb: number
  maxDb: number
  meanDb: number
  stdDevDb: number
  count: number
}

// Viridis sample points. Interpolated at runtime so the heatmap stays
// colorblind-safe without pulling in a color-scale dependency.
const VIRIDIS_STOPS = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 73, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
] as const

export function viridisColor(t: number): [number, number, number] {
  const scaled = clamp(t, 0, 1) * (VIRIDIS_STOPS.length - 1)
  const index = Math.min(
    Math.floor(scaled),
    VIRIDIS_STOPS.length - 2,
  )
  const fraction = scaled - index
  const from = VIRIDIS_STOPS[index]
  const to = VIRIDIS_STOPS[index + 1]

  return [
    Math.round(from[0] + (to[0] - from[0]) * fraction),
    Math.round(from[1] + (to[1] - from[1]) * fraction),
    Math.round(from[2] + (to[2] - from[2]) * fraction),
  ]
}

export function colorForDb(
  valueDb: number,
  minDb: number,
  maxDb: number,
): [number, number, number, number] {
  if (!Number.isFinite(valueDb)) return [0, 0, 0, 0]

  const span = Math.max(maxDb - minDb, 0.001)
  const [red, green, blue] = viridisColor((valueDb - minDb) / span)
  return [red, green, blue, 210]
}

export function computeCoverageStats(
  values: ArrayLike<number>,
): CoverageStats | null {
  let count = 0
  let minDb = Infinity
  let maxDb = -Infinity
  let sum = 0
  let sumSquares = 0

  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    if (!Number.isFinite(value)) continue

    count += 1
    minDb = Math.min(minDb, value)
    maxDb = Math.max(maxDb, value)
    sum += value
    sumSquares += value * value
  }

  if (count === 0) return null

  const meanDb = sum / count
  const variance = Math.max(sumSquares / count - meanDb * meanDb, 0)
  return {
    minDb,
    maxDb,
    meanDb,
    stdDevDb: Math.sqrt(variance),
    count,
  }
}

/**
 * Row-major RGBA pixels. Pass `flipY` for canvas/images, whose first row
 * is the top of the image. DataTexture consumers keep the natural order.
 */
export function buildCoverageRgba(
  grid: CoverageGrid,
  minDb = DEFAULT_HEATMAP_MIN_DB,
  maxDb = DEFAULT_HEATMAP_MAX_DB,
  flipY = false,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(grid.nx * grid.ny * 4)

  for (let row = 0; row < grid.ny; row++) {
    const sourceRow = flipY ? grid.ny - 1 - row : row
    for (let column = 0; column < grid.nx; column++) {
      const source = sourceRow * grid.nx + column
      const target = (row * grid.nx + column) * 4
      const [red, green, blue, alpha] = colorForDb(
        grid.values[source],
        minDb,
        maxDb,
      )
      rgba[target] = red
      rgba[target + 1] = green
      rgba[target + 2] = blue
      rgba[target + 3] = alpha
    }
  }

  return rgba
}

export function buildCoverageDataUrl(
  grid: CoverageGrid,
  minDb = DEFAULT_HEATMAP_MIN_DB,
  maxDb = DEFAULT_HEATMAP_MAX_DB,
): string | null {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = grid.nx
  canvas.height = grid.ny
  const context = canvas.getContext('2d')
  if (!context) return null

  const image = context.createImageData(grid.nx, grid.ny)
  image.data.set(buildCoverageRgba(grid, minDb, maxDb, true))
  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

export function heatmapGradientCss(): string {
  const stops = Array.from({ length: 12 }, (_, index) => {
    const [red, green, blue] = viridisColor(index / 11)
    return `rgb(${red}, ${green}, ${blue}) ${((index / 11) * 100).toFixed(0)}%`
  })
  return `linear-gradient(90deg, ${stops.join(', ')})`
}
