import { describe, expect, it } from 'vitest'
import { effectiveCoverageDeg } from '../../src/core/acoustics/directivity'
import { radiatorPosition } from '../../src/core/acoustics/radiator'
import { MIN_SPL_DB } from '../../src/core/acoustics/directField'
import {
  IRREGULAR_ROOM_WARNING,
  REFLECTION_COEFFICIENT,
  SPEED_OF_SOUND_M_S,
  coherentPathLevelDb,
  fieldModelFor,
  levelAtPoint,
  roomFieldWarning,
  speakersLevelAtPoint,
} from '../../src/core/acoustics/roomField'
import { wavePressureAtPoint } from '../../src/core/acoustics/waveSolver'
import { pointInPolygon } from '../../src/core/geometry/polygon'
import type { Speaker, Vec2 } from '../../src/core/types'

function speaker(partial: Partial<Speaker> = {}): Speaker {
  return {
    id: 'speaker-1',
    name: 'Speaker 1',
    position: { x: 0.4, y: 0.4, z: 0.4 },
    yawDeg: 0,
    gainDb: 0,
    coverageHorizontalDeg: 90,
    radiatorDiameterM: 0.13,
    widthM: 0.6,
    depthM: 0.5,
    heightM: 0.7,
    phaseInverted: false,
    delayMs: 0,
    enabled: true,
    ...partial,
  }
}

const rectangle = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 3 },
  { x: 0, y: 3 },
]

const irregular = [
  { x: 0, y: 0 },
  { x: 6, y: 0 },
  { x: 5, y: 4 },
  { x: 0, y: 3 },
]

describe('frequency-dependent directivity', () => {
  it('is omnidirectional below 200 Hz and nominal by 2 kHz', () => {
    expect(effectiveCoverageDeg(90, 80)).toBe(180)
    expect(effectiveCoverageDeg(90, 4000)).toBe(90)
  })

  it('does not silence the region behind the speaker at low frequency', () => {
    const level = levelAtPoint(
      { boundary: irregular, height: 3 },
      speaker({
        position: { x: 2, y: 1.2, z: 1.2 },
        yawDeg: 0,
        coverageHorizontalDeg: 90,
      }),
      { x: 2, y: 2.2, z: 1.2 },
      80,
    )
    expect(level).toBeGreaterThan(MIN_SPL_DB)
    expect(level).toBeGreaterThan(-40)
  })
})

describe('rectangular room modes', () => {
  it('has a node at mid-length and antinodes at both end walls', () => {
    const frequency = SPEED_OF_SOUND_M_S / (2 * 4)
    const room = { boundary: rectangle, height: 2.5 }
    const source = speaker()
    const near = levelAtPoint(room, source, { x: 0.2, y: 2, z: 1.2 }, frequency)
    const mid = levelAtPoint(room, source, { x: 2, y: 2, z: 1.2 }, frequency)
    const far = levelAtPoint(room, source, { x: 3.8, y: 2, z: 1.2 }, frequency)

    expect(mid).toBeLessThan(near - 6)
    expect(mid).toBeLessThan(far - 6)
    expect(fieldModelFor(frequency, true)).toBe('modes')
    expect(fieldModelFor(300, true)).toBe('blend')
  })

  it('keeps a true rectangle on the mode formula', () => {
    expect(fieldModelFor(80, false)).toBe('wave')
    expect(fieldModelFor(1000, false)).toBe('reflections')
    expect(roomFieldWarning(irregular)).toBe(IRREGULAR_ROOM_WARNING)
    expect(roomFieldWarning(rectangle)).toBeNull()
  })
})

describe('speaker phase and delay', () => {
  const room = { boundary: rectangle, height: 2.5 }
  const point = { x: 2, y: 1.5, z: 1.2 }

  it('leaves one speaker unchanged and cancels a copy when flipped or delayed', () => {
    const frequency = 80
    const alone = levelAtPoint(room, speaker(), point, frequency)
    const flippedAlone = levelAtPoint(
      room,
      speaker({ phaseInverted: true }),
      point,
      frequency,
    )
    const delayedAlone = levelAtPoint(
      room,
      speaker({ delayMs: 4 }),
      point,
      frequency,
    )
    expect(flippedAlone).toBeCloseTo(alone, 6)
    expect(delayedAlone).toBeCloseTo(alone, 6)

    const pair = speakersLevelAtPoint(
      room,
      [speaker(), speaker({ id: 'speaker-2' })],
      point,
      frequency,
    )
    const inverted = speakersLevelAtPoint(
      room,
      [speaker(), speaker({ id: 'speaker-2', phaseInverted: true })],
      point,
      frequency,
    )
    const delayed = speakersLevelAtPoint(
      room,
      [speaker(), speaker({ id: 'speaker-2', delayMs: 500 / frequency })],
      point,
      frequency,
    )

    expect(pair - alone).toBeCloseTo(6.0206, 2)
    expect(inverted).toBeLessThan(pair - 20)
    expect(delayed).toBeLessThan(pair - 20)
  })
})

describe('image interference', () => {
  it('is quieter when an image path is half a wavelength longer', () => {
    const frequency = 1000
    const lambda = SPEED_OF_SOUND_M_S / frequency
    const directOnly = coherentPathLevelDb(
      [{ linearGain: 1, distanceM: 2 }],
      frequency,
    )
    const withImage = coherentPathLevelDb(
      [
        { linearGain: 1, distanceM: 2 },
        {
          linearGain: REFLECTION_COEFFICIENT,
          distanceM: 2 + lambda / 2,
        },
      ],
      frequency,
    )
    expect(withImage).toBeLessThan(directOnly)
  })

  it('includes that cancellation in a large room at high frequency', () => {
    const frequency = 1000
    const lambda = SPEED_OF_SOUND_M_S / frequency
    const sourceZ = lambda / 4
    const direct = 2
    const room = {
      boundary: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 200, y: 200 },
        { x: 0, y: 200 },
      ],
      height: 200,
    }
    const both = levelAtPoint(
      room,
      speaker({
        position: { x: 100, y: 100, z: sourceZ },
        coverageHorizontalDeg: 180,
      }),
      { x: 100, y: 100, z: sourceZ + direct },
      frequency,
    )
    const directOnly = coherentPathLevelDb(
      [{ linearGain: 1, distanceM: direct }],
      frequency,
    )
    expect(both).toBeLessThan(directOnly)
  })
})

function pressureDb(value: { re: number; im: number }): number {
  const magnitude = Math.hypot(value.re, value.im)
  if (magnitude <= 1e-12) return MIN_SPL_DB
  return 20 * Math.log10(magnitude)
}

/** 6.50 m × 4.00 m with the 0.25 m × 1.1775 m slot cut into the bottom wall. */
const steppedRoom: Vec2[] = [
  { x: 0, y: 0 },
  { x: 4.25, y: 0 },
  { x: 4.25, y: 1.1775 },
  { x: 4.5, y: 1.1775 },
  { x: 4.5, y: 0 },
  { x: 6.5, y: 0 },
  { x: 6.5, y: 4 },
  { x: 0, y: 4 },
]

describe('floor-plan wave solver', () => {
  it('reproduces the first length-mode node of a rectangle', () => {
    const frequency = SPEED_OF_SOUND_M_S / (2 * 4)
    const room = { boundary: rectangle, height: 2.5 }
    const source = speaker()
    const at = (x: number) =>
      pressureDb(
        wavePressureAtPoint(
          room.boundary,
          room.height,
          source,
          { x, y: 2, z: 1.2 },
          frequency,
        ),
      )
    const near = at(0.2)
    const mid = at(2)
    const far = at(3.8)
    const analytic = levelAtPoint(room, source, { x: 0.2, y: 2, z: 1.2 }, frequency)

    expect(mid).toBeLessThan(near - 6)
    expect(mid).toBeLessThan(far - 6)
    expect(Math.abs(near - analytic)).toBeLessThan(8)
  })

  it('changes the field when the outline is not the bounding rectangle', () => {
    const ell = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 0, y: 4 },
    ]
    const box = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]
    const source = speaker({ position: { x: 0.5, y: 0.5, z: 0.5 } })
    const point = { x: 0.5, y: 3.5, z: 1.2 }
    const ellLevel = pressureDb(
      wavePressureAtPoint(ell, 2.5, source, point, 80),
    )
    const boxLevel = pressureDb(
      wavePressureAtPoint(box, 2.5, source, point, 80),
    )

    expect(ellLevel).toBeGreaterThan(-40)
    expect(Math.abs(ellLevel - boxLevel)).toBeGreaterThan(1)
  })

  it('keeps the bottom slot out of the floor plan and still returns a finite field', () => {
    expect(pointInPolygon({ x: 4.375, y: 0.5 }, steppedRoom)).toBe(false)
    expect(pointInPolygon({ x: 1, y: 1 }, steppedRoom)).toBe(true)

    const source = speaker({ position: { x: 1, y: 2, z: 1.2 } })
    const inside = levelAtPoint(
      { boundary: steppedRoom, height: 2.5 },
      source,
      { x: 5.2, y: 0.6, z: 1.2 },
      80,
    )
    const boxed = pressureDb(
      wavePressureAtPoint(
        [
          { x: 0, y: 0 },
          { x: 6.5, y: 0 },
          { x: 6.5, y: 4 },
          { x: 0, y: 4 },
        ],
        2.5,
        source,
        { x: 5.2, y: 0.6, z: 1.2 },
        80,
      ),
    )

    expect(inside).toBeGreaterThan(-40)
    expect(Math.abs(inside - boxed)).toBeGreaterThan(0.5)
  })

  it('cancels a flipped copy in a non-rectangular room', () => {
    const room = { boundary: irregular, height: 3 }
    const position = { x: 2, y: 1.2, z: 1.2 }
    const point = { x: 2, y: 1.5, z: 1.2 }
    const pair = speakersLevelAtPoint(
      room,
      [speaker({ position }), speaker({ id: 'speaker-2', position })],
      point,
      80,
    )
    const flipped = speakersLevelAtPoint(
      room,
      [
        speaker({ position }),
        speaker({ id: 'speaker-2', position, phaseInverted: true }),
      ],
      point,
      80,
    )

    expect(flipped).toBeLessThan(pair - 20)
  })
})

describe('solid objects and reflection order', () => {
  const room = {
    boundary: [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 4 },
      { x: 0, y: 4 },
    ],
    height: 3,
  }
  const source = speaker({
    position: { x: 1, y: 2, z: 1.2 },
    coverageHorizontalDeg: 180,
  })
  const across = { x: 5, y: 2, z: 1.2 }

  it('keeps the default preview on first-order room reflections', () => {
    const implicit = levelAtPoint(room, source, across, 1000)
    const explicit = levelAtPoint(room, source, across, 1000, {
      reflectionOrder: 1,
    })
    expect(explicit).toBeCloseTo(implicit, 6)
  })

  it('drops reflections when the order is direct only', () => {
    const order0 = levelAtPoint(room, source, across, 1000, {
      reflectionOrder: 0,
    })
    const origin = radiatorPosition(source)
    const distance = Math.hypot(
      across.x - origin.x,
      across.y - origin.y,
      across.z - origin.z,
    )
    const direct = coherentPathLevelDb(
      [{ linearGain: 1, distanceM: distance }],
      1000,
    )
    expect(order0).toBeCloseTo(direct, 4)
    expect(levelAtPoint(room, source, across, 1000)).not.toBeCloseTo(order0, 1)
  })

  it('changes the level when a second bounce is included', () => {
    const first = levelAtPoint(room, source, { x: 2.2, y: 1.3, z: 1.6 }, 1000, {
      reflectionOrder: 1,
    })
    const second = levelAtPoint(room, source, { x: 2.2, y: 1.3, z: 1.6 }, 1000, {
      reflectionOrder: 2,
    })
    expect(Number.isFinite(second)).toBe(true)
    expect(Math.abs(second - first)).toBeGreaterThan(0.25)
  })

  it('blocks sound with a full-height partition', () => {
    const open = levelAtPoint(room, source, across, 1000)
    const blocked = levelAtPoint(room, source, across, 1000, {
      reflectionOrder: 1,
      objects: [
        {
          id: 'partition',
          name: 'Partition',
          position: { x: 2.8, y: 0, z: 0 },
          width: 0.4,
          depth: 4,
          height: 3,
        },
      ],
    })
    expect(open).toBeGreaterThan(-40)
    expect(blocked).toBe(MIN_SPL_DB)
  })

  it('reflects off a nearby solid that does not block the direct path', () => {
    const open = levelAtPoint(room, source, { x: 3, y: 2, z: 1.2 }, 1000)
    const withPanel = levelAtPoint(room, source, { x: 3, y: 2, z: 1.2 }, 1000, {
      objects: [
        {
          id: 'panel',
          name: 'Panel',
          position: { x: 1.2, y: 2.45, z: 0 },
          width: 1.6,
          depth: 0.3,
          height: 2.4,
        },
      ],
    })
    expect(Math.abs(withPanel - open)).toBeGreaterThan(0.5)
  })

  it('is silent inside a solid', () => {
    const inside = levelAtPoint(room, source, { x: 4.2, y: 2.2, z: 0.6 }, 1000, {
      objects: [
        {
          id: 'column',
          name: 'Column',
          position: { x: 4, y: 2, z: 0 },
          width: 0.6,
          depth: 0.6,
          height: 1.5,
        },
      ],
    })
    expect(inside).toBe(MIN_SPL_DB)
  })
})

describe('open space', () => {
  const audience = [
    { x: -15, y: 0 },
    { x: 15, y: 0 },
    { x: 15, y: -20 },
    { x: -15, y: -20 },
  ]
  const open = { boundary: audience, height: 3, kind: 'open' as const }
  const enclosed = { boundary: audience, height: 3 }
  const source = speaker({
    position: { x: 0, y: 8, z: 2 },
    yawDeg: 0,
    coverageHorizontalDeg: 120,
  })
  const seat = { x: 0, y: -10, z: 1.2 }

  it('keeps sound from a speaker standing outside the audience', () => {
    const outside = levelAtPoint(open, source, seat, 1000, { reflectionOrder: 0 })
    const walled = levelAtPoint(enclosed, source, seat, 1000, {
      reflectionOrder: 0,
    })
    expect(outside).toBeGreaterThan(-40)
    expect(walled).toBe(MIN_SPL_DB)
  })

  it('adds the ground bounce above the direct path', () => {
    const direct = levelAtPoint(open, source, seat, 1000, { reflectionOrder: 0 })
    const ground = levelAtPoint(open, source, seat, 1000, { reflectionOrder: 1 })
    expect(Math.abs(ground - direct)).toBeGreaterThan(0.5)
  })

  it('does not follow the enclosed-room modal null', () => {
    const frequency = SPEED_OF_SOUND_M_S / (2 * 4)
    const modalRoom = { boundary: rectangle, height: 2.5, kind: 'open' as const }
    const near = levelAtPoint(
      modalRoom,
      speaker(),
      { x: 0.2, y: 2, z: 1.2 },
      frequency,
    )
    const mid = levelAtPoint(
      modalRoom,
      speaker(),
      { x: 2, y: 2, z: 1.2 },
      frequency,
    )
    expect(near).toBeGreaterThan(MIN_SPL_DB)
    expect(mid).toBeGreaterThan(near - 6)
    expect(roomFieldWarning(audience, 'open')).toBeNull()
  })
})
