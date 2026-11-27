// Dev page for the HUD and menus (dev-ui.html, not in the production build).
// Shows every UI state over a painted placeholder scene with fake data.
//
//   window.__fairwayUiDev.show('title')       switch state
//   window.__fairwayUiDev.states              all state names
//   window.__fairwayUiDev.toolbar(false)      hide the state switcher
//   ?state=archive&bar=0                      the same from the URL
//
// Backquote (`) cycles the states.
import { createInput } from '../../input'
import type { SurfaceId } from '../../shared/hole'
import { CLUB_COUNT, PUTTER_INDEX } from '../clubs'
import { addDays, todayUtc, yardsToMetres } from '../format'
import { createHud } from '../hud'
import type { ArchiveEntry } from '../screens'
import { createScreens } from '../screens'

const STATES = [
    'hud',
    'charging',
    'flight',
    'title',
    'title-played',
    'archive',
    'result',
    'result-practice',
] as const
type DevState = (typeof STATES)[number]

const canvas = document.getElementById('view') as HTMLCanvasElement
const ui = document.getElementById('ui') as HTMLElement
const bar = document.getElementById('dev-bar') as HTMLElement

const hud = createHud(ui)
const screens = createScreens(ui)
const input = createInput({ canvas, swingPad: hud.swingPad })

// --- Fake round ---------------------------------------------------------------

const CARRY_M = [215, 195, 165, 145, 120, 105, 75, 22]
const today = todayUtc()
const game = {
    par: 4,
    number: 1,
    lengthM: yardsToMetres(412),
    strokes: 0,
    lie: 'tee' as SurfaceId,
    distM: yardsToMetres(412),
    club: 0,
    aim: 0,
    windSpeed: 3.9,
    windDir: 0.9,
    flying: false,
    flightTimer: 0,
    lastPower: 0,
}

function refreshHud(): void {
    hud.setHoleInfo({ number: game.number, par: game.par })
    hud.setStrokes(game.strokes)
    hud.setLie(game.lie)
    hud.setDistance(game.distM)
    hud.setClub(game.club, CARRY_M[game.club])
    hud.setWind(game.windSpeed, game.windDir - game.aim)
}

function selectClub(i: number): void {
    game.club = Math.max(0, Math.min(CLUB_COUNT - 1, i))
    hud.setClub(game.club, CARRY_M[game.club])
}

input.on('aim', (d) => {
    game.aim += d
    hud.setWind(game.windSpeed, game.windDir - game.aim)
})
input.on('club', (dir) => {
    selectClub(typeof dir === 'number' ? game.club + dir : dir.index)
})
hud.onClubSelect(selectClub)
input.on('swingStart', () => hud.showHint(false))
input.on('swingRelease', (p) => {
    game.lastPower = p
    startFlight()
})
input.on('swingCancel', () => hud.toast('Swing cancelled'))
input.on('skip', () => land())
hud.onSkip(() => land())

function startFlight(): void {
    game.flying = true
    game.flightTimer = 3
    input.setEnabled(false)
    input.setSkippable(true)
    hud.showSkip(true)
}

function land(): void {
    if (!game.flying) {
        return
    }
    game.flying = false
    input.setSkippable(false)
    input.setEnabled(state === 'hud')
    hud.showSkip(false)
    game.strokes++
    const carry = CARRY_M[game.club] * game.lastPower
    game.distM = Math.max(0, Math.abs(game.distM - carry))
    if (game.distM < 0.5) {
        hud.toast('In the hole!', { tone: 'accent' })
        game.distM = 0
    } else if (game.distM < 18) {
        game.lie = 'green'
        selectClub(PUTTER_INDEX)
        hud.toast('On the green', { tone: 'accent' })
    } else {
        game.lie = game.lastPower > 0.9 ? 'fairway' : 'rough'
        hud.toast(`${Math.round(game.lastPower * 100)}% power`)
    }
    refreshHud()
}

// --- Fake menus -----------------------------------------------------------------

function fakeArchive(): ArchiveEntry[] {
    const out: ArchiveEntry[] = []
    const pars = [4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4, 5, 3, 4, 4, 3, 5, 4, 4]
    const scores = [
        null,
        3,
        5,
        5,
        null,
        3,
        4,
        null,
        6,
        2,
        4,
        null,
        5,
        4,
        4,
        null,
        3,
        6,
        5,
        4,
    ]
    for (let i = 0; i < pars.length; i++) {
        out.push({
            date: addDays(today, -i),
            number: pars.length - i,
            par: pars[i],
            strokes: scores[i],
        })
    }
    return out
}

screens.onPlayDaily(() => show('hud'))
screens.onPlayAgain(() => show('hud'))
screens.onPlayDate(() => show('hud'))
screens.onPlayRandom(() => show('hud'))
screens.onPlaySeed(() => show('hud'))
screens.onOpenArchive(() => show('archive'))
screens.onBack(() => show('title'))

// --- States ---------------------------------------------------------------------

let state: DevState = 'hud'

function resetRound(): void {
    Object.assign(game, {
        strokes: 0,
        lie: 'tee',
        distM: game.lengthM,
        club: 0,
        aim: 0,
        flying: false,
    })
    refreshHud()
    hud.showSkip(false)
    hud.setPower(0, false)
}

function show(s: DevState): void {
    state = s
    for (const b of bar.querySelectorAll('button')) {
        b.setAttribute('aria-pressed', String(b.dataset.state === s))
    }
    const inRound = s === 'hud' || s === 'charging' || s === 'flight'
    hud.setVisible(inRound)
    input.setSkippable(false)
    input.setEnabled(s === 'hud')
    if (inRound) {
        screens.hide()
    }
    switch (s) {
        case 'hud':
            resetRound()
            hud.showHint(true)
            break
        case 'charging':
            resetRound()
            Object.assign(game, {
                strokes: 1,
                lie: 'fairway',
                distM: yardsToMetres(176),
                club: 2,
                aim: 0.35,
            })
            refreshHud()
            hud.showHint(false)
            hud.setPower(0.68, true)
            break
        case 'flight':
            resetRound()
            Object.assign(game, { strokes: 1, lie: 'fairway', distM: 160 })
            refreshHud()
            hud.showHint(false)
            hud.showSkip(true)
            hud.toast('Good contact', { duration: 600000 })
            break
        case 'title':
            screens.showTitle({
                date: today,
                number: game.number,
                par: game.par,
                lengthM: game.lengthM,
                result: null,
            })
            break
        case 'title-played':
            screens.showTitle({
                date: today,
                number: game.number,
                par: game.par,
                lengthM: game.lengthM,
                result: { strokes: 5, par: 4 },
            })
            break
        case 'archive':
            screens.showArchive(fakeArchive())
            break
        case 'result':
        case 'result-practice':
            screens.showResult({
                number: game.number,
                seed: today,
                date: today,
                par: 4,
                strokes: 3,
                putts: 1,
                penalties: 0,
                bunkers: 1,
                official: s === 'result',
            })
            break
    }
}

for (const s of STATES) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = s
    b.dataset.state = s
    b.tabIndex = -1
    b.addEventListener('pointerdown', (e) => e.preventDefault())
    b.addEventListener('click', () => show(s))
    bar.append(b)
}

window.addEventListener('keydown', (e) => {
    if (e.key === '`') {
        const i = STATES.indexOf(state)
        show(STATES[(i + 1) % STATES.length])
    }
})

// --- Placeholder scene ------------------------------------------------------------

function rand(seed: number): () => number {
    let s = seed >>> 0
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 4294967296
    }
}

function paint(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    const hgt = canvas.clientHeight
    if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr)
    }
    if (canvas.height !== Math.round(hgt * dpr)) {
        canvas.height = Math.round(hgt * dpr)
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        return
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const horizon = hgt * 0.47
    const shift = -game.aim * w * 0.9
    const vx = w * 0.5 + shift

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, horizon)
    sky.addColorStop(0, '#8fb7d6')
    sky.addColorStop(0.65, '#c9dbe4')
    sky.addColorStop(1, '#efe6d4')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, horizon + 2)
    const sun = ctx.createRadialGradient(
        w * 0.78 + shift * 0.2,
        horizon * 0.55,
        0,
        w * 0.78 + shift * 0.2,
        horizon * 0.55,
        w * 0.45
    )
    sun.addColorStop(0, 'rgba(255, 236, 200, 0.85)')
    sun.addColorStop(1, 'rgba(255, 236, 200, 0)')
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, w, horizon + 2)

    // Far hills and tree line
    const r = rand(7)
    ctx.fillStyle = '#9fb3a3'
    ctx.beginPath()
    ctx.moveTo(0, horizon)
    for (let x = -50; x <= w + 50; x += 40) {
        ctx.lineTo(x, horizon - 16 - 12 * Math.sin((x - shift * 0.3) * 0.006))
    }
    ctx.lineTo(w, horizon)
    ctx.fill()
    ctx.fillStyle = '#56704a'
    for (let i = 0; i < 160; i++) {
        const x = ((r() * 1.6 - 0.3) * w + shift * 0.6) % (w * 1.4)
        const rr = 8 + r() * 16
        ctx.beginPath()
        ctx.arc(x, horizon - rr * 0.6, rr, 0, Math.PI * 2)
        ctx.fill()
    }

    // Ground
    const ground = ctx.createLinearGradient(0, horizon, 0, hgt)
    ground.addColorStop(0, '#93ac6c')
    ground.addColorStop(0.3, '#6f9649')
    ground.addColorStop(1, '#4c7a34')
    ctx.fillStyle = ground
    ctx.fillRect(0, horizon, w, hgt - horizon)

    // Fairway with mowing stripes
    const stripes = 14
    for (let i = 0; i < stripes; i++) {
        const t0 = i / stripes
        const t1 = (i + 1) / stripes
        const y0 = horizon + (hgt - horizon) * t0 * t0
        const y1 = horizon + (hgt - horizon) * t1 * t1
        const half0 = 14 + w * 0.42 * t0 * t0
        const half1 = 14 + w * 0.42 * t1 * t1
        const cx0 = vx + (w * 0.5 - vx) * t0 * t0
        const cx1 = vx + (w * 0.5 - vx) * t1 * t1
        ctx.fillStyle = i % 2 ? '#8ebd5c' : '#86b554'
        ctx.beginPath()
        ctx.moveTo(cx0 - half0, y0)
        ctx.lineTo(cx0 + half0, y0)
        ctx.lineTo(cx1 + half1, y1)
        ctx.lineTo(cx1 - half1, y1)
        ctx.fill()
    }

    // Green and flag
    ctx.fillStyle = '#a6d273'
    ctx.beginPath()
    ctx.ellipse(vx + 10, horizon + 6, 46, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#f5f1e8'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(vx + 14, horizon + 6)
    ctx.lineTo(vx + 14, horizon - 22)
    ctx.stroke()
    ctx.fillStyle = '#c8533f'
    ctx.beginPath()
    ctx.moveTo(vx + 14.5, horizon - 22)
    ctx.lineTo(vx + 26, horizon - 18.5)
    ctx.lineTo(vx + 14.5, horizon - 15)
    ctx.fill()

    // Ball on the tee
    ctx.fillStyle = '#fbfaf6'
    ctx.beginPath()
    ctx.arc(w * 0.5, hgt * 0.86, 5, 0, Math.PI * 2)
    ctx.fill()
}

// --- Loop -----------------------------------------------------------------------

let last = performance.now()
function frame(t: number): void {
    const dt = Math.min(0.1, (t - last) / 1000)
    last = t
    input.update(dt)
    if (state === 'hud') {
        hud.setPower(input.power(), input.isCharging())
        if (game.flying) {
            game.flightTimer -= dt
            if (game.flightTimer <= 0) {
                land()
            }
        }
    }
    paint()
    requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// --- Entry ----------------------------------------------------------------------

const params = new URLSearchParams(location.search)
if (params.get('bar') === '0') {
    bar.hidden = true
}
const initial = params.get('state') as DevState | null
show(initial && STATES.includes(initial) ? initial : 'hud')

declare global {
    interface Window {
        __fairwayUiDev?: {
            states: readonly DevState[]
            show(s: DevState): void
            state(): DevState
            toolbar(v: boolean): void
            hud: typeof hud
            screens: typeof screens
            input: typeof input
        }
    }
}

window.__fairwayUiDev = {
    states: STATES,
    show,
    state: () => state,
    toolbar(v) {
        bar.hidden = !v
    },
    hud,
    screens,
    input,
}
