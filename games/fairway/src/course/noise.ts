// 2D gradient noise with a seeded permutation table.
import type { Rng } from './prng'

export type Noise2D = (x: number, y: number) => number

const S = 0.7071067811865476
const GRAD_X = [1, -1, 0, 0, S, -S, S, -S]
const GRAD_Y = [0, 0, 1, -1, S, S, -S, -S]

/** Perlin-style noise. The result is roughly in [-1, 1]. */
export function createNoise2D(rng: Rng): Noise2D {
    const perm = new Uint8Array(512)
    for (let i = 0; i < 256; i++) {
        perm[i] = i
    }
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1))
        const t = perm[i]
        perm[i] = perm[j]
        perm[j] = t
    }
    for (let i = 0; i < 256; i++) {
        perm[i + 256] = perm[i]
    }
    // Offsets keep the lattice origin away from the tee.
    const ox = rng.range(0, 256)
    const oy = rng.range(0, 256)

    return (xIn, yIn) => {
        const x = xIn + ox
        const y = yIn + oy
        const xf = Math.floor(x)
        const yf = Math.floor(y)
        const xi = xf & 255
        const yi = yf & 255
        const fx = x - xf
        const fy = y - yf
        const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
        const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
        const g00 = perm[perm[xi] + yi] & 7
        const g10 = perm[perm[xi + 1] + yi] & 7
        const g01 = perm[perm[xi] + yi + 1] & 7
        const g11 = perm[perm[xi + 1] + yi + 1] & 7
        const n00 = GRAD_X[g00] * fx + GRAD_Y[g00] * fy
        const n10 = GRAD_X[g10] * (fx - 1) + GRAD_Y[g10] * fy
        const n01 = GRAD_X[g01] * fx + GRAD_Y[g01] * (fy - 1)
        const n11 = GRAD_X[g11] * (fx - 1) + GRAD_Y[g11] * (fy - 1)
        const a = n00 + (n10 - n00) * u
        const b = n01 + (n11 - n01) * u
        return (a + (b - a) * v) * 1.6
    }
}
