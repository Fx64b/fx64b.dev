// The pure part of the sound: which sounds a shot makes and when, how loud
// they are, and how they fade with distance. No Web Audio in here.
import { CUP_RADIUS, type ClubId, type ShotResult } from '../physics'
import type { SurfaceId, Vec3 } from '../shared/hole'

/** The sound of a ball landing on a surface. */
export type LandingSound = 'thud' | 'softThud' | 'pat' | 'sand'

/** The sound of the club on the ball. */
export type ImpactSound = 'wood' | 'iron' | 'putter'

export type CueKind = 'bounce' | 'splash' | 'cup' | 'lip'

export interface FlightCue {
    /** Playback time of the shot, in s. */
    t: number
    kind: CueKind
    /** Set for a bounce. */
    sound?: LandingSound
    /** Loudness 0..1 before the distance gain. */
    intensity: number
    position: Vec3
}

/**
 * The landing sound of a surface, or null where the ball makes no landing
 * sound (water has its own splash).
 */
export function landingSound(surface: SurfaceId): LandingSound | null {
    switch (surface) {
        case 'tee':
        case 'fairway':
        case 'firstCut':
            return 'thud'
        case 'rough':
        case 'ob':
            return 'softThud'
        case 'green':
            return 'pat'
        case 'bunker':
            return 'sand'
        case 'water':
            return null
    }
}

export function impactSound(club: ClubId): ImpactSound {
    if (club === 'putter') {
        return 'putter'
    }
    return club === 'driver' || club === 'wood3' ? 'wood' : 'iron'
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Loudness 0..1 of a ground contact from the ball speed before it. */
export function bounceIntensity(speedIn: number): number {
    if (!(speedIn > 0)) {
        return 0
    }
    // A full drive lands at about 30 m/s, a chip at about 8 m/s.
    return clamp01(0.12 + 0.88 * Math.sqrt(speedIn / 32))
}

/** Bounces slower than this make no sound (the last small hops). */
export const MIN_BOUNCE_SPEED = 0.6

/** Gain at this distance is one half. */
export const DISTANCE_REF = 55
/** Far sounds stay audible: the gain never falls below this. */
export const DISTANCE_FLOOR = 0.14

/** Gain 0..1 for a sound at a distance from the camera, in m. */
export function distanceGain(distance: number): number {
    if (!(distance > 0)) {
        return 1
    }
    return Math.max(DISTANCE_FLOOR, 1 / (1 + distance / DISTANCE_REF))
}

export function distanceBetween(a: Vec3, b: Vec3): number {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/**
 * The time and place where a rolling ball ran over the cup without
 * dropping (a lip-out), or null. The physics result has no event for it,
 * so it is found on the recorded path.
 */
export function findLipOut(
    result: ShotResult,
    pin: Vec3
): { t: number; position: Vec3 } | null {
    const s = result.samples
    const r = CUP_RADIUS * 0.95
    // The last moment of a holed shot is the drop itself.
    const end = result.holed ? result.duration - 0.1 : Infinity
    for (let i = 1; i < s.length; i++) {
        const a = s[i - 1]
        const b = s[i]
        if (b.t > end) {
            break
        }
        if (a.phase !== 'ground' || b.phase !== 'ground') {
            continue
        }
        const dx = b.x - a.x
        const dz = b.z - a.z
        const len2 = dx * dx + dz * dz
        if (len2 < 1e-10) {
            continue
        }
        const f = clamp01(((pin.x - a.x) * dx + (pin.z - a.z) * dz) / len2)
        const x = a.x + dx * f
        const z = a.z + dz * f
        if (Math.hypot(x - pin.x, z - pin.z) < r) {
            // A ball that stops on the edge did not lip out.
            const speed = Math.sqrt(len2) / Math.max(1e-6, b.t - a.t)
            if (speed < 0.25) {
                return null
            }
            return {
                t: a.t + (b.t - a.t) * f,
                position: { x, y: a.y + (b.y - a.y) * f, z },
            }
        }
    }
    return null
}

/**
 * Every sound of a shot after the club impact, in time order: bounces by
 * surface, a lip-out, and the end in the water or in the cup.
 */
export function flightCues(result: ShotResult, pin?: Vec3): FlightCue[] {
    const cues: FlightCue[] = []
    for (const b of result.bounces) {
        const sound = landingSound(b.surface)
        if (!sound || b.speedIn < MIN_BOUNCE_SPEED) {
            continue
        }
        cues.push({
            t: b.t,
            kind: 'bounce',
            sound,
            intensity: bounceIntensity(b.speedIn),
            position: b.position,
        })
    }
    if (pin) {
        const lip = findLipOut(result, pin)
        if (lip) {
            cues.push({ ...lip, kind: 'lip', intensity: 0.5 })
        }
    }
    if (result.outcome === 'water') {
        const last = result.bounces[result.bounces.length - 1]
        const fromAir = last !== undefined && last.t >= result.duration - 0.05
        cues.push({
            t: result.duration,
            kind: 'splash',
            // A ball that rolls in makes a smaller splash.
            intensity: fromAir ? bounceIntensity(last.speedIn) : 0.3,
            position: result.rest,
        })
    } else if (result.holed) {
        cues.push({
            t: result.duration,
            kind: 'cup',
            intensity: 0.8,
            position: result.rest,
        })
    }
    return cues.sort((a, b) => a.t - b.t)
}

/** The cues that end a shot. Only these play when the player skips. */
export function isFinalCue(cue: FlightCue): boolean {
    return cue.kind === 'splash' || cue.kind === 'cup'
}

export interface CuePlayer {
    /**
     * The cues that are due at playback time t (each cue comes once).
     * Call it every frame with the current time.
     */
    advance(t: number): FlightCue[]
    /**
     * The player skipped to the end: drops what is left and returns at
     * most one cue, the splash or the cup drop.
     */
    skip(): FlightCue[]
    /** Cues not played yet. */
    pending(): number
}

/**
 * Plays the cues of one shot in step with the playback time. A jump of
 * more than `maxJump` seconds in one call counts as a skip, so a long
 * frame or a jump to the end never plays a burst of sounds.
 */
export function createCuePlayer(cues: FlightCue[], maxJump = 0.5): CuePlayer {
    const list = [...cues].sort((a, b) => a.t - b.t)
    let next = 0
    let last = 0
    function skip(): FlightCue[] {
        const rest = list.slice(next)
        next = list.length
        const final = rest.filter(isFinalCue).pop()
        return final ? [final] : []
    }
    return {
        advance(t) {
            if (next >= list.length) {
                last = t
                return []
            }
            if (t - last > maxJump) {
                const due: FlightCue[] = []
                const final: FlightCue[] = []
                while (next < list.length && list[next].t <= t) {
                    due.push(list[next++])
                }
                last = t
                for (const c of due) {
                    if (isFinalCue(c)) {
                        final.push(c)
                    }
                }
                // One late cue is fine, a burst is not.
                return due.length <= 1 ? due : final.slice(-1)
            }
            last = t
            const due: FlightCue[] = []
            while (next < list.length && list[next].t <= t) {
                due.push(list[next++])
            }
            return due
        },
        skip,
        pending: () => list.length - next,
    }
}
