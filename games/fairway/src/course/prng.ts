// Seeded random numbers for the hole generator.
//
// Everything here uses 32-bit integer maths only, so the same seed gives the
// same sequence in every JavaScript engine.

/** cyrb128: a 128-bit hash of a string, as four unsigned 32-bit numbers. */
export function hashString(str: string): [number, number, number, number] {
    let h1 = 1779033703
    let h2 = 3144134277
    let h3 = 1013904242
    let h4 = 2773480762
    for (let i = 0; i < str.length; i++) {
        const k = str.charCodeAt(i)
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
    h1 ^= h2 ^ h3 ^ h4
    h2 ^= h1
    h3 ^= h1
    h4 ^= h1
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

/** sfc32: a small fast PRNG. Returns floats in [0, 1). */
export function sfc32(
    a: number,
    b: number,
    c: number,
    d: number
): () => number {
    a |= 0
    b |= 0
    c |= 0
    d |= 0
    return () => {
        const t = (((a + b) | 0) + d) | 0
        d = (d + 1) | 0
        a = b ^ (b >>> 9)
        b = (c + (c << 3)) | 0
        c = (c << 21) | (c >>> 11)
        c = (c + t) | 0
        return (t >>> 0) / 4294967296
    }
}

export interface Rng {
    /** Float in [0, 1). */
    next(): number
    /** Float in [min, max). */
    range(min: number, max: number): number
    /** Integer in [min, max], both inclusive. */
    int(min: number, max: number): number
    /** True with probability p. */
    chance(p: number): boolean
    /** -1 or 1. */
    sign(): 1 | -1
    pick<T>(items: readonly T[]): T
}

/**
 * A PRNG for one named sub-stream of a seed. Each part of the generator
 * (layout, green, trees, ...) takes its own stream, so a change in how one
 * part draws numbers does not reshuffle the others.
 */
export function createRng(seed: string, stream = ''): Rng {
    const [a, b, c, d] = hashString(`${seed}\u0000${stream}`)
    const next = sfc32(a, b, c, d)
    // The first outputs of sfc32 are weakly mixed. Skip them.
    for (let i = 0; i < 15; i++) {
        next()
    }
    return {
        next,
        range: (min, max) => min + (max - min) * next(),
        int: (min, max) => min + Math.floor(next() * (max - min + 1)),
        chance: (p) => next() < p,
        sign: () => (next() < 0.5 ? -1 : 1),
        pick: (items) => items[Math.floor(next() * items.length)],
    }
}
