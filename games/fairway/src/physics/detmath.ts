// Deterministic elementary functions.
//
// Math.sin, Math.log and friends are not required to give the same last bit
// in every JavaScript engine. A round is stored as (club, aim, power) and is
// replayed later, maybe in another browser, so the simulation only uses
// + - * / and Math.sqrt, which IEEE 754 defines exactly. These versions are
// accurate to about 1e-15, which is far more than the physics needs.

const TWO_PI = 6.283185307179586
const HALF_PI = 1.5707963267948966
const LN2 = 0.6931471805599453
const SQRT2 = 1.4142135623730951
const SQRT1_2 = 0.7071067811865476
// 1/1, 1/3, 1/5, ... 1/19
const ODD_RECIPROCALS = [
    1,
    1 / 3,
    1 / 5,
    1 / 7,
    1 / 9,
    1 / 11,
    1 / 13,
    1 / 15,
    1 / 17,
    1 / 19,
]

/** Natural logarithm for x > 0. */
export function ln(x: number): number {
    if (!(x > 0)) {
        return -Infinity
    }
    // Scale by powers of two (exact) into [1/sqrt2, sqrt2].
    let e = 0
    while (x > SQRT2) {
        x *= 0.5
        e++
    }
    while (x < SQRT1_2) {
        x *= 2
        e--
    }
    // ln(x) = 2 atanh(z), z = (x - 1) / (x + 1), |z| <= 0.172.
    const z = (x - 1) / (x + 1)
    const z2 = z * z
    // Series z + z^3/3 + ... + z^21/21 in Horner form (error below 1e-17).
    let sum = 1 / 21
    for (let k = 19; k >= 1; k -= 2) {
        sum = sum * z2 + ODD_RECIPROCALS[(k - 1) >> 1]
    }
    return 2 * z * sum + e * LN2
}

// sin and cos of x / 8 from the Taylor series, then three angle doublings.
function sinCos(x: number, wantSin: boolean): number {
    x -= TWO_PI * Math.round(x / TWO_PI)
    const y = x / 8
    const y2 = y * y
    let s =
        y *
        (1 -
            (y2 / 6) *
                (1 -
                    (y2 / 20) *
                        (1 -
                            (y2 / 42) *
                                (1 -
                                    (y2 / 72) *
                                        (1 - (y2 / 110) * (1 - y2 / 156))))))
    let c =
        1 -
        (y2 / 2) *
            (1 -
                (y2 / 12) *
                    (1 -
                        (y2 / 30) *
                            (1 - (y2 / 56) * (1 - (y2 / 90) * (1 - y2 / 132)))))
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

/** Arc tangent, result in (-pi/2, pi/2). */
export function atan(x: number): number {
    if (x < 0) {
        return -atan(-x)
    }
    if (x > 1) {
        return HALF_PI - atan(1 / x)
    }
    // Halve the angle twice: atan(x) = 2 atan(x / (1 + sqrt(1 + x^2))).
    x = x / (1 + Math.sqrt(1 + x * x))
    x = x / (1 + Math.sqrt(1 + x * x))
    const x2 = x * x
    let term = x
    let sum = x
    for (let k = 3; k <= 25; k += 2) {
        term *= -x2
        sum += term / k
    }
    return 4 * sum
}

/** Angle of the point (x, y) for x >= 0 and y >= 0, in [0, pi/2]. */
export function atan2Positive(y: number, x: number): number {
    if (x <= 0) {
        return HALF_PI
    }
    return atan(y / x)
}
