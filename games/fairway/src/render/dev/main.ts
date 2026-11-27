/*
 * Dev page for the renderer (dev-render.html). Not part of the game build.
 * Keys: 1 tee, 2 fairway, 3 approach, 4 flight, 5 overview, 6 green,
 * G glide to the next spot, Q quality, R aim ring, arrows aim.
 */
import { generateHole } from '../../course'
import type { HoleData, Vec3 } from '../../shared/hole'
import { type Quality, type Renderer, createRenderer } from '../index'
import { createTestHole } from './testHole'

type View =
    'tee' | 'fairway' | 'approach' | 'flight' | 'overview' | 'green' | 'custom'

// ?seed=2026-11-27 loads a hole from the real generator instead.
const params = new URLSearchParams(location.search)
const seed = params.get('seed')
const hole: HoleData = seed ? generateHole(seed) : createTestHole()
let quality: Quality = params.get('quality') === 'low' ? 'low' : 'high'
let canvas = document.getElementById('view') as HTMLCanvasElement
let renderer: Renderer = createRenderer(canvas, { quality })
const hud = document.getElementById('hud')!

let view: View = 'tee'
let aimOffset = 0
let flightT = 0
let flightAuto = true
let paused = false
let dirty = true

const spot = (x: number, z: number): Vec3 => ({
    x,
    y: renderer.groundHeight(x, z),
    z,
})
// Points along the line of play (tee, centre line, pin), by distance.
const linePts = [hole.tee, ...hole.centerline, hole.pin].filter(
    (p, i, all) =>
        i === 0 || Math.hypot(p.x - all[i - 1].x, p.z - all[i - 1].z) > 0.5
)
const lineLen = linePts.reduce(
    (sum, p, i) =>
        i === 0
            ? 0
            : sum + Math.hypot(p.x - linePts[i - 1].x, p.z - linePts[i - 1].z),
    0
)
function along(dist: number): Vec3 {
    let left = Math.min(Math.max(dist, 0), lineLen)
    for (let i = 1; i < linePts.length; i++) {
        const a = linePts[i - 1]
        const b = linePts[i]
        const seg = Math.hypot(b.x - a.x, b.z - a.z)
        if (left <= seg || i === linePts.length - 1) {
            const t = Math.min(1, left / seg)
            return spot(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)
        }
        left -= seg
    }
    return { ...hole.pin }
}
const spots: Record<'tee' | 'fairway' | 'approach' | 'green', () => Vec3> = {
    tee: () => ({ ...hole.tee }),
    fairway: () => along(lineLen * 0.5),
    approach: () => along(lineLen - 48),
    green: () => along(lineLen - 9),
}
const aimAt = (from: Vec3, to: Vec3) => Math.atan2(to.z - from.z, to.x - from.x)
// From the tee, aim down the line of play; elsewhere, at the pin.
const driveTarget = () => (lineLen < 230 ? hole.pin : along(210))
const aimFor = (name: 'tee' | 'fairway' | 'approach' | 'green', p: Vec3) => {
    const target = name === 'tee' ? driveTarget() : hole.pin
    return aimAt(p, target) + aimOffset
}

// A simple shot for the flight view: a parabola from the tee.
const FLIGHT = {
    time: 6.2,
    carry: Math.min(205, lineLen * 0.92),
    apex: Math.min(27, lineLen * 0.14),
}
function flightState(t: number): { pos: Vec3; vel: Vec3 } {
    const k = Math.min(Math.max(t / FLIGHT.time, 0), 1)
    const tee = hole.tee
    const a = aimAt(tee, driveTarget())
    const d = FLIGHT.carry * k
    const x = tee.x + Math.cos(a) * d
    const z = tee.z + Math.sin(a) * d
    const groundY = renderer.groundHeight(x, z)
    const y = Math.max(groundY, tee.y + 4 * FLIGHT.apex * k * (1 - k))
    const v = FLIGHT.carry / FLIGHT.time
    return {
        pos: { x, y, z },
        vel: {
            x: Math.cos(a) * v,
            y: (4 * FLIGHT.apex * (1 - 2 * k)) / FLIGHT.time,
            z: Math.sin(a) * v,
        },
    }
}

function applyView(snap: boolean) {
    if (view === 'overview') {
        renderer.setBall(hole.tee, true)
        renderer.setAimRing(null)
        renderer.cameraOverview()
        return
    }
    if (view === 'flight' || view === 'custom') {
        return
    }
    const p = spots[view]()
    const a = aimFor(view, p)
    renderer.setBall(p, true)
    const carry = view === 'tee' ? 215 : view === 'fairway' ? 145 : 0
    renderer.setAimRing(
        carry > 0
            ? spot(p.x + Math.cos(a) * carry, p.z + Math.sin(a) * carry)
            : null
    )
    if (snap) {
        renderer.cameraGlideTo(p, a, 0)
    }
    renderer.cameraAddress(p, a)
}

function setView(next: View, opts: { t?: number } = {}) {
    if (next === 'custom') {
        return
    }
    view = next
    aimOffset = 0
    if (next === 'flight') {
        renderer.setAimRing(null)
        // Replay from the address so the chase camera is settled.
        const tee = hole.tee
        const a = aimAt(tee, driveTarget())
        renderer.cameraGlideTo(tee, a, 0)
        renderer.cameraAddress(tee, a)
        renderer.update(0)
        flightAuto = opts.t === undefined
        flightT = 0
        if (opts.t !== undefined) {
            const dt = 1 / 60
            while (flightT < opts.t) {
                flightT += dt
                const s = flightState(flightT)
                renderer.setBall(s.pos, true)
                renderer.cameraFollow(s.pos, s.vel)
                renderer.update(dt)
            }
        }
        return
    }
    applyView(true)
    renderer.update(0)
}

function setQuality(q: Quality) {
    // A new canvas and renderer: antialiasing is fixed at context creation.
    quality = q
    renderer.dispose()
    const fresh = document.createElement('canvas')
    fresh.id = 'view'
    canvas.replaceWith(fresh)
    canvas = fresh
    renderer = createRenderer(canvas, { quality })
    renderer.setHole(hole)
    resize()
    setView(view)
}

function resize() {
    renderer.resize(window.innerWidth, window.innerHeight, devicePixelRatio)
}

function glideNext() {
    const order: View[] = ['tee', 'fairway', 'approach', 'green']
    const i = order.indexOf(view)
    const next = order[(i + 1) % order.length] as
        'tee' | 'fairway' | 'approach' | 'green'
    view = next
    aimOffset = 0
    const p = spots[next]()
    renderer.setBall(p, true)
    renderer.setAimRing(null)
    renderer.cameraGlideTo(p, aimFor(next, p), 1.6)
}

window.addEventListener('resize', resize)
window.addEventListener('keydown', (e) => {
    const map: Record<string, View> = {
        '1': 'tee',
        '2': 'fairway',
        '3': 'approach',
        '4': 'flight',
        '5': 'overview',
        '6': 'green',
    }
    if (map[e.key]) {
        setView(map[e.key])
    } else if (e.key === 'q') {
        setQuality(quality === 'high' ? 'low' : 'high')
    } else if (e.key === 'g') {
        glideNext()
    } else if (e.key === 'p') {
        paused = !paused
    } else if (e.key === 'ArrowLeft') {
        aimOffset -= 0.02
    } else if (e.key === 'ArrowRight') {
        aimOffset += 0.02
    }
})
document
    .querySelectorAll<HTMLButtonElement>('button[data-view]')
    .forEach((b) => {
        b.addEventListener('click', () => setView(b.dataset.view as View))
    })
document.getElementById('btn-quality')?.addEventListener('click', () => {
    setQuality(quality === 'high' ? 'low' : 'high')
})
document.getElementById('btn-glide')?.addEventListener('click', glideNext)

const t0 = performance.now()
renderer.setHole(hole)
const buildMs = performance.now() - t0
resize()
setView((params.get('view') as View) || 'tee')

let last = performance.now()
let fps = 60
let frames = 0
function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (!paused) {
        if (view === 'flight') {
            if (flightAuto) {
                flightT += dt
                if (flightT > FLIGHT.time + 2) {
                    flightT = 0
                }
                if (flightT < dt * 1.5) {
                    const tee = hole.tee
                    const a = aimAt(tee, driveTarget())
                    renderer.cameraGlideTo(tee, a, 0)
                }
            }
            const s = flightState(flightT)
            renderer.setBall(s.pos, true)
            renderer.cameraFollow(s.pos, s.vel)
        } else if (view !== 'overview') {
            applyView(false)
        }
        renderer.update(dt)
    }
    // While paused, draw only on request (keeps screenshot runs fast).
    if (!paused || dirty) {
        renderer.render()
    }
    dirty = false
    fps += (1 / Math.max(dt, 1e-4) - fps) * 0.05
    if (frames++ % 20 === 0) {
        const s = renderer.stats()
        hud.textContent =
            `${view} | ${quality} | ${fps.toFixed(0)} fps | ` +
            `${s.drawCalls} calls | ${(s.triangles / 1000).toFixed(0)}k tris | ` +
            `build ${buildMs.toFixed(0)} ms`
    }
    requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

declare global {
    interface Window {
        __fairwayDev: {
            hole: HoleData
            setView: typeof setView
            setQuality: typeof setQuality
            /** Advance the animation clock without waiting. */
            /** Address view from any spot toward a target. */
            lookFrom(x: number, z: number, tx: number, tz: number): void
            /** Ball on the green: dist metres from the pin, at an angle. */
            putt(dist: number, angleDeg: number, aimOffsetDeg?: number): void
            /** Slope (rise over run) of the ground at a point. */
            slopeAt(x: number, z: number): number
            step(seconds: number): void
            pause(on: boolean): void
            /** Draw one frame while paused. */
            draw(): void
            stats(): ReturnType<Renderer['stats']>
            renderer(): Renderer
            ready: boolean
        }
    }
}
window.__fairwayDev = {
    hole,
    setView,
    setQuality,
    step(seconds) {
        const n = Math.ceil(seconds * 60)
        for (let i = 0; i < n; i++) {
            renderer.update(1 / 60)
        }
    },
    pause(on) {
        paused = on
    },
    draw() {
        dirty = true
    },
    lookFrom(x, z, tx, tz) {
        view = 'overview'
        const p = spot(x, z)
        renderer.setBall(p, true)
        renderer.setAimRing(null)
        const a = Math.atan2(tz - z, tx - x)
        renderer.cameraGlideTo(p, a, 0)
        renderer.cameraAddress(p, a)
        view = 'custom'
    },
    putt(dist, angleDeg, aimOffsetDeg = 0) {
        const a = (angleDeg * Math.PI) / 180
        const p = spot(
            hole.pin.x + Math.cos(a) * dist,
            hole.pin.z + Math.sin(a) * dist
        )
        const aim = aimAt(p, hole.pin) + (aimOffsetDeg * Math.PI) / 180
        view = 'custom'
        renderer.setBall(p, true)
        renderer.setAimRing(null)
        renderer.cameraGlideTo(p, aim, 0)
        renderer.cameraAddress(p, aim)
    },
    slopeAt(x, z) {
        const e = 0.5
        return Math.hypot(
            renderer.groundHeight(x + e, z) - renderer.groundHeight(x - e, z),
            renderer.groundHeight(x, z + e) - renderer.groundHeight(x, z - e)
        )
    },
    stats: () => renderer.stats(),
    renderer: () => renderer,
    ready: true,
}
