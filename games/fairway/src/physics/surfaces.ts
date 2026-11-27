// Surface parameters for ground contact and lies (SPEC 5.5 and 5.6).
import { GRAVITY, STIMP_RELEASE_SPEED } from './constants'
import type { Environment, SurfaceId } from './types'
import { ftToM } from './units'

export interface SurfaceParams {
    /**
     * Factor on the normal coefficient of restitution. The base value
     * depends on the impact speed, see `baseRestitution` in simulate.ts.
     */
    restitution: number
    /** Sliding friction between ball and surface during an impact. */
    friction: number
    /**
     * How much the surface gives way under an impact. It scales the tilt of
     * the effective contact surface (see the bounce model in simulate.ts).
     */
    softness: number
    /**
     * Part of the tangent velocity that is left after the impact, on top of
     * the friction. Below 1 for surfaces that grab the ball (rough, sand).
     */
    impactKeep: number
    /** Deceleration of a rolling ball on level ground, in m/s^2. */
    rollDecel: number
}

/** Effect of the lie on the next full shot. Fixed values, not random. */
export interface LieEffect {
    /** Factor on the carry distance. */
    distance: number
    /** Factor on the spin, on top of the distance change. */
    spin: number
}

/**
 * Deceleration of a ball on a level green from the Stimpmeter reading.
 * A Stimpmeter releases the ball at 1.83 m/s and the reading is the roll
 * distance in feet, so with constant deceleration a = v^2 / (2 d).
 * Stimp 9 gives 0.61 m/s^2, Stimp 12 gives 0.46 m/s^2.
 */
export function greenRollDecel(stimp: number): number {
    return (STIMP_RELEASE_SPEED * STIMP_RELEASE_SPEED) / (2 * ftToM(stimp))
}

// Values chosen to give plausible behaviour, relative to the fairway:
// a full driver runs out about 20 m on the fairway, about half of that in
// the first cut, and only a few metres in the rough. Sand takes almost all
// of the energy. Fairway roll is like a very slow green (Stimp about 4).
const FAIRWAY: SurfaceParams = {
    restitution: 1,
    friction: 0.4,
    softness: 1,
    impactKeep: 1,
    rollDecel: 1.5,
}

const FIXED: Record<Exclude<SurfaceId, 'green'>, SurfaceParams> = {
    tee: FAIRWAY,
    fairway: FAIRWAY,
    firstCut: {
        restitution: 0.8,
        friction: 0.45,
        softness: 1.1,
        impactKeep: 0.85,
        rollDecel: 2.4,
    },
    rough: {
        restitution: 0.55,
        friction: 0.5,
        softness: 1.2,
        impactKeep: 0.6,
        rollDecel: 4.5,
    },
    bunker: {
        restitution: 0.08,
        friction: 0.6,
        softness: 0,
        impactKeep: 0.25,
        rollDecel: 12,
    },
    // The ball stops when it touches water or OB. These are never used.
    water: {
        restitution: 0,
        friction: 1,
        softness: 0,
        impactKeep: 0,
        rollDecel: 100,
    },
    ob: {
        restitution: 0,
        friction: 1,
        softness: 0,
        impactKeep: 0,
        rollDecel: 100,
    },
}

/** Parameters of a surface. Only the green depends on the environment. */
export function surfaceParams(
    surface: SurfaceId,
    env: Pick<Environment, 'stimp' | 'greenFirmness'>
): SurfaceParams {
    if (surface !== 'green') {
        return FIXED[surface]
    }
    const firmness = Math.min(1, Math.max(0, env.greenFirmness ?? 0.5))
    return {
        // A firm green bounces more and gives way less.
        restitution: 0.8 + 0.4 * firmness,
        friction: 0.4,
        softness: 1.3 - 0.6 * firmness,
        impactKeep: 1,
        rollDecel: greenRollDecel(env.stimp),
    }
}

/** All surfaces at once, for the simulation loop. */
export function surfaceTable(
    env: Pick<Environment, 'stimp' | 'greenFirmness'>
): Record<SurfaceId, SurfaceParams> {
    return { ...FIXED, green: surfaceParams('green', env) }
}

// Lie effects of SPEC 5.6. Fairway and greenside bunkers play the same.
const LIES: Record<SurfaceId, LieEffect> = {
    tee: { distance: 1, spin: 1 },
    fairway: { distance: 1, spin: 1 },
    firstCut: { distance: 0.95, spin: 1 },
    rough: { distance: 0.85, spin: 0.7 },
    bunker: { distance: 0.8, spin: 0.9 },
    green: { distance: 1, spin: 1 },
    water: { distance: 1, spin: 1 },
    ob: { distance: 1, spin: 1 },
}

export function lieEffect(surface: SurfaceId): LieEffect {
    return LIES[surface]
}

/**
 * Largest slope (rise over run) on which a ball at rest stays at rest.
 * A rolling ball is pulled down a slope with (5/7) g sin(a) and held by the
 * rolling resistance, so it stays when tan(a) <= rollDecel / ((5/7) g).
 */
export function holdingSlope(params: SurfaceParams): number {
    return params.rollDecel / ((5 / 7) * GRAVITY)
}
