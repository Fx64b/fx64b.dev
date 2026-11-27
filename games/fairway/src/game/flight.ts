// Playback of a simulated shot: where the ball is on its recorded path at a
// playback time, and how much the flight lifts the ambient wind sound.
import type { TrajectorySample } from '../physics'
import type { Vec3 } from '../shared/hole'

export interface FlightSample {
    pos: Vec3
    /** Velocity on the path segment around the time, in m/s. */
    vel: Vec3
}

/** Ball position and velocity on the recorded path at time t (in s). */
export function sampleAt(
    samples: readonly TrajectorySample[],
    t: number
): FlightSample {
    let i = 1
    while (i < samples.length - 1 && samples[i].t < t) {
        i++
    }
    const a = samples[i - 1] ?? samples[0]
    const b = samples[i] ?? a
    const span = b.t - a.t
    const f = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 1
    const inv = span > 0 ? 1 / span : 0
    return {
        pos: {
            x: a.x + (b.x - a.x) * f,
            y: a.y + (b.y - a.y) * f,
            z: a.z + (b.z - a.z) * f,
        },
        vel: {
            x: (b.x - a.x) * inv,
            y: (b.y - a.y) * inv,
            z: (b.z - a.z) * inv,
        },
    }
}

// The flight wind: part from the ball speed, part from the height.
const FLIGHT_WIND_SPEED_SHARE = 0.55
const FLIGHT_WIND_HEIGHT_SHARE = 0.45
/** Ball speed in m/s that gives the full speed part (a full drive). */
const FLIGHT_WIND_FULL_SPEED = 65
/** Height above the ground in m that gives the full height part. */
const FLIGHT_WIND_FULL_HEIGHT = 30

/**
 * 0..1: how much the ball flight lifts the ambient wind. It swells a little
 * with the speed of the ball and its height above the ground.
 */
export function flightWind(vel: Vec3, heightAboveGround: number): number {
    const speed = Math.hypot(vel.x, vel.y, vel.z)
    return (
        FLIGHT_WIND_SPEED_SHARE * Math.min(1, speed / FLIGHT_WIND_FULL_SPEED) +
        FLIGHT_WIND_HEIGHT_SHARE *
            Math.min(
                1,
                Math.max(0, heightAboveGround) / FLIGHT_WIND_FULL_HEIGHT
            )
    )
}
