// Unit conversions for the UI. The physics module itself uses SI units only
// (metres, seconds, kilograms, m/s, rad/s). Convert at the edge.

const METRES_PER_YARD = 0.9144
const METRES_PER_FOOT = 0.3048
const TWO_PI = 6.283185307179586

export function mToYd(m: number): number {
    return m / METRES_PER_YARD
}

export function ydToM(yd: number): number {
    return yd * METRES_PER_YARD
}

export function mToFt(m: number): number {
    return m / METRES_PER_FOOT
}

export function ftToM(ft: number): number {
    return ft * METRES_PER_FOOT
}

export function msToKmh(ms: number): number {
    return ms * 3.6
}

export function kmhToMs(kmh: number): number {
    return kmh / 3.6
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

export function radToDeg(rad: number): number {
    return (rad * 360) / TWO_PI
}
