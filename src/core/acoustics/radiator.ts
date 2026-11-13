import { degToRad } from '../../lib/math'
import {
  DEFAULT_SPEAKER_DEPTH_M,
  type Speaker,
  type Vec3,
} from '../types'

/**
 * The placed position is the cabinet center. Sound leaves the front face,
 * the same face the plan arrow points from. Local −Y is that face.
 */
export function radiatorPosition(
  speaker: Pick<Speaker, 'position' | 'yawDeg' | 'depthM'>,
): Vec3 {
  const depth =
    Number.isFinite(speaker.depthM) && speaker.depthM > 0
      ? speaker.depthM
      : DEFAULT_SPEAKER_DEPTH_M
  const yaw = degToRad(Number.isFinite(speaker.yawDeg) ? speaker.yawDeg : 0)
  const reach = depth / 2
  return {
    x: speaker.position.x - Math.sin(yaw) * reach,
    y: speaker.position.y - Math.cos(yaw) * reach,
    z: speaker.position.z,
  }
}

export function sourceAtRadiator(speaker: Speaker): Speaker {
  return { ...speaker, position: radiatorPosition(speaker) }
}
