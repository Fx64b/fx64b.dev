// Shared types of the physics module. Coordinates: y is up, x and z are
// horizontal. All values are SI (m, s, kg, m/s, rad/s).
import type { SurfaceId, Vec2, Vec3 } from '../shared/hole'

// The basic types come from the shared contract, so that the physics, the
// course generator and the renderer use the same ones.
export type { SurfaceId, Vec2, Vec3 }

/**
 * The terrain as the physics see it. The course generator implements this.
 * All three functions must be pure and cheap: the simulation calls them up
 * to 240 times per simulated second.
 */
export interface Ground {
    /** Terrain height (y) at the horizontal position. */
    height(x: number, z: number): number
    /** Unit surface normal at the horizontal position (y > 0). */
    normal(x: number, z: number): Vec3
    /** Surface type at the horizontal position. */
    surface(x: number, z: number): SurfaceId
}

export interface Environment {
    /**
     * Wind velocity at 10 m above the ground, in m/s. The vector points
     * where the air moves to (a wind of x = +5 pushes the ball toward +x).
     */
    wind: Vec2
    /** Air density in kg/m^3. Sea level is 1.225. */
    airDensity: number
    /** Green speed as a Stimpmeter reading in feet (about 9 to 12). */
    stimp: number
    /** Green firmness, 0 (soft) to 1 (firm). Default 0.5. */
    greenFirmness?: number
    /** Centre of the cup. Leave out for no cup. */
    cup?: Vec2
}

/** The state of the ball right after the club hits it. */
export interface Launch {
    /** Ball speed in m/s. */
    speed: number
    /** Launch angle above the ground, in rad. */
    launchAngle: number
    /** Backspin in rad/s. */
    spin: number
    /** True for a putt: the ball starts rolling on the ground. */
    rolling: boolean
}

export interface ShotInput {
    /** Where the ball lies. The height comes from the ground. */
    start: Vec2
    /** Horizontal aim direction. It does not need to be a unit vector. */
    aim: Vec2
    launch: Launch
}

export type Phase = 'air' | 'ground'

export interface TrajectorySample {
    /** Time since the hit, in s. */
    t: number
    x: number
    /** Height of the bottom of the ball. */
    y: number
    z: number
    phase: Phase
}

export interface ShotEvent {
    t: number
    position: Vec3
}

export interface BounceEvent extends ShotEvent {
    /** Ball speed just before the impact, in m/s. */
    speedIn: number
    surface: SurfaceId
}

export type ShotOutcome = 'rest' | 'holed' | 'water' | 'ob'

export interface ShotResult {
    /**
     * The path for playback: one sample every 1/60 s plus the exact points
     * of every ground contact and the final position. Times increase.
     */
    samples: TrajectorySample[]
    /** Final position. For water and OB this is where the ball touched. */
    rest: Vec3
    restSurface: SurfaceId
    /** Time until the ball stopped, in s. */
    duration: number
    /** First ground contact. Null if the ball never left the ground. */
    landing: ShotEvent | null
    /** Highest point before the first landing. Null for a putt. */
    apex: ShotEvent | null
    /** Every ground contact from the air. The first one is the landing. */
    bounces: BounceEvent[]
    /** Horizontal distance from the start to the first landing, in m. */
    carry: number
    /** Horizontal distance from the start to the final position, in m. */
    total: number
    outcome: ShotOutcome
    holed: boolean
    /**
     * Set if the ball ended in water. `drop` is the last point where the
     * path of the ball (seen from above) went from another surface into
     * water, on the ground and on the dry side.
     */
    water: { drop: Vec3 } | null
    /** Set if the ball ended out of bounds. `lastValid` is the shot start. */
    ob: { lastValid: Vec3 } | null
}
