import { describe, expect, it, vi } from 'vitest'

import {
    CLUB_CARRY,
    createGround,
    generateDailyHole,
    generateHole,
    holeLength,
    validateHole,
} from '../../../games/fairway/src/course'
import type { HoleData } from '../../../games/fairway/src/shared/hole'
import { SURFACE_IDS } from '../../../games/fairway/src/shared/hole'

const YD = 0.9144

// Hundreds of holes are generated here.
vi.setConfig({ testTimeout: 180_000 })
const SEED_COUNT = 240

const cache = new Map<string, HoleData>()
function hole(seed: string): HoleData {
    let h = cache.get(seed)
    if (!h) {
        h = generateHole(seed)
        cache.set(seed, h)
    }
    return h
}
const manySeeds = Array.from({ length: SEED_COUNT }, (_, i) => `test-${i}`)

function sameArray(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
    if (a.length !== b.length) {
        return false
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false
        }
    }
    return true
}

/** A cheap checksum over everything in a hole. */
function fingerprint(h: HoleData): string {
    let a = 2166136261
    const mix = (v: number): void => {
        a = Math.imul(a ^ Math.round(v * 1000), 16777619)
    }
    h.terrain.heights.forEach(mix)
    h.greenField.heights.forEach(mix)
    h.surfaces.data.forEach(mix)
    for (const t of h.trees) {
        mix(t.x)
        mix(t.z)
        mix(t.y)
        mix(t.height)
        mix(t.radius)
        mix(t.kind.length)
    }
    for (const b of h.bunkers) {
        b.outline.forEach((p) => (mix(p.x), mix(p.z)))
    }
    for (const w of h.water) {
        mix(w.level)
        w.outline.forEach((p) => (mix(p.x), mix(p.z)))
    }
    h.centerline.forEach((p) => (mix(p.x), mix(p.z)))
    ;[
        h.par,
        h.difficulty,
        h.tee.y,
        h.pin.x,
        h.pin.y,
        h.pin.z,
        h.conditions.windSpeed,
        h.conditions.windDirection,
        h.conditions.airDensity,
        h.conditions.stimp,
    ].forEach(mix)
    return (a >>> 0).toString(16)
}

describe('fairway hole generator', () => {
    it('is deterministic', () => {
        for (const seed of ['2026-11-27', 'determinism', 'x']) {
            const a = generateHole(seed)
            const b = generateHole(seed)
            expect(sameArray(a.terrain.heights, b.terrain.heights)).toBe(true)
            expect(sameArray(a.greenField.heights, b.greenField.heights)).toBe(
                true
            )
            expect(sameArray(a.surfaces.data, b.surfaces.data)).toBe(true)
            expect(a.trees).toEqual(b.trees)
            expect(a.bunkers).toEqual(b.bunkers)
            expect(a.water).toEqual(b.water)
            expect(a.centerline).toEqual(b.centerline)
            expect(a.conditions).toEqual(b.conditions)
            expect(a.tee).toEqual(b.tee)
            expect(a.pin).toEqual(b.pin)
            expect(a.bounds).toEqual(b.bounds)
            expect([a.par, a.difficulty, a.version]).toEqual([
                b.par,
                b.difficulty,
                b.version,
            ])
        }
    })

    // Version 1 is frozen once it is live. Before the launch this value may
    // be updated when the generator is tuned. After the launch a change
    // here means archive holes changed: add a new version instead.
    it('keeps the launch-day hole unchanged', () => {
        const h = hole('2026-11-27')
        expect(h.version).toBe(1)
        expect(h.number).toBe(1)
        expect(fingerprint(h)).toMatchInlineSnapshot(`"84859174"`)
    })

    it('gives different holes for different seeds', () => {
        const a = hole('test-0')
        const b = hole('test-1')
        expect(fingerprint(a)).not.toBe(fingerprint(b))
        const prints = new Set(
            manySeeds.slice(0, 40).map((s) => fingerprint(hole(s)))
        )
        expect(prints.size).toBe(40)
    })

    it('sets seed, version and number', () => {
        expect(hole('test-0').seed).toBe('test-0')
        expect(hole('test-0').number).toBe(0)
        expect(generateHole('test-0', { number: 7 }).number).toBe(7)
        expect(hole('2026-11-28').number).toBe(2)
        const daily = generateDailyHole(new Date('2026-11-28T15:00:00Z'))
        expect(daily.seed).toBe('2026-11-28')
        expect(daily.number).toBe(2)
        expect(fingerprint(daily)).toBe(fingerprint(hole('2026-11-28')))
        expect(fingerprint(generateHole('test-0', { version: 1 }))).toBe(
            fingerprint(hole('test-0'))
        )
        expect(() => generateHole('test-0', { version: 999 })).toThrow()
    })

    it('passes the playability checks for every seed', () => {
        const pars = { 3: 0, 4: 0, 5: 0 }
        for (const seed of manySeeds) {
            const h = hole(seed)
            const result = validateHole(h)
            expect(result.issues, `seed ${seed}`).toEqual([])
            expect(result.strokesToGreen).toBeLessThanOrEqual(h.par - 2)
            pars[h.par]++
        }
        expect(pars[3]).toBeGreaterThan(SEED_COUNT * 0.12)
        expect(pars[4]).toBeGreaterThan(SEED_COUNT * 0.3)
        expect(pars[5]).toBeGreaterThan(SEED_COUNT * 0.12)
    })

    it('keeps the length inside the range of the par', () => {
        const range = { 3: [140, 220], 4: [330, 470], 5: [470, 600] }
        for (const seed of manySeeds) {
            const h = hole(seed)
            const yards = holeLength(h) / YD
            expect(yards, seed).toBeGreaterThanOrEqual(range[h.par][0])
            expect(yards, seed).toBeLessThanOrEqual(range[h.par][1])
            // The first full shots must be able to cover it.
            expect(holeLength(h)).toBeLessThan(
                CLUB_CARRY[0] * (h.par - 2) * 1.07
            )
        }
    })

    it('follows the layout conventions', () => {
        for (const seed of manySeeds) {
            const h = hole(seed)
            const g = createGround(h)
            // Tee at the origin, the hole along +z.
            expect(h.tee.x).toBe(0)
            expect(h.tee.z).toBe(0)
            expect(h.centerline[0]).toEqual({ x: 0, z: 0 })
            const end = h.centerline[h.centerline.length - 1]
            expect(Math.abs(end.x)).toBeLessThan(1e-6)
            expect(end.z).toBeGreaterThan(100)
            expect(g.surface(h.tee.x, h.tee.z)).toBe('tee')
            expect(h.tee.y).toBeCloseTo(g.height(h.tee.x, h.tee.z), 6)
            // Pin on the green, with green all around it.
            expect(g.surface(h.pin.x, h.pin.z), seed).toBe('green')
            expect(h.pin.y).toBeCloseTo(g.height(h.pin.x, h.pin.z), 6)
            for (let k = 0; k < 8; k++) {
                const a = (k * Math.PI) / 4
                expect(
                    g.surface(
                        h.pin.x + 3 * Math.cos(a),
                        h.pin.z + 3 * Math.sin(a)
                    )
                ).toBe('green')
            }
            const n = g.normal(h.pin.x, h.pin.z)
            expect(Math.sqrt(1 - n.y * n.y) / n.y).toBeLessThan(0.026)
            // Grids.
            expect(h.terrain.cellSize).toBe(1)
            expect(h.greenField.cellSize).toBe(0.25)
            expect(h.terrain.heights.length).toBe(
                h.terrain.cols * h.terrain.rows
            )
            expect(h.greenField.heights.length).toBe(
                h.greenField.cols * h.greenField.rows
            )
            expect(h.surfaces.data.length).toBe(
                h.surfaces.cols * h.surfaces.rows
            )
            expect(h.terrain.originX).toBe(h.bounds.minX)
            expect(h.terrain.originZ).toBe(h.bounds.minZ)
            expect(
                h.terrain.originX + (h.terrain.cols - 1) * h.terrain.cellSize
            ).toBe(h.bounds.maxX)
            expect(
                h.surfaces.originZ + h.surfaces.rows * h.surfaces.cellSize
            ).toBe(h.bounds.maxZ)
        }
    })

    it('scales the conditions with difficulty', () => {
        for (const seed of manySeeds) {
            const h = hole(seed)
            const c = h.conditions
            expect(h.difficulty).toBeGreaterThanOrEqual(0)
            expect(h.difficulty).toBeLessThanOrEqual(1)
            const kmh = c.windSpeed * 3.6
            expect(kmh).toBeGreaterThanOrEqual(0)
            expect(kmh).toBeLessThanOrEqual(9 + 16 * h.difficulty + 1e-9)
            expect(c.windDirection).toBeGreaterThanOrEqual(0)
            expect(c.windDirection).toBeLessThan(2 * Math.PI)
            expect(c.airDensity).toBeGreaterThanOrEqual(1.1)
            expect(c.airDensity).toBeLessThanOrEqual(1.225)
            expect(c.stimp).toBeGreaterThanOrEqual(9)
            expect(c.stimp).toBeLessThanOrEqual(12)
        }
    })

    it('makes hard holes tighter than easy holes', () => {
        const easy = manySeeds.map(hole).filter((h) => h.difficulty < 0.3)
        const hard = manySeeds.map(hole).filter((h) => h.difficulty > 0.7)
        expect(easy.length).toBeGreaterThan(20)
        expect(hard.length).toBeGreaterThan(20)
        const mean = (list: HoleData[], f: (h: HoleData) => number): number =>
            list.reduce((sum, h) => sum + f(h), 0) / list.length
        const count = (h: HoleData, id: string): number => {
            const index = SURFACE_IDS.indexOf(
                id as (typeof SURFACE_IDS)[number]
            )
            let n = 0
            for (const v of h.surfaces.data) {
                if (v === index) {
                    n++
                }
            }
            return n * h.surfaces.cellSize * h.surfaces.cellSize
        }
        // Hazards and wind go up, the green gets smaller.
        expect(mean(hard, (h) => h.bunkers.length)).toBeGreaterThan(
            mean(easy, (h) => h.bunkers.length) + 0.8
        )
        expect(mean(hard, (h) => h.water.length)).toBeGreaterThan(
            mean(easy, (h) => h.water.length)
        )
        expect(mean(hard, (h) => h.conditions.windSpeed)).toBeGreaterThan(
            mean(easy, (h) => h.conditions.windSpeed)
        )
        expect(mean(hard, (h) => count(h, 'green'))).toBeLessThan(
            mean(easy, (h) => count(h, 'green')) * 0.85
        )
        // Fairway area for each metre of hole (par 4 and 5 only).
        const perMetre = (h: HoleData): number =>
            count(h, 'fairway') / holeLength(h)
        expect(
            mean(
                hard.filter((h) => h.par > 3),
                perMetre
            )
        ).toBeLessThan(
            mean(
                easy.filter((h) => h.par > 3),
                perMetre
            ) * 0.9
        )
    })

    it('builds greens of 27 to 38 yd with gentle slopes', () => {
        const GREEN = SURFACE_IDS.indexOf('green')
        for (const seed of manySeeds.slice(0, 80)) {
            const h = hole(seed)
            const g = createGround(h)
            const s = h.surfaces
            let area = 0
            let slopeSum = 0
            let slopeCount = 0
            for (let r = 0; r < s.rows; r++) {
                for (let c = 0; c < s.cols; c++) {
                    if (s.data[r * s.cols + c] !== GREEN) {
                        continue
                    }
                    area += s.cellSize * s.cellSize
                    if ((r + c) % 4 === 0) {
                        const n = g.normal(
                            s.originX + (c + 0.5) * s.cellSize,
                            s.originZ + (r + 0.5) * s.cellSize
                        )
                        const slope = Math.sqrt(1 - n.y * n.y) / n.y
                        expect(slope, seed).toBeLessThan(0.05)
                        slopeSum += slope
                        slopeCount++
                    }
                }
            }
            // Diameter of a circle with the same area.
            const diameter = (2 * Math.sqrt(area / Math.PI)) / YD
            expect(diameter, seed).toBeGreaterThan(26.5)
            expect(diameter, seed).toBeLessThan(38.5)
            const meanSlope = slopeSum / slopeCount
            expect(meanSlope, seed).toBeGreaterThan(0.007)
            expect(meanSlope, seed).toBeLessThan(0.032)
        }
    })

    it('carves bunkers and water into the ground', () => {
        let bunkers = 0
        let waters = 0
        let greenside = 0
        for (const seed of manySeeds.slice(0, 120)) {
            const h = hole(seed)
            const g = createGround(h)
            for (const b of h.bunkers) {
                bunkers++
                greenside += b.greenside ? 1 : 0
                expect(b.outline.length).toBeGreaterThan(8)
                let cx = 0
                let cz = 0
                let rim = 0
                for (const p of b.outline) {
                    cx += p.x / b.outline.length
                    cz += p.z / b.outline.length
                    rim += g.height(p.x, p.z) / b.outline.length
                }
                expect(g.surface(cx, cz)).toBe('bunker')
                // The sand lies below the rim.
                expect(rim - g.height(cx, cz), seed).toBeGreaterThan(0.2)
                expect(rim - g.height(cx, cz), seed).toBeLessThan(1.3)
            }
            for (const w of h.water) {
                waters++
                expect(w.outline.length).toBeGreaterThan(8)
            }
            if (h.water.length === 1) {
                // Every water cell is below the water level.
                const WATER = SURFACE_IDS.indexOf('water')
                const s = h.surfaces
                for (let r = 0; r < s.rows; r += 2) {
                    for (let c = 0; c < s.cols; c += 2) {
                        if (s.data[r * s.cols + c] === WATER) {
                            const y = g.height(
                                s.originX + (c + 0.5) * s.cellSize,
                                s.originZ + (r + 0.5) * s.cellSize
                            )
                            expect(y).toBeLessThan(h.water[0].level)
                        }
                    }
                }
                // Dry ground near the shore is above the water level.
                const outline = h.water[0].outline
                const shoreDistance = (x: number, z: number): number => {
                    let best = Infinity
                    for (let i = 0; i < outline.length; i++) {
                        const p = outline[i]
                        const q = outline[(i + 1) % outline.length]
                        const ex = q.x - p.x
                        const ez = q.z - p.z
                        const t = Math.max(
                            0,
                            Math.min(
                                1,
                                ((x - p.x) * ex + (z - p.z) * ez) /
                                    (ex * ex + ez * ez)
                            )
                        )
                        best = Math.min(
                            best,
                            Math.hypot(x - p.x - ex * t, z - p.z - ez * t)
                        )
                    }
                    return best
                }
                let checked = 0
                for (let i = 0; i < outline.length; i++) {
                    const p = outline[i]
                    const q = outline[(i + 1) % outline.length]
                    const len = Math.hypot(q.x - p.x, q.z - p.z)
                    for (const side of [-1, 1]) {
                        const x = p.x + ((q.z - p.z) / len) * 5 * side
                        const z = p.z - ((q.x - p.x) / len) * 5 * side
                        if (
                            g.surface(x, z) !== 'water' &&
                            g.surface(x, z) !== 'ob' &&
                            shoreDistance(x, z) > 2.5
                        ) {
                            checked++
                            expect(g.height(x, z), seed).toBeGreaterThan(
                                h.water[0].level
                            )
                        }
                    }
                }
                expect(checked).toBeGreaterThan(5)
            }
        }
        expect(bunkers).toBeGreaterThan(200)
        expect(greenside).toBeGreaterThan(100)
        expect(bunkers - greenside).toBeGreaterThan(30)
        expect(waters).toBeGreaterThan(10)
    })

    it('plants trees in the rough and beyond, on the ground', () => {
        const kinds = new Set<string>()
        for (const seed of manySeeds.slice(0, 80)) {
            const h = hole(seed)
            const g = createGround(h)
            expect(h.trees.length).toBeGreaterThan(80)
            expect(h.trees.length).toBeLessThan(1200)
            for (const t of h.trees) {
                kinds.add(t.kind)
                expect(['rough', 'ob']).toContain(g.surface(t.x, t.z))
                expect(t.y).toBeCloseTo(g.height(t.x, t.z), 6)
                expect(t.height).toBeGreaterThan(6)
                expect(t.radius).toBeGreaterThan(1)
            }
        }
        expect([...kinds].sort()).toEqual(['birch', 'broadleaf', 'pine'])
    })

    it('rejects broken holes in validation', () => {
        const good = hole('test-3')
        expect(validateHole(good).ok).toBe(true)

        const offGreen = { ...good, pin: { ...good.pin, x: good.pin.x + 60 } }
        expect(validateHole(offGreen).ok).toBe(false)

        const offTee = { ...good, tee: { x: 20, y: 0, z: 0 } }
        expect(validateHole(offTee).ok).toBe(false)

        const mid = good.centerline[good.centerline.length >> 1]
        const treeOnLine = {
            ...good,
            trees: [
                ...good.trees,
                {
                    x: mid.x,
                    z: mid.z,
                    y: 0,
                    height: 12,
                    radius: 4,
                    kind: 'pine' as const,
                },
            ],
        }
        expect(validateHole(treeOnLine).issues.join()).toContain('trees')

        // Flood everything that is not the tee or the green.
        const flooded = {
            ...good,
            surfaces: {
                ...good.surfaces,
                data: good.surfaces.data.map((v) =>
                    v === SURFACE_IDS.indexOf('fairway') ||
                    v === SURFACE_IDS.indexOf('firstCut')
                        ? SURFACE_IDS.indexOf('water')
                        : v
                ),
            },
        }
        const result = validateHole(flooded)
        expect(result.ok).toBe(false)
        if (good.par > 3) {
            expect(result.strokesToGreen).toBeGreaterThan(good.par - 2)
        }
    })

    it('generates a hole quickly', () => {
        generateHole('warm-up')
        const times: number[] = []
        for (const seed of ['time-a', 'time-b', 'time-c', 'time-d', 'time-e']) {
            const start = performance.now()
            generateHole(seed)
            times.push(performance.now() - start)
        }
        times.sort((a, b) => a - b)
        expect(times[2]).toBeLessThan(300)
    })
})
