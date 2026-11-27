// Playability checks on a finished hole. They only read HoleData, so they
// work for every generator version.
import type { HoleData, SurfaceId, Vec2 } from '../shared/hole'
import { SURFACE_IDS } from '../shared/hole'
import { createGround } from './ground'
import type { Ground } from './ground'

/**
 * Nominal full carry of each club in metres, longest first (the target
 * carries of physics/clubs.ts). A copy on purpose: the frozen generator
 * versions validate with it, so a later change to the club tuning must not
 * change archive holes.
 */
export const CLUB_CARRY = [215, 195, 165, 145, 120, 105, 75] as const

/** Allowance for roll after a full shot that lands on short grass. */
const ROLL = 1.07

/** Steepest ground allowed at the cup. */
export const MAX_PIN_SLOPE = 0.026

export interface ValidationResult {
    ok: boolean
    issues: string[]
    /** Fewest full shots from the tee to the green, or Infinity. */
    strokesToGreen: number
}

/** Length of a polyline. */
function polylineLength(line: readonly Vec2[]): number {
    let total = 0
    for (let i = 1; i < line.length; i++) {
        const dx = line[i].x - line[i - 1].x
        const dz = line[i].z - line[i - 1].z
        total += Math.sqrt(dx * dx + dz * dz)
    }
    return total
}

/** Playing length of the hole in metres: tee to green centre. */
export function holeLength(hole: HoleData): number {
    return polylineLength(hole.centerline)
}

/** Point at distance s along a polyline (clamped to its ends). */
function pointOnLine(line: readonly Vec2[], s: number): Vec2 {
    if (s <= 0) {
        return { x: line[0].x, z: line[0].z }
    }
    let run = 0
    for (let i = 1; i < line.length; i++) {
        const dx = line[i].x - line[i - 1].x
        const dz = line[i].z - line[i - 1].z
        const len = Math.sqrt(dx * dx + dz * dz)
        if (run + len >= s && len > 0) {
            const t = (s - run) / len
            return { x: line[i - 1].x + dx * t, z: line[i - 1].z + dz * t }
        }
        run += len
    }
    const last = line[line.length - 1]
    return { x: last.x, z: last.z }
}

function slopeAt(ground: Ground, x: number, z: number): number {
    const n = ground.normal(x, z)
    return Math.sqrt(1 - n.y * n.y) / n.y
}

/** Steepest slope at a point and on a small ring around it. */
export function pinSlope(ground: Ground, x: number, z: number): number {
    let worst = slopeAt(ground, x, z)
    for (let i = 0; i < 8; i++) {
        const dx = RING_X[i] * 1.2
        const dz = RING_Z[i] * 1.2
        const s = slopeAt(ground, x + dx, z + dz)
        if (s > worst) {
            worst = s
        }
    }
    return worst
}

const D = 0.7071067811865476
const RING_X = [1, D, 0, -D, -1, -D, 0, D]
const RING_Z = [0, D, 1, D, 0, -D, -1, -D]

const SHORT_GRASS: ReadonlySet<SurfaceId> = new Set(['fairway', 'firstCut'])
const DRY: ReadonlySet<SurfaceId> = new Set([
    'fairway',
    'firstCut',
    'rough',
    'green',
    'tee',
])
const NO_TREES: ReadonlySet<SurfaceId> = new Set([
    'green',
    'tee',
    'bunker',
    'water',
])

export function validateHole(
    hole: HoleData,
    ground: Ground = createGround(hole)
): ValidationResult {
    const issues: string[] = []
    const { tee, pin, bounds, surfaces, trees } = hole

    // Tee and pin.
    if (ground.surface(tee.x, tee.z) !== 'tee') {
        issues.push('tee is not on the tee box')
    }
    if (ground.surface(pin.x, pin.z) !== 'green') {
        issues.push('pin is not on the green')
    }
    for (let i = 0; i < 8; i++) {
        if (
            ground.surface(pin.x + RING_X[i] * 3, pin.z + RING_Z[i] * 3) !==
            'green'
        ) {
            issues.push('pin is too close to the edge of the green')
            break
        }
    }
    if (pinSlope(ground, pin.x, pin.z) > MAX_PIN_SLOPE) {
        issues.push('pin is on a slope')
    }
    for (const p of [tee, pin]) {
        if (
            p.x < bounds.minX + 5 ||
            p.x > bounds.maxX - 5 ||
            p.z < bounds.minZ + 5 ||
            p.z > bounds.maxZ - 5
        ) {
            issues.push('tee or pin is outside the bounds')
        }
    }

    // Heights.
    for (const field of [hole.terrain, hole.greenField]) {
        const h = field.heights
        for (let i = 0; i < h.length; i++) {
            if (!(h[i] > -100 && h[i] < 100)) {
                issues.push('heightfield has a bad value')
                break
            }
        }
    }

    // The green: big enough, and not touched by water or sand.
    const data = surfaces.data
    const cols = surfaces.cols
    const rows = surfaces.rows
    const GREEN = SURFACE_IDS.indexOf('green')
    const WATER = SURFACE_IDS.indexOf('water')
    const BUNKER = SURFACE_IDS.indexOf('bunker')
    let greenCells = 0
    let greenTouched = false
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            const i = r * cols + c
            if (data[i] !== GREEN) {
                continue
            }
            greenCells++
            const a = data[i - 1]
            const b = data[i + 1]
            const d = data[i - cols]
            const e = data[i + cols]
            if (
                a === WATER ||
                b === WATER ||
                d === WATER ||
                e === WATER ||
                a === BUNKER ||
                b === BUNKER ||
                d === BUNKER ||
                e === BUNKER
            ) {
                greenTouched = true
            }
        }
    }
    const greenArea = greenCells * surfaces.cellSize * surfaces.cellSize
    if (greenArea < 300) {
        issues.push('green is too small')
    }
    if (greenTouched) {
        issues.push('water or sand touches the green')
    }

    // Trees stay off the short grass and out of the hazards.
    let badTrees = 0
    for (const t of trees) {
        const at = ground.surface(t.x, t.z)
        // The trunk stands in the rough or beyond. The canopy of a guard
        // tree may hang over the fairway, but never over a green, a tee
        // or a hazard.
        let bad = at !== 'rough' && at !== 'ob'
        for (let i = 0; i < 8 && !bad; i++) {
            const s = ground.surface(
                t.x + RING_X[i] * t.radius * 0.8,
                t.z + RING_Z[i] * t.radius * 0.8
            )
            bad = NO_TREES.has(s)
        }
        if (bad) {
            badTrees++
        }
    }
    if (badTrees > 0) {
        issues.push(`${badTrees} trees on short grass or in a hazard`)
    }

    // Route: full shots along the centre line.
    const line = hole.centerline
    const length = polylineLength(line)
    const STEP = 5
    const count = Math.max(2, Math.round(length / STEP) + 1)
    const px = new Float64Array(count)
    const pz = new Float64Array(count)
    for (let i = 0; i < count; i++) {
        const p = pointOnLine(line, (length * i) / (count - 1))
        px[i] = p.x
        pz[i] = p.z
    }

    // Trees in buckets, to test flight lines quickly.
    const BUCKET = 8
    const bCols = Math.ceil((bounds.maxX - bounds.minX) / BUCKET) + 1
    const buckets = new Map<number, number[]>()
    for (let i = 0; i < trees.length; i++) {
        const key =
            Math.floor((trees[i].z - bounds.minZ) / BUCKET) * bCols +
            Math.floor((trees[i].x - bounds.minX) / BUCKET)
        const list = buckets.get(key)
        if (list) {
            list.push(i)
        } else {
            buckets.set(key, [i])
        }
    }
    const nearTree = (x: number, z: number): boolean => {
        const bc = Math.floor((x - bounds.minX) / BUCKET)
        const br = Math.floor((z - bounds.minZ) / BUCKET)
        for (let r = br - 1; r <= br + 1; r++) {
            for (let c = bc - 1; c <= bc + 1; c++) {
                const list = buckets.get(r * bCols + c)
                if (!list) {
                    continue
                }
                for (const i of list) {
                    const dx = trees[i].x - x
                    const dz = trees[i].z - z
                    const reach = trees[i].radius + 1.5
                    if (dx * dx + dz * dz < reach * reach) {
                        return true
                    }
                }
            }
        }
        return false
    }
    const clearFlight = (a: number, b: number): boolean => {
        const dx = px[b] - px[a]
        const dz = pz[b] - pz[a]
        const dist = Math.sqrt(dx * dx + dz * dz)
        const n = Math.ceil(dist / 2.5)
        for (let i = 1; i < n; i++) {
            const t = i / n
            if (nearTree(px[a] + dx * t, pz[a] + dz * t)) {
                return false
            }
        }
        return true
    }
    const safeLanding = (i: number): boolean => {
        if (
            !SHORT_GRASS.has(ground.surface(px[i], pz[i])) ||
            nearTree(px[i], pz[i])
        ) {
            return false
        }
        let dry = 0
        for (let k = 0; k < 8; k++) {
            if (
                DRY.has(
                    ground.surface(px[i] + RING_X[k] * 6, pz[i] + RING_Z[k] * 6)
                )
            ) {
                dry++
            }
        }
        return dry >= 7
    }

    const safe = new Uint8Array(count)
    for (let i = 1; i < count - 1; i++) {
        safe[i] = safeLanding(i) ? 1 : 0
    }
    safe[count - 1] =
        ground.surface(px[count - 1], pz[count - 1]) === 'green' ? 1 : 0

    const strokes = new Float64Array(count).fill(Infinity)
    strokes[0] = 0
    for (let i = 0; i < count - 1; i++) {
        if (strokes[i] === Infinity) {
            continue
        }
        const reach = (i === 0 ? CLUB_CARRY[0] : CLUB_CARRY[1]) * ROLL
        for (let j = i + 1; j < count; j++) {
            if (safe[j] === 0 || strokes[j] <= strokes[i] + 1) {
                continue
            }
            const dx = px[j] - px[i]
            const dz = pz[j] - pz[i]
            if (dx * dx + dz * dz > reach * reach) {
                continue
            }
            if (clearFlight(i, j)) {
                strokes[j] = strokes[i] + 1
            }
        }
    }
    const strokesToGreen = strokes[count - 1]
    if (!(strokesToGreen <= hole.par - 2)) {
        issues.push(
            `green needs ${strokesToGreen} full shots, par ${hole.par} allows ${hole.par - 2}`
        )
    }

    // The driver landing zone must be mostly safe.
    if (hole.par > 3) {
        let zone = 0
        let zoneSafe = 0
        for (let i = 1; i < count - 1; i++) {
            const s = (length * i) / (count - 1)
            const dist = Math.sqrt(px[i] * px[i] + pz[i] * pz[i])
            const fromTee = Math.sqrt(
                (px[i] - tee.x) * (px[i] - tee.x) +
                    (pz[i] - tee.z) * (pz[i] - tee.z)
            )
            if (
                dist > 0 &&
                fromTee >= 185 &&
                fromTee <= 230 &&
                s <= length - 45
            ) {
                zone++
                zoneSafe += safe[i]
            }
        }
        if (zone === 0 || zoneSafe < zone * 0.5) {
            issues.push('driver landing zone is blocked')
        }
    }

    return { ok: issues.length === 0, issues, strokesToGreen }
}
