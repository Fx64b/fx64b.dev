import { describe, expect, it } from 'vitest'

import {
    BALL_RADIUS,
    CUP_RADIUS,
    STIMP_RELEASE_SPEED,
    type SurfaceId,
    createPlaneGround,
    cupCaptureSpeed,
    defaultEnvironment,
    ftToM,
    greenRollDecel,
    holdingSlope,
    launchFor,
    simulateShot,
    surfaceParams,
} from '../../../games/fairway/src/physics'
import { CALM, GREEN, hit, hitClub, putt } from './helpers'

describe('green speed', () => {
    it.each([9, 10.5, 12])('stimp %d rolls the stimp distance', (stimp) => {
        const env = defaultEnvironment({ stimp })
        const result = hit(putt(STIMP_RELEASE_SPEED), GREEN, env)
        expect(Math.abs(result.total / ftToM(stimp) - 1)).toBeLessThan(0.05)
        expect(result.carry).toBe(0)
        expect(result.landing).toBeNull()
        expect(result.apex).toBeNull()
        expect(result.restSurface).toBe('green')
    })

    it('rolls further on a fast green', () => {
        const slow = hit(putt(3), GREEN, defaultEnvironment({ stimp: 9 }))
        const fast = hit(putt(3), GREEN, defaultEnvironment({ stimp: 12 }))
        expect(fast.total).toBeGreaterThan(slow.total * 1.25)
        expect(greenRollDecel(12)).toBeLessThan(greenRollDecel(9))
    })
})

describe('bounce and rollout', () => {
    const firm = defaultEnvironment({ greenFirmness: 0.9 })

    it('lets a driver run on the fairway', () => {
        const drive = hitClub('driver')
        const rollout = drive.total - drive.carry
        expect(rollout).toBeGreaterThan(10)
        expect(rollout).toBeLessThan(45)
        expect(drive.bounces.length).toBeGreaterThan(1)
    })

    it('stops a sand wedge near its pitch mark on a firm green', () => {
        const wedge = hitClub('sw', 1, GREEN, firm)
        const land = wedge.landing!.position
        const fromLanding = Math.hypot(
            wedge.rest.x - land.x,
            wedge.rest.z - land.z
        )
        expect(fromLanding).toBeLessThan(3)
        const drive = hitClub('driver')
        expect(drive.total - drive.carry).toBeGreaterThan(fromLanding + 8)
    })

    it('releases more with less spin and on firmer greens', () => {
        const soft = defaultEnvironment({ greenFirmness: 0.1 })
        const run = (club: 'iron7' | 'pw', env = firm) => {
            const r = hitClub(club, 1, GREEN, env)
            return r.total - r.carry
        }
        expect(run('iron7')).toBeGreaterThan(run('pw'))
        expect(run('iron7', firm)).toBeGreaterThan(run('iron7', soft))
    })

    it('runs less in longer grass', () => {
        const total = (surface: SurfaceId) =>
            hitClub('driver', 1, createPlaneGround({ surface })).total
        expect(total('firstCut')).toBeLessThan(total('fairway'))
        expect(total('rough')).toBeLessThan(total('firstCut'))
        expect(total('bunker')).toBeLessThan(total('rough'))
    })

    it('stops a ball in a bunker almost at once', () => {
        const sand = createPlaneGround({ surface: 'bunker' })
        for (const club of ['driver', 'iron7', 'sw'] as const) {
            const result = hitClub(club, 1, sand)
            expect(Math.abs(result.total - result.carry)).toBeLessThan(1)
            expect(result.bounces.length).toBe(1)
            expect(result.restSurface).toBe('bunker')
        }
    })

    it('uses the surface where the ball lands', () => {
        // Fairway up to 200 m, then sand.
        const ground = createPlaneGround({
            surface: (_x, z) => (z > 200 ? 'bunker' : 'fairway'),
        })
        const result = hitClub('driver', 1, ground)
        expect(result.bounces[0].surface).toBe('bunker')
        expect(result.restSurface).toBe('bunker')
        expect(result.total - result.carry).toBeLessThan(1)
    })
})

describe('slopes', () => {
    it('curves a putt downhill', () => {
        // The green rises toward +x, so the low side is -x.
        const ground = createPlaneGround({ surface: 'green', slopeX: 0.03 })
        const result = hit(putt(3), ground)
        expect(result.rest.x).toBeLessThan(-0.3)
        expect(result.rest.z).toBeGreaterThan(3)
        expect(result.rest.y).toBeCloseTo(0.03 * result.rest.x, 9)
        // The ball stays on the ground the whole way.
        for (const s of result.samples) {
            expect(s.y).toBeCloseTo(0.03 * s.x, 9)
        }
    })

    it('rolls further downhill than uphill', () => {
        const up = hit(
            putt(3),
            createPlaneGround({ surface: 'green', slopeZ: 0.03 })
        )
        const down = hit(
            putt(3),
            createPlaneGround({ surface: 'green', slopeZ: -0.03 })
        )
        const flat = hit(putt(3), GREEN)
        expect(up.total).toBeLessThan(flat.total)
        expect(down.total).toBeGreaterThan(flat.total)
    })

    it('holds a ball at rest on a gentle slope only', () => {
        const limit = holdingSlope(surfaceParams('green', CALM))
        expect(limit).toBeGreaterThan(0.04)
        expect(limit).toBeLessThan(0.12)

        const gentle = createPlaneGround({ surface: 'green', slopeX: 0.03 })
        const stays = hit(putt(0), gentle)
        expect(stays.total).toBe(0)
        expect(stays.duration).toBe(0)

        // Steep green that runs into a bunker at the bottom.
        const steep = createPlaneGround({
            slopeX: 0.2,
            surface: (x) => (x < -5 ? 'bunker' : 'green'),
        })
        const rolls = hit(putt(0), steep)
        expect(rolls.rest.x).toBeLessThan(-5)
        expect(rolls.rest.x).toBeGreaterThan(-8)
        expect(Math.abs(rolls.rest.z)).toBeLessThan(1e-9)
        expect(rolls.restSurface).toBe('bunker')
    })

    it('launches higher from an uphill lie', () => {
        const up = hitClub('iron7', 1, createPlaneGround({ slopeZ: 0.05 }))
        const level = hitClub('iron7')
        expect(up.apex!.position.y).toBeGreaterThan(level.apex!.position.y)
    })
})

describe('cup', () => {
    const cupEnv = (x = 0) => defaultEnvironment({ cup: { x, z: 3 } })

    it('has a capture speed of about 1.3 m/s for a centred putt', () => {
        const centred = cupCaptureSpeed(2 * CUP_RADIUS)
        expect(centred).toBeGreaterThan(1.3)
        expect(centred).toBeLessThan(1.6)
        expect(cupCaptureSpeed(CUP_RADIUS)).toBeLessThan(centred)
        expect(cupCaptureSpeed(BALL_RADIUS / 2)).toBe(0)
    })

    it('holes a slow centred putt', () => {
        // 2.1 m/s reaches the cup at 3 m with about 1 m/s.
        const result = hit(putt(2.1), GREEN, cupEnv())
        expect(result.holed).toBe(true)
        expect(result.outcome).toBe('holed')
        expect(result.rest).toEqual({ x: 0, y: 0, z: 3 })
        expect(result.samples[result.samples.length - 1].z).toBe(3)
    })

    it('holes a putt that dies at the hole', () => {
        const decel = greenRollDecel(CALM.stimp)
        const speed = Math.sqrt(2 * decel * 3.02)
        expect(hit(putt(speed), GREEN, cupEnv()).holed).toBe(true)
    })

    it('lips out a fast centred putt', () => {
        const result = hit(putt(4), GREEN, cupEnv())
        expect(result.holed).toBe(false)
        expect(result.rest.z).toBeGreaterThan(3.5)
        // It lost speed at the hole: without a cup it rolls further.
        const free = hit(putt(4), GREEN)
        expect(result.total).toBeLessThan(free.total)
    })

    it('captures less speed off centre and turns a lip-out', () => {
        // 2.2 m/s arrives with about 1.24 m/s: in when centred, out at the
        // edge, and turned toward the hole side.
        expect(hit(putt(2.2), GREEN, cupEnv()).holed).toBe(true)
        const edge = hit(putt(2.2), GREEN, cupEnv(0.04))
        expect(edge.holed).toBe(false)
        expect(edge.rest.x).toBeGreaterThan(0)
    })

    it('misses when the path is outside the hole', () => {
        const miss = CUP_RADIUS + BALL_RADIUS + 0.005
        for (const speed of [1.9, 2.1, 4]) {
            const result = hit(putt(speed), GREEN, cupEnv(miss))
            expect(result.holed).toBe(false)
            expect(result.rest.x).toBe(0)
        }
    })

    it('does not hole a ball that flies over the cup', () => {
        const env = defaultEnvironment({ cup: { x: 0, z: 60 } })
        const result = hitClub('sw', 1, GREEN, env)
        expect(result.holed).toBe(false)
    })
})

describe('hazards', () => {
    const band =
        (id: SurfaceId, from: number, to: number) =>
        (_x: number, z: number): SurfaceId =>
            z >= from && z < to ? id : 'fairway'

    it('stops in water and drops where the ball crossed in', () => {
        const ground = createPlaneGround({ surface: band('water', 120, 170) })
        const result = hitClub('iron7', 1, ground)
        expect(result.outcome).toBe('water')
        expect(result.holed).toBe(false)
        expect(result.ob).toBeNull()
        expect(result.restSurface).toBe('water')
        // The ball stops where it touched the water.
        expect(result.bounces.length).toBe(1)
        expect(result.total).toBe(result.carry)
        const drop = result.water!.drop
        expect(drop.z).toBeLessThan(120)
        expect(drop.z).toBeGreaterThan(119.9)
        expect(drop.x).toBeCloseTo(0, 9)
        expect(drop.y).toBe(0)
        expect(ground.surface(drop.x, drop.z)).toBe('fairway')
    })

    it('follows the wind to the crossing point', () => {
        const ground = createPlaneGround({ surface: band('water', 100, 170) })
        const env = defaultEnvironment({ wind: { x: 6, z: 0 } })
        const result = hitClub('iron7', 1, ground, env)
        expect(result.outcome).toBe('water')
        const drop = result.water!.drop
        expect(drop.x).toBeGreaterThan(1)
        expect(drop.x).toBeLessThan(result.rest.x)
        expect(drop.z).toBeCloseTo(100, 1)
    })

    it('finds water when the ball rolls in', () => {
        const ground = createPlaneGround({ surface: band('water', 225, 400) })
        const result = hitClub('driver', 1, ground)
        expect(result.carry).toBeLessThan(225)
        expect(result.outcome).toBe('water')
        expect(result.water!.drop.z).toBeCloseTo(225, 1)
        expect(result.rest.z).toBeGreaterThanOrEqual(225)
        // It may reach the water on a hop, a little past the edge.
        expect(result.rest.z).toBeLessThan(229)
        expect(result.bounces.length).toBeGreaterThan(1)
    })

    it('may fly over water', () => {
        const ground = createPlaneGround({ surface: band('water', 50, 130) })
        const result = hitClub('iron7', 1, ground)
        expect(result.outcome).toBe('rest')
        expect(result.water).toBeNull()
        expect(result.restSurface).toBe('fairway')
    })

    it('uses the last crossing if the ball flies over water twice', () => {
        const ground = createPlaneGround({
            surface: (_x, z) =>
                (z >= 30 && z < 60) || (z >= 120 && z < 170)
                    ? 'water'
                    : 'fairway',
        })
        const result = hitClub('iron7', 1, ground)
        expect(result.water!.drop.z).toBeCloseTo(120, 1)
    })

    it('stops out of bounds and gives the start as last valid position', () => {
        const ground = createPlaneGround({
            height: 2,
            surface: band('ob', 200, 1000),
        })
        const drive = simulateShot(
            {
                start: { x: 3, z: -4 },
                aim: { x: 0, z: 2 },
                launch: launchFor('driver', 1),
            },
            CALM,
            ground
        )
        expect(drive.outcome).toBe('ob')
        expect(drive.water).toBeNull()
        expect(drive.restSurface).toBe('ob')
        expect(drive.ob!.lastValid).toEqual({ x: 3, y: 2, z: -4 })
        expect(drive.total).toBe(drive.carry)
    })

    it('may roll out of bounds', () => {
        const ground = createPlaneGround({ surface: band('ob', 225, 1000) })
        const result = hitClub('driver', 1, ground)
        expect(result.outcome).toBe('ob')
        expect(result.bounces.length).toBeGreaterThan(1)
        expect(result.ob!.lastValid).toEqual({ x: 0, y: 0, z: 0 })
    })
})
