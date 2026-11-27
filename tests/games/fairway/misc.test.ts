import { describe, expect, it } from 'vitest'

import {
    buildPowerTables,
    createPlaneGround,
    defaultEnvironment,
    environmentFromHole,
    kmhToMs,
    launchFor,
    mToYd,
    msToKmh,
    radSToRpm,
    rpmToRadS,
    simulateShot,
    ydToM,
} from '../../../games/fairway/src/physics'
import { atan, cos, ln, sin } from '../../../games/fairway/src/physics/detmath'

describe('performance', () => {
    // Loose limits so that a slow CI machine passes. Typical values are
    // about 30 to 100 ms for the tables (cold) and 0.5 ms for a drive.
    it('builds the power tables quickly', () => {
        const t0 = performance.now()
        buildPowerTables()
        expect(performance.now() - t0).toBeLessThan(400)
    })

    it('simulates a full driver shot in well under 5 ms', () => {
        const ground = createPlaneGround()
        const env = defaultEnvironment({ wind: { x: 3, z: -4 } })
        const shot = {
            start: { x: 0, z: 0 },
            aim: { x: 0, z: 1 },
            launch: launchFor('driver', 1),
        }
        for (let i = 0; i < 20; i++) {
            simulateShot(shot, env, ground)
        }
        const runs = 50
        const t0 = performance.now()
        for (let i = 0; i < runs; i++) {
            simulateShot(shot, env, ground)
        }
        expect((performance.now() - t0) / runs).toBeLessThan(5)
    })
})

describe('units', () => {
    it('converts', () => {
        expect(mToYd(215)).toBeCloseTo(235.13, 2)
        expect(ydToM(mToYd(123.4))).toBeCloseTo(123.4, 12)
        expect(msToKmh(10)).toBe(36)
        expect(kmhToMs(36)).toBe(10)
        expect(rpmToRadS(60)).toBeCloseTo(2 * Math.PI, 12)
        expect(radSToRpm(rpmToRadS(2700))).toBeCloseTo(2700, 9)
    })
})

describe('deterministic math', () => {
    it('matches the built-in functions', () => {
        for (let x = 0.001; x < 5000; x *= 1.07) {
            expect(Math.abs(ln(x) - Math.log(x))).toBeLessThan(1e-13)
        }
        for (let x = -7; x < 7; x += 0.013) {
            expect(Math.abs(sin(x) - Math.sin(x))).toBeLessThan(1e-13)
            expect(Math.abs(cos(x) - Math.cos(x))).toBeLessThan(1e-13)
            expect(Math.abs(atan(8 * x) - Math.atan(8 * x))).toBeLessThan(1e-13)
        }
    })
})

describe('environment from hole data', () => {
    it('turns wind speed and direction into a vector', () => {
        const env = environmentFromHole(
            {
                windSpeed: 5,
                windDirection: Math.PI / 2,
                airDensity: 1.15,
                stimp: 11,
            },
            { x: 4, y: 1.5, z: 320 }
        )
        // Direction is atan2(z, x): pi/2 blows toward +z.
        expect(env.wind.x).toBeCloseTo(0, 12)
        expect(env.wind.z).toBeCloseTo(5, 12)
        expect(env.airDensity).toBe(1.15)
        expect(env.stimp).toBe(11)
        expect(env.cup).toEqual({ x: 4, z: 320 })
        const noPin = environmentFromHole({
            windSpeed: 0,
            windDirection: 0,
            airDensity: 1.225,
            stimp: 10,
        })
        expect(noPin.cup).toBeUndefined()
    })
})
