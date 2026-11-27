// The simulation of one shot: flight, bounces, roll, cup, hazards.
//
// The ball is tracked by its lowest point, so y equals the ground height
// when the ball lies on the ground.
import * as aero from './aero'
import * as constants from './constants'
import { atan2Positive, cos, sin } from './detmath'
import { surfaceTable } from './surfaces'
import type {
    BounceEvent,
    Environment,
    Ground,
    Phase,
    ShotEvent,
    ShotInput,
    ShotOutcome,
    ShotResult,
    SurfaceId,
    TrajectorySample,
    Vec3,
} from './types'

// Local copies of the constants for the hot loop. Some module systems (the
// test runner is one) read an imported binding through a getter on every
// use, which made the simulation about two times slower.
const CD_BASE = aero.CD_BASE
const CD_SPIN = aero.CD_SPIN
const CL_MAX = aero.CL_MAX
const CL_HALF_SPIN = aero.CL_HALF_SPIN
const SPIN_DECAY = aero.SPIN_DECAY
const windFactor = aero.windFactor
const BALL_AREA = constants.BALL_AREA
const BALL_MASS = constants.BALL_MASS
const BALL_RADIUS = constants.BALL_RADIUS
const CUP_RADIUS = constants.CUP_RADIUS
const DT = constants.DT
const GRAVITY = constants.GRAVITY

export interface SimulationOptions {
    /** Stop at the first ground contact. Used to measure the carry. */
    stopAtLanding?: boolean
    /** Record the path samples. Default true. */
    samples?: boolean
}

/** The simulation gives up after this time (a ball on an endless slope). */
const MAX_SHOT_TIME = 90

/** One path sample every this many steps (240 Hz / 4 = 60 Hz). */
const SAMPLE_EVERY = 4

// --- Flight -----------------------------------------------------------------
//
// Acceleration of the ball in the air:
//   a = g - k Cd |u| u + k Cl |u| (s x u),   k = rho A / (2 m)
// with u the velocity relative to the air and s the unit spin axis. The lift
// is normal to both the spin axis and the relative air flow, so a head wind
// gives more lift and drag, and a cross wind pushes the ball sideways.
//
// Integrator: classic RK4 at 240 Hz. The acceleration depends only on the
// velocity (the wind is sampled once per step, at the height at the start of
// the step), so RK4 costs four cheap evaluations. Its error at this step is
// far below a millimetre of carry, so the power lookup (carry as a function
// of launch speed) is smooth. Semi-implicit Euler would also be stable, but
// its error is of first order.

const AERO_K = BALL_AREA / (2 * BALL_MASS)

// Scratch state for `accel`, in one typed array so that the hot loop does
// not allocate (a module level `let` number is boxed on every write).
// JavaScript is single threaded and every step sets the inputs before use,
// so this does not affect determinism.
// 0, 1: wind x, z. 2: k * rho. 3 to 5: spin vector. 6: spin rate.
// 7 to 9: the result, acceleration x, y, z.
const F = new Float64Array(10)

function accel(vx: number, vy: number, vz: number): void {
    const ux = vx - F[0]
    const uz = vz - F[1]
    const u = Math.sqrt(ux * ux + vy * vy + uz * uz)
    if (u < 1e-9) {
        F[7] = 0
        F[8] = -GRAVITY
        F[9] = 0
        return
    }
    // Spin factor. The data behind Cd and Cl ends near S = 0.5, and a slow
    // ball with a lot of spin (top of a bounce) must not get absurd forces.
    const spin = F[6]
    let s = (BALL_RADIUS * spin) / u
    if (s > 1) {
        s = 1
    }
    const kd = F[2] * (CD_BASE + CD_SPIN * s) * u
    let x = -kd * ux
    let y = -GRAVITY - kd * vy
    let z = -kd * uz
    if (spin > 1e-9) {
        const cl = (CL_MAX * s) / (CL_HALF_SPIN + s)
        const kl = (F[2] * cl * u) / spin
        x += kl * (F[4] * uz - F[5] * vy)
        y += kl * (F[5] * ux - F[3] * uz)
        z += kl * (F[3] * vy - F[4] * ux)
    }
    F[7] = x
    F[8] = y
    F[9] = z
}

// --- Bounce -----------------------------------------------------------------
//
// The bounce follows the model of A. R. Penner, "The run of a golf ball"
// (Can. J. Phys. 80, 2002), written with vectors so that it works on slopes
// and with any spin axis:
//
// 1. Turf gives way under the ball. The ball then bounces off a small ramp
//    that faces it. The effective normal is tilted toward the incoming ball
//    by theta_c = 15.4 deg * (v / 18.3 m/s) * (theta / 44.4 deg), where
//    theta is the descent angle to the surface. Fast, steep shots tilt it
//    most. The surface `softness` scales the tilt.
// 2. Normal part: restitution e(v_n) = 0.510 - 0.0375 v_n + 0.000903 v_n^2
//    up to 20 m/s and 0.120 above (hard impacts lose more), times the
//    surface factor.
// 3. Tangent part: friction acts against the slip velocity of the contact
//    point, c = v_t - r (omega x n). Backspin makes the slip larger. If the
//    friction impulse mu (1 + e) v_n is enough to stop the slip, the ball
//    leaves rolling: dv = -(2/7) c. This is the case that checks a wedge:
//    v_t' = (5 v_t - 2 r omega) / 7, which is below zero for high backspin.
//    Otherwise it slides the whole time: dv = -mu (1 + e) v_n c / |c|.
//    The spin changes by -(5 / (2 r)) n x dv (solid sphere).
//
// With these rules a driver (shallow, little spin) keeps most of its forward
// speed and runs, while a wedge (steep, much spin) stops or comes back.

const TILT_REFERENCE = (15.4 * 3.141592653589793) / 180
const TILT_REFERENCE_SPEED = 18.3
const TILT_REFERENCE_ANGLE = (44.4 * 3.141592653589793) / 180
const MAX_TILT = (25 * 3.141592653589793) / 180
const HALF_PI = 1.5707963267948966

function baseRestitution(normalSpeed: number): number {
    if (normalSpeed >= 20) {
        return 0.12
    }
    return 0.51 - 0.0375 * normalSpeed + 0.000903 * normalSpeed * normalSpeed
}

/** Below this rebound speed (normal to the ground) the ball starts to roll. */
const ROLL_START_SPEED = 0.35

// --- Roll -------------------------------------------------------------------
//
// A rolling solid sphere on a slope accelerates with (5/7) g sin(a) down the
// slope. Rolling resistance works against the motion with the deceleration
// of the surface (measured on level ground, so it already includes the 5/7)
// times the normal force factor n.y. The ball comes to rest only where the
// resistance can hold it against the slope.
//
// Integrator: semi-implicit Euler at 240 Hz (velocity first, then position).
// The forces are almost constant over a step, and the friction needs an
// exact stop without a sign flip, which is simple in this form.

const ROLL_GRAVITY = (5 / 7) * GRAVITY
const REST_SPEED = 1e-3

// --- Cup --------------------------------------------------------------------
//
// Capture model: free fall over the hole (after B. W. Holmes, "Putting: how
// a golf ball and hole interact", Am. J. Phys. 59, 1991). A ball that
// crosses the hole along a chord of length L is over the hole for the time
// (L - r) / v until its centre is one ball radius from the far rim. It is
// captured if it falls at least one ball radius in that time:
//   v <= (L - r) * sqrt(g / (2 r))
// For a centred putt on a real cup L = 0.108 m and the limit is 1.31 m/s;
// with the larger game cup (CUP_RADIUS) L = 0.17 m and the limit is about
// 2.25 m/s. Off centre the chord is shorter and the limit falls, to zero
// near the edge.
//
// A faster ball lips out: it dips into the hole, hits the far rim, loses
// speed and is turned toward the hole side. Both effects scale with the
// part of the ball radius it fell, q = (capture speed / speed)^2. The two
// factors below are a simple estimate, not measured values.

const CAPTURE_FACTOR = Math.sqrt(GRAVITY / (2 * BALL_RADIUS))
const LIP_SPEED_LOSS = 0.6
const LIP_DEFLECTION = 0.8

/** Largest speed at which a ball is captured on a path of this length. */
export function cupCaptureSpeed(pathOverHole: number): number {
    const free = pathOverHole - BALL_RADIUS
    return free > 0 ? free * CAPTURE_FACTOR : 0
}

// The edge between a dry point and a wet point, by bisection. The result is
// the dry end, in EDGE (x, z).
const EDGE = new Float64Array(2)

function findWaterEdge(
    ground: Ground,
    dryX: number,
    dryZ: number,
    wetX: number,
    wetZ: number
): void {
    for (let i = 0; i < 12; i++) {
        const mx = 0.5 * (dryX + wetX)
        const mz = 0.5 * (dryZ + wetZ)
        if (ground.surface(mx, mz) === 'water') {
            wetX = mx
            wetZ = mz
        } else {
            dryX = mx
            dryZ = mz
        }
    }
    EDGE[0] = dryX
    EDGE[1] = dryZ
}

function horizontalDistance(a: Vec3, b: Vec3): number {
    const dx = b.x - a.x
    const dz = b.z - a.z
    return Math.sqrt(dx * dx + dz * dz)
}

/**
 * Simulate one shot until the ball stops, is holed, or touches water or
 * out of bounds. The function is pure and deterministic: the same inputs
 * give bit-identical results.
 *
 * Water and OB only count where the ball touches the ground. A ball may fly
 * over them.
 */
export function simulateShot(
    shot: ShotInput,
    env: Environment,
    ground: Ground,
    options: SimulationOptions = {}
): ShotResult {
    const record = options.samples !== false
    const stopAtLanding = options.stopAtLanding === true
    const surfaces = surfaceTable(env)
    const cup = env.cup
    const cupR2 = CUP_RADIUS * CUP_RADIUS
    const launch = shot.launch

    // Unit aim direction in the horizontal plane.
    let dx = shot.aim.x
    let dz = shot.aim.z
    const aimLen = Math.sqrt(dx * dx + dz * dz)
    if (aimLen > 1e-12) {
        dx /= aimLen
        dz /= aimLen
    } else {
        dx = 0
        dz = 1
    }

    const startX = shot.start.x
    const startZ = shot.start.z
    const startY = ground.height(startX, startZ)
    const start: Vec3 = { x: startX, y: startY, z: startZ }

    let t = 0
    let px = startX
    let py = startY
    let pz = startZ
    let vx: number
    let vy: number
    let vz: number
    // Spin vector in rad/s.
    let wx = 0
    let wy = 0
    let wz = 0
    let phase: Phase = 'ground'
    // Ground normal under the ball while it rolls.
    let n: Vec3 = ground.normal(startX, startZ)
    let groundH = startY

    // Launch direction. The launch angle is measured from the ground along
    // the aim line, so an uphill lie launches higher and a downhill lie
    // lower. `tan*` is the unit tangent of the slope along the aim, `up*`
    // the unit vector normal to it in the vertical plane of the aim.
    const slope = -(n.x * dx + n.z * dz) / n.y
    const tl = Math.sqrt(1 + slope * slope)
    const speed0 = Math.max(0, launch.speed)
    if (launch.rolling || launch.launchAngle <= 0 || speed0 === 0) {
        vx = (speed0 * dx) / tl
        vy = (speed0 * slope) / tl
        vz = (speed0 * dz) / tl
    } else {
        const ca = cos(launch.launchAngle)
        const sa = sin(launch.launchAngle)
        vx = (speed0 * (ca * dx - sa * slope * dx)) / tl
        vy = (speed0 * (ca * slope + sa)) / tl
        vz = (speed0 * (ca * dz - sa * slope * dz)) / tl
        // Pure backspin: the axis is horizontal and normal to the aim,
        // axis = aim x up, so that (axis x velocity) points up.
        wx = -launch.spin * dz
        wz = launch.spin * dx
        phase = 'air'
    }

    // Surface under the ball, and the last crossing from dry land to water
    // (seen from above). This gives the drop point for a water ball.
    let trackX = startX
    let trackZ = startZ
    let surface: SurfaceId = ground.surface(startX, startZ)
    let dropX = startX
    let dropZ = startZ
    const samples: TrajectorySample[] = []
    if (record) {
        samples.push({ t, x: px, y: py, z: pz, phase })
    }

    let landing: ShotEvent | null = null
    const bounces: BounceEvent[] = []
    let apexOpen = phase === 'air'
    let apexT = 0
    let apexX = px
    let apexY = py
    let apexZ = pz
    let outcome: ShotOutcome = 'rest'
    let inCup = false

    const calm = env.wind.x === 0 && env.wind.z === 0
    const maxSteps = Math.round(MAX_SHOT_TIME / DT)
    let step = 0

    while (step < maxSteps) {
        step++
        if (phase === 'air') {
            // --- One RK4 flight step ---
            const wf = calm ? 0 : windFactor(py - groundH)
            const windX = env.wind.x * wf
            const windZ = env.wind.z * wf
            F[0] = windX
            F[1] = windZ
            F[2] = AERO_K * env.airDensity
            F[3] = wx
            F[4] = wy
            F[5] = wz
            F[6] = Math.sqrt(wx * wx + wy * wy + wz * wz)

            const h = DT
            accel(vx, vy, vz)
            const k1x = F[7]
            const k1y = F[8]
            const k1z = F[9]
            accel(vx + 0.5 * h * k1x, vy + 0.5 * h * k1y, vz + 0.5 * h * k1z)
            const k2x = F[7]
            const k2y = F[8]
            const k2z = F[9]
            accel(vx + 0.5 * h * k2x, vy + 0.5 * h * k2y, vz + 0.5 * h * k2z)
            const k3x = F[7]
            const k3y = F[8]
            const k3z = F[9]
            accel(vx + h * k3x, vy + h * k3y, vz + h * k3z)
            const k4x = F[7]
            const k4y = F[8]
            const k4z = F[9]

            const prevX = px
            const prevY = py
            const prevZ = pz
            const prevVx = vx
            const prevVy = vy
            const prevVz = vz
            const h26 = (h * h) / 6
            px += h * vx + h26 * (k1x + k2x + k3x)
            py += h * vy + h26 * (k1y + k2y + k3y)
            pz += h * vz + h26 * (k1z + k2z + k3z)
            vx += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x)
            vy += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y)
            vz += (h / 6) * (k1z + 2 * k2z + 2 * k3z + k4z)

            // Spin decay, with the air speed at the start of the step.
            const ux = prevVx - windX
            const uz = prevVz - windZ
            const u = Math.sqrt(ux * ux + prevVy * prevVy + uz * uz)
            const keep = 1 - ((SPIN_DECAY * u) / BALL_RADIUS) * h
            wx *= keep
            wy *= keep
            wz *= keep

            const gh = ground.height(px, pz)
            if (py >= gh) {
                // Still in the air.
                t += h
                groundH = gh
                const under = ground.surface(px, pz)
                if (under === 'water' && surface !== 'water') {
                    findWaterEdge(ground, trackX, trackZ, px, pz)
                    dropX = EDGE[0]
                    dropZ = EDGE[1]
                }
                trackX = px
                trackZ = pz
                surface = under
                if (apexOpen && py > apexY) {
                    apexT = t
                    apexX = px
                    apexY = py
                    apexZ = pz
                }
                if (step % SAMPLE_EVERY === 0) {
                    if (record) {
                        samples.push({ t, x: px, y: py, z: pz, phase })
                    }
                }
                continue
            }

            // --- Ground contact ---
            // Go back along the step to the point where the path met the
            // ground (linear, the step is at most 0.3 m long).
            const above = prevY - groundH
            const below = gh - py
            const f = above > 0 ? above / (above + below) : 0
            px = prevX + f * (px - prevX)
            pz = prevZ + f * (pz - prevZ)
            vx = prevVx + f * (vx - prevVx)
            vy = prevVy + f * (vy - prevVy)
            vz = prevVz + f * (vz - prevVz)
            t += f * h
            groundH = ground.height(px, pz)
            py = groundH
            n = ground.normal(px, pz)
            const s = ground.surface(px, pz)
            if (s === 'water' && surface !== 'water') {
                findWaterEdge(ground, trackX, trackZ, px, pz)
                dropX = EDGE[0]
                dropZ = EDGE[1]
            }
            trackX = px
            trackZ = pz
            surface = s
            const speedIn = Math.sqrt(vx * vx + vy * vy + vz * vz)
            const position: Vec3 = { x: px, y: py, z: pz }
            bounces.push({ t, position, speedIn, surface: s })
            if (landing === null) {
                landing = { t, position }
                apexOpen = false
            }
            if (record) {
                samples.push({ t, x: px, y: py, z: pz, phase })
            }
            if (stopAtLanding) {
                break
            }
            if (s === 'water' || s === 'ob') {
                outcome = s
                break
            }

            // A ball that lands in the hole stays in if it is slow enough
            // for the rest of its way across the hole.
            if (cup) {
                const ox = px - cup.x
                const oz = pz - cup.z
                const d2 = ox * ox + oz * oz
                if (d2 < cupR2) {
                    const vh = Math.sqrt(vx * vx + vz * vz)
                    let rest = CUP_RADIUS
                    if (vh > 1e-9) {
                        const b = (ox * vx + oz * vz) / vh
                        rest = -b + Math.sqrt(b * b - (d2 - cupR2))
                    }
                    if (vh <= cupCaptureSpeed(rest)) {
                        outcome = 'holed'
                        break
                    }
                }
            }

            const params = surfaces[s]
            const vn0 = -(vx * n.x + vy * n.y + vz * n.z)
            if (vn0 <= 0) {
                // The ground rose into a ball that moves away from it.
                continue
            }
            // Tangent direction of the incoming ball.
            let tx = vx + vn0 * n.x
            let ty = vy + vn0 * n.y
            let tz = vz + vn0 * n.z
            const vt0 = Math.sqrt(tx * tx + ty * ty + tz * tz)
            // Effective normal, tilted toward the incoming ball (step 1).
            let ex = n.x
            let ey = n.y
            let ez = n.z
            if (vt0 > 1e-6 && params.softness > 0) {
                const descent = atan2Positive(vn0, vt0)
                let tilt =
                    params.softness *
                    TILT_REFERENCE *
                    (speedIn / TILT_REFERENCE_SPEED) *
                    (descent / TILT_REFERENCE_ANGLE)
                // Never tilt past the incoming direction.
                tilt = Math.min(tilt, MAX_TILT, HALF_PI - descent)
                const ct = cos(tilt)
                const st = sin(tilt)
                ex = ct * n.x - (st * tx) / vt0
                ey = ct * n.y - (st * ty) / vt0
                ez = ct * n.z - (st * tz) / vt0
            }
            const vn = -(vx * ex + vy * ey + vz * ez)
            tx = vx + vn * ex
            ty = vy + vn * ey
            tz = vz + vn * ez
            // Slip velocity of the contact point (step 3).
            const cx = tx - BALL_RADIUS * (wy * ez - wz * ey)
            const cy = ty - BALL_RADIUS * (wz * ex - wx * ez)
            const cz = tz - BALL_RADIUS * (wx * ey - wy * ex)
            const slip = Math.sqrt(cx * cx + cy * cy + cz * cz)
            const e = baseRestitution(vn) * params.restitution
            const maxImpulse = params.friction * (1 + e) * vn
            let k = -2 / 7
            if ((2 / 7) * slip > maxImpulse) {
                k = -maxImpulse / slip
            }
            const dvx = k * cx
            const dvy = k * cy
            const dvz = k * cz
            const spinK = 5 / (2 * BALL_RADIUS)
            wx -= spinK * (ey * dvz - ez * dvy)
            wy -= spinK * (ez * dvx - ex * dvz)
            wz -= spinK * (ex * dvy - ey * dvx)
            const keepT = params.impactKeep
            wx *= keepT
            wy *= keepT
            wz *= keepT
            vx = (tx + dvx) * keepT + e * vn * ex
            vy = (ty + dvy) * keepT + e * vn * ey
            vz = (tz + dvz) * keepT + e * vn * ez

            const out = vx * n.x + vy * n.y + vz * n.z
            if (out < ROLL_START_SPEED) {
                // Too slow to leave the ground: start to roll. Any slip
                // that is left is used up by friction, which turns the
                // rest of the spin into forward or backward speed.
                vx -= out * n.x
                vy -= out * n.y
                vz -= out * n.z
                const rx = vx - BALL_RADIUS * (wy * n.z - wz * n.y)
                const ry = vy - BALL_RADIUS * (wz * n.x - wx * n.z)
                const rz = vz - BALL_RADIUS * (wx * n.y - wy * n.x)
                vx -= (2 / 7) * rx
                vy -= (2 / 7) * ry
                vz -= (2 / 7) * rz
                wx = 0
                wy = 0
                wz = 0
                phase = 'ground'
            }
            continue
        }

        // --- One roll step ---
        const params = surfaces[surface]
        const asx = ROLL_GRAVITY * n.y * n.x
        const asy = ROLL_GRAVITY * (n.y * n.y - 1)
        const asz = ROLL_GRAVITY * n.y * n.z
        const slopeAccel = Math.sqrt(asx * asx + asy * asy + asz * asz)
        const resist = params.rollDecel * n.y
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
        if (speed < REST_SPEED) {
            if (slopeAccel <= resist) {
                // The resistance holds the ball on this slope.
                break
            }
            const k = ((slopeAccel - resist) / slopeAccel) * DT
            vx = asx * k
            vy = asy * k
            vz = asz * k
        } else {
            vx += asx * DT
            vy += asy * DT
            vz += asz * DT
            const sp = Math.sqrt(vx * vx + vy * vy + vz * vz)
            const loss = resist * DT
            if (sp <= loss) {
                // Stopped. The next step decides if the slope holds it.
                vx = 0
                vy = 0
                vz = 0
                t += DT
                continue
            }
            const k = (sp - loss) / sp
            vx *= k
            vy *= k
            vz *= k
        }

        px += vx * DT
        pz += vz * DT
        py = ground.height(px, pz)
        groundH = py
        t += DT
        // Keep the velocity in the ground plane. The speed is not changed
        // here: gravity along the slope already accounts for the energy.
        n = ground.normal(px, pz)
        const sp = Math.sqrt(vx * vx + vy * vy + vz * vz)
        const into = vx * n.x + vy * n.y + vz * n.z
        vx -= into * n.x
        vy -= into * n.y
        vz -= into * n.z
        const sp2 = Math.sqrt(vx * vx + vy * vy + vz * vz)
        if (sp2 > 0) {
            const k = sp / sp2
            vx *= k
            vy *= k
            vz *= k
        }

        const s = ground.surface(px, pz)
        if (s === 'water' && surface !== 'water') {
            findWaterEdge(ground, trackX, trackZ, px, pz)
            dropX = EDGE[0]
            dropZ = EDGE[1]
        }
        trackX = px
        trackZ = pz
        surface = s
        if (s === 'water' || s === 'ob') {
            outcome = s
            break
        }

        if (cup) {
            const ox = px - cup.x
            const oz = pz - cup.z
            const inside = ox * ox + oz * oz < cupR2
            if (inside && !inCup) {
                const vh = Math.sqrt(vx * vx + vz * vz)
                if (vh < 1e-9) {
                    outcome = 'holed'
                    break
                }
                const hx = vx / vh
                const hz = vz / vh
                // Distance of the path from the cup centre, and the chord.
                const along = ox * hx + oz * hz
                const sideX = -(ox - along * hx)
                const sideZ = -(oz - along * hz)
                const offset = Math.sqrt(sideX * sideX + sideZ * sideZ)
                const chord =
                    2 * Math.sqrt(Math.max(0, cupR2 - offset * offset))
                const capture = cupCaptureSpeed(chord)
                if (vh <= capture) {
                    outcome = 'holed'
                    break
                }
                // Lip out: slower, and turned toward the side of the hole.
                const q = (capture / vh) * (capture / vh)
                const newSpeed = sp * (1 - LIP_SPEED_LOSS * q)
                const turn = (LIP_DEFLECTION * q) / CUP_RADIUS
                vx = hx + turn * sideX
                vz = hz + turn * sideZ
                vy = -(n.x * vx + n.z * vz) / n.y
                const k = newSpeed / Math.sqrt(vx * vx + vy * vy + vz * vz)
                vx *= k
                vy *= k
                vz *= k
            }
            inCup = inside
        }

        if (step % SAMPLE_EVERY === 0) {
            if (record) {
                samples.push({ t, x: px, y: py, z: pz, phase })
            }
        }
    }

    // A ball that stops over the hole falls in.
    if (cup && outcome === 'rest') {
        const ox = px - cup.x
        const oz = pz - cup.z
        if (ox * ox + oz * oz < cupR2) {
            outcome = 'holed'
        }
    }
    if (cup && outcome === 'holed') {
        px = cup.x
        pz = cup.z
        py = ground.height(px, pz)
        surface = ground.surface(px, pz)
    }
    // The path always ends with the exact final position.
    if (record) {
        if (samples[samples.length - 1].t === t) {
            samples.pop()
        }
        samples.push({ t, x: px, y: py, z: pz, phase })
    }

    const rest: Vec3 = { x: px, y: py, z: pz }
    const land: ShotEvent | null = landing

    return {
        samples,
        rest,
        restSurface: surface,
        duration: t,
        landing: land,
        apex:
            land !== null
                ? { t: apexT, position: { x: apexX, y: apexY, z: apexZ } }
                : null,
        bounces,
        carry: land !== null ? horizontalDistance(start, land.position) : 0,
        total: horizontalDistance(start, rest),
        outcome,
        holed: outcome === 'holed',
        water:
            outcome === 'water'
                ? {
                      drop: {
                          x: dropX,
                          y: ground.height(dropX, dropZ),
                          z: dropZ,
                      },
                  }
                : null,
        ob: outcome === 'ob' ? { lastValid: start } : null,
    }
}
