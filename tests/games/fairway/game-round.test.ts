import { describe, expect, it } from 'vitest'

import { generateHole } from '../../../games/fairway/src/course'
import {
    CLUB_LENGTH,
    MAX_STROKES,
    createRound,
    defaultAim,
    distanceToPin,
    headingToPin,
    playShot,
    suggestClub,
} from '../../../games/fairway/src/game/round'
import { createStorage } from '../../../games/fairway/src/game/storage'
import {
    createPlaneGround,
    defaultEnvironment,
    launchFor,
    simulateShot,
} from '../../../games/fairway/src/physics'
import type { SurfaceId } from '../../../games/fairway/src/shared/hole'

const hole = generateHole('alpha')

// A flat test range: tee at the origin, the hole along +z. Water from 100 m
// to 140 m, out of bounds beyond x = 30, the green around the pin.
function testRound() {
    const pin = { x: 0, y: 0, z: 300 }
    const surface = (x: number, z: number): SurfaceId => {
        if (Math.abs(x) > 30) {
            return 'ob'
        }
        if (z > 100 && z < 140) {
            return 'water'
        }
        if (Math.hypot(x, z - pin.z) < 15) {
            return 'green'
        }
        return 'fairway'
    }
    const ground = createPlaneGround({ surface })
    const env = defaultEnvironment({ cup: { x: pin.x, z: pin.z } })
    const round = createRound(
        { ...hole, tee: { x: 0, y: 0, z: 0 }, pin },
        { ground, env }
    )
    return round
}

const UP = Math.PI / 2 // heading along +z

describe('round rules', () => {
    it('starts on the tee and suggests a long club', () => {
        const r = createRound(hole)
        expect(r.lie).toBe('tee')
        expect(r.stats.strokes).toBe(0)
        expect(['driver', 'wood3']).toContain(suggestClub(r))
        expect(distanceToPin(r)).toBeGreaterThan(400)
    })

    it('water costs a stroke and drops the ball before the hazard', () => {
        const r = testRound()
        // A 9 iron carries about 120 m: into the water.
        const out = playShot(r, { club: 'iron9', aim: UP, power: 1 })
        expect(out.notes).toContain('water')
        expect(out.penalty).toBe(1)
        expect(r.stats.strokes).toBe(2)
        // One club length back from the edge of the water (z = 100), on
        // the line to the shot start.
        expect(r.ball.z).toBeGreaterThan(100 - CLUB_LENGTH - 0.2)
        expect(r.ball.z).toBeLessThan(100 - CLUB_LENGTH + 0.2)
        expect(r.ball.x).toBeCloseTo(0, 6)
        expect(r.lie).not.toBe('water')
    })

    it('out of bounds costs a stroke and replays from the same spot', () => {
        const r = testRound()
        const out = playShot(r, { club: 'iron7', aim: 0.2, power: 1 })
        expect(out.notes).toContain('ob')
        expect(r.stats.strokes).toBe(2)
        expect(r.ball).toEqual({ x: 0, y: 0, z: 0 })
    })

    it('a clean shot moves the ball and counts one stroke', () => {
        const r = testRound()
        playShot(r, { club: 'driver', aim: UP, power: 1 })
        expect(r.stats.strokes).toBe(1)
        expect(r.ball.z).toBeGreaterThan(200)
        expect(r.lie).toBe('fairway')
    })

    it('a putt on the green can be holed and ends the round', () => {
        const r = testRound()
        r.ball = { x: 0, y: 0, z: 297 }
        r.lie = 'green'
        expect(suggestClub(r)).toBe('putter')
        expect(headingToPin(r)).toBeCloseTo(UP, 6)
        // Power is linear in the flat roll (24 m at full power): aim to
        // roll 3.5 m, so the ball reaches the cup slowly.
        const out = playShot(r, { club: 'putter', aim: UP, power: 3.5 / 24 })
        expect(out.notes).toContain('holed')
        expect(r.done).toBe(true)
        expect(r.stats.putts).toBe(1)
    })

    it('aims down the fairway on a dogleg, and at the pin in reach', () => {
        // Straight along +z for 250 m, then a right angle toward +x.
        const centerline = []
        for (let z = 0; z <= 250; z += 10) {
            centerline.push({ x: 0, z })
        }
        for (let x = 10; x <= 200; x += 10) {
            centerline.push({ x, z: 250 })
        }
        const pin = { x: 200, y: 0, z: 250 }
        const r = createRound(
            { ...hole, centerline, tee: { x: 0, y: 0, z: 0 }, pin },
            {
                ground: createPlaneGround({ surface: 'fairway' }),
                env: defaultEnvironment(),
            }
        )
        // The driver (about 215 m) cannot reach: aim along the first leg.
        expect(defaultAim(r, 'driver')).toBeCloseTo(UP, 6)
        // From the corner: aim along the second leg, toward the pin.
        r.ball = { x: 0, y: 0, z: 250 }
        expect(defaultAim(r, 'iron5')).toBeCloseTo(0, 6)
    })

    it('stops at the stroke limit', () => {
        const r = testRound()
        for (let i = 0; i < MAX_STROKES && !r.done; i++) {
            playShot(r, { club: 'sw', aim: UP, power: 0.05 })
        }
        expect(r.done).toBe(true)
        expect(r.holed).toBe(false)
        expect(() => playShot(r, { club: 'sw', aim: UP, power: 0.1 })).toThrow()
    })

    it('replays give identical results', () => {
        const shots = [
            { club: 'driver' as const, aim: UP + 0.01, power: 0.9 },
            { club: 'iron7' as const, aim: UP - 0.02, power: 0.6 },
        ]
        const a = testRound()
        const b = testRound()
        for (const s of shots) {
            playShot(a, s)
            playShot(b, s)
        }
        expect(a.ball).toEqual(b.ball)
        expect(a.stats).toEqual(b.stats)
    })
})

describe('putter distance', () => {
    function roll(power: number, stimp: number): number {
        return simulateShot(
            {
                start: { x: 0, z: 0 },
                aim: { x: 0, z: 1 },
                launch: launchFor('putter', power, 'green'),
            },
            defaultEnvironment({ stimp }),
            createPlaneGround({ surface: 'green' })
        ).total
    }

    it('is linear in distance: full power rolls about 24 m at Stimp 10', () => {
        expect(roll(1, 10)).toBeGreaterThan(22.5)
        expect(roll(1, 10)).toBeLessThan(25.5)
        expect(roll(0.5, 10) / roll(1, 10)).toBeCloseTo(0.5, 1)
        expect(roll(0.1, 10)).toBeGreaterThan(2)
        expect(roll(0.1, 10)).toBeLessThan(2.8)
    })

    it('rolls further on a faster green', () => {
        expect(roll(0.5, 12)).toBeGreaterThan(roll(0.5, 10) * 1.1)
    })
})

describe('storage', () => {
    function memory() {
        const m = new Map<string, string>()
        return {
            getItem: (k: string) => m.get(k) ?? null,
            setItem: (k: string, v: string) => void m.set(k, v),
        }
    }
    const result = {
        strokes: 4,
        par: 4,
        putts: 2,
        penalties: 0,
        bunkers: 0,
        version: 1,
    }

    it('keeps the first result of a day as the official one', () => {
        const s = createStorage(memory())
        expect(s.saveResult('2026-11-27', result)).toBe(true)
        expect(s.saveResult('2026-11-27', { ...result, strokes: 3 })).toBe(
            false
        )
        expect(s.result('2026-11-27')?.strokes).toBe(4)
    })

    it('works without storage and with broken data', () => {
        const none = createStorage(null)
        expect(none.results()).toEqual({})
        expect(none.saveResult('2026-11-27', result)).toBe(true)
        const broken = memory()
        broken.setItem('fairway:daily-results', '{not json')
        expect(createStorage(broken).results()).toEqual({})
    })

    it('remembers the dismissed hint', () => {
        const s = createStorage(memory())
        expect(s.hintDismissed()).toBe(false)
        s.dismissHint()
        expect(s.hintDismissed()).toBe(true)
    })
})
