import {
    type ClubId,
    type Environment,
    type Ground,
    type Launch,
    type ShotResult,
    type SurfaceId,
    createPlaneGround,
    defaultEnvironment,
    launchFor,
    simulateShot,
} from '../../../games/fairway/src/physics'

export const FAIRWAY = createPlaneGround({ surface: 'fairway' })
export const GREEN = createPlaneGround({ surface: 'green' })
export const CALM = defaultEnvironment()

/** Hit from the origin toward +z. */
export function hit(
    launch: Launch,
    ground: Ground = FAIRWAY,
    env: Environment = CALM
): ShotResult {
    return simulateShot(
        { start: { x: 0, z: 0 }, aim: { x: 0, z: 1 }, launch },
        env,
        ground
    )
}

export function hitClub(
    club: ClubId,
    power = 1,
    ground: Ground = FAIRWAY,
    env: Environment = CALM,
    lie: SurfaceId = 'fairway'
): ShotResult {
    return hit(launchFor(club, power, lie), ground, env)
}

/** A ball that starts rolling toward +z with the given speed. */
export function putt(speed: number): Launch {
    return { speed, launchAngle: 0, spin: 0, rolling: true }
}
