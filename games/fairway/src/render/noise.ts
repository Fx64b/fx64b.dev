/*
 * Small deterministic noise helpers. Used for procedural textures, tree
 * shapes and the dev test hole. No Math.random anywhere in the renderer.
 */

/** Integer lattice hash, returns [0, 1). */
export function hash2(x: number, y: number, seed = 0): number {
    let h =
        Math.imul(x | 0, 374761393) +
        Math.imul(y | 0, 668265263) +
        Math.imul(seed | 0, 1274126177)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
}

function smooth(t: number): number {
    return t * t * (3 - 2 * t)
}

/** Smooth value noise in [0, 1]. A period > 0 makes it tile. */
export function valueNoise(x: number, y: number, seed = 0, period = 0): number {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = smooth(x - x0)
    const fy = smooth(y - y0)
    let xa = x0
    let xb = x0 + 1
    let ya = y0
    let yb = y0 + 1
    if (period > 0) {
        xa = ((xa % period) + period) % period
        xb = ((xb % period) + period) % period
        ya = ((ya % period) + period) % period
        yb = ((yb % period) + period) % period
    }
    const a = hash2(xa, ya, seed)
    const b = hash2(xb, ya, seed)
    const c = hash2(xa, yb, seed)
    const d = hash2(xb, yb, seed)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/** Fractal value noise in [0, 1]. */
export function fbm(
    x: number,
    y: number,
    octaves = 4,
    seed = 0,
    period = 0
): number {
    let sum = 0
    let amp = 0.5
    let norm = 0
    let f = 1
    for (let i = 0; i < octaves; i++) {
        sum += amp * valueNoise(x * f, y * f, seed + i * 17, period * f)
        norm += amp
        amp *= 0.5
        f *= 2
    }
    return sum / norm
}

export function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

export function smoothstep(e0: number, e1: number, x: number): number {
    const t = clamp((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}
