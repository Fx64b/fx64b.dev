// Aerodynamics of the ball: drag and lift coefficients and the wind profile.
import { ln } from './detmath'

// Drag and lift depend on the spin factor S = r * omega / |v_rel|, where
// v_rel is the velocity of the ball relative to the air.
//
// The shapes follow the wind tunnel data for dimpled balls above the drag
// crisis (Bearman and Harvey 1976, Smits and Smith 1994):
//   - Cd rises about linearly with S from a base value near 0.2.
//   - Cl rises steeply at small S and levels off (about 0.15 at S = 0.05,
//     0.22 at S = 0.1, 0.29 at S = 0.2).
// The constants were then adjusted a little so that the club table of
// SPEC 5.3 gives the listed carries.
export const CD_BASE = 0.215
export const CD_SPIN = 0.3
export const CL_MAX = 0.42
export const CL_HALF_SPIN = 0.09

export function dragCoefficient(spinFactor: number): number {
    return CD_BASE + CD_SPIN * spinFactor
}

export function liftCoefficient(spinFactor: number): number {
    return (CL_MAX * spinFactor) / (CL_HALF_SPIN + spinFactor)
}

// Spin decay in flight: d(omega)/dt = -SPIN_DECAY * omega * |v_rel| / r.
// With 2e-5 a ball at 50 m/s loses about 4.5% of its spin per second, which
// matches launch monitor data (about 4% per second).
export const SPIN_DECAY = 2e-5

// Wind profile. The wind in the environment is given at the reference height
// of 10 m. Near the ground the air is slower: the log law
//   w(h) = w(10) * ln((h + z0) / z0) / ln((10 + z0) / z0)
// with a roughness length z0 of 0.03 m (open land with short grass).
// At 1 m the wind is 61% of the reference, at 30 m it is 119%.
export const WIND_REFERENCE_HEIGHT = 10
export const WIND_ROUGHNESS = 0.03
const WIND_LOG_REF = ln(
    (WIND_REFERENCE_HEIGHT + WIND_ROUGHNESS) / WIND_ROUGHNESS
)

/** Factor on the reference wind at a height above the ground. */
export function windFactor(heightAboveGround: number): number {
    if (heightAboveGround <= 0) {
        return 0
    }
    return (
        ln((heightAboveGround + WIND_ROUGHNESS) / WIND_ROUGHNESS) / WIND_LOG_REF
    )
}
