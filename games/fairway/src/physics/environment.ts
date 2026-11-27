import type { HoleData } from '../shared/hole'
import { SEA_LEVEL_AIR_DENSITY } from './constants'
import { cos, sin } from './detmath'
import type { Environment } from './types'

/** No wind, sea level air, a medium green (Stimp 10), no cup. */
export function defaultEnvironment(
    overrides: Partial<Environment> = {}
): Environment {
    return {
        wind: { x: 0, z: 0 },
        airDensity: SEA_LEVEL_AIR_DENSITY,
        stimp: 10,
        greenFirmness: 0.5,
        ...overrides,
    }
}

/**
 * The environment of a generated hole. The wind direction of the hole data
 * is the direction the wind blows toward, as atan2(z, x).
 */
export function environmentFromHole(
    conditions: HoleData['conditions'],
    pin?: HoleData['pin']
): Environment {
    const env: Environment = {
        wind: {
            x: conditions.windSpeed * cos(conditions.windDirection),
            z: conditions.windSpeed * sin(conditions.windDirection),
        },
        airDensity: conditions.airDensity,
        stimp: conditions.stimp,
        greenFirmness: 0.5,
    }
    if (pin) {
        env.cup = { x: pin.x, z: pin.z }
    }
    return env
}
