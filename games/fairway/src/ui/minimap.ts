// A small top-down map of the hole: surfaces with a light hillshade, trees,
// the tee and the pin; on top the ball, a faint aim line and the nominal
// full-power landing point. The tee is at the bottom, the pin at the top.
//
// The static layer is rendered once per hole (and on resize) into an
// offscreen canvas by inverse-mapping every device pixel into the hole; the
// dynamic layer is redrawn only when its inputs change.
import type { HoleData, SurfaceId, Vec3 } from '../shared/hole'
import { SURFACE_IDS } from '../shared/hole'
import { h } from './dom'

export interface MinimapState {
    ball: Vec3
    /** Aim heading in radians, atan2(dz, dx), world coordinates. */
    aim: number
    /** Nominal full-power carry point on the aim line, or null. */
    landing: Vec3 | null
}

export interface Minimap {
    el: HTMLElement
    setHole(hole: HoleData): void
    update(state: MinimapState): void
    setVisible(v: boolean): void
    /** Time the last static layer took to build, in ms (for profiling). */
    lastBuildMs(): number
    dispose(): void
}

/** Maps world x/z to map pixels (CSS px) and back. */
export interface MapTransform {
    width: number
    height: number
    /** Pixels per metre. */
    scale: number
    toMap(x: number, z: number): { x: number; y: number }
    toWorld(px: number, py: number): { x: number; z: number }
    /** A world direction (heading) as a unit vector on the map. */
    dirToMap(heading: number): { x: number; y: number }
}

export interface MapMargins {
    /** Metres shown behind the tee. */
    back: number
    /** Metres shown beyond the pin. */
    front: number
    /** Metres shown left and right of the centre line. */
    side: number
}

export const DEFAULT_MAP_MARGINS: MapMargins = { back: 20, front: 30, side: 40 }

/** Map padding in CSS pixels (room for the flag at the top). */
export interface MapPadding {
    top: number
    bottom: number
    side: number
}

export const DEFAULT_MAP_PADDING: MapPadding = { top: 12, bottom: 6, side: 4 }

/**
 * Fit the hole into a width x height map with the tee at the bottom and the
 * pin at the top. The map's up axis is the tee-to-pin direction; its right
 * axis is the player's right when facing the pin.
 */
export function createMapTransform(
    hole: Pick<HoleData, 'tee' | 'pin' | 'centerline'>,
    width: number,
    height: number,
    margins: MapMargins = DEFAULT_MAP_MARGINS,
    padding: MapPadding = DEFAULT_MAP_PADDING
): MapTransform {
    const { tee, pin } = hole
    let fx = pin.x - tee.x
    let fz = pin.z - tee.z
    const len = Math.hypot(fx, fz)
    if (len < 1e-6) {
        fx = 0
        fz = 1
    } else {
        fx /= len
        fz /= len
    }
    // Right of the forward direction, with y up (as in Three.js).
    const rx = -fz
    const rz = fx

    const local = (x: number, z: number) => {
        const dx = x - tee.x
        const dz = z - tee.z
        return { u: dx * rx + dz * rz, v: dx * fx + dz * fz }
    }

    let minU = 0
    let maxU = 0
    let minV = 0
    let maxV = Math.max(len, 1)
    for (const p of [...hole.centerline, { x: pin.x, z: pin.z }]) {
        const l = local(p.x, p.z)
        minU = Math.min(minU, l.u)
        maxU = Math.max(maxU, l.u)
        minV = Math.min(minV, l.v)
        maxV = Math.max(maxV, l.v)
    }
    minU -= margins.side
    maxU += margins.side
    minV -= margins.back
    maxV += margins.front

    const innerW = Math.max(1, width - 2 * padding.side)
    const innerH = Math.max(1, height - padding.top - padding.bottom)
    const scale = Math.min(innerW / (maxU - minU), innerH / (maxV - minV))
    const midU = (minU + maxU) / 2
    const midV = (minV + maxV) / 2
    const cx = width / 2
    const cy = padding.top + innerH / 2

    return {
        width,
        height,
        scale,
        toMap(x, z) {
            const l = local(x, z)
            return {
                x: cx + (l.u - midU) * scale,
                y: cy - (l.v - midV) * scale,
            }
        },
        toWorld(px, py) {
            const u = (px - cx) / scale + midU
            const v = (cy - py) / scale + midV
            return { x: tee.x + u * rx + v * fx, z: tee.z + u * rz + v * fz }
        },
        dirToMap(heading) {
            const dx = Math.cos(heading)
            const dz = Math.sin(heading)
            return { x: dx * rx + dz * rz, y: -(dx * fx + dz * fz) }
        },
    }
}

// --- Colours ------------------------------------------------------------------

type Rgb = [number, number, number]

const SURFACE_TOKENS: Record<SurfaceId, [string, string]> = {
    tee: ['--fw-map-tee', '#acd07c'],
    fairway: ['--fw-map-fairway', '#a1c878'],
    firstCut: ['--fw-map-firstcut', '#8fb86a'],
    rough: ['--fw-map-rough', '#79a05a'],
    bunker: ['--fw-map-bunker', '#ecdfbf'],
    green: ['--fw-map-green', '#b5db88'],
    water: ['--fw-map-water', '#86b4cc'],
    ob: ['--fw-map-ob', '#6d8a58'],
}

function parseHex(s: string): Rgb | null {
    const m = /^#([0-9a-f]{6})/i.exec(s.trim())
    if (!m) {
        return null
    }
    const n = parseInt(m[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function readColor(
    style: CSSStyleDeclaration | null,
    token: string,
    fallback: string
): string {
    const v = style?.getPropertyValue(token).trim()
    return v || fallback
}

// --- Sampling -----------------------------------------------------------------

function heightAt(hf: HoleData['terrain'], x: number, z: number): number {
    const fx = Math.min(
        Math.max((x - hf.originX) / hf.cellSize, 0),
        hf.cols - 1.001
    )
    const fz = Math.min(
        Math.max((z - hf.originZ) / hf.cellSize, 0),
        hf.rows - 1.001
    )
    const c = Math.floor(fx)
    const r = Math.floor(fz)
    const tx = fx - c
    const tz = fz - r
    const i = r * hf.cols + c
    const hs = hf.heights
    const a = hs[i] + (hs[i + 1] - hs[i]) * tx
    const b = hs[i + hf.cols] + (hs[i + hf.cols + 1] - hs[i + hf.cols]) * tx
    return a + (b - a) * tz
}

function getContext(c: HTMLCanvasElement | OffscreenCanvas | null) {
    if (!c) {
        return null
    }
    try {
        return c.getContext('2d') as
            CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    } catch {
        return null
    }
}

const DEFAULT_SIZE = { width: 142, height: 212 }
// 2x is crisp at this size and keeps setHole fast on 3x phones.
const MAX_DPR = 2

// --- Minimap ------------------------------------------------------------------

export function createMinimap(root: HTMLElement): Minimap {
    const canvas = h('canvas', { class: 'fw-minimap-canvas' })
    const el = h(
        'div',
        {
            class: 'fw-panel fw-minimap',
            'aria-hidden': 'true',
            'data-empty': true,
        },
        canvas
    )
    root.append(el)

    let hole: HoleData | null = null
    let state: MinimapState | null = null
    let transform: MapTransform | null = null
    let staticLayer: HTMLCanvasElement | null = null
    let dpr = 1
    let buildMs = 0
    let lastKey = ''
    let disposed = false

    function size(): { width: number; height: number } {
        const w = canvas.clientWidth
        const ht = canvas.clientHeight
        return w > 0 && ht > 0 ? { width: w, height: ht } : DEFAULT_SIZE
    }

    function buildStatic(): void {
        if (!hole) {
            return
        }
        const t0 = performance.now()
        const { width, height } = size()
        dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_DPR)
        const W = Math.max(1, Math.round(width * dpr))
        const H = Math.max(1, Math.round(height * dpr))
        transform = createMapTransform(hole, width, height)
        canvas.width = W
        canvas.height = H
        lastKey = ''

        const layer = document.createElement('canvas')
        layer.width = W
        layer.height = H
        const ctx = getContext(layer)
        if (!ctx) {
            staticLayer = null
            buildMs = performance.now() - t0
            return
        }

        let style: CSSStyleDeclaration | null = null
        try {
            style = getComputedStyle(el)
        } catch {
            style = null
        }
        const palette: Rgb[] = SURFACE_IDS.map((id) => {
            const [token, fallback] = SURFACE_TOKENS[id]
            return parseHex(readColor(style, token, fallback)) ?? [120, 150, 90]
        })
        const outside = palette[SURFACE_IDS.indexOf('ob')]

        const img = ctx.createImageData(W, H)
        const px = img.data
        const sg = hole.surfaces
        const terrain = hole.terrain
        const tf = transform
        // Screen axes in world space (per device pixel).
        const o = tf.toWorld(0, 0)
        const ax = tf.toWorld(1 / dpr, 0)
        const ay = tf.toWorld(0, 1 / dpr)
        const dxu = ax.x - o.x
        const dzu = ax.z - o.z
        const dxv = ay.x - o.x
        const dzv = ay.z - o.z
        const waterIndex = SURFACE_IDS.indexOf('water')
        const inv = 1 / sg.cellSize
        const cols = sg.cols
        const rows = sg.rows
        const data = sg.data
        const heights = new Float32Array(W * H)
        const water = new Float32Array(W * H)

        // Pass 1: surface colour (bilinear blend of the four nearest cells)
        // and the terrain height under each device pixel.
        for (let j = 0; j < H; j++) {
            let wx = o.x + dxv * (j + 0.5) + dxu * 0.5
            let wz = o.z + dzv * (j + 0.5) + dzu * 0.5
            for (let i = 0; i < W; i++, wx += dxu, wz += dzu) {
                const gx = (wx - sg.originX) * inv - 0.5
                const gz = (wz - sg.originZ) * inv - 0.5
                const c0 = Math.floor(gx)
                const r0 = Math.floor(gz)
                const tx = gx - c0
                const tz = gz - r0
                let r = 0
                let g = 0
                let b = 0
                let wet = 0
                for (let k = 0; k < 4; k++) {
                    const c = c0 + (k & 1)
                    const rr = r0 + (k >> 1)
                    const w = (k & 1 ? tx : 1 - tx) * (k >> 1 ? tz : 1 - tz)
                    let col = outside
                    if (c >= 0 && rr >= 0 && c < cols && rr < rows) {
                        const s = data[rr * cols + c]
                        col = palette[s] ?? outside
                        if (s === waterIndex) {
                            wet += w
                        }
                    }
                    r += col[0] * w
                    g += col[1] * w
                    b += col[2] * w
                }
                const q = j * W + i
                const p = q * 4
                px[p] = r
                px[p + 1] = g
                px[p + 2] = b
                px[p + 3] = 255
                water[q] = wet
                heights[q] = heightAt(terrain, wx, wz)
            }
        }

        // Pass 2: a light hillshade from the height buffer, lit from the
        // upper left of the map. Gradients over about 2.5 m.
        const mPerPx = 1 / (tf.scale * dpr)
        const d = Math.max(1, Math.round(1.25 / mPerPx))
        const span = 2 * d * mPerPx
        const L = [-0.45, 0.75, 0.48]
        const Ln = Math.hypot(L[0], L[1], L[2])
        const lu = L[0] / Ln
        const ly = L[1] / Ln
        const lv = L[2] / Ln
        for (let j = 0; j < H; j++) {
            const jUp = Math.max(0, j - d) * W
            const jDown = Math.min(H - 1, j + d) * W
            for (let i = 0; i < W; i++) {
                const q = j * W + i
                const wet = water[q]
                if (wet > 0.99) {
                    continue
                }
                const iL = Math.max(0, i - d)
                const iR = Math.min(W - 1, i + d)
                const nu = -(heights[j * W + iR] - heights[j * W + iL]) / span
                const nv = -(heights[jUp + i] - heights[jDown + i]) / span
                const shade =
                    (nu * lu + ly + nv * lv) /
                    Math.sqrt(nu * nu + 1 + nv * nv) /
                    ly
                const f = 1 + (shade - 1) * 1.3 * (1 - wet)
                const p = q * 4
                px[p] *= f
                px[p + 1] *= f
                px[p + 2] *= f
            }
        }
        ctx.putImageData(img, 0, 0)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // Trees
        const treeFill = readColor(style, '--fw-map-tree', '#4f7444')
        const treeShade = readColor(
            style,
            '--fw-map-tree-shade',
            'rgba(30, 45, 25, 0.28)'
        )
        const trees = hole.trees.map((t) => ({
            p: tf.toMap(t.x, t.z),
            r: Math.max(0.9, t.radius * tf.scale * 0.9),
        }))
        ctx.fillStyle = treeShade
        for (const t of trees) {
            ctx.beginPath()
            ctx.arc(t.p.x + 0.5, t.p.y + 0.6, t.r, 0, Math.PI * 2)
            ctx.fill()
        }
        ctx.fillStyle = treeFill
        for (const t of trees) {
            ctx.beginPath()
            ctx.arc(t.p.x, t.p.y, t.r, 0, Math.PI * 2)
            ctx.fill()
        }

        // Tee
        const tee = tf.toMap(hole.tee.x, hole.tee.z)
        ctx.fillStyle = readColor(style, '--fw-map-marker', '#fbf8f1')
        ctx.strokeStyle = readColor(
            style,
            '--fw-map-ink',
            'rgba(43, 40, 34, 0.55)'
        )
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(tee.x, tee.y, 2.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Pin: a cup dot, a pole and a small flag.
        const pin = tf.toMap(hole.pin.x, hole.pin.z)
        ctx.fillStyle = readColor(
            style,
            '--fw-map-ink',
            'rgba(43, 40, 34, 0.55)'
        )
        ctx.beginPath()
        ctx.arc(pin.x, pin.y, 1.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = readColor(style, '--fw-map-pole', '#fbf8f1')
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.moveTo(pin.x, pin.y)
        ctx.lineTo(pin.x, pin.y - 10)
        ctx.stroke()
        ctx.fillStyle = readColor(style, '--fw-map-flag', '#c8533f')
        ctx.beginPath()
        ctx.moveTo(pin.x + 0.5, pin.y - 10.5)
        ctx.lineTo(pin.x + 7, pin.y - 8.4)
        ctx.lineTo(pin.x + 0.5, pin.y - 6.3)
        ctx.closePath()
        ctx.fill()

        staticLayer = layer
        buildMs = performance.now() - t0
    }

    function draw(): void {
        if (!hole || !transform) {
            return
        }
        const key = state
            ? [
                  state.ball.x.toFixed(2),
                  state.ball.z.toFixed(2),
                  state.aim.toFixed(4),
                  state.landing ? state.landing.x.toFixed(2) : '-',
                  state.landing ? state.landing.z.toFixed(2) : '-',
              ].join(',')
            : 'none'
        if (key === lastKey) {
            return
        }
        lastKey = key
        const ctx = getContext(canvas) as CanvasRenderingContext2D | null
        if (!ctx) {
            return
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (staticLayer) {
            ctx.drawImage(staticLayer, 0, 0)
        }
        if (!state) {
            return
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        const tf = transform
        // Smaller marks on the phone-size map.
        const k = tf.width < 120 ? 0.8 : 1
        const ball = tf.toMap(state.ball.x, state.ball.z)
        const dir = tf.dirToMap(state.aim)

        let landing: { x: number; y: number } | null = null
        let reach = 34
        if (state.landing) {
            landing = tf.toMap(state.landing.x, state.landing.z)
            reach = Math.hypot(landing.x - ball.x, landing.y - ball.y)
        }

        // Aim line: brighter up to the landing point, then a short fade.
        const end = reach + Math.max(10, reach * 0.18)
        const grad = ctx.createLinearGradient(
            ball.x,
            ball.y,
            ball.x + dir.x * end,
            ball.y + dir.y * end
        )
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
        grad.addColorStop(
            Math.min(0.99, reach / end),
            'rgba(255, 255, 255, 0.6)'
        )
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(ball.x, ball.y)
        ctx.lineTo(ball.x + dir.x * end, ball.y + dir.y * end)
        ctx.stroke()

        if (landing) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.arc(landing.x, landing.y, 4.2 * k, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
        }

        // Ball
        ctx.fillStyle = 'rgba(30, 26, 20, 0.35)'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y + 0.4, 3.4 * k, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, 2.7 * k, 0, Math.PI * 2)
        ctx.fill()
    }

    // Rebuild on size changes (desktop/phone layout, rotation).
    let lastSize = ''
    function onResize(): void {
        if (disposed || !hole) {
            return
        }
        const s = size()
        const k = `${s.width}x${s.height}@${window.devicePixelRatio}`
        if (k === lastSize) {
            return
        }
        lastSize = k
        buildStatic()
        draw()
    }
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(onResize)
        observer.observe(canvas)
    }
    window.addEventListener('resize', onResize)

    return {
        el,
        setHole(hd) {
            hole = hd
            el.removeAttribute('data-empty')
            state = null
            const s = size()
            lastSize = `${s.width}x${s.height}@${window.devicePixelRatio}`
            buildStatic()
            draw()
        },
        update(s) {
            state = {
                ball: { ...s.ball },
                aim: s.aim,
                landing: s.landing ? { ...s.landing } : null,
            }
            draw()
        },
        setVisible(v) {
            el.toggleAttribute('data-hidden', !v)
        },
        lastBuildMs: () => buildMs,
        dispose() {
            disposed = true
            observer?.disconnect()
            window.removeEventListener('resize', onResize)
            staticLayer = null
            el.remove()
        },
    }
}
