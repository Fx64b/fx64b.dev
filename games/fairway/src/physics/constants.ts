// Physical constants of the simulation (SPEC 5.1).

/** Fixed time step in s. */
export const DT = 1 / 240

export const GRAVITY = 9.81

export const BALL_MASS = 0.04593
export const BALL_DIAMETER = 0.04267
export const BALL_RADIUS = BALL_DIAMETER / 2
export const BALL_AREA = (3.141592653589793 * BALL_DIAMETER * BALL_DIAMETER) / 4

/** Air density at sea level, 15 deg C, in kg/m^3. */
export const SEA_LEVEL_AIR_DENSITY = 1.225

/** Radius of the cup in m (diameter 4.25 in). */
export const CUP_RADIUS = 0.054

/** Release speed of a Stimpmeter in m/s. */
export const STIMP_RELEASE_SPEED = 1.83

/** Largest start speed of a putt in m/s (SPEC 3). */
export const PUTTER_MAX_SPEED = 9
