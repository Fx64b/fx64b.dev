// Deterministic maths helpers.
//
// Math.sin, Math.exp and friends may differ in the last bit between
// JavaScript engines. A hole must be identical everywhere, so the generator
// only uses + - * /, Math.sqrt and the functions below.

export const PI = 3.141592653589793
export const TAU = 6.283185307179586

// sin and cos of x / 8 from the Taylor series, then three angle doublings.
function sinCos(x: number, wantSin: boolean): number {
    x -= TAU * Math.round(x / TAU)
    const y = x / 8
    const y2 = y * y
    let s =
        y *
        (1 -
            (y2 / 6) *
                (1 -
                    (y2 / 20) *
                        (1 - (y2 / 42) * (1 - (y2 / 72) * (1 - y2 / 110)))))
    let c =
        1 -
        (y2 / 2) *
            (1 - (y2 / 12) * (1 - (y2 / 30) * (1 - (y2 / 56) * (1 - y2 / 90))))
    for (let i = 0; i < 3; i++) {
        const s2 = 2 * s * c
        c = 1 - 2 * s * s
        s = s2
    }
    return wantSin ? s : c
}

export function sin(x: number): number {
    return sinCos(x, true)
}

export function cos(x: number): number {
    return sinCos(x, false)
}

export function clamp(x: number, min: number, max: number): number {
    return x < min ? min : x > max ? max : x
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

/** 0 below e0, 1 above e1, smooth in between. */
export function smoothstep(e0: number, e1: number, x: number): number {
    const t = clamp((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
}

/** A bell shape without exp: 1 at x = 0, 0 for |x| >= width. */
export function bump(x: number, width: number): number {
    const t = x / width
    const u = 1 - t * t
    return u <= 0 ? 0 : u * u
}
