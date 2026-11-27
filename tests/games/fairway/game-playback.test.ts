import { describe, expect, it } from 'vitest'

import { flightWind, sampleAt } from '../../../games/fairway/src/game/flight'
import {
    PREVIEW_MIN_LENGTH,
    PREVIEW_SHARE_FLIGHT,
    PREVIEW_SHARE_PUTT,
    pathStart,
    previewLength,
    previewPoints,
} from '../../../games/fairway/src/game/preview'
import type { TrajectorySample } from '../../../games/fairway/src/physics'
import { GREEN, hit, hitClub, putt } from './helpers'

function sample(t: number, x: number, y: number, z: number): TrajectorySample {
    return { t, x, y, z, phase: 'air' }
}

describe('flight playback', () => {
    const path = [sample(0, 0, 0, 0), sample(1, 10, 5, 0), sample(2, 20, 0, 4)]

    it('interpolates the position and gives the segment velocity', () => {
        const a = sampleAt(path, 0.5)
        expect(a.pos).toEqual({ x: 5, y: 2.5, z: 0 })
        expect(a.vel).toEqual({ x: 10, y: 5, z: 0 })
        const b = sampleAt(path, 1.5)
        expect(b.pos).toEqual({ x: 15, y: 2.5, z: 2 })
        expect(b.vel).toEqual({ x: 10, y: -5, z: 4 })
    })

    it('clamps to the ends of the path', () => {
        expect(sampleAt(path, -1).pos).toEqual({ x: 0, y: 0, z: 0 })
        expect(sampleAt(path, 9).pos).toEqual({ x: 20, y: 0, z: 4 })
        const single = sampleAt([sample(0, 1, 2, 3)], 0.3)
        expect(single.pos).toEqual({ x: 1, y: 2, z: 3 })
        expect(single.vel).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('lifts the flight wind with speed and height, up to 1', () => {
        expect(flightWind({ x: 0, y: 0, z: 0 }, 0)).toBe(0)
        expect(flightWind({ x: 0, y: 0, z: 0 }, -3)).toBe(0)
        expect(flightWind({ x: 65, y: 0, z: 0 }, 0)).toBeCloseTo(0.55, 12)
        expect(flightWind({ x: 0, y: 0, z: 0 }, 30)).toBeCloseTo(0.45, 12)
        expect(flightWind({ x: 80, y: 10, z: 0 }, 50)).toBeCloseTo(1, 12)
    })
})

describe('path preview', () => {
    it('cuts the path at a horizontal distance from its start', () => {
        const path = [
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 1, z: 2 },
            { x: 0, y: 2, z: 4 },
            { x: 0, y: 3, z: 6 },
        ]
        const cut = pathStart(path, 3)
        expect(cut).toHaveLength(3)
        expect(cut[2]).toEqual({ x: 0, y: 1.5, z: 3 })
        expect(pathStart(path, 100)).toEqual(path)
        expect(pathStart([], 3)).toEqual([])
    })

    it('shows only the start of a full shot', () => {
        const result = hitClub('iron7')
        const want = PREVIEW_SHARE_FLIGHT * result.carry
        expect(previewLength(result, false)).toBeCloseTo(want, 12)
        const points = previewPoints(result, false)!
        expect(points.length).toBeGreaterThan(1)
        const last = points[points.length - 1]
        expect(Math.hypot(last.x, last.z)).toBeCloseTo(want, 9)
        // Climbing at the launch angle, far below the apex.
        expect(last.y).toBeGreaterThan(0)
        expect(last.y).toBeLessThan(result.apex!.position.y)
    })

    it('shows a share of the roll of a putt, at least the minimum', () => {
        const long = hit(putt(4), GREEN)
        expect(previewLength(long, true)).toBeCloseTo(
            PREVIEW_SHARE_PUTT * long.total,
            12
        )
        const short = hit(putt(0.5), GREEN)
        expect(PREVIEW_SHARE_PUTT * short.total).toBeLessThan(
            PREVIEW_MIN_LENGTH
        )
        expect(previewLength(short, true)).toBe(PREVIEW_MIN_LENGTH)
    })
})
