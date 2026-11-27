import { describe, expect, it } from 'vitest'

import {
    CLUBS,
    CLUB_ORDER,
    type ClubId,
    defaultEnvironment,
    kmhToMs,
    launchFor,
    mToYd,
    nominalCarry,
    windFactor,
} from '../../../games/fairway/src/physics'
import { FAIRWAY, hit, hitClub } from './helpers'

const FULL_CLUBS = CLUB_ORDER.filter((id) => id !== 'putter')

// SPEC 5.3, carry in yards.
const SPEC_CARRY_YD: Record<Exclude<ClubId, 'putter'>, number> = {
    driver: 235,
    wood3: 213,
    iron5: 180,
    iron7: 159,
    iron9: 131,
    pw: 115,
    sw: 82,
}

function windEnv(xKmh: number, zKmh: number) {
    return defaultEnvironment({
        wind: { x: kmhToMs(xKmh), z: kmhToMs(zKmh) },
    })
}

describe('club carries', () => {
    it.each(FULL_CLUBS)('%s full power is within 5%% of the SPEC', (id) => {
        const result = hitClub(id)
        const target = CLUBS[id].targetCarry
        expect(Math.abs(result.carry / target - 1)).toBeLessThan(0.05)
        const yd = SPEC_CARRY_YD[id as Exclude<ClubId, 'putter'>]
        expect(Math.abs(mToYd(result.carry) / yd - 1)).toBeLessThan(0.05)
        // The exposed nominal carry is the simulated one.
        expect(result.carry).toBeCloseTo(nominalCarry(id), 6)
    })

    it('gives longer clubs more carry', () => {
        const carries = FULL_CLUBS.map((id) => nominalCarry(id))
        for (let i = 1; i < carries.length; i++) {
            expect(carries[i]).toBeLessThan(carries[i - 1])
        }
        expect(nominalCarry('putter')).toBe(0)
    })

    it('reports a sensible flight', () => {
        const result = hitClub('driver')
        expect(result.outcome).toBe('rest')
        expect(result.landing).not.toBeNull()
        expect(result.apex).not.toBeNull()
        expect(result.apex!.position.y).toBeGreaterThan(20)
        expect(result.apex!.position.y).toBeLessThan(40)
        expect(result.apex!.t).toBeLessThan(result.landing!.t)
        expect(result.bounces[0].t).toBe(result.landing!.t)
        expect(result.total).toBeGreaterThan(result.carry)
        // No wind: the ball stays on the aim line.
        expect(Math.abs(result.rest.x)).toBeLessThan(1e-9)
        // Thin air carries further.
        const thin = hitClub(
            'driver',
            1,
            FAIRWAY,
            defaultEnvironment({ airDensity: 1.1 })
        )
        expect(thin.carry).toBeGreaterThan(result.carry)
        expect(thin.carry / result.carry).toBeLessThan(1.06)
    })
})

describe('power', () => {
    it.each(FULL_CLUBS)('%s carry is linear in power', (id) => {
        const nominal = nominalCarry(id)
        for (const power of [0.75, 0.5, 0.25, 0.1]) {
            const carry = hitClub(id, power).carry
            expect(Math.abs(carry / (power * nominal) - 1)).toBeLessThan(0.02)
        }
    })

    it('scales speed and spin together and keeps the launch angle', () => {
        const full = launchFor('iron7', 1)
        const half = launchFor('iron7', 0.5)
        expect(full.speed).toBeCloseTo(CLUBS.iron7.ballSpeed, 9)
        expect(half.launchAngle).toBe(full.launchAngle)
        expect(half.speed).toBeLessThan(full.speed)
        expect(half.spin / full.spin).toBeCloseTo(half.speed / full.speed, 9)
    })

    it('caps power at 1 and handles 0', () => {
        expect(launchFor('driver', 1.5)).toEqual(launchFor('driver', 1))
        expect(launchFor('driver', 0).speed).toBe(0)
        const still = hitClub('driver', 0)
        expect(still.total).toBe(0)
        expect(still.outcome).toBe('rest')
    })

    it('maps putter power to a start speed for a linear roll distance', () => {
        expect(launchFor('putter', 1).speed).toBeCloseTo(5.135, 2)
        expect(launchFor('putter', 0.25).speed).toBeCloseTo(5.135 / 2, 2)
        expect(launchFor('putter', 0.5).rolling).toBe(true)
    })
})

describe('lie', () => {
    it('gives less carry and less spin from the rough', () => {
        const fairway = hitClub('iron7', 0.8, FAIRWAY, undefined, 'fairway')
        const firstCut = hitClub('iron7', 0.8, FAIRWAY, undefined, 'firstCut')
        const rough = hitClub('iron7', 0.8, FAIRWAY, undefined, 'rough')
        const bunker = hitClub('iron7', 0.8, FAIRWAY, undefined, 'bunker')
        expect(firstCut.carry / fairway.carry).toBeCloseTo(0.95, 2)
        expect(rough.carry).toBeLessThan(firstCut.carry)
        expect(rough.carry / fairway.carry).toBeGreaterThan(0.75)
        expect(rough.carry / fairway.carry).toBeLessThan(0.92)
        expect(bunker.carry).toBeLessThan(rough.carry)
        const a = launchFor('iron7', 0.8, 'fairway')
        const b = launchFor('iron7', 0.8, 'rough')
        expect(b.spin / b.speed).toBeLessThan(a.spin / a.speed)
    })
})

describe('wind', () => {
    it('shortens the carry into the wind and lengthens it downwind', () => {
        const calm = hitClub('iron7').carry
        const head = hitClub('iron7', 1, FAIRWAY, windEnv(0, -20)).carry
        const tail = hitClub('iron7', 1, FAIRWAY, windEnv(0, 20)).carry
        const loss = 1 - head / calm
        const gain = tail / calm - 1
        expect(loss).toBeGreaterThan(0.08)
        expect(loss).toBeLessThan(0.15)
        expect(gain).toBeGreaterThan(0.03)
        expect(gain).toBeLessThan(0.12)
        // A head wind hurts more than a tail wind helps.
        expect(loss).toBeGreaterThan(gain)
    })

    it('moves the ball sideways with a cross wind', () => {
        const right = hitClub('iron7', 1, FAIRWAY, windEnv(20, 0))
        const left = hitClub('iron7', 1, FAIRWAY, windEnv(-20, 0))
        expect(right.landing!.position.x).toBeGreaterThan(5)
        expect(right.landing!.position.x).toBeLessThan(30)
        expect(left.landing!.position.x).toBeCloseTo(
            -right.landing!.position.x,
            9
        )
    })

    it('is stronger at height', () => {
        expect(windFactor(0)).toBe(0)
        expect(windFactor(10)).toBeCloseTo(1, 12)
        expect(windFactor(1)).toBeLessThan(windFactor(5))
        expect(windFactor(30)).toBeGreaterThan(1)

        // The same ball speed and spin, launched low and high.
        const base = launchFor('iron7', 1)
        const low = { ...base, launchAngle: base.launchAngle * 0.5 }
        const env = windEnv(20, 0)
        const highShot = hit(base, FAIRWAY, env)
        const lowShot = hit(low, FAIRWAY, env)
        expect(lowShot.apex!.position.y).toBeLessThan(highShot.apex!.position.y)
        const drift = (r: typeof highShot) =>
            r.landing!.position.x / r.landing!.position.z
        expect(drift(highShot)).toBeGreaterThan(drift(lowShot) * 1.2)
    })
})

describe('determinism', () => {
    it('gives identical results for identical inputs', () => {
        const env = windEnv(11, -7)
        const a = hitClub('driver', 0.93, FAIRWAY, env)
        const b = hitClub('driver', 0.93, FAIRWAY, env)
        expect(b).toEqual(a)
        expect(JSON.stringify(b)).toBe(JSON.stringify(a))
        expect(Object.is(a.rest.x, b.rest.x)).toBe(true)
    })

    it('records a path that ends at the rest position', () => {
        const result = hitClub('iron5', 1, FAIRWAY, windEnv(5, 5))
        const samples = result.samples
        expect(samples[0]).toMatchObject({ t: 0, x: 0, y: 0, z: 0 })
        const last = samples[samples.length - 1]
        expect(last.t).toBe(result.duration)
        expect(last.x).toBe(result.rest.x)
        expect(last.z).toBe(result.rest.z)
        for (let i = 1; i < samples.length; i++) {
            expect(samples[i].t).toBeGreaterThan(samples[i - 1].t)
            expect(samples[i].t - samples[i - 1].t).toBeLessThan(1 / 60 + 1e-9)
        }
        // The landing point is one of the samples.
        const landing = result.landing!
        expect(samples.some((s) => s.t === landing.t && s.y === 0)).toBe(true)
        expect(samples.some((s) => s.phase === 'ground')).toBe(true)
    })
})
