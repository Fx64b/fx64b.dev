import { describe, expect, it } from 'vitest'

import {
    GREEN_SEAM,
    createGround,
    generateHole,
} from '../../../games/fairway/src/course'
import type { HoleData } from '../../../games/fairway/src/shared/hole'

const holes: HoleData[] = ['ground-a', 'ground-b', '2026-11-28'].map((s) =>
    generateHole(s)
)

describe('fairway ground queries', () => {
    it('returns the terrain heights at the grid points', () => {
        for (const h of holes) {
            const g = createGround(h)
            const t = h.terrain
            for (let r = 0; r < t.rows; r += 17) {
                for (let c = 0; c < t.cols; c += 13) {
                    const x = t.originX + c * t.cellSize
                    const z = t.originZ + r * t.cellSize
                    const gf = h.greenField
                    const inGreen =
                        x > gf.originX &&
                        x < gf.originX + (gf.cols - 1) * gf.cellSize &&
                        z > gf.originZ &&
                        z < gf.originZ + (gf.rows - 1) * gf.cellSize
                    if (!inGreen) {
                        expect(g.height(x, z)).toBe(t.heights[r * t.cols + c])
                    }
                }
            }
        }
    })

    it('interpolates between grid points', () => {
        const h = holes[0]
        const g = createGround(h)
        const t = h.terrain
        const i = 5 * t.cols + 7
        const x = t.originX + 7 * t.cellSize
        const z = t.originZ + 5 * t.cellSize
        const expected =
            (t.heights[i] +
                t.heights[i + 1] +
                t.heights[i + t.cols] +
                t.heights[i + t.cols + 1]) /
            4
        expect(g.height(x + 0.5, z + 0.5)).toBeCloseTo(expected, 6)
    })

    it('uses the fine heightfield on the green', () => {
        for (const h of holes) {
            const g = createGround(h)
            const gf = h.greenField
            for (let r = 12; r < gf.rows - 12; r += 9) {
                for (let c = 12; c < gf.cols - 12; c += 7) {
                    const x = gf.originX + c * gf.cellSize
                    const z = gf.originZ + r * gf.cellSize
                    expect(g.height(x, z)).toBeCloseTo(
                        gf.heights[r * gf.cols + c],
                        6
                    )
                }
            }
            expect(g.height(h.pin.x, h.pin.z)).toBeCloseTo(h.pin.y, 6)
        }
    })

    it('is continuous across the seam of the green heightfield', () => {
        for (const h of holes) {
            const g = createGround(h)
            const gf = h.greenField
            const x0 = gf.originX
            const x1 = gf.originX + (gf.cols - 1) * gf.cellSize
            const z0 = gf.originZ
            const z1 = gf.originZ + (gf.rows - 1) * gf.cellSize
            const STEP = 0.01
            // Lines across each of the four edges, and across the inner
            // end of the blend band.
            const reach = GREEN_SEAM + 1
            for (let k = 0; k <= 20; k++) {
                const t = k / 20
                const lines = [
                    { x: x0 - 1, z: z0 + (z1 - z0) * t, dx: 1, dz: 0 },
                    { x: x1 + 1, z: z0 + (z1 - z0) * t, dx: -1, dz: 0 },
                    { x: x0 + (x1 - x0) * t, z: z0 - 1, dx: 0, dz: 1 },
                    { x: x0 + (x1 - x0) * t, z: z1 + 1, dx: 0, dz: -1 },
                ]
                for (const line of lines) {
                    let last = g.height(line.x, line.z)
                    for (let d = STEP; d <= 1 + reach; d += STEP) {
                        const y = g.height(
                            line.x + line.dx * d,
                            line.z + line.dz * d
                        )
                        // A jump would be far larger than any slope allows.
                        expect(Math.abs(y - last)).toBeLessThan(STEP * 1.5)
                        last = y
                    }
                }
            }
        }
    })

    it('agrees with the coarse terrain near the seam', () => {
        // Both grids sample the same height function, so the blend has
        // very little to hide.
        for (const h of holes) {
            const g = createGround(h)
            const gf = h.greenField
            const x = gf.originX + GREEN_SEAM + 0.01
            for (let r = 8; r < gf.rows - 8; r += 5) {
                const z = gf.originZ + r * gf.cellSize
                const inside = g.height(x, z)
                const outside = g.height(gf.originX - 0.01, z)
                expect(Math.abs(inside - outside)).toBeLessThan(0.6)
            }
        }
    })

    it('returns unit normals that point up', () => {
        for (const h of holes) {
            const g = createGround(h)
            const b = h.bounds
            for (let k = 0; k < 2000; k++) {
                // A fixed scatter of points, some outside the bounds.
                const x = b.minX - 10 + ((k * 37.3) % (b.maxX - b.minX + 20))
                const z = b.minZ - 10 + ((k * 91.7) % (b.maxZ - b.minZ + 20))
                const n = g.normal(x, z)
                expect(
                    Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
                ).toBeCloseTo(1, 9)
                expect(n.y).toBeGreaterThan(0.5)
            }
            const n = g.normal(h.tee.x, h.tee.z)
            // The tee is flat.
            expect(n.y).toBeGreaterThan(0.9999)
        }
    })

    it('tilts the normal against the slope', () => {
        const h = holes[0]
        const g = createGround(h)
        const x = h.pin.x
        const z = h.pin.z
        const n = g.normal(x, z)
        const e = 0.2
        const dx = (g.height(x + e, z) - g.height(x - e, z)) / (2 * e)
        const dz = (g.height(x, z + e) - g.height(x, z - e)) / (2 * e)
        expect(n.x / n.y).toBeCloseTo(-dx, 9)
        expect(n.z / n.y).toBeCloseTo(-dz, 9)
    })

    it('reports out of bounds outside the bounds', () => {
        for (const h of holes) {
            const g = createGround(h)
            const b = h.bounds
            const midX = (b.minX + b.maxX) / 2
            const midZ = (b.minZ + b.maxZ) / 2
            expect(g.surface(b.minX - 0.01, midZ)).toBe('ob')
            expect(g.surface(b.maxX + 0.01, midZ)).toBe('ob')
            expect(g.surface(midX, b.minZ - 0.01)).toBe('ob')
            expect(g.surface(midX, b.maxZ + 0.01)).toBe('ob')
            expect(g.surface(1e6, -1e6)).toBe('ob')
            expect(g.surface(Number.NaN, 0)).toBe('ob')
            // The corners lie deep in the trees.
            expect(g.surface(b.minX + 0.5, b.minZ + 0.5)).toBe('ob')
            expect(g.surface(b.maxX - 0.5, b.maxZ - 0.5)).toBe('ob')
            // Heights stay finite out there.
            expect(Number.isFinite(g.height(b.minX - 50, b.maxZ + 50))).toBe(
                true
            )
            expect(g.surface(h.tee.x, h.tee.z)).toBe('tee')
            expect(g.surface(h.pin.x, h.pin.z)).toBe('green')
        }
    })

    it('has every playable surface on a hole with sand and water', () => {
        const h = holes[2]
        const g = createGround(h)
        const seen = new Set<string>()
        const s = h.surfaces
        for (let r = 0; r < s.rows; r += 2) {
            for (let c = 0; c < s.cols; c += 2) {
                seen.add(
                    g.surface(
                        s.originX + (c + 0.5) * s.cellSize,
                        s.originZ + (r + 0.5) * s.cellSize
                    )
                )
            }
        }
        expect([...seen].sort()).toEqual([
            'bunker',
            'fairway',
            'firstCut',
            'green',
            'ob',
            'rough',
            'tee',
            'water',
        ])
    })
})
