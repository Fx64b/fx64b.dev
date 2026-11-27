// The round on screen: a small phase machine that turns input into shots,
// plays the simulated path back, moves the camera and keeps the HUD, the
// minimap and the audio in step. Menus, storage and the result screen are
// not its business; it reports the end of a round through onFinish.
//
//   menu -> aim -> flight -> settle -> glide -> aim ...
//                                   -> finish -> menu (onFinish)
import type { GameAudio } from '../audio'
import type { Input } from '../input'
import {
    CLUB_ORDER,
    type ClubId,
    PUTTER_FULL_ROLL,
    type TrajectorySample,
    nominalCarry,
} from '../physics'
import type { Renderer } from '../render'
import type { HoleData, Vec3 } from '../shared/hole'
import { type Hud, type Minimap, scoreName } from '../ui'
import { flightWind, sampleAt } from './flight'
import { PREVIEW_MIN_POWER, previewPoints } from './preview'
import {
    MIN_POWER,
    type Round,
    type ShotOutcome,
    createRound,
    defaultAim,
    distanceToPin,
    playShot,
    simulate,
    suggestClub,
} from './round'

/** Pause after the ball stops, before the camera moves on, in s. */
const SETTLE_S = 0.9
/** Camera glide from the ball to the next address position, in s. */
const GLIDE_S = 1.3
/** Pause after the last shot, before the result screen, in s. */
const FINISH_S = 1.8
/** The preview is rebuilt once the power changed by more than this. */
const PREVIEW_POWER_STEP = 0.005
/** How long the score toast for a holed ball stays, in ms. */
const HOLED_TOAST_MS = 2600

export type Phase =
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

export interface ControllerDeps {
    renderer: Renderer
    hud: Hud
    minimap: Minimap
    input: Input
    audio: GameAudio
}

export interface RoundController {
    /** Show a hole behind the menus: overview camera, no HUD, no input. */
    showMenu(hole: HoleData): void
    /** Start a round on a hole. The caller hides the menus. */
    startRound(hole: HoleData): void
    /** Called when a round is over and the scene is back in menu mode. */
    onFinish(cb: (round: Round) => void): void
    /** Advance the round by one frame (dt in s). Call before rendering. */
    step(dt: number): void
    round(): Round | null
    phase(): Phase['name']
    /**
     * Hit a shot now, in the aim phase only: optionally change the club and
     * turn the aim first. For scripted tests and screenshots.
     */
    shoot(power: number, aimOffset?: number, club?: ClubId): void
}

export function createRoundController(deps: ControllerDeps): RoundController {
    const { renderer, hud, minimap, input, audio } = deps

    let hole: HoleData | null = null
    let round: Round | null = null
    let phase: Phase = { name: 'menu' }
    /** Aim heading in rad, atan2(dz, dx). */
    let aim = 0
    let clubIndex = 0
    /** Power of the dots on show, or -1 to rebuild them. */
    let previewPower = -1
    let finishCb: ((round: Round) => void) | null = null

    function setHole(h: HoleData): void {
        if (hole !== h) {
            hole = h
            renderer.setHole(h)
        }
        audio.setWind(h.conditions.windSpeed)
        audio.setMusicSeed(h.seed)
    }

    function club(): ClubId {
        return CLUB_ORDER[clubIndex]
    }

    // --- Menu ----------------------------------------------------------------

    function showMenu(h: HoleData): void {
        setHole(h)
        phase = { name: 'menu' }
        audio.setScene('menu')
        audio.setFlight(0)
        audio.flightEnd()
        input.setEnabled(false)
        input.setSkippable(false)
        hud.setVisible(false)
        minimap.setVisible(false)
        renderer.setBall(h.tee, false)
        renderer.setAimRing(null)
        renderer.setPathPreview(null)
        renderer.cameraOverview()
    }

    // --- Aim -----------------------------------------------------------------

    function startRound(h: HoleData): void {
        setHole(h)
        round = createRound(h)
        audio.setScene('round')
        hud.setVisible(true)
        minimap.setHole(h)
        minimap.setVisible(true)
        hud.setHoleInfo({
            number: h.number,
            par: h.par,
            title: h.number > 0 ? undefined : `Seed ${h.seed}`,
        })
        beginAim(true)
    }

    /** Ready for the next shot: suggest a club and aim down the hole. */
    function beginAim(snap: boolean): void {
        const r = round!
        const suggested = suggestClub(r)
        aim = defaultAim(r, suggested)
        setClub(CLUB_ORDER.indexOf(suggested))
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

    function setClub(index: number): void {
        clubIndex = Math.max(0, Math.min(CLUB_ORDER.length - 1, index))
        const id = club()
        hud.setClub(
            clubIndex,
            id === 'putter' ? PUTTER_FULL_ROLL : nominalCarry(id)
        )
        refreshAim()
    }

    /** Camera, aim ring, minimap and relative wind for the aim and club. */
    function refreshAim(): void {
        if (!round || phase.name !== 'aim') {
            return
        }
        const r = round
        renderer.cameraAddress(r.ball, aim)
        const id = club()
        // The faint ring and the minimap marker show the nominal full-power
        // carry: no wind, slope or lie.
        let landing: Vec3 | null = null
        if (id === 'putter') {
            renderer.setAimRing(null)
        } else {
            const d = nominalCarry(id)
            const x = r.ball.x + Math.cos(aim) * d
            const z = r.ball.z + Math.sin(aim) * d
            landing = { x, y: renderer.groundHeight(x, z), z }
            renderer.setAimRing(landing)
        }
        minimap.update({ ball: r.ball, aim, landing })
        const c = r.hole.conditions
        hud.setWind(c.windSpeed, c.windDirection - aim)
        previewPower = -1
        refreshPreview()
    }

    /** The path preview for the power being charged, else for full power. */
    function refreshPreview(): void {
        if (!round || phase.name !== 'aim') {
            renderer.setPathPreview(null)
            return
        }
        const power = input.isCharging()
            ? Math.max(input.power(), PREVIEW_MIN_POWER)
            : 1
        if (Math.abs(power - previewPower) < PREVIEW_POWER_STEP) {
            return
        }
        previewPower = power
        const id = club()
        const result = simulate(round, { club: id, aim, power })
        renderer.setPathPreview(previewPoints(result, id === 'putter'))
    }

    input.on('aim', (d) => {
        if (phase.name === 'aim') {
            aim += d
            refreshAim()
        }
    })
    input.on('club', (step) => {
        if (phase.name === 'aim') {
            setClub(typeof step === 'number' ? clubIndex + step : step.index)
        }
    })
    hud.onClubSelect((i) => {
        if (phase.name === 'aim') {
            setClub(i)
        }
    })
    input.on('swingStart', () => hud.showHint(false))
    input.on('swingCancel', () => {
        previewPower = -1
        refreshPreview()
    })
    input.on('swingRelease', (power) => {
        if (phase.name === 'aim' && round && power >= MIN_POWER) {
            hit(power)
        }
    })

    // --- Flight --------------------------------------------------------------

    /** Hit the ball with the current club and aim, and start the playback. */
    function hit(power: number): void {
        const r = round!
        const outcome = playShot(r, { club: club(), aim, power })
        const { samples, duration } = outcome.result
        audio.swing(club(), power)
        audio.flightStart(outcome.result, r.hole.pin)
        input.setEnabled(false)
        input.setSkippable(true)
        hud.showSkip(true)
        renderer.setAimRing(null)
        renderer.setPathPreview(null)
        phase = { name: 'flight', samples, duration, t: 0, outcome }
    }

    function skip(): void {
        if (phase.name === 'flight') {
            // No burst of bounces: at most the splash or the cup drop.
            audio.flightSkip()
            phase.t = phase.duration
        } else if (phase.name === 'settle') {
            phase.left = 0
        }
    }
    input.on('skip', skip)
    hud.onSkip(skip)

    function stepFlight(
        p: Extract<Phase, { name: 'flight' }>,
        dt: number
    ): void {
        p.t = Math.min(p.duration, p.t + dt)
        const { pos, vel } = sampleAt(p.samples, p.t)
        const o = p.outcome
        const over = p.t >= p.duration
        // A ball in the water or the cup is gone at the end.
        const lost =
            over && (o.notes.includes('water') || o.notes.includes('holed'))
        renderer.setBall(pos, !lost)
        minimap.update({
            ball: pos,
            aim: Math.atan2(vel.z, vel.x),
            landing: null,
        })
        renderer.cameraFollow(pos, vel)
        audio.flightAdvance(p.t)
        audio.setFlight(
            flightWind(vel, pos.y - renderer.groundHeight(pos.x, pos.z))
        )
        if (over) {
            audio.setFlight(0)
            audio.flightEnd()
            announce(o)
            phase = { name: 'settle', left: SETTLE_S, outcome: o }
        }
    }

    /** The ball has stopped: tell the player what happened. */
    function announce(o: ShotOutcome): void {
        const r = round!
        const notes = o.notes
        if (notes.includes('holed')) {
            hud.toast(scoreName(r.stats.strokes, r.hole.par), {
                tone: 'accent',
                duration: HOLED_TOAST_MS,
            })
            audio.chime(r.stats.strokes < r.hole.par)
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

    /** After the pause: glide to the next shot, or end the round. */
    function afterSettle(): void {
        const r = round!
        if (r.done) {
            phase = { name: 'finish', left: FINISH_S }
            return
        }
        renderer.setBall(r.ball, true)
        renderer.cameraGlideTo(r.ball, defaultAim(r, suggestClub(r)), GLIDE_S)
        hud.showSkip(false)
        input.setSkippable(false)
        phase = { name: 'glide', left: GLIDE_S }
    }

    function finishRound(): void {
        hud.setVisible(false)
        minimap.setVisible(false)
        input.setEnabled(false)
        input.setSkippable(false)
        renderer.cameraOverview()
        audio.setScene('menu')
        phase = { name: 'menu' }
        finishCb?.(round!)
    }

    // --- Frame ---------------------------------------------------------------

    function step(dt: number): void {
        input.update(dt)
        hud.setPower(input.power(), input.isCharging())
        switch (phase.name) {
            case 'aim':
                refreshPreview()
                break
            case 'flight':
                stepFlight(phase, dt)
                break
            case 'settle':
                phase.left -= dt
                if (phase.left <= 0) {
                    afterSettle()
                }
                break
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
    }

    return {
        showMenu,
        startRound,
        onFinish(cb) {
            finishCb = cb
        },
        step,
        round: () => round,
        phase: () => phase.name,
        shoot(power, aimOffset = 0, clubId) {
            if (phase.name !== 'aim' || !round) {
                return
            }
            if (clubId) {
                setClub(CLUB_ORDER.indexOf(clubId))
            }
            aim += aimOffset
            refreshAim()
            hit(power)
        },
    }
}
