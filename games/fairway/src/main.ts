// Fairway: the game loop. It connects the round rules (game/), the physics
// playback, the renderer (render/), the HUD and menus (ui/) and the input.
import {
    generateHole,
    holeLength,
    holeNumberFor,
    parseDateSeed,
    randomSeed,
} from './course'
import {
    MIN_POWER,
    type Round,
    type ShotOutcome,
    createRound,
    distanceToPin,
    headingToPin,
    playShot,
    simulate,
    suggestClub,
} from './game/round'
import { createStorage } from './game/storage'
import { createInput } from './input'
import {
    CLUB_ORDER,
    type ClubId,
    PUTTER_FULL_ROLL,
    nominalCarry,
} from './physics'
import type { TrajectorySample } from './physics'
import { createRenderer } from './render'
import type { HoleData, Vec3 } from './shared/hole'
import {
    type ArchiveEntry,
    archiveDates,
    createHud,
    createScreens,
    scoreName,
    todayUtc,
} from './ui'

// --- Setup ------------------------------------------------------------------

const canvas = document.getElementById('view') as HTMLCanvasElement
const uiRoot = document.getElementById('ui') as HTMLElement
document.getElementById('status')?.remove()

// Phones get the low tier. ?quality=low|high overrides it.
const coarse = window.matchMedia?.('(pointer: coarse)').matches === true
const askedQuality = new URLSearchParams(location.search).get('quality')
const quality =
    askedQuality === 'low' || askedQuality === 'high'
        ? askedQuality
        : coarse
          ? 'low'
          : 'high'
const renderer = createRenderer(canvas, { quality })
const hud = createHud(uiRoot)
const screens = createScreens(uiRoot)
const input = createInput({ canvas, swingPad: hud.swingPad })
const storage = createStorage()

// The renderer caps the pixel ratio for its quality tier.
function resize(): void {
    renderer.resize(
        window.innerWidth,
        window.innerHeight,
        window.devicePixelRatio || 1
    )
}
window.addEventListener('resize', resize)
resize()

// --- State ------------------------------------------------------------------

type Mode =
    | { kind: 'daily'; date: string; official: boolean }
    | { kind: 'seed'; seed: string }

type Phase =
    | { name: 'menu' }
    | { name: 'aim' }
    | {
          name: 'flight'
          samples: TrajectorySample[]
          duration: number
          t: number
          outcome: ShotOutcome
      }
    | { name: 'settle'; left: number; outcome: ShotOutcome }
    | { name: 'glide'; left: number }
    | { name: 'finish'; left: number }

let hole: HoleData | null = null
let round: Round | null = null
let mode: Mode | null = null
let phase: Phase = { name: 'menu' }
let aim = 0
let clubIndex = 0

// A short pause after the ball stops, the camera glide to the next shot,
// and the pause before the result screen.
const SETTLE_S = 0.9
const GLIDE_S = 1.3
const FINISH_S = 1.8

// --- Menus ------------------------------------------------------------------

function showTitle(): void {
    const today = todayUtc()
    setHole(generateHole(today))
    phase = { name: 'menu' }
    input.setEnabled(false)
    input.setSkippable(false)
    hud.setVisible(false)
    renderer.setBall(hole!.tee, false)
    renderer.setAimRing(null)
    renderer.setPathPreview(null)
    renderer.cameraOverview()
    const done = storage.result(today)
    screens.showTitle({
        date: today,
        number: hole!.number,
        par: hole!.par,
        lengthM: holeLength(hole!),
        result: done ? { strokes: done.strokes, par: done.par } : null,
    })
}

function archiveEntries(): ArchiveEntry[] {
    const results = storage.results()
    return archiveDates(todayUtc()).map((date) => {
        const r = results[date]
        const d = parseDateSeed(date)
        return {
            date,
            number: d ? holeNumberFor(d) : 0,
            par: r?.par ?? null,
            strokes: r?.strokes ?? null,
        }
    })
}

screens.onPlayDaily(() => playDaily(todayUtc()))
screens.onPlayDate((date) => playDaily(date))
screens.onPlayRandom(() => {
    const entropy = new Uint32Array(2)
    crypto.getRandomValues(entropy)
    playSeed(randomSeed(entropy))
})
screens.onPlaySeed((seed) => {
    const s = seed.trim()
    if (s) {
        if (parseDateSeed(s)) {
            playDaily(s)
        } else {
            playSeed(s)
        }
    }
})
screens.onOpenArchive(() => screens.showArchive(archiveEntries()))
screens.onBack(() => showTitle())
screens.onPlayAgain(() => {
    if (!mode) {
        return
    }
    if (mode.kind === 'daily') {
        playDaily(mode.date)
    } else {
        playSeed(mode.seed)
    }
})

function playDaily(date: string): void {
    const official = storage.result(date) === null && date <= todayUtc()
    mode = { kind: 'daily', date, official }
    startRound(generateHole(date))
}

function playSeed(seed: string): void {
    mode = { kind: 'seed', seed }
    startRound(generateHole(seed))
}

function setHole(h: HoleData): void {
    if (hole !== h) {
        hole = h
        renderer.setHole(h)
    }
}

// --- Round ------------------------------------------------------------------

function startRound(h: HoleData): void {
    setHole(h)
    round = createRound(h)
    screens.hide()
    hud.setVisible(true)
    hud.setHoleInfo({
        number: h.number,
        par: h.par,
        title: h.number > 0 ? undefined : `Seed ${h.seed}`,
    })
    if (!storage.hintDismissed()) {
        hud.showHint(true)
    }
    beginAim(true)
}

/** Ready for the next shot: aim at the pin, pick the club. */
function beginAim(snap: boolean): void {
    const r = round!
    aim = headingToPin(r)
    setClub(CLUB_ORDER.indexOf(suggestClub(r)))
    if (snap) {
        renderer.cameraAddress(r.ball, aim)
    }
    renderer.setBall(r.ball, true)
    hud.setStrokes(r.stats.strokes)
    hud.setLie(r.lie)
    hud.setDistance(distanceToPin(r))
    hud.showSkip(false)
    input.setSkippable(false)
    input.setEnabled(true)
    phase = { name: 'aim' }
    refreshAim()
}

function club(): ClubId {
    return CLUB_ORDER[clubIndex]
}

function setClub(index: number): void {
    clubIndex = Math.max(0, Math.min(CLUB_ORDER.length - 1, index))
    const id = club()
    hud.setClub(
        clubIndex,
        id === 'putter' ? PUTTER_FULL_ROLL : nominalCarry(id)
    )
    refreshAim()
}

/** Camera, aim ring and relative wind for the current aim and club. */
function refreshAim(): void {
    if (!round || phase.name !== 'aim') {
        return
    }
    const r = round
    renderer.cameraAddress(r.ball, aim)
    const id = club()
    if (id === 'putter') {
        renderer.setAimRing(null)
    } else {
        const d = nominalCarry(id)
        const x = r.ball.x + Math.cos(aim) * d
        const z = r.ball.z + Math.sin(aim) * d
        renderer.setAimRing({ x, y: renderer.groundHeight(x, z), z })
    }
    const c = r.hole.conditions
    hud.setWind(c.windSpeed, c.windDirection - aim)
    previewPower = -1
    refreshPreview()
}

// --- Path preview -----------------------------------------------------------

/**
 * How much of the path the dots show: only the start of a full shot (its
 * launch angle and direction), and a little more of a putt (its line).
 */
const PREVIEW_SHARE_FLIGHT = 0.015
const PREVIEW_SHARE_PUTT = 0.1
const PREVIEW_MIN_LENGTH = 1
let previewPower = -1

/**
 * Faint dots along the first part of the predicted path: for the power
 * being charged, else for full power. It updates as the power rises.
 */
function refreshPreview(): void {
    if (!round || phase.name !== 'aim') {
        renderer.setPathPreview(null)
        return
    }
    const power = input.isCharging() ? Math.max(input.power(), 0.04) : 1
    if (Math.abs(power - previewPower) < 0.005) {
        return
    }
    previewPower = power
    const id = club()
    const result = simulate(round, { club: id, aim, power })
    const rolling = id === 'putter'
    const want = Math.max(
        PREVIEW_MIN_LENGTH,
        rolling
            ? PREVIEW_SHARE_PUTT * result.total
            : PREVIEW_SHARE_FLIGHT * result.carry
    )
    const start = result.samples[0]
    const points: Vec3[] = []
    for (const smp of result.samples) {
        const d = Math.hypot(smp.x - start.x, smp.z - start.z)
        if (points.length > 0 && d > want) {
            const prev = points[points.length - 1]
            const pd = Math.hypot(prev.x - start.x, prev.z - start.z)
            const f = d > pd ? (want - pd) / (d - pd) : 0
            points.push({
                x: prev.x + (smp.x - prev.x) * f,
                y: prev.y + (smp.y - prev.y) * f,
                z: prev.z + (smp.z - prev.z) * f,
            })
            break
        }
        points.push({ x: smp.x, y: smp.y, z: smp.z })
    }
    renderer.setPathPreview(points.length > 1 ? points : null)
}

input.on('aim', (d) => {
    if (phase.name === 'aim') {
        aim += d
        refreshAim()
    }
})
input.on('club', (step) => {
    if (phase.name !== 'aim') {
        return
    }
    setClub(typeof step === 'number' ? clubIndex + step : step.index)
})
hud.onClubSelect((i) => {
    if (phase.name === 'aim') {
        setClub(i)
    }
})
hud.onHintDismiss(() => storage.dismissHint())
input.on('swingStart', () => hud.showHint(false))
input.on('swingCancel', () => {
    previewPower = -1
    refreshPreview()
})
input.on('swingRelease', (power) => {
    if (phase.name !== 'aim' || !round || power < MIN_POWER) {
        return
    }
    const outcome = playShot(round, { club: club(), aim, power })
    const { samples, duration } = outcome.result
    input.setEnabled(false)
    input.setSkippable(true)
    hud.showSkip(true)
    renderer.setAimRing(null)
    renderer.setPathPreview(null)
    phase = { name: 'flight', samples, duration, t: 0, outcome }
})

function skip(): void {
    if (phase.name === 'flight') {
        phase.t = phase.duration
    } else if (phase.name === 'settle') {
        phase.left = 0
    }
}
input.on('skip', skip)
hud.onSkip(skip)

/** Ball position and velocity on the recorded path at time t. */
function sampleAt(
    samples: TrajectorySample[],
    t: number
): { pos: Vec3; vel: Vec3 } {
    let i = 1
    while (i < samples.length - 1 && samples[i].t < t) {
        i++
    }
    const a = samples[i - 1] ?? samples[0]
    const b = samples[i] ?? a
    const span = b.t - a.t
    const f = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 1
    const inv = span > 0 ? 1 / span : 0
    return {
        pos: {
            x: a.x + (b.x - a.x) * f,
            y: a.y + (b.y - a.y) * f,
            z: a.z + (b.z - a.z) * f,
        },
        vel: {
            x: (b.x - a.x) * inv,
            y: (b.y - a.y) * inv,
            z: (b.z - a.z) * inv,
        },
    }
}

/** The ball has stopped: tell the player what happened. */
function announce(o: ShotOutcome): void {
    const r = round!
    const notes = o.notes
    if (notes.includes('holed')) {
        hud.toast(scoreName(r.stats.strokes, r.hole.par), {
            tone: 'accent',
            duration: 2600,
        })
    } else if (notes.includes('water')) {
        hud.toast('In the water. +1 stroke')
    } else if (notes.includes('ob')) {
        hud.toast('Out of bounds. +1 stroke')
    } else if (notes.includes('limit')) {
        hud.toast('Stroke limit reached')
    } else if (notes.includes('green')) {
        hud.toast('On the green', { tone: 'accent' })
    } else if (notes.includes('bunker')) {
        hud.toast('In the bunker')
    }
    hud.setStrokes(r.stats.strokes)
}

function finishRound(): void {
    const r = round!
    const m = mode!
    hud.setVisible(false)
    input.setEnabled(false)
    input.setSkippable(false)
    renderer.cameraOverview()
    let official = false
    if (m.kind === 'daily' && m.official && r.holed) {
        official = storage.saveResult(m.date, {
            strokes: r.stats.strokes,
            par: r.hole.par,
            putts: r.stats.putts,
            penalties: r.stats.penalties,
            bunkers: r.stats.bunkers,
            version: r.hole.version,
        })
        m.official = false
    }
    const url =
        m.kind === 'seed'
            ? `${location.origin}${location.pathname}?seed=${encodeURIComponent(m.seed)}`
            : undefined
    screens.showResult({
        number: r.hole.number,
        seed: r.hole.seed,
        par: r.hole.par,
        strokes: r.stats.strokes,
        putts: r.stats.putts,
        penalties: r.stats.penalties,
        bunkers: r.stats.bunkers,
        official,
        date: m.kind === 'daily' ? m.date : undefined,
        url,
    })
    phase = { name: 'menu' }
}

// --- Frame loop -------------------------------------------------------------

function step(dt: number): void {
    input.update(dt)
    hud.setPower(input.power(), input.isCharging())
    if (phase.name === 'aim') {
        refreshPreview()
    }
    switch (phase.name) {
        case 'flight': {
            phase.t = Math.min(phase.duration, phase.t + dt)
            const { pos, vel } = sampleAt(phase.samples, phase.t)
            const o = phase.outcome
            const lost =
                phase.t >= phase.duration &&
                (o.notes.includes('water') || o.notes.includes('holed'))
            renderer.setBall(pos, !lost)
            renderer.cameraFollow(pos, vel)
            if (phase.t >= phase.duration) {
                announce(o)
                phase = { name: 'settle', left: SETTLE_S, outcome: o }
            }
            break
        }
        case 'settle': {
            phase.left -= dt
            if (phase.left <= 0) {
                const r = round!
                if (r.done) {
                    phase = { name: 'finish', left: FINISH_S }
                } else {
                    renderer.setBall(r.ball, true)
                    renderer.cameraGlideTo(r.ball, headingToPin(r), GLIDE_S)
                    hud.showSkip(false)
                    input.setSkippable(false)
                    phase = { name: 'glide', left: GLIDE_S }
                }
            }
            break
        }
        case 'glide':
            phase.left -= dt
            if (phase.left <= 0) {
                beginAim(false)
            }
            break
        case 'finish':
            phase.left -= dt
            if (phase.left <= 0) {
                finishRound()
            }
            break
    }
    renderer.update(dt)
    renderer.render()
}

let last = performance.now()
function frame(now: number): void {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
    last = now
    step(dt)
    requestAnimationFrame(frame)
}

// --- Start ------------------------------------------------------------------

// Links: ?seed=<text> plays a seed, ?date=YYYY-MM-DD plays a daily hole.
const params = new URLSearchParams(location.search)
const linkSeed = params.get('seed')
const linkDate = params.get('date')
showTitle()
if (linkDate && parseDateSeed(linkDate) && linkDate <= todayUtc()) {
    playDaily(linkDate)
} else if (linkSeed) {
    playSeed(linkSeed.slice(0, 48))
}
requestAnimationFrame(frame)

// Debug hook for screenshots and manual tests.
Object.assign(window, {
    __fairway: {
        renderer,
        hud,
        input,
        get round() {
            return round
        },
        get phase() {
            return phase.name
        },
        playDaily,
        playSeed,
        shoot(power: number, aimOffset = 0, clubId?: ClubId) {
            if (phase.name !== 'aim' || !round) {
                return
            }
            if (clubId) {
                setClub(CLUB_ORDER.indexOf(clubId))
            }
            aim += aimOffset
            refreshAim()
            const outcome = playShot(round, { club: club(), aim, power })
            input.setEnabled(false)
            input.setSkippable(true)
            hud.showSkip(true)
            renderer.setAimRing(null)
            renderer.setPathPreview(null)
            phase = {
                name: 'flight',
                samples: outcome.result.samples,
                duration: outcome.result.duration,
                t: 0,
                outcome,
            }
        },
    },
})
