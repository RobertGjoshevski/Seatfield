import { describe, expect, it } from 'vitest'
import { idsInsideMarquee, marqueePick } from '../../src/core/geometry/selection'
import {
  DEFAULT_SPEAKER_DEPTH_M,
  DEFAULT_SPEAKER_HEIGHT_M,
  DEFAULT_SPEAKER_WIDTH_M,
  type Project,
  type Speaker,
} from '../../src/core/types'

function speaker(id: string, x: number, y: number, yawDeg = 0): Speaker {
  return {
    id,
    name: id,
    position: { x, y, z: 1 },
    yawDeg,
    gainDb: 0,
    phaseInverted: false,
    delayMs: 0,
    coverageHorizontalDeg: 90,
    radiatorDiameterM: 0.13,
    widthM: DEFAULT_SPEAKER_WIDTH_M,
    depthM: DEFAULT_SPEAKER_DEPTH_M,
    heightM: DEFAULT_SPEAKER_HEIGHT_M,
    enabled: true,
  }
}

function plan(): Pick<Project, 'speakers' | 'objects' | 'listener'> {
  return {
    speakers: [speaker('near', 0, 0), speaker('far', 5, 5)],
    objects: [
      {
        id: 'block',
        name: 'Block',
        position: { x: 2, y: 2, z: 0 },
        width: 1,
        depth: 1,
        height: 1,
      },
    ],
    listener: {
      id: 'ear',
      name: 'Listener',
      position: { x: 8, y: 0 },
      earHeight: 1.2,
    },
  }
}

describe('marquee selection', () => {
  it('uses a window pick left to right and a crossing pick right to left', () => {
    expect(marqueePick({ x: 0, y: 0 }, { x: 2, y: 1 })).toBe('window')
    expect(marqueePick({ x: 2, y: 0 }, { x: 0, y: 1 })).toBe('crossing')
  })

  it('keeps only fully enclosed items when dragging left to right', () => {
    const ids = idsInsideMarquee(plan(), { x: -1, y: -1 }, { x: 1, y: 1 }, 0.2)
    expect(ids).toEqual(['near'])
  })

  it('keeps crossed items when dragging right to left', () => {
    const ids = idsInsideMarquee(plan(), { x: 1, y: -1 }, { x: 0, y: 1 }, 0.2)
    expect(ids).toContain('near')
    expect(ids).not.toContain('far')
  })

  it('misses a speaker that only overlaps a left-to-right rectangle', () => {
    const ids = idsInsideMarquee(plan(), { x: 0, y: -1 }, { x: 1, y: 1 }, 0.2)
    expect(ids).not.toContain('near')
  })

  it('includes an object and the listener when the rectangle covers them', () => {
    const ids = idsInsideMarquee(plan(), { x: 1.5, y: -1 }, { x: 9, y: 4 }, 0.2)
    expect(ids).toEqual(['block', 'ear'])
  })
})
