// Clubs and the power model (SPEC 5.3 and 5.4).
import { PUTTER_MAX_SPEED } from './constants'
import { defaultEnvironment } from './environment'
import { createPlaneGround } from './ground'
import { simulateShot } from './simulate'
import { lieEffect } from './surfaces'
import type { Launch, SurfaceId } from './types'
import { degToRad, rpmToRadS } from './units'

export type ClubId =
    'driver' | 'wood3' | 'iron5' | 'iron7' | 'iron9' | 'pw' | 'sw' | 'putter'

export interface Club {
    id: ClubId
    /** Full name, as the HUD shows it. */
    name: string
    /** Ball speed at full power, in m/s. */
    ballSpeed: number
    /** Launch angle in rad. */
    launchAngle: number
    /** Backspin at full power, in rad/s. */
    spin: number
    /** Carry of SPEC 5.3 that the club is calibrated to, in m. */
    targetCarry: number
}

function club(
    id: ClubId,
    name: string,
    ballSpeed: number,
    launchDeg: number,
    spinRpm: number,
    targetCarry: number
): Club {
    return {
        id,
        name,
        ballSpeed,
        launchAngle: degToRad(launchDeg),
        spin: rpmToRadS(spinRpm),
        targetCarry,
    }
}

// Ball speed (m/s), launch angle (deg), spin (rpm) and the target carry (m).
// SPEC 5.3 lists the same values. The ball speeds were solved so that the
// flight model gives the listed carry (no wind, sea level, flat ground),
// starting from typical launch monitor speeds (65, 61, 56, 51, 46, 42 and
// 36 m/s); they ended 0.1 to 2.3 m/s lower.
export const CLUBS: Record<ClubId, Club> = {
    driver: club('driver', 'Driver', 63.6, 12, 2700, 215),
    wood3: club('wood3', '3 Wood', 59.4, 11, 3500, 195),
    iron5: club('iron5', '5 Iron', 53.7, 13, 5300, 165),
    iron7: club('iron7', '7 Iron', 50.5, 16, 7000, 145),
    iron9: club('iron9', '9 Iron', 45.3, 21, 8500, 120),
    pw: club('pw', 'Pitching wedge', 41.9, 25, 9300, 105),
    sw: club('sw', 'Sand wedge', 33.3, 30, 10000, 75),
    putter: club('putter', 'Putter', PUTTER_MAX_SPEED, 0, 0, 0),
}

/**
 * The clubs from longest to shortest. A club's index in this list is its
 * index everywhere else (HUD club bar, number keys, stored rounds).
 */
export const CLUB_ORDER: readonly ClubId[] = [
    'driver',
    'wood3',
    'iron5',
    'iron7',
    'iron9',
    'pw',
    'sw',
    'putter',
]

// --- Power table --------------------------------------------------------------
//
// Power is a fraction of the nominal carry. Speed and spin are scaled by the
// same factor k and the launch angle is kept, so the spin factor and the
// shape of the flight stay similar. Carry is not linear in k, so each club
// gets a table of carry(k) for k = 0, 1/N, ... 1, measured with the real
// simulation on flat ground with no wind at sea level. The table is built
// once, the first time a club is used.

const TABLE_STEPS = 24

interface PowerTable {
    /** carry[i] is the carry in m at scale i / TABLE_STEPS. */
    carry: Float64Array
}

const tables = new Map<ClubId, PowerTable>()
const RANGE = createPlaneGround()
const CALM = defaultEnvironment()

function measureCarry(c: Club, scale: number): number {
    return simulateShot(
        {
            start: { x: 0, z: 0 },
            aim: { x: 0, z: 1 },
            launch: {
                speed: c.ballSpeed * scale,
                launchAngle: c.launchAngle,
                spin: c.spin * scale,
                rolling: false,
            },
        },
        CALM,
        RANGE,
        { stopAtLanding: true, samples: false }
    ).carry
}

function powerTable(id: ClubId): PowerTable {
    let table = tables.get(id)
    if (!table) {
        const c = CLUBS[id]
        const carry = new Float64Array(TABLE_STEPS + 1)
        for (let i = 1; i <= TABLE_STEPS; i++) {
            // Carry rises with the scale. Guard the lookup anyway.
            carry[i] = Math.max(carry[i - 1], measureCarry(c, i / TABLE_STEPS))
        }
        table = { carry }
        tables.set(id, table)
    }
    return table
}

/** Build the power tables of all clubs now (else on first use). */
export function buildPowerTables(): void {
    for (const id of CLUB_ORDER) {
        if (id !== 'putter') {
            powerTable(id)
        }
    }
}

/**
 * Carry at full power from a fairway lie, with no wind, at sea level, on
 * flat ground, in m. This is the simulated value (within about 1% of the
 * SPEC table). The putter has no carry and gives 0.
 */
export function nominalCarry(id: ClubId): number {
    if (id === 'putter') {
        return 0
    }
    return powerTable(id).carry[TABLE_STEPS]
}

/** Speed and spin scale that gives this carry in m (table lookup). */
function scaleForCarry(id: ClubId, carry: number): number {
    const table = powerTable(id).carry
    if (carry <= 0) {
        return 0
    }
    if (carry >= table[TABLE_STEPS]) {
        return 1
    }
    // Binary search for the cell, then linear interpolation.
    let lo = 0
    let hi = TABLE_STEPS
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1
        if (table[mid] <= carry) {
            lo = mid
        } else {
            hi = mid
        }
    }
    const span = table[hi] - table[lo]
    const f = span > 0 ? (carry - table[lo]) / span : 0
    return (lo + f) / TABLE_STEPS
}

/**
 * The launch for a club, a power in [0, 1] and the lie of the ball.
 *
 * Full shots: the carry on flat ground with no wind at sea level is
 * power * nominal carry * lie distance factor. The lie can also take away
 * spin (rough), which is applied after the distance.
 *
 * Putter: power is linear in the roll distance on a flat green of the
 * reference speed (full power rolls PUTTER_FULL_ROLL), so the start speed
 * is PUTTER_MAX_SPEED * sqrt(power). On a faster green the same stroke
 * rolls further, as in real golf. The ball rolls from the start. The lie
 * has no effect on the launch (the surface slows the roll anyway).
 */
export function launchFor(
    id: ClubId,
    power: number,
    lie: SurfaceId = 'fairway'
): Launch {
    const p = Math.min(1, Math.max(0, power))
    const c = CLUBS[id]
    if (id === 'putter') {
        return {
            speed: PUTTER_MAX_SPEED * Math.sqrt(p),
            launchAngle: 0,
            spin: 0,
            rolling: true,
        }
    }
    const effect = lieEffect(lie)
    const scale = scaleForCarry(id, p * effect.distance * nominalCarry(id))
    return {
        speed: c.ballSpeed * scale,
        launchAngle: c.launchAngle,
        spin: c.spin * scale * effect.spin,
        rolling: false,
    }
}
