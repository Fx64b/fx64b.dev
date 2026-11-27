import type { Ground, SurfaceId, Vec3 } from './types'

export interface PlaneGroundOptions {
    /** Height at the origin. Default 0. */
    height?: number
    /** Rise in y for each metre in +x. Default 0. */
    slopeX?: number
    /** Rise in y for each metre in +z. Default 0. */
    slopeZ?: number
    /** One surface for the whole plane, or a function. Default fairway. */
    surface?: SurfaceId | ((x: number, z: number) => SurfaceId)
}

/**
 * A flat or evenly sloped plane, y = height + slopeX * x + slopeZ * z.
 * It is used by the tests, by the club calibration and by the flat test
 * range of phase 2.
 */
export function createPlaneGround(options: PlaneGroundOptions = {}): Ground {
    const h0 = options.height ?? 0
    const sx = options.slopeX ?? 0
    const sz = options.slopeZ ?? 0
    const surface = options.surface ?? 'fairway'
    const inv = 1 / Math.sqrt(sx * sx + 1 + sz * sz)
    // The normal of a plane is the same everywhere, so share one object.
    const normal: Vec3 = { x: -sx * inv, y: inv, z: -sz * inv }
    const surfaceFn =
        typeof surface === 'function' ? surface : (): SurfaceId => surface
    return {
        height: (x, z) => h0 + sx * x + sz * z,
        normal: () => normal,
        surface: surfaceFn,
    }
}
