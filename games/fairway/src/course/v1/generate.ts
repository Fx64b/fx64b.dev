// Hole generator, version 1.
//
// FROZEN ONCE LIVE: daily holes that launched with this version must never
// change. Fix bugs or tune values in a new version (copy this folder) and
// add it to the registry in ../versions.ts.
//
// Layout steps:
//  1. Par, difficulty and length from the seed.
//  2. Centre line: straight legs with rounded doglegs, tee at the origin,
//     green on the +z axis.
//  3. A field of (station, offset) along the centre line. Fairway, rough,
//     tree lines and out of bounds are profiles over the station.
//  4. Green, tee, water and bunkers as signed-distance shapes.
//  5. One height function (noise hills, flattened under tee, fairway and
//     green, with carved bunkers and water) sampled into both heightfields.
//  6. Surface grid, trees, pin and conditions.
import type {
    Bunker,
    HoleData,
    Tree,
    TreeKind,
    Vec2,
    WaterBody,
} from '../../shared/hole'
import { PI, TAU, bump, clamp, cos, lerp, sin, smoothstep } from '../dmath'
import { createGround } from '../ground'
import { createNoise2D } from '../noise'
import { createRng } from '../prng'
import type { Rng } from '../prng'
import { MAX_PIN_SLOPE, pinSlope, validateHole } from '../validate'

const VERSION = 1
const MAX_ATTEMPTS = 12
const YD = 0.9144

// Surface indices (see SURFACE_IDS).
const TEE = 0
const FAIRWAY = 1
const FIRST_CUT = 2
const ROUGH = 3
const BUNKER = 4
const GREEN = 5
const WATER = 6
const OB = 7

const TERRAIN_CELL = 1
const SURFACE_CELL = 0.5
const GREEN_CELL = 0.25
const FIELD_CELL = 2
const LINE_STEP = 2

/** Width of the first cut around the fairway and of the collar. */
const FIRST_CUT_WIDTH = 2.6
/** Depth of the forest drawn beyond the out-of-bounds line. */
const FOREST_DEPTH = 16
/** Out of bounds starts this far behind the tee. */
const BACK_OF_TEE = 24

const LENGTH_YD: Record<3 | 4 | 5, [number, number]> = {
    3: [140, 220],
    4: [330, 470],
    5: [470, 600],
}

// Fairway half-width limits (27 and 44 yd wide).
const HALF_MIN = (27 * YD) / 2
const HALF_MAX = (44 * YD) / 2

interface Shape {
    sd(x: number, z: number): number
    minX: number
    maxX: number
    minZ: number
    maxZ: number
}

interface BunkerSpec extends Shape {
    cx: number
    cz: number
    depth: number
    lip: number
    /** Unit vector toward the high lip. */
    ux: number
    uz: number
    greenside: boolean
    outline: Vec2[]
}

interface WaterSpec extends Shape {
    skirt: number
    basin: number
    level: number
    outline: Vec2[]
    last: number
}

function smin(a: number, b: number, k: number): number {
    const diff = a > b ? a - b : b - a
    const h = diff >= k ? 0 : (k - diff) / k
    return (a < b ? a : b) - h * h * k * 0.25
}

/** A blob: the smooth union of a few circles. */
function makeBlob(
    cx: number[],
    cz: number[],
    r: number[],
    k: number
): Shape & { ox: number; oz: number; reach: number } {
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    let reach = 0
    const mid = cx.length >> 1
    for (let i = 0; i < cx.length; i++) {
        const pad = r[i] + k * 0.25
        minX = Math.min(minX, cx[i] - pad)
        maxX = Math.max(maxX, cx[i] + pad)
        minZ = Math.min(minZ, cz[i] - pad)
        maxZ = Math.max(maxZ, cz[i] + pad)
        const dx = cx[i] - cx[mid]
        const dz = cz[i] - cz[mid]
        reach = Math.max(reach, Math.sqrt(dx * dx + dz * dz) + pad + 1)
    }
    const n = cx.length
    return {
        sd(x, z) {
            let d = 1e9
            for (let i = 0; i < n; i++) {
                const dx = x - cx[i]
                const dz = z - cz[i]
                const di = Math.sqrt(dx * dx + dz * dz) - r[i]
                d = i === 0 ? di : smin(d, di, k)
            }
            return d
        },
        minX,
        maxX,
        minZ,
        maxZ,
        ox: cx[mid],
        oz: cz[mid],
        reach,
    }
}

/** Outline of a star-shaped blob, found by bisection along rays. */
function blobOutline(
    shape: Shape,
    ox: number,
    oz: number,
    reach: number,
    points: number
): Vec2[] {
    const out: Vec2[] = []
    for (let i = 0; i < points; i++) {
        const a = (TAU * i) / points
        const ux = cos(a)
        const uz = sin(a)
        let lo = 0
        let hi = reach
        for (let k = 0; k < 16; k++) {
            const mid = (lo + hi) * 0.5
            if (shape.sd(ox + ux * mid, oz + uz * mid) < 0) {
                lo = mid
            } else {
                hi = mid
            }
        }
        const t = (lo + hi) * 0.5
        out.push({ x: ox + ux * t, z: oz + uz * t })
    }
    return out
}

/** Chaikin corner cutting. Keeps the end points. */
function chaikin(points: Vec2[], iterations: number): Vec2[] {
    let pts = points
    for (let it = 0; it < iterations; it++) {
        const next: Vec2[] = [pts[0]]
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i]
            const b = pts[i + 1]
            next.push(
                { x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 },
                { x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 }
            )
        }
        next.push(pts[pts.length - 1])
        pts = next
    }
    return pts
}

function pathLength(pts: Vec2[]): number {
    let total = 0
    for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x
        const dz = pts[i].z - pts[i - 1].z
        total += Math.sqrt(dx * dx + dz * dz)
    }
    return total
}

/** Points at even arc length along a polyline, including both ends. */
function resample(pts: Vec2[], segments: number): Vec2[] {
    const total = pathLength(pts)
    const out: Vec2[] = [{ x: pts[0].x, z: pts[0].z }]
    let seg = 1
    let run = 0
    for (let i = 1; i < segments; i++) {
        const target = (total * i) / segments
        for (;;) {
            const dx = pts[seg].x - pts[seg - 1].x
            const dz = pts[seg].z - pts[seg - 1].z
            const len = Math.sqrt(dx * dx + dz * dz)
            if (run + len >= target || seg === pts.length - 1) {
                const t = len > 0 ? (target - run) / len : 0
                out.push({
                    x: pts[seg - 1].x + dx * t,
                    z: pts[seg - 1].z + dz * t,
                })
                break
            }
            run += len
            seg++
        }
    }
    const last = pts[pts.length - 1]
    out.push({ x: last.x, z: last.z })
    return out
}

interface Layout {
    /** Centre line points, about LINE_STEP apart. */
    line: Vec2[]
    /** Station (distance along the line) of each point. */
    station: Float64Array
    length: number
    /** Stations of the landing zones (the dogleg corners, if any). */
    landing: number[]
}

function buildCenterline(
    rng: Rng,
    par: 3 | 4 | 5,
    length: number,
    difficulty: number
): Layout {
    const pts: Vec2[] = [{ x: 0, z: 0 }]
    const landing: number[] = []
    if (par === 3) {
        // None or a slight curve.
        pts.push(
            { x: rng.range(-1, 1) * length * 0.035, z: length * 0.5 },
            { x: 0, z: length }
        )
    } else {
        const roll = rng.next()
        let doglegs =
            par === 4
                ? roll < 0.3
                    ? 0
                    : 1
                : roll < 0.15
                  ? 0
                  : roll < 0.6
                    ? 1
                    : 2
        const c1 = clamp(rng.range(200, 240), 150, length - 85)
        const c2 = Math.min(c1 + rng.range(165, 200), length - 90)
        if (doglegs === 2 && c2 - c1 < 120) {
            doglegs = 1
        }
        const maxBend = lerp(24, 38, difficulty)
        const side = rng.sign()
        const bend1 = side * rng.range(10, maxBend)
        const bend2 =
            (rng.chance(0.6) ? -side : side) * rng.range(8, maxBend * 0.7)
        const radius = rng.range(50, 90)
        const wobble1 = rng.range(-1, 1)
        const wobble2 = rng.range(-1, 1)
        landing.push(c1)
        if (par === 5) {
            landing.push(c2)
        }
        if (doglegs === 0) {
            pts.push(
                { x: wobble1 * length * 0.03, z: length * 0.35 },
                { x: wobble2 * length * 0.03, z: length * 0.68 },
                { x: 0, z: length }
            )
        } else {
            const legs =
                doglegs === 1 ? [c1, length - c1] : [c1, c2 - c1, length - c2]
            const bends = [bend1, bend2]
            let heading = 0
            let x = 0
            let z = 0
            for (let k = 0; k < legs.length; k++) {
                const len = legs[k]
                const ux = sin((heading * PI) / 180)
                const uz = cos((heading * PI) / 180)
                const r = Math.min(radius, len * 0.45)
                if (k > 0) {
                    pts.push({ x: x + ux * r, z: z + uz * r })
                }
                if (k < legs.length - 1) {
                    pts.push({ x: x + ux * (len - r), z: z + uz * (len - r) })
                }
                x += ux * len
                z += uz * len
                pts.push({ x, z })
                heading += bends[k]
            }
        }
    }

    // Smooth, then scale to the exact length and turn the green onto +z.
    const smooth = chaikin(pts, 4)
    const end = smooth[smooth.length - 1]
    const span = Math.sqrt(end.x * end.x + end.z * end.z)
    const scale = length / pathLength(smooth)
    const ca = end.z / span
    const sa = end.x / span
    const turned = smooth.map((p) => ({
        x: (p.x * ca - p.z * sa) * scale,
        z: (p.x * sa + p.z * ca) * scale,
    }))
    const line = resample(turned, Math.round(length / LINE_STEP))
    line[line.length - 1].x = 0
    const station = new Float64Array(line.length)
    for (let i = 1; i < line.length; i++) {
        const dx = line[i].x - line[i - 1].x
        const dz = line[i].z - line[i - 1].z
        station[i] = station[i - 1] + Math.sqrt(dx * dx + dz * dz)
    }
    return { line, station, length: station[line.length - 1], landing }
}

/** Chamfer distance (in cells) to the nearest set cell of a mask. */
function chamfer(mask: Uint8Array, cols: number, rows: number): Float32Array {
    const dist = new Float32Array(cols * rows)
    const DIAG = 1.4142135623730951
    for (let i = 0; i < dist.length; i++) {
        dist[i] = mask[i] ? 0 : 1e6
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const i = r * cols + c
            let d = dist[i]
            if (d === 0) {
                continue
            }
            if (c > 0 && dist[i - 1] + 1 < d) {
                d = dist[i - 1] + 1
            }
            if (r > 0) {
                if (dist[i - cols] + 1 < d) {
                    d = dist[i - cols] + 1
                }
                if (c > 0 && dist[i - cols - 1] + DIAG < d) {
                    d = dist[i - cols - 1] + DIAG
                }
                if (c < cols - 1 && dist[i - cols + 1] + DIAG < d) {
                    d = dist[i - cols + 1] + DIAG
                }
            }
            dist[i] = d
        }
    }
    for (let r = rows - 1; r >= 0; r--) {
        for (let c = cols - 1; c >= 0; c--) {
            const i = r * cols + c
            let d = dist[i]
            if (d === 0) {
                continue
            }
            if (c < cols - 1 && dist[i + 1] + 1 < d) {
                d = dist[i + 1] + 1
            }
            if (r < rows - 1) {
                if (dist[i + cols] + 1 < d) {
                    d = dist[i + cols] + 1
                }
                if (c < cols - 1 && dist[i + cols + 1] + DIAG < d) {
                    d = dist[i + cols + 1] + DIAG
                }
                if (c > 0 && dist[i + cols - 1] + DIAG < d) {
                    d = dist[i + cols - 1] + DIAG
                }
            }
            dist[i] = d
        }
    }
    return dist
}

/** Par, difficulty and length. They do not change between attempts. */
export function holeIdentityV1(seed: string): {
    par: 3 | 4 | 5
    difficulty: number
    length: number
} {
    const rng = createRng(`v1:${seed}`, 'identity')
    const parRoll = rng.next()
    const par = parRoll < 0.25 ? 3 : parRoll < 0.75 ? 4 : 5
    const difficulty = Math.round(rng.next() * 1000) / 1000
    // Harder holes lean longer.
    const t = clamp(rng.next() * 0.75 + difficulty * 0.25, 0, 1)
    const [minYd, maxYd] = LENGTH_YD[par]
    const length = lerp(minYd + 1.5, maxYd - 1.5, t) * YD
    return { par, difficulty, length }
}

/**
 * Builds the hole for one attempt, without checking it. Returns null when
 * the layout cannot be finished (for example no flat spot for the pin).
 */
export function buildHoleV1(
    seed: string,
    number: number,
    attempt: number
): HoleData | null {
    const key = `v1:${seed}`
    const stream = (name: string): Rng => createRng(key, `${attempt}/${name}`)
    const { par, difficulty, length: wantedLength } = holeIdentityV1(seed)

    // ---- Centre line -----------------------------------------------------
    const layout = buildCenterline(
        stream('layout'),
        par,
        wantedLength,
        difficulty
    )
    const { line, station, length: L, landing } = layout
    const lastSeg = line.length - 2
    const endTx = line[lastSeg + 1].x - line[lastSeg].x
    const endTz = line[lastSeg + 1].z - line[lastSeg].z
    const endLen = Math.sqrt(endTx * endTx + endTz * endTz)
    // Unit tangent at the green (direction of play).
    const playX = endTx / endLen
    const playZ = endTz / endLen

    /** World position of (station, offset). Extends past both ends. */
    function linePoint(s: number, d: number): Vec2 {
        let i = Math.floor((s / L) * (line.length - 1))
        i = i < 0 ? 0 : i > lastSeg ? lastSeg : i
        const ax = line[i].x
        const az = line[i].z
        let ux = line[i + 1].x - ax
        let uz = line[i + 1].z - az
        const len = Math.sqrt(ux * ux + uz * uz)
        ux /= len
        uz /= len
        const t = s - station[i]
        return { x: ax + ux * t - uz * d, z: az + uz * t + ux * d }
    }
    function lineTangent(s: number): Vec2 {
        let i = Math.floor((s / L) * (line.length - 1))
        i = i < 0 ? 0 : i > lastSeg ? lastSeg : i
        const ux = line[i + 1].x - line[i].x
        const uz = line[i + 1].z - line[i].z
        const len = Math.sqrt(ux * ux + uz * uz)
        return { x: ux / len, z: uz / len }
    }

    // ---- Green shape -----------------------------------------------------
    const gRng = stream('green')
    const gx = 0
    const gz = line[line.length - 1].z
    const diameterYd = clamp(
        lerp(37, 28, difficulty) + gRng.range(-1.5, 1.5),
        27.5,
        37.5
    )
    const ratioMax = Math.min(
        1.3,
        (38 / diameterYd) * (38 / diameterYd),
        (diameterYd / 27) * (diameterYd / 27)
    )
    const ratio = 1 + gRng.next() * (ratioMax - 1)
    const gR = (diameterYd * YD) / 2
    const gA = gR * Math.sqrt(ratio)
    const gB = gR / Math.sqrt(ratio)
    // Long axis along the play line or across it, with some twist.
    const gTwist = gRng.range(-0.6, 0.6) + (gRng.chance(0.5) ? PI / 2 : 0)
    const gCr = playX * cos(gTwist) - playZ * sin(gTwist)
    const gSr = playX * sin(gTwist) + playZ * cos(gTwist)
    const lobe2 = gRng.range(0, 0.03)
    const lobe2p = gRng.range(0, TAU)
    const lobe3 = gRng.range(0.02, 0.06)
    const lobe3p = gRng.range(0, TAU)
    const l2c = lobe2 * cos(lobe2p)
    const l2s = lobe2 * sin(lobe2p)
    const l3c = lobe3 * cos(lobe3p)
    const l3s = lobe3 * sin(lobe3p)
    const gMaxR = gA * (1 + lobe2 + lobe3)

    /** Radius of the green edge in the unit direction (ux, uz). */
    function greenRadius(ux: number, uz: number): number {
        const c1 = ux * gCr + uz * gSr
        const s1 = -ux * gSr + uz * gCr
        const e =
            (gA * gB) / Math.sqrt(gB * c1 * (gB * c1) + gA * s1 * (gA * s1))
        const c2 = c1 * c1 - s1 * s1
        const s2 = 2 * c1 * s1
        const c3 = c2 * c1 - s2 * s1
        const s3 = s2 * c1 + c2 * s1
        return e * (1 + (c2 * l2c - s2 * l2s) + (c3 * l3c - s3 * l3s))
    }
    /** Signed distance to the green edge (negative inside). */
    function greenSd(x: number, z: number): number {
        const dx = x - gx
        const dz = z - gz
        const rho = Math.sqrt(dx * dx + dz * dz)
        if (rho < 1e-6) {
            return -gB
        }
        return rho - greenRadius(dx / rho, dz / rho)
    }

    // ---- Profiles over the station ---------------------------------------
    const pRng = stream('profile')
    const PAD = 130
    const pLen = Math.ceil(L) + 2 * PAD + 1
    const fwL = new Float32Array(pLen) // fairway half-width, offset > 0
    const fwR = new Float32Array(pLen) // fairway half-width, offset < 0
    const corr = new Float32Array(pLen) // smooth corridor, for the terrain
    const obL = new Float32Array(pLen)
    const obR = new Float32Array(pLen)
    const treeL = new Float32Array(pLen)
    const treeR = new Float32Array(pLen)
    const noiseP = createNoise2D(pRng)
    const halfWide = (lerp(44, 34, difficulty) * YD) / 2
    const halfLanding = (lerp(36, 27, difficulty) * YD) / 2
    const roughWidth = lerp(30, 20, difficulty) + pRng.range(-2, 3)
    const treeBand = lerp(13, 9, difficulty)
    const fairwayStart =
        par === 3
            ? L - gR - pRng.range(22, 40)
            : lerp(55, 85, difficulty) + pRng.range(-8, 12)
    const fairwayEnd = L - gR * 0.3
    const par3Half = pRng.range(9, 12)
    const CAP = 16
    for (let i = 0; i < pLen; i++) {
        const s = i - PAD
        const sc = clamp(s, 0, L)
        let wide: number
        let left: number
        let right: number
        if (par === 3) {
            wide = par3Half
            left = par3Half + 1.2 * noiseP(sc / 30, 3.3)
            right = par3Half + 1.2 * noiseP(sc / 30, 9.1)
        } else {
            wide = halfWide
            for (const lz of landing) {
                wide -= (halfWide - halfLanding) * bump(sc - lz, 60)
            }
            wide = Math.max(wide, halfLanding)
            // The fairway wanders a little off the centre line, and each
            // edge has its own wobble.
            const drift = 3.2 * noiseP(sc / 95, 15.5)
            left = wide + drift + 1.6 * noiseP(sc / 38, 3.3)
            right = wide - drift + 1.6 * noiseP(sc / 38, 9.1)
            // Keep the total width between 27 and 44 yd.
            const total = left + right
            const fit = clamp(total, 2 * HALF_MIN, 2 * HALF_MAX) / total
            left *= fit
            right *= fit
        }
        // The neck in front of the green.
        const neck = smoothstep(L - 60, L - gR - 4, sc)
        left = lerp(left, Math.min(left, gR * 0.7), neck)
        right = lerp(right, Math.min(right, gR * 0.7), neck)
        corr[i] = lerp(9, Math.max(left, right), smoothstep(5, 70, sc))

        let cap = 0
        if (s >= fairwayStart && s <= fairwayEnd) {
            cap = 1
            if (s < fairwayStart + CAP) {
                const u = 1 - (s - fairwayStart) / CAP
                cap = Math.sqrt(1 - u * u)
            }
        }
        fwL[i] = left * cap
        fwR[i] = right * cap

        const nearGreen = (gR + 26) * smoothstep(L - 80, L - 30, sc)
        const base = (par === 3 ? lerp(18, 14, difficulty) : wide) + roughWidth
        obL[i] = Math.max(base + 4 * noiseP(sc / 70, 20.7), nearGreen, 30)
        obR[i] = Math.max(base + 4 * noiseP(sc / 70, 31.9), nearGreen, 30)
        treeL[i] = obL[i] - treeBand + 3 * noiseP(sc / 25, 44.4)
        treeR[i] = obR[i] - treeBand + 3 * noiseP(sc / 25, 57.2)
    }
    function prof(arr: Float32Array, s: number): number {
        const f = clamp(s + PAD, 0, pLen - 1.001)
        const i = Math.floor(f)
        return arr[i] + (arr[i + 1] - arr[i]) * (f - i)
    }
    let obMax = 0
    for (let i = PAD; i < pLen - PAD; i++) {
        obMax = Math.max(obMax, obL[i], obR[i])
    }
    const backOfGreen = gR + 26

    // ---- Bounds and the (station, offset) field --------------------------
    const margin = obMax + FOREST_DEPTH + 4
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const p of line) {
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minZ = Math.min(minZ, p.z)
        maxZ = Math.max(maxZ, p.z)
    }
    // Even numbers, so every grid lines up.
    minX = Math.floor((minX - margin) / 2) * 2
    maxX = Math.ceil((maxX + margin) / 2) * 2
    minZ = Math.floor((minZ - margin) / 2) * 2
    maxZ = Math.ceil((maxZ + margin) / 2) * 2
    const bounds = { minX, minZ, maxX, maxZ }

    const fCols = Math.round((maxX - minX) / FIELD_CELL) + 1
    const fRows = Math.round((maxZ - minZ) / FIELD_CELL) + 1
    const fieldS = new Float32Array(fCols * fRows)
    const fieldD = new Float32Array(fCols * fRows).fill(1e4)
    // The big loops live in their own functions: the engine optimises
    // small functions much better than one very long one.
    const stampField = (): void => {
        const best = new Float32Array(fCols * fRows).fill(Infinity)
        const reach = margin + 4
        // Chords over two line points are accurate enough here.
        const lastPoint = line.length - 1
        for (let k = 0; k < lastPoint; k += 2) {
            const k2 = Math.min(k + 2, lastPoint)
            const ax = line[k].x
            const az = line[k].z
            const bx = line[k2].x
            const bz = line[k2].z
            let ux = bx - ax
            let uz = bz - az
            const len = Math.sqrt(ux * ux + uz * uz)
            ux /= len
            uz /= len
            const c0 = Math.max(
                0,
                Math.floor((Math.min(ax, bx) - reach - minX) / FIELD_CELL)
            )
            const c1 = Math.min(
                fCols - 1,
                Math.ceil((Math.max(ax, bx) + reach - minX) / FIELD_CELL)
            )
            const r0 = Math.max(
                0,
                Math.floor((Math.min(az, bz) - reach - minZ) / FIELD_CELL)
            )
            const r1 = Math.min(
                fRows - 1,
                Math.ceil((Math.max(az, bz) + reach - minZ) / FIELD_CELL)
            )
            for (let r = r0; r <= r1; r++) {
                const pz = minZ + r * FIELD_CELL - az
                for (let c = c0; c <= c1; c++) {
                    const px = minX + c * FIELD_CELL - ax
                    const along = px * ux + pz * uz
                    let t = along
                    // The first and last segments continue as rays.
                    if (t < 0 && k > 0) {
                        t = 0
                    } else if (t > len && k2 < lastPoint) {
                        t = len
                    }
                    const qx = px - ux * t
                    const qz = pz - uz * t
                    const d2 = qx * qx + qz * qz
                    const i = r * fCols + c
                    if (d2 < best[i]) {
                        best[i] = d2
                        fieldS[i] = station[k] + t
                        const cross = ux * pz - uz * px
                        fieldD[i] = cross < 0 ? -Math.sqrt(d2) : Math.sqrt(d2)
                    }
                }
            }
        }
    }
    stampField()
    // Field lookup. The result is left in fOut: [station, offset].
    const fOut = new Float64Array(2)
    const fInv = 1 / FIELD_CELL
    function lookup(x: number, z: number): void {
        let fx = (x - minX) * fInv
        let fz = (z - minZ) * fInv
        fx = fx < 0 ? 0 : fx > fCols - 1.001 ? fCols - 1.001 : fx
        fz = fz < 0 ? 0 : fz > fRows - 1.001 ? fRows - 1.001 : fz
        const c = Math.floor(fx)
        const r = Math.floor(fz)
        const u = fx - c
        const v = fz - r
        const i = r * fCols + c
        const s0 = fieldS[i] + (fieldS[i + 1] - fieldS[i]) * u
        const s1 =
            fieldS[i + fCols] + (fieldS[i + fCols + 1] - fieldS[i + fCols]) * u
        const d0 = fieldD[i] + (fieldD[i + 1] - fieldD[i]) * u
        const d1 =
            fieldD[i + fCols] + (fieldD[i + fCols + 1] - fieldD[i + fCols]) * u
        fOut[0] = s0 + (s1 - s0) * v
        fOut[1] = d0 + (d1 - d0) * v
    }
    /** Distance from the play corridor axis, with rounded ends. */
    function corridorDistance(s: number, d: number): number {
        if (s < 0) {
            const k = prof(d > 0 ? obL : obR, 0) / BACK_OF_TEE
            return Math.sqrt(s * k * (s * k) + d * d)
        }
        if (s > L) {
            const k = prof(d > 0 ? obL : obR, L) / backOfGreen
            return Math.sqrt((s - L) * k * ((s - L) * k) + d * d)
        }
        return d < 0 ? -d : d
    }

    // ---- Tee box ---------------------------------------------------------
    const teeHalfLen = par === 3 ? 8 : 6.5
    const teeHalfWid = par === 3 ? 5.5 : 4.5
    const teeCentre = 4.5 - teeHalfLen
    const TEE_ROUND = 1.2
    function teeSd(s: number, d: number): number {
        const qx = Math.abs(s - teeCentre) - (teeHalfLen - TEE_ROUND)
        const qz = Math.abs(d) - (teeHalfWid - TEE_ROUND)
        const ox = qx > 0 ? qx : 0
        const oz = qz > 0 ? qz : 0
        const inner = qx > qz ? qx : qz
        return (
            Math.sqrt(ox * ox + oz * oz) + (inner < 0 ? inner : 0) - TEE_ROUND
        )
    }

    // ---- Terrain noise ---------------------------------------------------
    const tRng = stream('terrain')
    const noiseA = createNoise2D(tRng)
    const noiseB = createNoise2D(tRng)
    const hillAmp = tRng.range(1.2, 2.6)
    const hillAmp2 = tRng.range(0.3, 0.7)
    const tiltX = tRng.range(-0.008, 0.008)
    const tiltZ = tRng.range(-0.012, 0.012)
    const moundAmp = tRng.range(0.35, 0.6)
    function macroRaw(x: number, z: number): number {
        return (
            hillAmp * noiseA(x / 210, z / 210) +
            hillAmp2 * noiseA(x / 85 + 40, z / 85 + 40) +
            tiltX * x +
            tiltZ * z
        )
    }
    const macroOffset = -macroRaw(0, 0)

    // ---- Water -----------------------------------------------------------
    const wRng = stream('water')
    const waters: WaterSpec[] = []
    const hwAt = (s: number, side: number): number =>
        par === 3 ? par3Half : prof(side > 0 ? fwL : fwR, s)
    if (wRng.chance(0.12 + 0.5 * difficulty)) {
        const roll = wRng.next()
        let shape: (Shape & { outline: Vec2[] }) | null = null
        const pond = (cx: number[], cz: number[], r: number[]): void => {
            const blob = makeBlob(cx, cz, r, 6)
            shape = {
                ...blob,
                outline: blobOutline(blob, blob.ox, blob.oz, blob.reach, 40),
            }
        }
        if (par === 3 && roll < 0.5) {
            // A pond in front of the green.
            const n = 3
            const cx: number[] = []
            const cz: number[] = []
            const r: number[] = []
            const shift = wRng.range(-8, 8)
            const frontEdge = greenRadius(-playX, -playZ)
            for (let i = 0; i < n; i++) {
                const ri = wRng.range(7.5, 12.5)
                const p = linePoint(
                    L - frontEdge - wRng.range(8.5, 14) - ri,
                    shift + (i - 1) * wRng.range(10, 13)
                )
                cx.push(p.x)
                cz.push(p.z)
                r.push(ri)
            }
            pond(cx, cz, r)
        } else if (par === 3 || roll < 0.65) {
            if (par === 3 || roll >= 0.4) {
                // A pond beside the green.
                const side = wRng.sign()
                const around = side * wRng.range(1.0, 1.9)
                const n = wRng.int(2, 3)
                const cx: number[] = []
                const cz: number[] = []
                const r: number[] = []
                for (let i = 0; i < n; i++) {
                    const a = around + (i - (n - 1) / 2) * 0.42 * side
                    // Angle measured from the direction back to the tee.
                    const ux = -playX * cos(a) + playZ * sin(a)
                    const uz = -playX * sin(a) - playZ * cos(a)
                    const ri = wRng.range(8, 12)
                    const dist = greenRadius(ux, uz) + ri + wRng.range(8.5, 12)
                    cx.push(gx + ux * dist)
                    cz.push(gz + uz * dist)
                    r.push(ri)
                }
                pond(cx, cz, r)
            } else {
                // A pond beside the landing zone.
                const side = wRng.sign()
                const s0 = landing[0] + wRng.range(-25, 40)
                const n = wRng.int(3, 4)
                const cx: number[] = []
                const cz: number[] = []
                const r: number[] = []
                let s = s0
                for (let i = 0; i < n; i++) {
                    const ri = wRng.range(8, 13)
                    const sc = clamp(s, 80, L - gR - 45)
                    const p = linePoint(
                        sc,
                        side * (hwAt(sc, side) + 5 + ri + wRng.range(0, 5))
                    )
                    cx.push(p.x)
                    cz.push(p.z)
                    r.push(ri)
                    s += ri * 0.95
                }
                pond(cx, cz, r)
            }
        } else {
            // A creek across the hole, away from the landing zones.
            const options: number[] = []
            for (let k = 0; k < 6; k++) {
                const s =
                    k % 2 === 0
                        ? wRng.range(L - gR - 65, L - gR - 30)
                        : wRng.range(105, 160)
                let ok = s > 95 && s < L - gR - 28
                for (const lz of landing) {
                    if (Math.abs(s - lz) < 42) {
                        ok = false
                    }
                }
                if (ok) {
                    options.push(s)
                }
            }
            if (options.length > 0) {
                const sc = options[0]
                const slant = wRng.range(-0.25, 0.25)
                const halfBase = wRng.range(2.2, 3.4)
                const px: number[] = []
                const pz: number[] = []
                const hw: number[] = []
                const span = obMax + FOREST_DEPTH + 6
                for (let d = -span; d <= span; d += 7) {
                    let s = sc + slant * d + 9 * noiseP(d / 45, 71.3)
                    s = Math.min(s, L - gR - 16)
                    const p = linePoint(s, d)
                    px.push(p.x)
                    pz.push(p.z)
                    hw.push(halfBase * (1 + 0.3 * noiseP(d / 20, 83.7)))
                }
                const n = px.length
                let bx0 = Infinity
                let bx1 = -Infinity
                let bz0 = Infinity
                let bz1 = -Infinity
                const leftBank: Vec2[] = []
                const rightBank: Vec2[] = []
                for (let i = 0; i < n; i++) {
                    bx0 = Math.min(bx0, px[i] - hw[i])
                    bx1 = Math.max(bx1, px[i] + hw[i])
                    bz0 = Math.min(bz0, pz[i] - hw[i])
                    bz1 = Math.max(bz1, pz[i] + hw[i])
                    const a = Math.max(0, i - 1)
                    const b = Math.min(n - 1, i + 1)
                    let tx = px[b] - px[a]
                    let tz = pz[b] - pz[a]
                    const tl = Math.sqrt(tx * tx + tz * tz)
                    tx /= tl
                    tz /= tl
                    leftBank.push({
                        x: px[i] - tz * hw[i],
                        z: pz[i] + tx * hw[i],
                    })
                    rightBank.push({
                        x: px[i] + tz * hw[i],
                        z: pz[i] - tx * hw[i],
                    })
                }
                shape = {
                    sd(x, z) {
                        let bestD = 1e9
                        for (let i = 0; i < n - 1; i++) {
                            const ex = px[i + 1] - px[i]
                            const ez = pz[i + 1] - pz[i]
                            const qx = x - px[i]
                            const qz = z - pz[i]
                            const t = clamp(
                                (qx * ex + qz * ez) / (ex * ex + ez * ez),
                                0,
                                1
                            )
                            const rx = qx - ex * t
                            const rz = qz - ez * t
                            const dd =
                                Math.sqrt(rx * rx + rz * rz) -
                                (hw[i] + (hw[i + 1] - hw[i]) * t)
                            if (dd < bestD) {
                                bestD = dd
                            }
                        }
                        return bestD
                    },
                    minX: bx0,
                    maxX: bx1,
                    minZ: bz0,
                    maxZ: bz1,
                    outline: leftBank.concat(rightBank.reverse()),
                }
            }
        }
        const made = shape as (Shape & { outline: Vec2[] }) | null
        if (made) {
            // Keep the water off the green, its collar and the tee.
            let ok = true
            for (let i = 0; i < 48 && ok; i++) {
                const a = (TAU * i) / 48
                const ux = cos(a)
                const uz = sin(a)
                const rr = greenRadius(ux, uz) + 5
                ok = made.sd(gx + ux * rr, gz + uz * rr) > 0
            }
            if (made.sd(0, 0) < 45) {
                ok = false
            }
            if (ok) {
                // The basin is the lowest ground near the water, so a pond
                // always sits in a hollow.
                const skirt = 26
                let basin = Infinity
                for (
                    let z = made.minZ - skirt;
                    z <= made.maxZ + skirt;
                    z += 5
                ) {
                    for (
                        let x = made.minX - skirt;
                        x <= made.maxX + skirt;
                        x += 5
                    ) {
                        if (made.sd(x, z) < skirt) {
                            basin = Math.min(
                                basin,
                                macroRaw(x, z) + macroOffset
                            )
                        }
                    }
                }
                // The exact distance is slow (a creek has many segments),
                // so it is sampled once on a 1 m grid and interpolated.
                const wx0 = Math.floor(made.minX - skirt - 2)
                const wz0 = Math.floor(made.minZ - skirt - 2)
                const wCols = Math.ceil(made.maxX + skirt + 2) - wx0 + 1
                const wRows = Math.ceil(made.maxZ + skirt + 2) - wz0 + 1
                const wGrid = new Float32Array(wCols * wRows)
                for (let r = 0; r < wRows; r++) {
                    for (let c = 0; c < wCols; c++) {
                        wGrid[r * wCols + c] = made.sd(wx0 + c, wz0 + r)
                    }
                }
                const sampled = (x: number, z: number): number => {
                    const fx = x - wx0
                    const fz = z - wz0
                    if (!(
                        fx >= 0 &&
                        fz >= 0 &&
                        fx < wCols - 1 &&
                        fz < wRows - 1
                    )) {
                        return 1e3
                    }
                    const c = Math.floor(fx)
                    const r = Math.floor(fz)
                    const u = fx - c
                    const i = r * wCols + c
                    const a = wGrid[i] + (wGrid[i + 1] - wGrid[i]) * u
                    const b =
                        wGrid[i + wCols] +
                        (wGrid[i + wCols + 1] - wGrid[i + wCols]) * u
                    return a + (b - a) * (fz - r)
                }
                waters.push({
                    ...made,
                    sd: sampled,
                    skirt,
                    basin,
                    level: basin - 0.4,
                    last: 1e3,
                })
            }
        }
    }
    function waterSd(x: number, z: number): number {
        let d = 1e3
        for (const w of waters) {
            if (
                x > w.minX - 12 &&
                x < w.maxX + 12 &&
                z > w.minZ - 12 &&
                z < w.maxZ + 12
            ) {
                d = Math.min(d, w.sd(x, z))
            }
        }
        return d
    }

    // ---- Bunkers ---------------------------------------------------------
    const bRng = stream('bunkers')
    const bunkers: BunkerSpec[] = []
    function addBunker(
        cx: number[],
        cz: number[],
        r: number[],
        greenside: boolean,
        ux: number,
        uz: number
    ): boolean {
        const blob = makeBlob(cx, cz, r, 2.5)
        for (let i = 0; i < cx.length; i++) {
            // Clear of water, other bunkers, the tee and the green.
            if (waterSd(cx[i], cz[i]) < r[i] + 6) {
                return false
            }
            for (const other of bunkers) {
                if (other.sd(cx[i], cz[i]) < r[i] + 3) {
                    return false
                }
            }
            if (Math.sqrt(cx[i] * cx[i] + cz[i] * cz[i]) < r[i] + 40) {
                return false
            }
            if (greenSd(cx[i], cz[i]) < r[i] + FIRST_CUT_WIDTH + 0.6) {
                return false
            }
        }
        for (let i = 0; i < 48; i++) {
            const a = (TAU * i) / 48
            const dx = cos(a)
            const dz = sin(a)
            const rr = greenRadius(dx, dz) + FIRST_CUT_WIDTH
            if (blob.sd(gx + dx * rr, gz + dz * rr) < 0.3) {
                return false
            }
        }
        const ul = Math.sqrt(ux * ux + uz * uz)
        bunkers.push({
            ...blob,
            cx: blob.ox,
            cz: blob.oz,
            depth: greenside
                ? bRng.range(0.4, 0.6) + 0.2 * difficulty
                : bRng.range(0.3, 0.55),
            lip: bRng.range(0.2, 0.42),
            ux: ux / ul,
            uz: uz / ul,
            greenside,
            outline: blobOutline(blob, blob.ox, blob.oz, blob.reach, 28),
        })
        return true
    }
    {
        // Greenside bunkers. Angles are measured from the approach side.
        const wanted = clamp(
            Math.round(
                lerp(1.0, 3.4, difficulty) +
                    bRng.range(-0.7, 0.7) +
                    (par === 3 ? 0.6 : 0)
            ),
            1,
            4
        )
        const slots = [-65, 65, -125, 125, 180, difficulty > 0.7 ? 15 : -90]
        for (let i = slots.length - 1; i > 0; i--) {
            const j = bRng.int(0, i)
            const t = slots[i]
            slots[i] = slots[j]
            slots[j] = t
        }
        let placed = 0
        for (const slot of slots) {
            if (placed >= wanted) {
                break
            }
            const centre = ((slot + bRng.range(-14, 14)) * PI) / 180
            const n = bRng.int(2, 3)
            const gap = bRng.range(0.5, 2.5)
            const cx: number[] = []
            const cz: number[] = []
            const r: number[] = []
            let a = centre - ((n - 1) / 2) * 0.24
            for (let i = 0; i < n; i++) {
                const ux = -playX * cos(a) + playZ * sin(a)
                const uz = -playX * sin(a) - playZ * cos(a)
                const ri = bRng.range(3.1, 4.9)
                const dist =
                    greenRadius(ux, uz) + FIRST_CUT_WIDTH + 0.8 + ri + gap
                cx.push(gx + ux * dist)
                cz.push(gz + uz * dist)
                r.push(ri)
                a += (ri * 0.95) / dist
            }
            const mid = n >> 1
            if (addBunker(cx, cz, r, true, gx - cx[mid], gz - cz[mid])) {
                placed++
            }
        }
        // Fairway bunkers beside the landing zones.
        if (par > 3) {
            for (const lz of landing) {
                const count = clamp(
                    Math.round(
                        lerp(0.2, 2.3, difficulty) + bRng.range(-0.6, 0.6)
                    ),
                    0,
                    3
                )
                let side = bRng.sign()
                for (let b = 0; b < count; b++) {
                    const sb = clamp(
                        lz + bRng.range(-35, 30),
                        fairwayStart + 20,
                        L - gR - 40
                    )
                    const n = bRng.int(2, 3)
                    const bite = lerp(1.0, 0.35, difficulty * bRng.next())
                    const cx: number[] = []
                    const cz: number[] = []
                    const r: number[] = []
                    let s = sb
                    for (let i = 0; i < n; i++) {
                        const ri = bRng.range(3.8, 6.2)
                        const p = linePoint(
                            s,
                            side *
                                (hwAt(s, side) +
                                    1.5 +
                                    ri * bite +
                                    bRng.range(-0.8, 0.8))
                        )
                        cx.push(p.x)
                        cz.push(p.z)
                        r.push(ri)
                        s += ri * 0.95
                    }
                    const t = lineTangent(sb)
                    addBunker(cx, cz, r, false, t.x, t.z)
                    side = -side as 1 | -1
                }
            }
        }
    }

    // ---- Height function -------------------------------------------------
    const noiseG = createNoise2D(gRng)
    const greenTilt =
        (lerp(1.0, 2.0, difficulty) + gRng.range(-0.15, 0.25)) / 100
    // Uphill is away from the tee, turned a little: greens face the player.
    const tiltTurn = gRng.range(-1.0, 1.0)
    const gSlopeX = greenTilt * (playX * cos(tiltTurn) - playZ * sin(tiltTurn))
    const gSlopeZ = greenTilt * (playX * sin(tiltTurn) + playZ * cos(tiltTurn))
    const rollAmp = lerp(0.015, 0.04, difficulty)
    // A gentle tier or ridge on harder greens.
    const featureRoll = gRng.next()
    const feature =
        difficulty > 0.45 && featureRoll < 0.3 + 0.4 * difficulty
            ? featureRoll < 0.2
                ? 'ridge'
                : 'tier'
            : 'none'
    const featTurn = gRng.range(-0.5, 0.5) + (feature === 'ridge' ? PI / 2 : 0)
    const featX = playX * cos(featTurn) - playZ * sin(featTurn)
    const featZ = playX * sin(featTurn) + playZ * cos(featTurn)
    const featOffset = gRng.range(-3, 3)
    const featHeight =
        feature === 'tier' ? gRng.range(0.1, 0.17) : gRng.range(0.06, 0.1)
    const greenRaise = gRng.range(0.25, 0.7)
    let greenBase = 0
    let greenOn = false
    function greenSurface(x: number, z: number): number {
        const dx = x - gx
        const dz = z - gz
        let h =
            greenBase +
            gSlopeX * dx +
            gSlopeZ * dz +
            rollAmp * noiseG(x / 11, z / 11)
        if (feature !== 'none') {
            const across = dx * featX + dz * featZ - featOffset
            h +=
                feature === 'tier'
                    ? featHeight * (smoothstep(-4, 4, across) - 0.5)
                    : featHeight * bump(across, 7)
        }
        return h
    }
    const TEE_RAISE = 0.4
    const greenReach2 = (gMaxR + 16) * (gMaxR + 16)

    function heightAt(x: number, z: number, carve: boolean): number {
        lookup(x, z)
        const S = fOut[0]
        const D = fOut[1]
        const aD = D < 0 ? -D : D
        let h = macroRaw(x, z) + macroOffset

        // Water basins: the ground settles toward the water.
        let damp = 1
        for (let k = 0; k < waters.length; k++) {
            const w = waters[k]
            w.last = 1e3
            if (
                x > w.minX - w.skirt &&
                x < w.maxX + w.skirt &&
                z > w.minZ - w.skirt &&
                z < w.maxZ + w.skirt
            ) {
                const sd = w.sd(x, z)
                w.last = sd
                if (sd < w.skirt) {
                    h = w.basin + (h - w.basin) * smoothstep(0, w.skirt, sd)
                    damp = Math.min(damp, smoothstep(0, 12, sd))
                }
            }
        }

        // Mounds in the rough, none on the fairway.
        let rough = 1
        if (aD < 900) {
            const e =
                S < -8
                    ? Math.sqrt((S + 8) * (S + 8) + D * D)
                    : S > L
                      ? Math.sqrt((S - L) * (S - L) + D * D)
                      : aD
            const c = prof(corr, S)
            rough = smoothstep(c + 2, c + 18, e)
        }
        rough *= damp
        if (rough > 0) {
            h +=
                moundAmp *
                rough *
                (noiseB(x / 32, z / 32) + 0.4 * noiseB(x / 14 + 9, z / 14 + 9))
        }

        // Green pad.
        let gd = 1e3
        if (greenOn) {
            const dx = x - gx
            const dz = z - gz
            if (dx * dx + dz * dz < greenReach2) {
                gd = greenSd(x, z)
                const w = 1 - smoothstep(1.5, 13, gd)
                if (w > 0) {
                    h += (greenSurface(x, z) - h) * w
                }
            }
        }

        // Tee pad: flat and slightly raised.
        if (S < 30 && aD < 30) {
            const w = 1 - smoothstep(0.2, 4.5, teeSd(S, D))
            if (w > 0) {
                h += (TEE_RAISE - h) * w
            }
        }
        if (!carve) {
            return h
        }

        // Bunkers: a bowl of sand with a raised lip toward the play.
        for (let k = 0; k < bunkers.length; k++) {
            const b = bunkers[k]
            if (
                x < b.minX - 4 ||
                x > b.maxX + 4 ||
                z < b.minZ - 4 ||
                z > b.maxZ + 4
            ) {
                continue
            }
            const sd = b.sd(x, z)
            if (sd >= 3.5) {
                continue
            }
            if (sd < 0) {
                h -= b.depth * smoothstep(0, 2.2, -sd)
            }
            const vx = x - b.cx
            const vz = z - b.cz
            const vl = Math.sqrt(vx * vx + vz * vz)
            const facing = vl > 1e-6 ? (vx * b.ux + vz * b.uz) / vl : 0
            if (facing > 0) {
                // The lip fades out before it reaches the putting surface.
                const fade = b.greenside ? smoothstep(0.3, 2.5, gd) : 1
                h += b.lip * facing * bump(sd - 0.2, 2.6) * fade
            }
        }

        // Water: banks fall to the water line, the bed lies below it.
        for (let k = 0; k < waters.length; k++) {
            const w = waters[k]
            const sd = w.last
            if (sd < 4) {
                const cut =
                    sd > 0
                        ? w.level - 0.15 + 0.35 * sd
                        : w.level - 0.15 - 0.9 * smoothstep(0, 4, -sd)
                if (cut < h) {
                    h = cut
                }
            }
        }
        return h
    }

    greenBase = heightAt(gx, gz, false) + greenRaise
    greenOn = true

    // Water level: just below the lowest ground on the shore.
    for (const w of waters) {
        let low = Infinity
        for (let z = w.minZ - 3; z <= w.maxZ + 3; z += 1.5) {
            if (z < minZ || z > maxZ) {
                continue
            }
            for (let x = w.minX - 3; x <= w.maxX + 3; x += 1.5) {
                if (x < minX || x > maxX) {
                    continue
                }
                const sd = w.sd(x, z)
                if (sd >= 0 && sd <= 3) {
                    low = Math.min(low, heightAt(x, z, false))
                }
            }
        }
        if (low < Infinity) {
            w.level = low - 0.3
        }
    }

    // ---- Heightfields ----------------------------------------------------
    const tCols = Math.round((maxX - minX) / TERRAIN_CELL) + 1
    const tRows = Math.round((maxZ - minZ) / TERRAIN_CELL) + 1
    const heights = new Float32Array(tCols * tRows)
    const sampleHeights = (
        out: Float32Array,
        cols: number,
        rows: number,
        x0: number,
        z0: number,
        cell: number
    ): void => {
        for (let r = 0; r < rows; r++) {
            const z = z0 + r * cell
            for (let c = 0; c < cols; c++) {
                out[r * cols + c] = heightAt(x0 + c * cell, z, true)
            }
        }
    }
    // Visit every kind of ground once before the big loops. It changes no
    // result: it lets the engine see all code paths early, so it does not
    // have to throw away optimised code half way through the grid.
    for (let s = -30; s < L + 45; s += 3) {
        for (const d of [0.5, 7.3, -14.1, 26.7, -47.9, 71.3, -120.1]) {
            const p = linePoint(s, d)
            heightAt(p.x, p.z, true)
        }
    }
    sampleHeights(heights, tCols, tRows, minX, minZ, TERRAIN_CELL)
    const gPad = gMaxR + FIRST_CUT_WIDTH + 4
    const gOriginX = Math.floor(gx - gPad)
    const gOriginZ = Math.floor(gz - gPad)
    const gCols = Math.round((Math.ceil(gx + gPad) - gOriginX) / GREEN_CELL) + 1
    const gRows = Math.round((Math.ceil(gz + gPad) - gOriginZ) / GREEN_CELL) + 1
    const greenHeights = new Float32Array(gCols * gRows)
    sampleHeights(greenHeights, gCols, gRows, gOriginX, gOriginZ, GREEN_CELL)

    // ---- Surfaces --------------------------------------------------------
    // The grid is filled one field cell (a block of surface cells) at a
    // time, so blocks deep in the trees can be skipped.
    const BLOCK = Math.round(FIELD_CELL / SURFACE_CELL)
    const sCols = (fCols - 1) * BLOCK
    const sRows = (fRows - 1) * BLOCK
    const data = new Uint8Array(sCols * sRows).fill(OB)
    const gReach2 = (gMaxR + 5) * (gMaxR + 5)
    const classify = (rowFrom: number, rowTo: number): void => {
        const skipBeyond = obMax + 1
        const nWater = waters.length
        const nBunker = bunkers.length
        for (let fr = rowFrom; fr < rowTo; fr++) {
            for (let fc = 0; fc < fCols - 1; fc++) {
                const fi = fr * fCols + fc
                const d00 = fieldD[fi]
                const d10 = fieldD[fi + 1]
                const d01 = fieldD[fi + fCols]
                const d11 = fieldD[fi + fCols + 1]
                const bx = minX + fc * FIELD_CELL
                const bz = minZ + fr * FIELD_CELL
                let near =
                    Math.abs(d00) < skipBeyond ||
                    Math.abs(d10) < skipBeyond ||
                    Math.abs(d01) < skipBeyond ||
                    Math.abs(d11) < skipBeyond
                for (let k = 0; k < nWater && !near; k++) {
                    const w = waters[k]
                    near =
                        bx + FIELD_CELL > w.minX &&
                        bx < w.maxX &&
                        bz + FIELD_CELL > w.minZ &&
                        bz < w.maxZ
                }
                if (!near) {
                    continue
                }
                const s00 = fieldS[fi]
                const s10 = fieldS[fi + 1]
                const s01 = fieldS[fi + fCols]
                const s11 = fieldS[fi + fCols + 1]
                for (let br = 0; br < BLOCK; br++) {
                    const v = (br + 0.5) / BLOCK
                    const z = bz + v * FIELD_CELL
                    const sa = s00 + (s01 - s00) * v
                    const sb = s10 + (s11 - s10) * v
                    const da = d00 + (d01 - d00) * v
                    const db = d10 + (d11 - d10) * v
                    const row = (fr * BLOCK + br) * sCols + fc * BLOCK
                    for (let bc = 0; bc < BLOCK; bc++) {
                        const u = (bc + 0.5) / BLOCK
                        const x = bx + u * FIELD_CELL
                        const S = sa + (sb - sa) * u
                        const D = da + (db - da) * u
                        const aD = D < 0 ? -D : D
                        const i = row + bc

                        let wsd = 1e3
                        for (let k = 0; k < nWater; k++) {
                            const w = waters[k]
                            if (
                                x > w.minX - 4 &&
                                x < w.maxX + 4 &&
                                z > w.minZ - 4 &&
                                z < w.maxZ + 4
                            ) {
                                const sd = w.sd(x, z)
                                if (sd < wsd) {
                                    wsd = sd
                                }
                            }
                        }
                        if (wsd < 0) {
                            data[i] = WATER
                            continue
                        }
                        if (aD > 900) {
                            continue
                        }
                        const out =
                            corridorDistance(S, D) > prof(D > 0 ? obL : obR, S)
                        let bsd = 1e3
                        for (let k = 0; k < nBunker; k++) {
                            const b = bunkers[k]
                            if (
                                x > b.minX - 2 &&
                                x < b.maxX + 2 &&
                                z > b.minZ - 2 &&
                                z < b.maxZ + 2
                            ) {
                                const sd = b.sd(x, z)
                                if (sd < bsd) {
                                    bsd = sd
                                }
                            }
                        }
                        if (bsd < 0) {
                            data[i] = BUNKER
                            continue
                        }
                        const dx = x - gx
                        const dz = z - gz
                        if (dx * dx + dz * dz < gReach2) {
                            const gd = greenSd(x, z)
                            if (gd < 0) {
                                data[i] = GREEN
                                continue
                            }
                            if (gd < FIRST_CUT_WIDTH) {
                                data[i] = FIRST_CUT
                                continue
                            }
                        }
                        if (S < 12 && aD < 12 && teeSd(S, D) < 0) {
                            data[i] = TEE
                            continue
                        }
                        if (out) {
                            continue
                        }
                        data[i] =
                            aD < prof(D > 0 ? fwL : fwR, S) &&
                            wsd > 3 &&
                            bsd > 1.2
                                ? FAIRWAY
                                : ROUGH
                    }
                }
            }
        }
    }
    // A few rows through the tee, the middle and the green first (see the
    // note at the heightfields), then everything.
    for (const z of [0, L * 0.35, L * 0.6, gz - 6, gz + 6]) {
        const row = clamp(Math.floor((z - minZ) / FIELD_CELL), 0, fRows - 2)
        classify(row, row + 1)
    }
    classify(0, fRows - 1)

    // First cut: a band of rough around the fairway. Each cell on the
    // fairway edge stamps a disc.
    const firstCut = (): void => {
        const reach = FIRST_CUT_WIDTH / SURFACE_CELL
        const span = Math.ceil(reach)
        const reach2 = reach * reach
        for (let r = 1; r < sRows - 1; r++) {
            for (let c = 1; c < sCols - 1; c++) {
                const i = r * sCols + c
                if (
                    data[i] !== FAIRWAY ||
                    (data[i - 1] === FAIRWAY &&
                        data[i + 1] === FAIRWAY &&
                        data[i - sCols] === FAIRWAY &&
                        data[i + sCols] === FAIRWAY)
                ) {
                    continue
                }
                const r0 = Math.max(0, r - span)
                const r1 = Math.min(sRows - 1, r + span)
                const c0 = Math.max(0, c - span)
                const c1 = Math.min(sCols - 1, c + span)
                for (let rr = r0; rr <= r1; rr++) {
                    for (let cc = c0; cc <= c1; cc++) {
                        const j = rr * sCols + cc
                        if (
                            data[j] === ROUGH &&
                            (rr - r) * (rr - r) + (cc - c) * (cc - c) <= reach2
                        ) {
                            data[j] = FIRST_CUT
                        }
                    }
                }
            }
        }
    }
    firstCut()

    // ---- Trees -----------------------------------------------------------
    const trRng = stream('trees')
    // Distance to the nearest short grass or hazard, on a 1 m grid.
    const CLEAR_CELL = 1
    const cStep = Math.round(CLEAR_CELL / SURFACE_CELL)
    const cCols = Math.round(sCols / cStep)
    const cRows = Math.round(sRows / cStep)
    const clearMask = new Uint8Array(cCols * cRows)
    const markClear = (): void => {
        for (let r = 0; r < sRows; r++) {
            const cr = Math.floor(r / cStep) * cCols
            for (let c = 0; c < sCols; c++) {
                const id = data[r * sCols + c]
                if (id !== ROUGH && id !== OB) {
                    clearMask[cr + Math.floor(c / cStep)] = 1
                }
            }
        }
    }
    markClear()
    const clearDist = chamfer(clearMask, cCols, cRows)
    const noiseT = createNoise2D(trRng)
    const speciesBias = trRng.range(-0.45, 0.45)
    const lonely = lerp(0.008, 0.03, difficulty)
    const TREE_GRID = 5.5
    const treeSpots: Omit<Tree, 'y'>[] = []
    const plantTrees = (): void => {
        for (let z = minZ + 3; z < maxZ - 3; z += TREE_GRID) {
            for (let x = minX + 3; x < maxX - 3; x += TREE_GRID) {
                // Always draw the same count, so that one tree does not
                // shift the others.
                const jx = trRng.next()
                const jz = trRng.next()
                const accept = trRng.next()
                const size = trRng.next()
                const flip = trRng.next()
                const tx = x + jx * TREE_GRID * 0.8
                const tz = z + jz * TREE_GRID * 0.8
                if (tx > maxX - 3 || tz > maxZ - 3) {
                    continue
                }
                lookup(tx, tz)
                const S = fOut[0]
                const D = fOut[1]
                if (D > 900 || D < -900) {
                    continue
                }
                const cd = corridorDistance(S, D)
                const ob = prof(D > 0 ? obL : obR, S)
                if (cd > ob + FOREST_DEPTH) {
                    continue
                }
                const cluster = noiseT(tx / 55, tz / 55)
                let chance: number
                if (cd > ob) {
                    chance = 0.62 + 0.25 * cluster
                } else if (cd > prof(D > 0 ? treeL : treeR, S)) {
                    // The tree line: clusters with gaps.
                    chance = 0.8 * smoothstep(-0.35, 0.15, cluster)
                } else if (cd > prof(corr, S) + 10) {
                    chance = cluster > 0.15 ? lonely * 3 : lonely * 0.5
                } else {
                    continue
                }
                if (accept >= chance) {
                    continue
                }
                const species = noiseT(tx / 95 + 50, tz / 95 + 50) + speciesBias
                let kind: TreeKind =
                    species > 0.25
                        ? 'pine'
                        : species < -0.4
                          ? 'birch'
                          : 'broadleaf'
                if (flip < 0.12) {
                    kind =
                        flip < 0.05
                            ? 'pine'
                            : flip < 0.08
                              ? 'birch'
                              : 'broadleaf'
                }
                let height: number
                let radius: number
                if (kind === 'pine') {
                    height = lerp(12, 20, size)
                    radius = lerp(2.0, 3.2, size)
                } else if (kind === 'birch') {
                    height = lerp(8, 13, size)
                    radius = lerp(1.8, 2.8, size)
                } else {
                    height = lerp(9, 16, size)
                    radius = lerp(3.0, 5.2, size)
                }
                const cc = Math.floor((tx - minX) / CLEAR_CELL)
                const cr = Math.floor((tz - minZ) / CLEAR_CELL)
                if (clearDist[cr * cCols + cc] * CLEAR_CELL < radius + 5.5) {
                    continue
                }
                treeSpots.push({ x: tx, z: tz, height, radius, kind })
            }
        }
    }
    plantTrees()

    // ---- Conditions ------------------------------------------------------
    const cRng = stream('conditions')
    const windMax = lerp(9, 25, difficulty) / 3.6
    const windMin = lerp(0, 6, difficulty) / 3.6
    const windSpeed = lerp(windMin, windMax, cRng.next())
    const windDirection = cRng.range(0, TAU)
    const altitude = cRng.next() * cRng.next()
    const airDensity = lerp(1.225, 1.1, altitude)
    const stimp =
        Math.round(lerp(9, 12, 0.6 * difficulty + 0.4 * cRng.next()) * 2) / 2

    // ---- Assemble --------------------------------------------------------
    const centerline: Vec2[] = []
    for (let i = 0; i < line.length - 1; i += 5) {
        centerline.push({ x: line[i].x, z: line[i].z })
    }
    centerline.push({ x: gx, z: gz })

    const hole: HoleData = {
        version: VERSION,
        seed,
        number,
        par,
        difficulty,
        bounds,
        tee: { x: 0, y: 0, z: 0 },
        pin: { x: gx, y: 0, z: gz },
        centerline,
        terrain: {
            originX: minX,
            originZ: minZ,
            cellSize: TERRAIN_CELL,
            cols: tCols,
            rows: tRows,
            heights,
        },
        greenField: {
            originX: gOriginX,
            originZ: gOriginZ,
            cellSize: GREEN_CELL,
            cols: gCols,
            rows: gRows,
            heights: greenHeights,
        },
        surfaces: {
            originX: minX,
            originZ: minZ,
            cellSize: SURFACE_CELL,
            cols: sCols,
            rows: sRows,
            data,
        },
        bunkers: bunkers.map((b): Bunker => ({
            outline: b.outline,
            greenside: b.greenside,
        })),
        water: waters.map((w): WaterBody => ({
            outline: w.outline,
            level: w.level,
        })),
        trees: [],
        conditions: { windSpeed, windDirection, airDensity, stimp },
    }
    const ground = createGround(hole)
    hole.tee.y = ground.height(0, 0)
    hole.trees = treeSpots.map((t) => ({ ...t, y: ground.height(t.x, t.z) }))

    // ---- Pin -------------------------------------------------------------
    // A flat spot, not too close to the edge. Harder holes may tuck it.
    const pinRng = stream('pin')
    const edge = lerp(4.6, 3.8, difficulty)
    let found = false
    for (let k = 0; k < 120 && !found; k++) {
        const a = pinRng.range(0, TAU)
        const ux = cos(a)
        const uz = sin(a)
        const rr = Math.max(
            0,
            (greenRadius(ux, uz) - edge) * Math.sqrt(pinRng.next())
        )
        const x = gx + ux * rr
        const z = gz + uz * rr
        if (greenSd(x, z) > -edge) {
            continue
        }
        if (pinSlope(ground, x, z) <= MAX_PIN_SLOPE - 0.001) {
            hole.pin = { x, y: ground.height(x, z), z }
            found = true
        }
    }
    return found ? hole : null
}

/**
 * Generator version 1. Tries sub-seeds in order until a hole passes the
 * playability checks.
 */
export function generateHoleV1(seed: string, number: number): HoleData {
    let best: HoleData | null = null
    let bestIssues = Infinity
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const hole = buildHoleV1(seed, number, attempt)
        if (!hole) {
            continue
        }
        const result = validateHole(hole)
        if (result.ok) {
            return hole
        }
        if (result.issues.length < bestIssues) {
            best = hole
            bestIssues = result.issues.length
        }
    }
    if (!best) {
        throw new Error(`Fairway: no hole for seed "${seed}"`)
    }
    return best
}
