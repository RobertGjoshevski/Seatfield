import { describe, expect, it } from 'vitest'
import { SPEED_OF_SOUND_M_S } from '../../src/core/acoustics/roomField'
import {
  buildCoverageGrid,
  computeCoverage,
  coverageSpacingFor,
  levelAtListener,
  levelOnCoverageGrid,
} from '../../src/core/geometry/coverage'
import type { CoverageGrid } from '../../src/core/geometry/coverage'
import type { Speaker } from '../../src/core/types'

const rectangle = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

const lRoom = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 0, y: 3 },
]

const speaker: Speaker = {
  id: 'speaker-1',
  name: 'Speaker 1',
  position: { x: 0.5, y: 0.5, z: 1.2 },
  yawDeg: -90,
  gainDb: 0,
  coverageHorizontalDeg: 90,
  radiatorDiameterM: 0.13,
  widthM: 0.6,
  depthM: 0.5,
  heightM: 0.7,
  phaseInverted: false,
  delayMs: 0,
  enabled: true,
}

function indexOf(grid: CoverageGrid, x: number, y: number): number {
  const cellX = (grid.maxX - grid.minX) / grid.nx
  const cellY = (grid.maxY - grid.minY) / grid.ny
  const ix = Math.min(grid.nx - 1, Math.max(0, Math.floor((x - grid.minX) / cellX)))
  const iy = Math.min(grid.ny - 1, Math.max(0, Math.floor((y - grid.minY) / cellY)))
  return ix + iy * grid.nx
}

describe('coverage grid', () => {
  it('builds a grid over the room bounds', () => {
    const grid = buildCoverageGrid(rectangle, 1, 1.2)
    expect(grid).not.toBeNull()
    if (!grid) throw new Error('Expected a grid')

    expect(grid.minX).toBe(0)
    expect(grid.minY).toBe(0)
    expect(grid.maxX).toBe(4)
    expect(grid.maxY).toBe(3)
    expect(grid.nx).toBe(4)
    expect(grid.ny).toBe(3)
    expect(grid.spacing).toBe(1)
    expect(grid.values).toHaveLength(12)
    expect(grid.values[indexOf(grid, 2, 1)]).toBe(0)
    expect(Array.from(grid.values).every((value) => value === 0)).toBe(true)
    grid.values[indexOf(grid, 2, 1)] = -12
    expect(levelOnCoverageGrid(grid, 2.1, 1.1)).toBe(-12)
    expect(levelOnCoverageGrid(grid, -1, 1)).toBeUndefined()
  })

  it('marks cells outside an L-shaped room as NaN', () => {
    const grid = buildCoverageGrid(lRoom, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    expect(grid.values[indexOf(grid, 0.5, 0.5)]).toBe(0)
    expect(grid.values[indexOf(grid, 2.5, 2.5)]).toBeNaN()
  })

  it('computes levels inside and preserves outside cells', () => {
    const grid = buildCoverageGrid(lRoom, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const result = computeCoverage(
      grid,
      [{ ...speaker, coverageHorizontalDeg: 180 }],
      { boundary: lRoom, height: 3 },
      1000,
    )
    expect(Number.isFinite(result.values[indexOf(result, 0.5, 2.5)])).toBe(
      true,
    )
    expect(result.values[indexOf(result, 2.5, 2.5)]).toBeNaN()
  })

  it('power sums multiple speakers', () => {
    const grid = buildCoverageGrid(rectangle, 0.5, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const room = { boundary: rectangle, height: 3 }
    const one = computeCoverage(grid, [speaker], room, 80)
    const two = computeCoverage(
      grid,
      [speaker, { ...speaker, id: 'speaker-2' }],
      room,
      80,
    )
    const index = indexOf(grid, 2.5, 0.5)

    expect(Number.isFinite(one.values[index])).toBe(true)
    expect(two.values[index] - one.values[index]).toBeCloseTo(6.0206, 2)
  })

  it('returns no coverage when every speaker is disabled', () => {
    const grid = buildCoverageGrid(rectangle, 1, 1.2)
    if (!grid) throw new Error('Expected a grid')

    const result = computeCoverage(
      grid,
      [{ ...speaker, enabled: false }],
      { boundary: rectangle, height: 3 },
      80,
    )
    expect(Array.from(result.values).every((value) => Number.isNaN(value))).toBe(
      true,
    )
  })

  it('keeps a small room near a 0.15 m grid at 1×', () => {
    const result = coverageSpacingFor(
      { minX: 0, minY: 0, maxX: 5, maxY: 4 },
      1,
    )
    expect(result.spacing).toBeCloseTo(0.15, 5)
    expect(result.capped).toBe(false)
    expect(result.nx * result.ny).toBeLessThanOrEqual(6000)
  })

  it('coarsens a 40 m area to about 0.63 m at 1×', () => {
    const result = coverageSpacingFor(
      { minX: 0, minY: 0, maxX: 40, maxY: 30 },
      1,
    )
    expect(result.spacing).toBeCloseTo(0.625, 5)
    expect(result.nx).toBe(64)
    expect(result.ny).toBe(48)
    expect(result.capped).toBe(false)
    expect(result.nx * result.ny).toBeLessThanOrEqual(6000)
  })

  it('scales the sample count with the resolution multiplier', () => {
    const bounds = { minX: 0, minY: 0, maxX: 6, maxY: 4 }
    const mid = coverageSpacingFor(bounds, 1)
    const fine = coverageSpacingFor(bounds, 2)
    const coarse = coverageSpacingFor(bounds, 0.5)
    expect(fine.spacing).toBeCloseTo(mid.spacing / 2, 5)
    expect(coarse.spacing).toBeCloseTo(mid.spacing * 2, 5)
    expect(fine.nx).toBeGreaterThan(mid.nx)
    expect(coarse.nx).toBeLessThan(mid.nx)
    expect(fine.capped).toBe(false)
    expect(coarse.capped).toBe(false)
  })

  it('caps a huge area so the grid stays bounded', () => {
    const fine = coverageSpacingFor(
      { minX: 0, minY: 0, maxX: 200, maxY: 200 },
      2,
    )
    expect(fine.capped).toBe(true)
    expect(fine.nx * fine.ny).toBeLessThanOrEqual(10000)

    const coarse = coverageSpacingFor(
      { minX: 0, minY: 0, maxX: 400, maxY: 400 },
      0.5,
    )
    expect(coarse.capped).toBe(true)
    expect(coarse.nx * coarse.ny).toBeLessThanOrEqual(2500)

    const stage = coverageSpacingFor(
      { minX: 0, minY: 0, maxX: 80, maxY: 50 },
      1,
    )
    expect(stage.nx * stage.ny).toBeGreaterThanOrEqual(2500)
    expect(stage.nx * stage.ny).toBeLessThanOrEqual(4000)
  })

  it('returns null without a room', () => {
    expect(buildCoverageGrid([], 0.25, 1.2)).toBeNull()
  })
})

describe('levelAtListener', () => {
  const room = { boundary: rectangle, height: 2.5 }
  const frequency = SPEED_OF_SOUND_M_S / (2 * 4)

  it('changes with the listener position without a heatmap', () => {
    const nearWall = levelAtListener(
      room,
      [speaker],
      { x: 0.2, y: 1.5, z: 1.2 },
      frequency,
    )
    const midRoom = levelAtListener(
      room,
      [speaker],
      { x: 2, y: 1.5, z: 1.2 },
      frequency,
    )
    expect(nearWall).toBeTypeOf('number')
    expect(midRoom).toBeTypeOf('number')
    expect(nearWall).not.toBeCloseTo(midRoom ?? 0, 1)
  })

  it('is empty outside the room and inside a solid', () => {
    expect(
      levelAtListener(room, [speaker], { x: -1, y: 1, z: 1.2 }, frequency),
    ).toBeUndefined()
    expect(
      levelAtListener(
        room,
        [speaker],
        { x: 1, y: 1, z: 1 },
        frequency,
        {
          objects: [
            {
              id: 'box',
              name: 'Box',
              position: { x: 0.5, y: 0.5, z: 0 },
              width: 1,
              depth: 1,
              height: 2,
            },
          ],
        },
      ),
    ).toBeUndefined()
  })
})
