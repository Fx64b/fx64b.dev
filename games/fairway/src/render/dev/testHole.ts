/*
 * A hand-built test hole for renderer work, used until the seeded generator
 * (src/course) is ready. A par 4 of about 380 m with a gentle dogleg. Every
 * field of the HoleData contract is filled the way the real generator
 * should fill it. It is deterministic.
 */
import {
    type Bunker,
    type Heightfield,
    type HoleData,
    SURFACE_IDS,
    type SurfaceGrid,
    type SurfaceId,
    type Tree,
    type TreeKind,
    type Vec2,
    type WaterBody,
} from '../../shared/hole'
import { sampleField } from '../height'
import { clamp, fbm, hash2, lerp, smoothstep, valueNoise } from '../noise'

const BOUNDS = { minX: -85, minZ: -40, maxX: 95, maxZ: 430 }

// Tee to green. With y up and the hole toward +z, +x is on the player's left.
const CONTROL: Vec2[] = [
    { x: 0, z: 0 },
    { x: 1, z: 70 },
    { x: 5, z: 140 },
    { x: 17, z: 215 },
    { x: 31, z: 285 },
    { x: 38, z: 335 },
    { x: 40, z: 372 },
]

const TEE = { x: 0, z: 0 }
const PIN = { x: 40, z: 372 }
const GREEN = { x: 38.5, z: 370 }
const FAIRWAY_START = 72
const FAIRWAY_END = 350

/** A soft closed shape: an ellipse with a little angular wobble. */
interface Blob {
    cx: number
    cz: number
    ru: number
    rv: number
    rot: number
    a2: number
    p2: number
    a3: number
    p3: number
}

/** Normalised radius: below 1 is inside the blob. */
function blobRho(b: Blob, x: number, z: number): number {
    const dx = x - b.cx
    const dz = z - b.cz
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    const u = (dx * c + dz * s) / b.ru
    const v = (-dx * s + dz * c) / b.rv
    const th = Math.atan2(v, u)
    const k =
        1 + b.a2 * Math.sin(2 * th + b.p2) + b.a3 * Math.sin(3 * th + b.p3)
    return Math.hypot(u, v) / k
}

function blobOutline(b: Blob, n: number, scale = 1): Vec2[] {
    const out: Vec2[] = []
    const c = Math.cos(b.rot)
    const s = Math.sin(b.rot)
    for (let i = 0; i < n; i++) {
        const th = (i / n) * Math.PI * 2
        const k =
            (1 +
                b.a2 * Math.sin(2 * th + b.p2) +
                b.a3 * Math.sin(3 * th + b.p3)) *
            scale
        const u = Math.cos(th) * k * b.ru
        const v = Math.sin(th) * k * b.rv
        out.push({ x: b.cx + u * c - v * s, z: b.cz + u * s + v * c })
    }
    return out
}

const GREEN_BLOB: Blob = {
    cx: GREEN.x,
    cz: GREEN.z,
    ru: 14.5,
    rv: 14.5,
    rot: 0,
    a2: 0.15,
    p2: 0.6,
    a3: 0.09,
    p3: 2.0,
}

interface BunkerDef {
    blob: Blob
    depth: number
    greenside: boolean
}

const BUNKERS: BunkerDef[] = [
    // Two fairway bunkers at the landing zone, one on each side.
    {
        blob: {
            cx: 36.5,
            cz: 219,
            ru: 5.5,
            rv: 9,
            rot: 0.2,
            a2: 0.1,
            p2: 1,
            a3: 0.12,
            p3: 0.4,
        },
        depth: 0.9,
        greenside: false,
    },
    {
        blob: {
            cx: 7.5,
            cz: 256,
            ru: 5,
            rv: 7.5,
            rot: 0.15,
            a2: 0.12,
            p2: 2.2,
            a3: 0.1,
            p3: 1.3,
        },
        depth: 0.8,
        greenside: false,
    },
    // Two greenside bunkers.
    {
        blob: {
            cx: 22.5,
            cz: 355.5,
            ru: 5,
            rv: 7,
            rot: -0.75,
            a2: 0.12,
            p2: 0.3,
            a3: 0.1,
            p3: 2.6,
        },
        depth: 1.0,
        greenside: true,
    },
    {
        blob: {
            cx: 59.5,
            cz: 376,
            ru: 4.5,
            rv: 7.5,
            rot: 0.3,
            a2: 0.1,
            p2: 1.7,
            a3: 0.12,
            p3: 0.9,
        },
        depth: 1.0,
        greenside: true,
    },
]

const POND: Blob = {
    cx: 2,
    cz: 316,
    ru: 14,
    rv: 20,
    rot: 0.12,
    a2: 0.1,
    p2: 0.8,
    a3: 0.08,
    p3: 2.4,
}

// ---------------------------------------------------------------------
// Centre line

interface Line {
    pts: Vec2[]
    s: number[]
    length: number
}

function catmull(a: number, b: number, c: number, d: number, t: number) {
    const t2 = t * t
    const t3 = t2 * t
    return (
        0.5 *
        (2 * b +
            (-a + c) * t +
            (2 * a - 5 * b + 4 * c - d) * t2 +
            (-a + 3 * b - 3 * c + d) * t3)
    )
}

function buildLine(ctrl: Vec2[], perSegment: number): Line {
    const pts: Vec2[] = []
    for (let i = 0; i < ctrl.length - 1; i++) {
        const p0 = ctrl[Math.max(i - 1, 0)]
        const p1 = ctrl[i]
        const p2 = ctrl[i + 1]
        const p3 = ctrl[Math.min(i + 2, ctrl.length - 1)]
        for (let j = 0; j < perSegment; j++) {
            const t = j / perSegment
            pts.push({
                x: catmull(p0.x, p1.x, p2.x, p3.x, t),
                z: catmull(p0.z, p1.z, p2.z, p3.z, t),
            })
        }
    }
    pts.push(ctrl[ctrl.length - 1])
    const s = [0]
    for (let i = 1; i < pts.length; i++) {
        s.push(
            s[i - 1] +
                Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)
        )
    }
    return { pts, s, length: s[s.length - 1] }
}

/** Distance to the centre line and the arc length of the nearest point. */
function nearest(line: Line, x: number, z: number): { d: number; s: number } {
    let best = Infinity
    let bestS = 0
    const p = line.pts
    for (let i = 0; i < p.length - 1; i++) {
        const ax = p[i].x
        const az = p[i].z
        const bx = p[i + 1].x - ax
        const bz = p[i + 1].z - az
        const len2 = bx * bx + bz * bz
        const t = clamp(((x - ax) * bx + (z - az) * bz) / len2, 0, 1)
        const dx = x - (ax + bx * t)
        const dz = z - (az + bz * t)
        const d2 = dx * dx + dz * dz
        if (d2 < best) {
            best = d2
            bestS = line.s[i] + Math.sqrt(len2) * t
        }
    }
    return { d: Math.sqrt(best), s: bestS }
}

// ---------------------------------------------------------------------

/** Fairway half width at arc length s, with organic edges. */
function halfWidth(s: number, x: number, z: number, extra: number): number {
    const base =
        15 +
        3 * Math.sin(s / 36 + 1.1) +
        5 * (valueNoise(x / 22, z / 22, 5) - 0.5) +
        extra
    const a = clamp((s - (FAIRWAY_START - extra)) / 14, 0, 1)
    const b = clamp((FAIRWAY_END + extra - s) / 10, 0, 1)
    return base * Math.sqrt(a) * Math.sqrt(b)
}

function teeRectDistance(x: number, z: number): number {
    const dx = Math.abs(x - TEE.x) - 4
    const dz = Math.abs(z - (TEE.z - 1.5)) - 6.5
    return Math.max(dx, dz)
}

export function createTestHole(): HoleData {
    const line = buildLine(CONTROL, 28)

    // Smooth base land: big rolls, a rise toward the green, banks at the
    // sides. Detail is damped near the centre line.
    const base = (x: number, z: number, d: number): number => {
        const big = (fbm(x / 150 + 3.1, z / 150 + 1.7, 3, 11) - 0.5) * 7
        const med = (fbm(x / 42, z / 42, 3, 23) - 0.5) * 1.6
        const small = (fbm(x / 11, z / 11, 2, 37) - 0.5) * 0.35
        const open = smoothstep(8, 34, d)
        const bank = 0.018 * Math.pow(Math.max(0, d - 22), 1.3)
        return (
            big +
            med * (0.3 + 0.7 * open) +
            small * smoothstep(16, 30, d) +
            0.007 * z +
            bank
        )
    }

    const greenD = nearest(line, GREEN.x, GREEN.z).d
    const greenPad = base(GREEN.x, GREEN.z, greenD) + 0.8
    const teePad = base(TEE.x, TEE.z, 0) + 0.35
    const pondD = nearest(line, POND.cx, POND.cz).d
    const pondLevel = base(POND.cx, POND.cz, pondD) - 0.7
    const bunkerFloor = BUNKERS.map((b) => {
        const d = nearest(line, b.blob.cx, b.blob.cz).d
        return base(b.blob.cx, b.blob.cz, d)
    })

    const heightAt = (x: number, z: number): number => {
        const d = nearest(line, x, z).d
        let h = base(x, z, d)

        // Tee pad.
        const td = teeRectDistance(x, z)
        h = lerp(h, teePad, smoothstep(5, 0, td))

        // Green pad: a raised, almost flat platform.
        const gr = blobRho(GREEN_BLOB, x, z)
        const gm = smoothstep(2.1, 1.15, gr)
        h = lerp(h, greenPad, gm)

        // Bunkers: level the floor, carve the bowl, raise a small lip.
        for (let i = 0; i < BUNKERS.length; i++) {
            const b = BUNKERS[i]
            const r = blobRho(b.blob, x, z)
            if (r > 2) {
                continue
            }
            const keep = 1 - smoothstep(1.02, 0.95, gr) // never dent the green
            const floor = b.greenside ? greenPad - 0.25 : bunkerFloor[i]
            h = lerp(h, floor, smoothstep(1.5, 0.9, r) * keep * 0.8)
            h -= b.depth * smoothstep(1.02, 0.45, r) * keep
            h += 0.22 * Math.exp(-(((r - 1.14) / 0.13) ** 2)) * keep
        }

        // Pond: a bowl below the water level and a low bank around it.
        const pr = blobRho(POND, x, z)
        if (pr < 2) {
            const profile =
                pondLevel -
                1.7 * smoothstep(1.0, 0.25, pr) +
                0.35 * smoothstep(1.0, 1.45, pr)
            h = lerp(h, profile, smoothstep(1.95, 1.2, pr))
        }
        return h
    }

    // --- Coarse terrain, 1 m cells, samples on the bounds edges.
    const terrain: Heightfield = {
        originX: BOUNDS.minX,
        originZ: BOUNDS.minZ,
        cellSize: 1,
        cols: BOUNDS.maxX - BOUNDS.minX + 1,
        rows: BOUNDS.maxZ - BOUNDS.minZ + 1,
        heights: new Float32Array(0),
    }
    terrain.heights = new Float32Array(terrain.cols * terrain.rows)
    for (let r = 0; r < terrain.rows; r++) {
        for (let c = 0; c < terrain.cols; c++) {
            terrain.heights[r * terrain.cols + c] = heightAt(
                terrain.originX + c,
                terrain.originZ + r
            )
        }
    }

    // --- Fine green field, 0.25 m cells. Coarse terrain plus the putting
    // slopes. The detail fades out before the edge of the field, so the two
    // fields meet without a step.
    const half = 24
    const cell = 0.25
    const n = Math.round((half * 2) / cell) + 1
    const greenField: Heightfield = {
        originX: Math.round(GREEN.x) - half,
        originZ: Math.round(GREEN.z) - half,
        cellSize: cell,
        cols: n,
        rows: n,
        heights: new Float32Array(n * n),
    }
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const x = greenField.originX + c * cell
            const z = greenField.originZ + r * cell
            const rho = blobRho(GREEN_BLOB, x, z)
            const mask = smoothstep(1.22, 0.95, rho)
            const tilt = 0.02 * (z - GREEN.z) + 0.009 * (x - GREEN.x)
            const roll =
                0.1 * Math.sin(x / 5.5 + 1) * Math.cos(z / 6.5 + 0.4) +
                0.06 * (fbm(x / 7, z / 7, 2, 71) - 0.5)
            greenField.heights[r * n + c] =
                sampleField(terrain, x, z) + mask * (tilt + roll)
        }
    }

    // --- Surfaces, 1 m cells.
    const surfaces: SurfaceGrid = {
        originX: BOUNDS.minX,
        originZ: BOUNDS.minZ,
        cellSize: 1,
        cols: BOUNDS.maxX - BOUNDS.minX,
        rows: BOUNDS.maxZ - BOUNDS.minZ,
        data: new Uint8Array(0),
    }
    surfaces.data = new Uint8Array(surfaces.cols * surfaces.rows)
    const idx = (id: SurfaceId) => SURFACE_IDS.indexOf(id)
    const surfaceAt = (x: number, z: number): SurfaceId => {
        const gr = blobRho(GREEN_BLOB, x, z)
        const pr = blobRho(POND, x, z)
        if (pr < 1.08 && sampleField(terrain, x, z) < pondLevel) {
            return 'water'
        }
        if (gr < 1) {
            return 'green'
        }
        for (const b of BUNKERS) {
            if (blobRho(b.blob, x, z) < 1) {
                return 'bunker'
            }
        }
        const td = teeRectDistance(x, z)
        if (td < 0) {
            return 'tee'
        }
        const { d, s } = nearest(line, x, z)
        if (d < halfWidth(s, x, z, 0)) {
            return 'fairway'
        }
        if (gr < 1 + 3 / GREEN_BLOB.ru) {
            return 'firstCut'
        }
        if (td < 2) {
            return 'firstCut'
        }
        if (d < halfWidth(s, x, z, 3.2)) {
            return 'firstCut'
        }
        return 'rough'
    }
    for (let r = 0; r < surfaces.rows; r++) {
        for (let c = 0; c < surfaces.cols; c++) {
            surfaces.data[r * surfaces.cols + c] = idx(
                surfaceAt(
                    surfaces.originX + c + 0.5,
                    surfaces.originZ + r + 0.5
                )
            )
        }
    }

    // --- Trees: lines along both sides and behind the tee and the green,
    // in groups of one kind, with a few clearings.
    const trees: Tree[] = []
    const addTree = (x: number, z: number, kind: TreeKind, size: number) => {
        const u = hash2(Math.round(x * 7), Math.round(z * 7), 91)
        const v = hash2(Math.round(x * 7), Math.round(z * 7), 92)
        let height: number
        let radius: number
        if (kind === 'pine') {
            height = lerp(13, 21, u) * size
            radius = height * lerp(0.17, 0.21, v)
        } else if (kind === 'birch') {
            height = lerp(9, 14, u) * size
            radius = height * lerp(0.2, 0.25, v)
        } else {
            height = lerp(10, 17, u) * size
            radius = height * lerp(0.3, 0.38, v)
        }
        trees.push({
            x,
            z,
            y: sampleField(terrain, x, z),
            height,
            radius,
            kind,
        })
    }
    // The tree line is uneven: its distance from the fairway, its density
    // and the tree sizes all vary, with gaps and a few young trees.
    const spacing = 6.5
    for (let gz = BOUNDS.minZ + 3; gz < BOUNDS.maxZ - 3; gz += spacing) {
        for (let gx = BOUNDS.minX + 3; gx < BOUNDS.maxX - 3; gx += spacing) {
            const ix = Math.round(gx * 3)
            const iz = Math.round(gz * 3)
            const x = gx + (hash2(ix, iz, 1) - 0.5) * spacing * 0.95
            const z = gz + (hash2(ix, iz, 2) - 0.5) * spacing * 0.95
            const { d, s } = nearest(line, x, z)
            const fw = Math.max(halfWidth(s, x, z, 0), 12)
            const edge =
                fw +
                9 +
                24 * valueNoise(x / 46, z / 46, 3) +
                7 * valueNoise(x / 13, z / 13, 6)
            if (d < edge) {
                continue
            }
            if (blobRho(GREEN_BLOB, x, z) < 2.3) {
                continue
            }
            if (Math.hypot(x - TEE.x, z - TEE.z) < 17) {
                continue
            }
            if (blobRho(POND, x, z) < 1.55) {
                continue
            }
            if (BUNKERS.some((b) => blobRho(b.blob, x, z) < 1.8)) {
                continue
            }
            const depth = d - edge
            const dense = fbm(x / 48, z / 48, 2, 7)
            const p =
                lerp(0.3, 0.85, smoothstep(0, 14, depth)) *
                smoothstep(0.3, 0.5, dense)
            if (hash2(ix, iz, 4) > p) {
                continue
            }
            const k = valueNoise(x / 60, z / 60, 9)
            const mix = hash2(ix, iz, 5)
            let kind: TreeKind = 'broadleaf'
            if (k < 0.36) {
                kind = mix < 0.85 ? 'pine' : 'broadleaf'
            } else if (k > 0.66) {
                kind = mix < 0.75 ? 'birch' : 'broadleaf'
            } else if (mix > 0.9) {
                kind = 'pine'
            }
            // Size: groups of big and small trees, and some young ones.
            const young = hash2(ix, iz, 6) < 0.16
            const size =
                (young ? 0.5 : 0.82) +
                0.42 * valueNoise(x / 30, z / 30, 12) +
                0.12 * (hash2(ix, iz, 8) - 0.5)
            addTree(x, z, kind, size)
        }
    }
    // Single trees and small groups in the rough near the line of play.
    addTree(-24, 118, 'broadleaf', 1.2)
    addTree(31, 158, 'broadleaf', 1.05)
    addTree(34.5, 163, 'broadleaf', 0.7)
    addTree(-27, 64, 'pine', 0.9)
    addTree(24, 48, 'birch', 1)
    addTree(27, 52, 'birch', 0.8)
    addTree(49, 262, 'birch', 1.1)
    addTree(52.5, 266, 'birch', 0.9)
    addTree(-16, 286, 'broadleaf', 1.15)
    addTree(-8, 205, 'pine', 1.05)
    addTree(-11, 211, 'pine', 0.7)
    addTree(66, 338, 'pine', 1)

    const bunkers: Bunker[] = BUNKERS.map((b) => ({
        outline: blobOutline(b.blob, 28),
        greenside: b.greenside,
    }))
    const water: WaterBody[] = [
        { outline: blobOutline(POND, 40), level: pondLevel },
    ]

    return {
        version: 0,
        seed: 'render-test',
        number: 0,
        par: 4,
        difficulty: 0.4,
        bounds: { ...BOUNDS },
        tee: { x: TEE.x, y: sampleField(terrain, TEE.x, TEE.z), z: TEE.z },
        pin: { x: PIN.x, y: sampleField(greenField, PIN.x, PIN.z), z: PIN.z },
        centerline: CONTROL.map((p) => ({ ...p })),
        terrain,
        greenField,
        surfaces,
        bunkers,
        water,
        trees,
        conditions: {
            windSpeed: 3.2,
            windDirection: 0.6,
            airDensity: 1.2,
            stimp: 10.5,
        },
    }
}
