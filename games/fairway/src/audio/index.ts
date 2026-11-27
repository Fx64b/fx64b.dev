// Fairway sound: a calm ambient bed and soft effects, all synthesized with
// the Web Audio API. The context is created on the first user gesture, and
// every call is safe (and silent) when Web Audio is missing or blocked.
import type { ClubId, ShotResult } from '../physics'
import type { Vec3 } from '../shared/hole'
import { type Ambient, createAmbient } from './ambient'
import {
    type CuePlayer,
    type FlightCue,
    createCuePlayer,
    distanceBetween,
    distanceGain,
    flightCues,
    impactSound,
} from './cues'
import {
    impulseResponse,
    playChime,
    playCup,
    playImpact,
    playLanding,
    playLipOut,
    playSplash,
    playUiClick,
    playWhoosh,
} from './fx'

export * from './cues'
export { STRONG_WIND, windParams } from './ambient'

export type AudioScene = 'menu' | 'round'

export interface AudioInfo {
    /** False if the browser has no Web Audio (or it failed to start). */
    supported: boolean
    enabled: boolean
    /** State of the AudioContext, or 'none' before the first gesture. */
    state: string
    volume: number
}

export interface GameAudio {
    /** Sound on or off (the mute toggle). */
    enabled(): boolean
    setEnabled(on: boolean): void
    /** Master volume 0..1. */
    setVolume(v: number): void
    /** A user gesture happened. The audio also listens for it itself. */
    unlock(): void
    /** Menus are a little quieter than the round. */
    setScene(scene: AudioScene): void
    /** Wind speed of the hole in m/s: level and brightness of the wind. */
    setWind(speedMs: number): void
    /** 0..1: the ball flight (height, speed) lifts the wind a little. */
    setFlight(amount: number): void
    /** The camera position, for the distance gain. */
    setListener(pos: Vec3): void
    /** Call every frame: schedules the ambient events. */
    update(): void
    /** The swing and the club on the ball. */
    swing(club: ClubId, power: number): void
    /** A shot starts its playback. `pin` enables the lip-out sound. */
    flightStart(result: ShotResult, pin?: Vec3): void
    /** Playback time of the shot: plays the bounces that are due. */
    flightAdvance(t: number): void
    /** The player skipped: at most the splash or the cup drop plays. */
    flightSkip(): void
    /** A soft chime after a holed ball. */
    chime(underPar: boolean): void
    uiClick(): void
    info(): AudioInfo
    dispose(): void
}

export interface AudioOptions {
    /** Start with the sound on. Default true. */
    enabled?: boolean
    /** Master volume 0..1. Default 0.8. */
    volume?: number
    /** Makes the context; for tests. Default: window.AudioContext. */
    createContext?: () => AudioContext | null
}

/** Level of the ambient bed in a round and in the menus. */
const AMBIENT_ROUND = 1
const AMBIENT_MENU = 0.65
const FX_LEVEL = 0.9
const FADE_IN_S = 0.6
const FADE_OUT_S = 0.25

function defaultContext(): AudioContext | null {
    if (typeof window === 'undefined') {
        return null
    }
    const w = window as unknown as {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
    }
    const Ctor = w.AudioContext ?? w.webkitAudioContext
    return Ctor ? new Ctor({ latencyHint: 'interactive' }) : null
}

interface Graph {
    ctx: AudioContext
    /** Effects go in here (dry, plus a little room). */
    fx: GainNode
    ambientBus: GainNode
    volume: GainNode
    /** 0 when muted or the page is hidden, else 1. */
    fade: GainNode
    ambient: Ambient
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

export function createAudio(opts: AudioOptions = {}): GameAudio {
    const make = opts.createContext ?? defaultContext
    let on = opts.enabled ?? true
    let volume = clamp01(opts.volume ?? 0.8)
    let supported = true
    let unlocked = false
    let graph: Graph | null = null
    let scene: AudioScene = 'menu'
    let wind = 0
    let listener: Vec3 | null = null
    let cues: CuePlayer | null = null
    let suspendTimer: ReturnType<typeof setTimeout> | null = null

    function hidden(): boolean {
        return typeof document !== 'undefined' && document.hidden === true
    }

    function build(): Graph | null {
        const ctx = make()
        if (!ctx) {
            return null
        }
        // A gentle compressor and a limiter-like second stage keep the
        // sum of wind, birds and effects away from clipping.
        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = -20
        comp.knee.value = 14
        comp.ratio.value = 5
        comp.attack.value = 0.004
        comp.release.value = 0.22
        const ceiling = ctx.createGain()
        ceiling.gain.value = 0.85
        comp.connect(ceiling).connect(ctx.destination)

        const fade = ctx.createGain()
        fade.gain.value = 0
        fade.connect(comp)
        const vol = ctx.createGain()
        vol.gain.value = volume
        vol.connect(fade)

        const room = ctx.createConvolver()
        room.buffer = impulseResponse(ctx)
        const roomReturn = ctx.createGain()
        roomReturn.gain.value = 0.5
        room.connect(roomReturn).connect(vol)

        const fx = ctx.createGain()
        fx.gain.value = FX_LEVEL
        fx.connect(vol)
        const fxSend = ctx.createGain()
        fxSend.gain.value = 0.16
        fx.connect(fxSend).connect(room)

        const ambientBus = ctx.createGain()
        ambientBus.gain.value = scene === 'menu' ? AMBIENT_MENU : AMBIENT_ROUND
        ambientBus.connect(vol)
        const ambientRoom = ctx.createGain()
        ambientRoom.gain.value = 3
        ambientRoom.connect(room)
        const ambient = createAmbient(ctx, ambientBus, ambientRoom)
        ambient.setWind(wind)
        return { ctx, fx, ambientBus, volume: vol, fade, ambient }
    }

    /** Bring the context and the fade in line with the wanted state. */
    function sync(): void {
        const want = on && unlocked && !hidden()
        if (want && !graph && supported) {
            try {
                graph = build()
            } catch {
                graph = null
            }
            if (!graph) {
                supported = false
            }
        }
        const g = graph
        if (!g) {
            return
        }
        if (suspendTimer) {
            clearTimeout(suspendTimer)
            suspendTimer = null
        }
        try {
            const now = g.ctx.currentTime
            if (want) {
                if (g.ctx.state !== 'running') {
                    void g.ctx.resume().catch(() => {})
                }
                g.fade.gain.setTargetAtTime(1, now, FADE_IN_S / 3)
            } else {
                g.fade.gain.setTargetAtTime(0, now, FADE_OUT_S / 3)
                // Let the fade end, then stop the audio clock.
                suspendTimer = setTimeout(
                    () => {
                        suspendTimer = null
                        if (g.ctx.state === 'running') {
                            void g.ctx.suspend().catch(() => {})
                        }
                    },
                    FADE_OUT_S * 1000 + 150
                )
            }
        } catch {
            // A closed or broken context: stay silent.
        }
    }

    /** The graph if a sound can play now, else null. */
    function live(): Graph | null {
        return graph && on && unlocked && !hidden() ? graph : null
    }

    function fxAt(position?: Vec3): number {
        return position && listener
            ? distanceGain(distanceBetween(listener, position))
            : 1
    }

    function play(fn: (g: Graph, t: number) => void): void {
        const g = live()
        if (!g) {
            return
        }
        try {
            fn(g, g.ctx.currentTime + 0.012)
        } catch {
            // Never let a sound break the game.
        }
    }

    function playCue(cue: FlightCue): void {
        const gain = cue.intensity * fxAt(cue.position)
        play((g, t) => {
            switch (cue.kind) {
                case 'bounce':
                    if (cue.sound) {
                        playLanding(g.ctx, g.fx, t, cue.sound, gain)
                    }
                    break
                case 'splash':
                    playSplash(g.ctx, g.fx, t, 0.45 + 0.55 * gain)
                    break
                case 'cup':
                    playCup(g.ctx, g.fx, t, Math.max(0.5, gain))
                    break
                case 'lip':
                    playLipOut(g.ctx, g.fx, t, Math.max(0.5, gain))
                    break
            }
        })
    }

    const onGesture = (): void => {
        const first = !unlocked
        unlocked = true
        // Also wakes a context that the system interrupted.
        if (first || (graph && on && graph.ctx.state !== 'running')) {
            sync()
        }
    }
    const onVisibility = (): void => sync()
    const GESTURES = [
        'pointerdown',
        'pointerup',
        'touchend',
        'click',
        'keydown',
    ] as const
    if (typeof window !== 'undefined') {
        for (const type of GESTURES) {
            window.addEventListener(type, onGesture, {
                capture: true,
                passive: true,
            })
        }
    }
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibility)
    }

    return {
        enabled: () => on,
        setEnabled(v) {
            if (on !== v) {
                on = v
                sync()
            }
        },
        setVolume(v) {
            volume = clamp01(v)
            const g = graph
            if (g) {
                try {
                    g.volume.gain.setTargetAtTime(
                        volume,
                        g.ctx.currentTime,
                        0.05
                    )
                } catch {
                    // Ignore.
                }
            }
        },
        unlock: onGesture,
        setScene(s) {
            if (scene === s) {
                return
            }
            scene = s
            const g = graph
            if (g) {
                try {
                    g.ambientBus.gain.setTargetAtTime(
                        s === 'menu' ? AMBIENT_MENU : AMBIENT_ROUND,
                        g.ctx.currentTime,
                        0.6
                    )
                } catch {
                    // Ignore.
                }
            }
        },
        setWind(speedMs) {
            wind = Number.isFinite(speedMs) ? Math.max(0, speedMs) : 0
            graph?.ambient.setWind(wind)
        },
        setFlight(amount) {
            graph?.ambient.setFlight(amount)
        },
        setListener(pos) {
            listener = { x: pos.x, y: pos.y, z: pos.z }
        },
        update() {
            const g = live()
            if (g && g.ctx.state === 'running') {
                try {
                    g.ambient.tick(g.ctx.currentTime)
                } catch {
                    // Ignore.
                }
            }
        },
        swing(club, power) {
            const kind = impactSound(club)
            play((g, t) => {
                if (kind !== 'putter') {
                    playWhoosh(g.ctx, g.fx, t, power)
                }
                // The whoosh peaks as the club meets the ball.
                const hit = kind === 'putter' ? t : t + 0.085
                playImpact(g.ctx, g.fx, hit, kind, power)
            })
        },
        flightStart(result, pin) {
            cues = createCuePlayer(flightCues(result, pin))
        },
        flightAdvance(t) {
            if (cues) {
                for (const cue of cues.advance(t)) {
                    playCue(cue)
                }
            }
        },
        flightSkip() {
            if (cues) {
                for (const cue of cues.skip()) {
                    playCue(cue)
                }
            }
        },
        chime(underPar) {
            play((g, t) => playChime(g.ctx, g.fx, t + 0.5, underPar))
        },
        uiClick() {
            play((g, t) => playUiClick(g.ctx, g.fx, t))
        },
        info: () => ({
            supported,
            enabled: on,
            state: graph ? graph.ctx.state : 'none',
            volume,
        }),
        dispose() {
            if (typeof window !== 'undefined') {
                for (const type of GESTURES) {
                    window.removeEventListener(type, onGesture, {
                        capture: true,
                    })
                }
            }
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility)
            }
            if (suspendTimer) {
                clearTimeout(suspendTimer)
                suspendTimer = null
            }
            const g = graph
            graph = null
            cues = null
            if (g) {
                try {
                    g.ambient.dispose()
                    void g.ctx.close().catch(() => {})
                } catch {
                    // Ignore.
                }
            }
        },
    }
}
