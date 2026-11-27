import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HoleData, Vec2 } from '../../../games/fairway/src/shared/hole'
import {
    type Minimap,
    createMapTransform,
    createMinimap,
} from '../../../games/fairway/src/ui/minimap'

/** A small synthetic hole: tee at the origin, pin at `pin`. */
function makeHole(pin: Vec2, centerline?: Vec2[]): HoleData {
    const cols = 40
    const rows = 80
    return {
        version: 1,
        seed: 'test',
        number: 1,
        par: 4,
        difficulty: 0.5,
        bounds: { minX: -100, minZ: -100, maxX: 100, maxZ: 400 },
        tee: { x: 0, y: 0, z: 0 },
        pin: { x: pin.x, y: 0, z: pin.z },
        centerline: centerline ?? [
            { x: 0, z: 0 },
            { x: pin.x, z: pin.z },
        ],
        terrain: {
            originX: -100,
            originZ: -100,
            cellSize: 10,
            cols,
            rows,
            heights: new Float32Array(cols * rows),
        },
        greenField: {
            originX: 0,
            originZ: 0,
            cellSize: 0.25,
            cols: 2,
            rows: 2,
            heights: new Float32Array(4),
        },
        surfaces: {
            originX: -100,
            originZ: -100,
            cellSize: 10,
            cols,
            rows,
            data: new Uint8Array(cols * rows).fill(3),
        },
        bunkers: [],
        water: [],
        trees: [{ x: 20, y: 0, z: 100, height: 12, radius: 4, kind: 'pine' }],
        conditions: {
            windSpeed: 3,
            windDirection: 0,
            airDensity: 1.2,
            stimp: 10,
        },
    }
}

describe('createMapTransform', () => {
    const W = 150
    const H = 220

    it('puts the tee at the bottom centre and the pin at the top', () => {
        const t = createMapTransform(makeHole({ x: 0, z: 400 }), W, H)
        const tee = t.toMap(0, 0)
        const pin = t.toMap(0, 400)
        expect(tee.x).toBeCloseTo(W / 2, 6)
        expect(tee.y).toBeGreaterThan(H * 0.85)
        expect(tee.y).toBeLessThan(H)
        expect(pin.x).toBeCloseTo(W / 2, 6)
        expect(pin.y).toBeLessThan(H * 0.2)
        expect(pin.y).toBeGreaterThan(0)
    })

    it('rotates any hole direction so the pin is up', () => {
        // Hole toward +x: the tee is still at the bottom, the pin at the top.
        const t = createMapTransform(makeHole({ x: 300, z: 0 }), W, H)
        const tee = t.toMap(0, 0)
        const pin = t.toMap(300, 0)
        expect(tee.x).toBeCloseTo(pin.x, 6)
        expect(pin.y).toBeLessThan(tee.y)
    })

    it('maps headings with the player right to the map right', () => {
        // Facing +z with y up, the player's right is -x.
        const t = createMapTransform(makeHole({ x: 0, z: 300 }), W, H)
        const up = t.dirToMap(Math.PI / 2)
        expect(up.x).toBeCloseTo(0, 9)
        expect(up.y).toBeCloseTo(-1, 9)
        const right = t.dirToMap(Math.PI)
        expect(right.x).toBeCloseTo(1, 9)
        expect(right.y).toBeCloseTo(0, 9)
        // A small positive heading change turns to the right on the map.
        expect(t.dirToMap(Math.PI / 2 + 0.1).x).toBeGreaterThan(0)
    })

    it('round-trips between world and map', () => {
        const t = createMapTransform(makeHole({ x: 40, z: 350 }), W, H)
        const m = t.toMap(-12.5, 210)
        const w = t.toWorld(m.x, m.y)
        expect(w.x).toBeCloseTo(-12.5, 6)
        expect(w.z).toBeCloseTo(210, 6)
    })

    it('fits a long dogleg par 5 with a margin', () => {
        const line: Vec2[] = []
        for (let i = 0; i <= 50; i++) {
            const z = (i / 50) * 550
            line.push({ x: -70 * Math.sin((Math.PI * i) / 50), z })
        }
        for (const [w, ht] of [
            [150, 220],
            [96, 140],
        ]) {
            const t = createMapTransform(
                makeHole({ x: 0, z: 550 }, line),
                w,
                ht
            )
            for (const p of line) {
                const m = t.toMap(p.x, p.z)
                expect(m.x).toBeGreaterThan(2)
                expect(m.x).toBeLessThan(w - 2)
                expect(m.y).toBeGreaterThan(4)
                expect(m.y).toBeLessThan(ht - 2)
            }
        }
    })
})

describe('createMinimap', () => {
    let root: HTMLElement
    let map: Minimap

    beforeEach(() => {
        root = document.createElement('div')
        document.body.append(root)
        map = createMinimap(root)
    })

    afterEach(() => {
        map.dispose()
        root.remove()
    })

    it('renders without a 2D context and updates without throwing', () => {
        expect(root.querySelector('.fw-minimap canvas')).not.toBeNull()
        expect(map.el.hasAttribute('data-empty')).toBe(true)
        expect(map.el.getAttribute('aria-hidden')).toBe('true')
        const hole = makeHole({ x: 0, z: 300 })
        expect(() => map.setHole(hole)).not.toThrow()
        expect(map.el.hasAttribute('data-empty')).toBe(false)
        expect(Number.isFinite(map.lastBuildMs())).toBe(true)
        expect(() =>
            map.update({
                ball: { x: 0, y: 0, z: 0 },
                aim: Math.PI / 2,
                landing: { x: 0, y: 0, z: 215 },
            })
        ).not.toThrow()
        expect(() =>
            map.update({ ball: { x: 1, y: 0, z: 2 }, aim: 1.4, landing: null })
        ).not.toThrow()
    })

    it('shows and hides', () => {
        map.setVisible(false)
        expect(map.el.hasAttribute('data-hidden')).toBe(true)
        map.setVisible(true)
        expect(map.el.hasAttribute('data-hidden')).toBe(false)
    })

    it('removes itself on dispose', () => {
        map.dispose()
        expect(root.querySelector('.fw-minimap')).toBeNull()
    })
})
