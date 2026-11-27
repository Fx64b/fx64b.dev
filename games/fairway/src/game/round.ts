// One round of one hole: the golf rules on top of the physics. No DOM and no
// rendering, so the whole round is testable and replayable from its inputs.
import { createGround } from '../course'
import {
    CLUB_ORDER,
    type ClubId,
    type Environment,
    type Ground,
    type ShotResult,
    environmentFromHole,
    launchFor,
    nominalCarry,
    simulateShot,
} from '../physics'
import { cos, sin } from '../physics/detmath'
import type { HoleData, SurfaceId, Vec3 } from '../shared/hole'

/** A round stops after this many strokes (the player "picks up"). */
export const MAX_STROKES = 12

/** A release below this power is a slip, not a shot. */
export const MIN_POWER = 0.03

/** One played shot: everything needed to replay it. */
export interface ShotRecord {
    club: ClubId
    /** Aim heading in rad, atan2(dz, dx). */
    aim: number
    power: number
}

export type ShotNote = 'water' | 'ob' | 'holed' | 'green' | 'bunker' | 'limit'

export interface ShotOutcome {
    result: ShotResult
    /** Where the ball lies for the next shot (after a drop, if any). */
    next: Vec3
    lie: SurfaceId
    /** Penalty strokes for this shot (0 or 1). */
    penalty: number
    notes: ShotNote[]
}

export interface RoundStats {
    strokes: number
    putts: number
    penalties: number
    bunkers: number
}

export interface Round {
    readonly hole: HoleData
    readonly ground: Ground
    readonly env: Environment
    /** Ball position (y is the ground height under the ball). */
    ball: Vec3
    lie: SurfaceId
    stats: RoundStats
    shots: ShotRecord[]
    holed: boolean
    /** True when the round is over: holed or the stroke limit is reached. */
    done: boolean
}

export interface RoundOptions {
    ground?: Ground
    env?: Environment
}

export function createRound(hole: HoleData, opts: RoundOptions = {}): Round {
    const ground = opts.ground ?? createGround(hole)
    return {
        hole,
        ground,
        env: opts.env ?? environmentFromHole(hole.conditions, hole.pin),
        ball: { ...hole.tee },
        lie: 'tee',
        stats: { strokes: 0, putts: 0, penalties: 0, bunkers: 0 },
        shots: [],
        holed: false,
        done: false,
    }
}

/** Horizontal distance from the ball to the pin, in m. */
export function distanceToPin(round: Round): number {
    return Math.hypot(
        round.hole.pin.x - round.ball.x,
        round.hole.pin.z - round.ball.z
    )
}

/** Aim heading from the ball straight at the pin, atan2(dz, dx). */
export function headingToPin(round: Round): number {
    return Math.atan2(
        round.hole.pin.z - round.ball.z,
        round.hole.pin.x - round.ball.x
    )
}

/**
 * The aim a player would take with this club: straight at the pin when the
 * club can reach it, else at the point on the centre line of the hole at
 * the full carry of the club. On a dogleg that is down the fairway, not
 * over the trees at the corner.
 */
export function defaultAim(round: Round, club: ClubId): number {
    const reach = club === 'putter' ? Infinity : nominalCarry(club)
    if (distanceToPin(round) <= reach * 1.05) {
        return headingToPin(round)
    }
    const line = round.hole.centerline
    const b = round.ball
    // Start at the centre line point nearest to the ball, then walk toward
    // the green to the first point that is a full carry away.
    let nearest = 0
    let best = Infinity
    for (let i = 0; i < line.length; i++) {
        const d = Math.hypot(line[i].x - b.x, line[i].z - b.z)
        if (d < best) {
            best = d
            nearest = i
        }
    }
    for (let i = nearest + 1; i < line.length; i++) {
        const p = line[i]
        if (Math.hypot(p.x - b.x, p.z - b.z) >= reach) {
            return Math.atan2(p.z - b.z, p.x - b.x)
        }
    }
    return headingToPin(round)
}

/**
 * The club a caddie would hand over: the putter on and near the green, else
 * the shortest club whose full carry reaches the pin. From the tee of a long
 * hole that is the driver.
 */
export function suggestClub(round: Round): ClubId {
    const d = distanceToPin(round)
    if (round.lie === 'green') {
        return 'putter'
    }
    if (round.lie === 'firstCut' && d < 12) {
        return 'putter'
    }
    const full = CLUB_ORDER.filter((c) => c !== 'putter')
    for (let i = full.length - 1; i >= 0; i--) {
        if (nominalCarry(full[i]) >= d * 0.97) {
            return full[i]
        }
    }
    return full[0]
}

/** Simulate a shot without changing the round (for previews and tests). */
export function simulate(round: Round, shot: ShotRecord): ShotResult {
    return simulateShot(
        {
            start: { x: round.ball.x, z: round.ball.z },
            // Deterministic cos/sin, so a replay gives the same shot everywhere.
            aim: { x: cos(shot.aim), z: sin(shot.aim) },
            launch: launchFor(shot.club, shot.power, round.lie),
        },
        round.env,
        round.ground
    )
}

/**
 * Play one shot and apply the rules:
 * - water: +1 stroke, drop where the ball last crossed into the hazard;
 * - out of bounds: +1 stroke, play again from the same spot;
 * - holed: the round is over;
 * - the round also ends at MAX_STROKES.
 */
export function playShot(round: Round, shot: ShotRecord): ShotOutcome {
    if (round.done) {
        throw new Error('The round is over')
    }
    const result = simulate(round, shot)
    round.shots.push(shot)
    round.stats.strokes += 1
    if (shot.club === 'putter') {
        round.stats.putts += 1
    }

    const notes: ShotNote[] = []
    let penalty = 0
    let next: Vec3
    if (result.outcome === 'water' && result.water) {
        penalty = 1
        notes.push('water')
        next = onGround(round.ground, result.water.drop)
    } else if (result.outcome === 'ob') {
        penalty = 1
        notes.push('ob')
        next = { ...round.ball }
    } else {
        next = onGround(round.ground, result.rest)
    }
    round.stats.strokes += penalty
    round.stats.penalties += penalty

    round.ball = next
    round.lie = round.ground.surface(next.x, next.z)
    if (result.holed) {
        round.holed = true
        round.done = true
        round.ball = { ...round.hole.pin }
        notes.push('holed')
    } else {
        if (round.lie === 'bunker') {
            round.stats.bunkers += 1
            notes.push('bunker')
        }
        if (round.lie === 'green' && penalty === 0) {
            notes.push('green')
        }
        if (round.stats.strokes >= MAX_STROKES) {
            round.done = true
            notes.push('limit')
        }
    }
    return { result, next: round.ball, lie: round.lie, penalty, notes }
}

function onGround(ground: Ground, p: { x: number; z: number }): Vec3 {
    return { x: p.x, y: ground.height(p.x, p.z), z: p.z }
}
