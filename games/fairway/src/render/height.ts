import type { Heightfield, HoleData } from '../shared/hole'
import { clamp } from './noise'

/** Bilinear sample of a heightfield, clamped at its edges. */
export function sampleField(f: Heightfield, x: number, z: number): number {
    const u = clamp((x - f.originX) / f.cellSize, 0, f.cols - 1)
    const v = clamp((z - f.originZ) / f.cellSize, 0, f.rows - 1)
    const c0 = Math.min(Math.floor(u), f.cols - 2)
    const r0 = Math.min(Math.floor(v), f.rows - 2)
    const fu = u - c0
    const fv = v - r0
    const i = r0 * f.cols + c0
    const h = f.heights
    const a = h[i]
    const b = h[i + 1]
    const c = h[i + f.cols]
    const d = h[i + f.cols + 1]
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv
}

export interface FieldRect {
    minX: number
    minZ: number
    maxX: number
    maxZ: number
}

export function fieldRect(f: Heightfield): FieldRect {
    return {
        minX: f.originX,
        minZ: f.originZ,
        maxX: f.originX + (f.cols - 1) * f.cellSize,
        maxZ: f.originZ + (f.rows - 1) * f.cellSize,
    }
}

export type HeightSampler = (x: number, z: number) => number

/**
 * Ground height for a hole: the fine green field inside its rectangle, the
 * coarse terrain elsewhere (clamped at the terrain edge).
 */
export function createHeightSampler(hole: HoleData): HeightSampler {
    const g = hole.greenField
    const r = fieldRect(g)
    const hasGreen = g.cols > 1 && g.rows > 1
    return (x, z) => {
        if (
            hasGreen &&
            x >= r.minX &&
            x <= r.maxX &&
            z >= r.minZ &&
            z <= r.maxZ
        ) {
            return sampleField(g, x, z)
        }
        return sampleField(hole.terrain, x, z)
    }
}
