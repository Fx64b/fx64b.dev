// The ambient bed: wind, leaves and far birds. All of it is generated; the
// events are random, so nothing repeats as a loop. `tick` schedules what is
// due, so the bed pauses with the audio clock and renders offline too.
import { type Rand, noiseBuffer } from './fx'

export interface Ambient {
    /** Wind speed of the hole in m/s. */
    setWind(speedMs: number): void
    /** 0..1: how much the ball flight (height, speed) lifts the wind. */
    setFlight(amount: number): void
    /** Schedule everything that is due at audio time `now`. */
    tick(now: number): void
    dispose(): void
}

/** Wind speed that counts as a strong wind for the sound, in m/s. */
export const STRONG_WIND = 7.5

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Wind sound parameters for a wind level, gust and flight (all 0..1). */
export function windParams(
    wind: number,
    gust: number,
    flight: number
): { bodyGain: number; bodyFreq: number; airGain: number; airFreq: number } {
    const w = clamp01(wind)
    const f = clamp01(flight)
    const g = 0.7 + 0.5 * clamp01(gust)
    return {
        bodyGain: (0.04 + 0.11 * w) * g * (1 + 0.8 * f),
        bodyFreq: 240 + 460 * w + 180 * (g - 0.7) + 420 * f,
        airGain: (0.005 + 0.02 * w) * g + 0.014 * f,
        airFreq: 1000 + 700 * w + 500 * f,
    }
}

/**
 * Six seconds of soft (pink) stereo noise. The end is cross-faded into the
 * start, so the loop has no click.
 */
function windBuffer(ctx: BaseAudioContext, rand: Rand): AudioBuffer {
    const rate = ctx.sampleRate
    const n = Math.floor(rate * 6)
    const fade = Math.floor(rate * 0.25)
    const buf = ctx.createBuffer(2, n, rate)
    for (let ch = 0; ch < 2; ch++) {
        const raw = new Float32Array(n + fade)
        // Paul Kellet's pink filter.
        let b0 = 0
        let b1 = 0
        let b2 = 0
        for (let i = 0; i < raw.length; i++) {
            const white = rand() * 2 - 1
            b0 = 0.99765 * b0 + white * 0.099046
            b1 = 0.963 * b1 + white * 0.2965164
            b2 = 0.57 * b2 + white * 1.0526913
            raw[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22
        }
        const d = buf.getChannelData(ch)
        for (let i = 0; i < n; i++) {
            d[i] = raw[i]
        }
        for (let i = 0; i < fade; i++) {
            const x = i / fade
            d[i] = raw[i] * x + raw[n + i] * (1 - x)
        }
    }
    return buf
}

type BirdKind = 'tit' | 'song' | 'chirp' | 'dove'

export function createAmbient(
    ctx: BaseAudioContext,
    out: AudioNode,
    reverb: AudioNode,
    rand: Rand = Math.random
): Ambient {
    const range = (a: number, b: number): number => a + (b - a) * rand()

    // --- Wind ----------------------------------------------------------
    const buffer = windBuffer(ctx, rand)
    const sources: AudioBufferSourceNode[] = []
    function loop(rate: number): AudioBufferSourceNode {
        const s = ctx.createBufferSource()
        s.buffer = buffer
        s.loop = true
        s.playbackRate.value = rate
        s.start(0, rand() * 5)
        sources.push(s)
        return s
    }
    // Two loops at different speeds: their sum repeats only after minutes.
    const slow = loop(0.83)
    const fast = loop(1.09)

    const body = ctx.createBiquadFilter()
    body.type = 'lowpass'
    body.Q.value = 0.4
    const bodyGain = ctx.createGain()
    slow.connect(body).connect(bodyGain).connect(out)

    const air = ctx.createBiquadFilter()
    air.type = 'bandpass'
    air.Q.value = 0.5
    const airGain = ctx.createGain()
    fast.connect(air).connect(airGain).connect(out)

    // A very faint, low, far-away hum of the open land.
    const far = ctx.createBiquadFilter()
    far.type = 'lowpass'
    far.frequency.value = 120
    const farGain = ctx.createGain()
    farGain.gain.value = 0.05
    fast.connect(far).connect(farGain).connect(out)

    let wind = 0.3
    let flight = 0
    let gust = 0.5
    let gustTarget = 0.5
    let nextGust = 0
    let nextApply = 0
    let lastApply = -1

    const p0 = windParams(wind, gust, 0)
    body.frequency.value = p0.bodyFreq
    bodyGain.gain.value = p0.bodyGain
    air.frequency.value = p0.airFreq
    airGain.gain.value = p0.airGain

    function applyWind(now: number): void {
        const dt = lastApply < 0 ? 0 : Math.min(1, now - lastApply)
        lastApply = now
        gust += (gustTarget - gust) * (1 - Math.exp(-dt / 1.6))
        const p = windParams(wind, gust, flight)
        const tc = 0.25
        body.frequency.setTargetAtTime(p.bodyFreq, now, tc)
        bodyGain.gain.setTargetAtTime(p.bodyGain, now, tc)
        air.frequency.setTargetAtTime(p.airFreq, now, tc)
        airGain.gain.setTargetAtTime(p.airGain, now, tc)
    }

    // --- Leaves --------------------------------------------------------
    let nextRustle = range(3, 9)

    function pan(node: AudioNode, value: number): AudioNode {
        if (typeof ctx.createStereoPanner !== 'function') {
            return node
        }
        const p = ctx.createStereoPanner()
        p.pan.value = value
        node.connect(p)
        return p
    }

    function rustle(t: number): void {
        const dur = range(1.4, 3.4)
        const src = ctx.createBufferSource()
        src.buffer = noiseBuffer(ctx)
        src.loop = true
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = range(3800, 6200)
        bp.Q.value = 0.45
        const g = ctx.createGain()
        // A swell with a flutter in it, like leaves in a passing breeze.
        const peak = (0.012 + 0.03 * wind) * range(0.6, 1)
        const n = 40
        const curve = new Float32Array(n)
        let flutter = 0.7
        for (let i = 0; i < n; i++) {
            const x = i / (n - 1)
            flutter += (range(0.35, 1) - flutter) * 0.55
            curve[i] = peak * Math.sin(Math.PI * x) ** 1.5 * flutter
        }
        curve[0] = 0
        curve[n - 1] = 0
        g.gain.setValueAtTime(0, t)
        g.gain.setValueCurveAtTime(curve, t, dur)
        src.connect(bp).connect(g)
        pan(g, range(-0.8, 0.8)).connect(out)
        src.start(t, rand() * 1.5)
        src.stop(t + dur + 0.05)
    }

    // --- Birds ---------------------------------------------------------
    let nextBird = range(1.5, 4)

    /** One sliding note of a bird. */
    function note(
        dest: AudioNode,
        t: number,
        f0: number,
        f1: number,
        dur: number,
        gain: number,
        fMid?: number
    ): void {
        const osc = ctx.createOscillator()
        osc.frequency.setValueAtTime(f0, t)
        if (fMid) {
            osc.frequency.exponentialRampToValueAtTime(fMid, t + dur * 0.45)
        }
        osc.frequency.exponentialRampToValueAtTime(f1, t + dur)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(gain, t + dur * 0.25)
        g.gain.linearRampToValueAtTime(gain * 0.7, t + dur * 0.7)
        g.gain.linearRampToValueAtTime(0, t + dur)
        osc.connect(g).connect(dest)
        osc.start(t)
        osc.stop(t + dur + 0.02)
    }

    function bird(t: number, kind: BirdKind): number {
        // Each call is a bird at its own place: near ones are clearer,
        // far ones are quieter, duller and more in the room.
        const near = range(0.25, 1)
        const voice = ctx.createGain()
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 3500 + 4500 * near
        const dry = ctx.createGain()
        dry.gain.value = 0.35 + 0.65 * near
        const wet = ctx.createGain()
        wet.gain.value = 0.9 - 0.4 * near
        voice.connect(lp)
        const placed = pan(lp, range(-0.9, 0.9))
        placed.connect(dry).connect(out)
        placed.connect(wet).connect(reverb)

        const level = 0.036 * range(0.7, 1)
        let at = t
        if (kind === 'tit') {
            // Two notes, high then low, a few times.
            const f = range(4000, 5200)
            const low = f * range(0.74, 0.82)
            const beat = range(0.36, 0.46)
            const reps = 2 + Math.floor(rand() * 3)
            for (let i = 0; i < reps; i++) {
                note(voice, at, f, f * 0.98, 0.12, level)
                note(voice, at + beat * 0.45, low, low * 0.97, 0.14, level)
                at += beat
            }
        } else if (kind === 'song') {
            // A slow, mellow phrase of sliding whistles.
            const notes = 4 + Math.floor(rand() * 4)
            let f = range(1900, 2700)
            for (let i = 0; i < notes; i++) {
                const dur = range(0.12, 0.3)
                const to = Math.min(3400, Math.max(1500, f * range(0.8, 1.3)))
                note(voice, at, f, to, dur, level * 1.1, f * range(0.95, 1.12))
                f = to * range(0.9, 1.1)
                at += dur + range(0.03, 0.14)
            }
        } else if (kind === 'chirp') {
            // Quick, light chirps.
            const chirps = 3 + Math.floor(rand() * 4)
            const f = range(3000, 3900)
            for (let i = 0; i < chirps; i++) {
                const top = f * range(1.3, 1.55)
                note(voice, at, f, f * 1.08, 0.075, level * 0.8, top)
                at += range(0.11, 0.26)
            }
        } else {
            // A wood pigeon far away: low, round, unhurried.
            const f = range(430, 500)
            const shape = [
                [0.3, 1, 0.12],
                [0.48, 1.07, 0.12],
                [0.34, 1, 0.26],
                [0.3, 0.97, 0.1],
                [0.24, 0.95, 0.5],
            ]
            for (const [dur, pitch, gap] of shape) {
                note(
                    voice,
                    at,
                    f * pitch * 0.96,
                    f * pitch * 0.93,
                    dur,
                    level * 1.6,
                    f * pitch
                )
                at += dur + gap
            }
        }
        return at
    }

    function pickBird(): BirdKind {
        const r = rand()
        return r < 0.3 ? 'tit' : r < 0.62 ? 'song' : r < 0.88 ? 'chirp' : 'dove'
    }

    return {
        setWind(speedMs) {
            wind = clamp01(speedMs / STRONG_WIND)
        },
        setFlight(amount) {
            flight = clamp01(amount)
        },
        tick(now) {
            if (now >= nextGust) {
                gustTarget = rand()
                nextGust = now + range(2.5, 7)
            }
            if (now >= nextApply) {
                applyWind(now)
                nextApply = now + 0.1
            }
            if (now >= nextRustle) {
                rustle(now + 0.05)
                nextRustle = now + range(7, 20) / (0.6 + wind)
            }
            if (now >= nextBird) {
                const kind = pickBird()
                let end = bird(now + 0.05, kind)
                // Sometimes another one answers.
                if (rand() < 0.25) {
                    end = bird(end + range(0.4, 1.6), kind)
                }
                nextBird = end + range(3.5, 13)
            }
        },
        dispose() {
            for (const s of sources) {
                try {
                    s.stop()
                    s.disconnect()
                } catch {
                    // Already stopped.
                }
            }
        },
    }
}
