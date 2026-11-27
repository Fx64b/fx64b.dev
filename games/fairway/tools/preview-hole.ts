// Top-down preview of a generated hole, as a PNG.
//
//     node games/fairway/tools/preview-hole.ts <seed> <out.png> [scale]
//
// Needs Node 22.18 or newer (it runs TypeScript directly). The tee is on
// the left and the hole plays to the right. `scale` is pixels per metre
// (default 2).
import { writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { crc32, deflateSync } from 'node:zlib'

import type { SurfaceId } from '../src/shared/hole.ts'

// The game sources import each other without file extensions (the bundler
// resolves them). Teach Node to try `.ts`.
registerHooks({
    resolve(specifier, context, nextResolve) {
        try {
            return nextResolve(specifier, context)
        } catch (error) {
            if (specifier.startsWith('.')) {
                return nextResolve(`${specifier}.ts`, context)
            }
            throw error
        }
    },
})

const course: typeof import('../src/course/index.ts') =
    await import('../src/course/index.ts')
const { createGround, generateHole, holeLength, validateHole } = course

const COLOURS: Record<SurfaceId, [number, number, number]> = {
    tee: [124, 190, 108],
    fairway: [112, 178, 92],
    firstCut: [92, 156, 80],
    rough: [70, 128, 66],
    bunker: [226, 210, 160],
    green: [150, 212, 124],
    water: [70, 130, 190],
    ob: [44, 84, 52],
}
const TREE_COLOURS = {
    broadleaf: [38, 98, 44],
    pine: [22, 70, 48],
    birch: [96, 140, 60],
} as const

function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
    const chunk = (type: string, body: Buffer): Buffer => {
        const head = Buffer.alloc(8)
        head.writeUInt32BE(body.length, 0)
        head.write(type, 4, 'latin1')
        const tail = Buffer.alloc(4)
        tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0)
        return Buffer.concat([head, body, tail])
    }
    const header = Buffer.alloc(13)
    header.writeUInt32BE(width, 0)
    header.writeUInt32BE(height, 4)
    header[8] = 8 // bit depth
    header[9] = 2 // RGB
    const raw = Buffer.alloc((width * 3 + 1) * height)
    for (let y = 0; y < height; y++) {
        raw[y * (width * 3 + 1)] = 0
        raw.set(
            rgb.subarray(y * width * 3, (y + 1) * width * 3),
            y * (width * 3 + 1) + 1
        )
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ])
}

const seed = process.argv[2]
const outPath = process.argv[3]
const scale = Number(process.argv[4] ?? 2)
if (!seed || !outPath) {
    process.stderr.write(
        'usage: node preview-hole.ts <seed> <out.png> [pixels per metre]\n'
    )
    process.exit(1)
}

const started = performance.now()
const hole = generateHole(seed)
const elapsed = performance.now() - started
const ground = createGround(hole)
const { bounds } = hole

// Image x runs along +z (tee left, green right), image y along +x.
const width = Math.round((bounds.maxZ - bounds.minZ) * scale)
const height = Math.round((bounds.maxX - bounds.minX) * scale)
const rgb = new Uint8Array(width * height * 3)
const toWorld = (px: number, py: number): [number, number] => [
    bounds.minX + (py + 0.5) / scale,
    bounds.minZ + (px + 0.5) / scale,
]
const put = (px: number, py: number, c: readonly number[], a = 1): void => {
    if (px < 0 || py < 0 || px >= width || py >= height) {
        return
    }
    const i = (py * width + px) * 3
    for (let k = 0; k < 3; k++) {
        rgb[i + k] = Math.round(rgb[i + k] * (1 - a) + c[k] * a)
    }
}
const disc = (
    x: number,
    z: number,
    radius: number,
    c: readonly number[],
    a = 1
): void => {
    const cx = (z - bounds.minZ) * scale
    const cy = (x - bounds.minX) * scale
    const r = radius * scale
    for (let py = Math.floor(cy - r); py <= cy + r; py++) {
        for (let px = Math.floor(cx - r); px <= cx + r; px++) {
            const dx = px + 0.5 - cx
            const dy = py + 0.5 - cy
            if (dx * dx + dy * dy <= r * r) {
                put(px, py, c, a)
            }
        }
    }
}

// Surfaces with hillshade (light from the top left) and height tint.
const light = [-0.5, 0.75, -0.45]
for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
        const [x, z] = toWorld(px, py)
        const surface = ground.surface(x, z)
        const n = ground.normal(x, z)
        const lit = n.x * light[0] + n.y * light[1] + n.z * light[2]
        const shade =
            surface === 'water'
                ? 1
                : Math.min(1.5, Math.max(0.45, 1 + (lit - light[1]) * 5))
        const c = COLOURS[surface]
        put(px, py, [
            Math.min(255, c[0] * shade),
            Math.min(255, c[1] * shade),
            Math.min(255, c[2] * shade),
        ])
    }
}

// Trees: a shadow, then the canopy.
for (const t of hole.trees) {
    disc(t.x + 1.2, t.z + 1.2, t.radius, [10, 30, 16], 0.35)
}
for (const t of hole.trees) {
    disc(t.x, t.z, t.radius, TREE_COLOURS[t.kind])
    disc(
        t.x - t.radius * 0.25,
        t.z - t.radius * 0.25,
        t.radius * 0.45,
        [255, 255, 255],
        0.08
    )
}

// Tee marker and pin.
disc(hole.tee.x, hole.tee.z, 1, [255, 255, 255])
disc(hole.tee.x, hole.tee.z, 0.5, [40, 40, 200])
disc(hole.pin.x, hole.pin.z, 1.2, [255, 255, 255])
disc(hole.pin.x, hole.pin.z, 0.7, [220, 30, 30])

writeFileSync(outPath, encodePng(width, height, rgb))

const check = validateHole(hole, ground)
const yards = holeLength(hole) / 0.9144
process.stdout.write(
    [
        `seed ${seed}  v${hole.version}  #${hole.number}`,
        `par ${hole.par}  ${yards.toFixed(0)} yd  difficulty ${hole.difficulty.toFixed(2)}`,
        `wind ${(hole.conditions.windSpeed * 3.6).toFixed(0)} km/h  stimp ${hole.conditions.stimp}  air ${hole.conditions.airDensity.toFixed(3)}`,
        `bunkers ${hole.bunkers.length}  water ${hole.water.length}  trees ${hole.trees.length}`,
        `size ${bounds.maxX - bounds.minX} x ${bounds.maxZ - bounds.minZ} m  generated in ${elapsed.toFixed(0)} ms`,
        `valid ${check.ok}${check.ok ? '' : `: ${check.issues.join('; ')}`}  (green in ${check.strokesToGreen})`,
        `wrote ${outPath} (${width} x ${height})`,
    ].join('\n') + '\n'
)
