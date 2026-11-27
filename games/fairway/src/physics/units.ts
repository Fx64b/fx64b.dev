// Unit conversions. The game works in SI units only (metres, seconds,
// kilograms, m/s, rad/s) and converts at the edges: the UI shows yards and
// km/h, and the club and hole tables are written in yards, rpm and degrees.
// This module has no dependencies, so every other module can use it.

export const METRES_PER_YARD = 0.9144
export const METRES_PER_FOOT = 0.3048
/** km/h in one m/s. */
export const KMH_PER_MS = 3.6
const TWO_PI = 6.283185307179586

export function mToYd(m: number): number {
    return m / METRES_PER_YARD
}

export function ydToM(yd: number): number {
    return yd * METRES_PER_YARD
}

export function ftToM(ft: number): number {
    return ft * METRES_PER_FOOT
}

export function msToKmh(ms: number): number {
    return ms * KMH_PER_MS
}

export function kmhToMs(kmh: number): number {
    return kmh / KMH_PER_MS
}

export function rpmToRadS(rpm: number): number {
    return (rpm * TWO_PI) / 60
}

export function radSToRpm(radS: number): number {
    return (radS * 60) / TWO_PI
}

export function degToRad(deg: number): number {
    return (deg * TWO_PI) / 360
}
