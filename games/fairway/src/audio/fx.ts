// Sound effects, synthesized with Web Audio. Every function schedules a few
// short-lived nodes into `out` at time `t`; nothing is loaded from a file.
// They take a BaseAudioContext, so an OfflineAudioContext can render them.
import type { ImpactSound, LandingSound } from './cues'

/** A random source; tests and offline renders can pass a seeded one. */
export type Rand = () => number

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>()

/** Two seconds of white noise, shared by all effects of a context. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
    let buf = noiseCache.get(ctx)
    if (!buf) {
        const n = Math.floor(ctx.sampleRate * 2)
        buf = ctx.createBuffer(1, n, ctx.sampleRate)
        const d = buf.getChannelData(0)
        for (let i = 0; i < n; i++) {
            d[i] = Math.random() * 2 - 1
        }
        noiseCache.set(ctx, buf)
    }
    return buf
}

/**
 * A small generated room: decaying noise that gets darker with time. It
 * gives the birds and the far sounds some distance.
 */
export function impulseResponse(
    ctx: BaseAudioContext,
    seconds = 1.6
): AudioBuffer {
    const n = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, n, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch)
        let lp = 0
        for (let i = 0; i < n; i++) {
            const x = i / n
            // One-pole lowpass that closes as the tail decays.
            const k = 0.5 - 0.42 * x
            lp += k * (Math.random() * 2 - 1 - lp)
            const onset = Math.min(1, i / (0.012 * ctx.sampleRate))
            d[i] = lp * onset * Math.pow(1 - x, 2.4) * Math.exp(-3.2 * x)
        }
    }
    return buf
}

interface NoiseOpts {
    type: BiquadFilterType
    freq: number
    /** Sweep the filter to this frequency over the sound. */
    freqEnd?: number
    q?: number
    gain: number
    attack?: number
    decay: number
}

/** A burst of filtered noise with a fast attack and an exponential decay. */
function noiseBurst(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    o: NoiseOpts
): void {
    if (o.gain <= 0) {
        return
    }
    const attack = o.attack ?? 0.002
    const len = attack + o.decay * 5
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    const filter = ctx.createBiquadFilter()
    filter.type = o.type
    filter.frequency.setValueAtTime(o.freq, t)
    if (o.freqEnd) {
        filter.frequency.exponentialRampToValueAtTime(o.freqEnd, t + len)
    }
    filter.Q.value = o.q ?? 0.7
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(o.gain, t + attack)
    g.gain.setTargetAtTime(0, t + attack, o.decay)
    src.connect(filter).connect(g).connect(out)
    src.start(t, Math.random() * 1.5)
    src.stop(t + len)
}

interface ToneOpts {
    freq: number
    freqEnd?: number
    /** Time constant of the pitch fall, in s. Default: the decay. */
    glide?: number
    gain: number
    attack?: number
    decay: number
    type?: OscillatorType
}

/** A short sine (or triangle) with a pitch glide: thumps, taps and pings. */
function tone(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    o: ToneOpts
): void {
    if (o.gain <= 0) {
        return
    }
    const attack = o.attack ?? 0.003
    const len = attack + o.decay * 6
    const osc = ctx.createOscillator()
    osc.type = o.type ?? 'sine'
    osc.frequency.setValueAtTime(o.freq, t)
    if (o.freqEnd) {
        osc.frequency.setTargetAtTime(o.freqEnd, t, o.glide ?? o.decay)
    }
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(o.gain, t + attack)
    g.gain.setTargetAtTime(0, t + attack, o.decay)
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + len)
}

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v
}

/** The club through the air: a soft, short rush that rises and falls. */
export function playWhoosh(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    power: number
): void {
    const p = clamp01(power)
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.9
    const top = 900 + 1500 * p
    bp.frequency.setValueAtTime(380, t)
    bp.frequency.exponentialRampToValueAtTime(top, t + 0.09)
    bp.frequency.exponentialRampToValueAtTime(520, t + 0.36)
    const g = ctx.createGain()
    const peak = 0.04 + 0.26 * p * p
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.085)
    g.gain.setTargetAtTime(0, t + 0.1, 0.07)
    src.connect(bp).connect(g).connect(out)
    src.start(t, Math.random())
    src.stop(t + 0.6)
}

/** The club on the ball. */
export function playImpact(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    kind: ImpactSound,
    power: number
): void {
    const p = clamp01(power)
    const level = 0.25 + 0.75 * p
    if (kind === 'wood') {
        // A fuller thwack: a low body, a woody knock and a short crack.
        tone(ctx, out, t, {
            freq: 210,
            freqEnd: 105,
            glide: 0.03,
            gain: 0.36 * level,
            decay: 0.045,
        })
        tone(ctx, out, t, {
            freq: 860,
            freqEnd: 700,
            gain: 0.16 * level,
            decay: 0.018,
            type: 'triangle',
        })
        noiseBurst(ctx, out, t, {
            type: 'bandpass',
            freq: 2100,
            q: 0.8,
            gain: 0.24 * level,
            decay: 0.014,
        })
        noiseBurst(ctx, out, t, {
            type: 'lowpass',
            freq: 700,
            gain: 0.2 * level,
            decay: 0.04,
        })
    } else if (kind === 'iron') {
        // A crisper click with a little turf after it.
        noiseBurst(ctx, out, t, {
            type: 'highpass',
            freq: 2400,
            gain: 0.2 * level,
            attack: 0.001,
            decay: 0.007,
        })
        tone(ctx, out, t, {
            freq: 2700,
            freqEnd: 2300,
            gain: 0.1 * level,
            attack: 0.001,
            decay: 0.012,
        })
        tone(ctx, out, t, {
            freq: 320,
            freqEnd: 170,
            glide: 0.025,
            gain: 0.22 * level,
            decay: 0.03,
        })
        noiseBurst(ctx, out, t + 0.012, {
            type: 'bandpass',
            freq: 1300,
            q: 0.6,
            gain: 0.07 * level,
            attack: 0.008,
            decay: 0.035,
        })
    } else {
        // A soft tap.
        tone(ctx, out, t, {
            freq: 640,
            freqEnd: 470,
            glide: 0.02,
            gain: 0.1 + 0.14 * p,
            decay: 0.022,
        })
        noiseBurst(ctx, out, t, {
            type: 'lowpass',
            freq: 1500,
            gain: 0.03 + 0.05 * p,
            decay: 0.006,
        })
    }
}

/** The ball on the ground. `gain` already holds the distance gain. */
export function playLanding(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    sound: LandingSound,
    gain: number
): void {
    const g = Math.max(0, gain)
    switch (sound) {
        case 'thud':
            tone(ctx, out, t, {
                freq: 125,
                freqEnd: 62,
                glide: 0.04,
                gain: 0.5 * g,
                decay: 0.05,
            })
            noiseBurst(ctx, out, t, {
                type: 'lowpass',
                freq: 520,
                gain: 0.22 * g,
                decay: 0.03,
            })
            break
        case 'softThud':
            // Longer grass: duller, with a small rustle.
            tone(ctx, out, t, {
                freq: 100,
                freqEnd: 55,
                glide: 0.04,
                gain: 0.3 * g,
                attack: 0.006,
                decay: 0.05,
            })
            noiseBurst(ctx, out, t, {
                type: 'bandpass',
                freq: 2600,
                q: 0.5,
                gain: 0.05 * g,
                attack: 0.012,
                decay: 0.05,
            })
            break
        case 'pat':
            tone(ctx, out, t, {
                freq: 175,
                freqEnd: 95,
                glide: 0.025,
                gain: 0.3 * g,
                decay: 0.032,
            })
            noiseBurst(ctx, out, t, {
                type: 'lowpass',
                freq: 800,
                gain: 0.1 * g,
                decay: 0.016,
            })
            break
        case 'sand':
            // A sandy puff: no body, a soft hiss that opens and fades.
            noiseBurst(ctx, out, t, {
                type: 'bandpass',
                freq: 3400,
                freqEnd: 1900,
                q: 0.5,
                gain: 0.2 * g,
                attack: 0.012,
                decay: 0.07,
            })
            tone(ctx, out, t, {
                freq: 85,
                freqEnd: 50,
                gain: 0.16 * g,
                attack: 0.008,
                decay: 0.04,
            })
            break
    }
}

/** The ball in the water: a low plop, a spray and a few drops. */
export function playSplash(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    gain: number,
    rand: Rand = Math.random
): void {
    const g = Math.max(0, gain)
    tone(ctx, out, t, {
        freq: 190,
        freqEnd: 60,
        glide: 0.05,
        gain: 0.36 * g,
        attack: 0.005,
        decay: 0.07,
    })
    noiseBurst(ctx, out, t, {
        type: 'bandpass',
        freq: 1100,
        freqEnd: 2600,
        q: 0.6,
        gain: 0.26 * g,
        attack: 0.02,
        decay: 0.13,
    })
    noiseBurst(ctx, out, t + 0.05, {
        type: 'highpass',
        freq: 4200,
        gain: 0.06 * g,
        attack: 0.05,
        decay: 0.16,
    })
    const drops = 3 + Math.floor(rand() * 3)
    for (let i = 0; i < drops; i++) {
        const f = 700 + rand() * 1300
        tone(ctx, out, t + 0.16 + rand() * 0.5, {
            freq: f,
            freqEnd: f * 1.7,
            glide: 0.03,
            gain: (0.025 + rand() * 0.035) * g,
            decay: 0.018,
        })
    }
}

/** One knock of the ball on the cup wall: two hollow resonances. */
function cupKnock(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    gain: number,
    detune: number
): void {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(ctx)
    const env = ctx.createGain()
    env.gain.setValueAtTime(gain * 2.4, t)
    env.gain.setTargetAtTime(0, t, 0.004)
    src.connect(env)
    for (const [freq, q, level] of [
        [540, 14, 1],
        [1180, 18, 0.55],
        [1950, 16, 0.22],
    ]) {
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = freq * detune
        bp.Q.value = q
        const g = ctx.createGain()
        g.gain.value = level
        env.connect(bp).connect(g).connect(out)
    }
    src.start(t, Math.random() * 1.5)
    src.stop(t + 0.2)
    tone(ctx, out, t, {
        freq: 300 * detune,
        freqEnd: 240 * detune,
        gain: gain * 0.22,
        decay: 0.03,
    })
}

/** The ball drops into the cup: a hollow rattle that settles. */
export function playCup(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    gain: number,
    rand: Rand = Math.random
): void {
    const g = Math.max(0, gain)
    let at = t
    let level = 1.2 * g
    let gap = 0.085 + rand() * 0.02
    for (let i = 0; i < 6; i++) {
        cupKnock(ctx, out, at, level, 0.96 + rand() * 0.09)
        at += gap
        gap *= 0.66
        level *= 0.62
    }
}

/** The ball catches the edge of the cup and runs on. */
export function playLipOut(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    gain: number
): void {
    const g = Math.max(0, gain)
    cupKnock(ctx, out, t, 0.45 * g, 1.22)
    noiseBurst(ctx, out, t, {
        type: 'bandpass',
        freq: 2200,
        q: 1.2,
        gain: 0.03 * g,
        attack: 0.01,
        decay: 0.04,
    })
}

/**
 * A quiet two or three note chime for a holed ball. `under` adds a third,
 * higher note for a score under par.
 */
export function playChime(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number,
    under: boolean,
    gain = 1
): void {
    // E5, B5 and (under par) E6.
    const notes = under ? [659.25, 987.77, 1318.51] : [659.25, 987.77]
    notes.forEach((freq, i) => {
        const at = t + i * 0.14
        tone(ctx, out, at, {
            freq,
            gain: (0.05 - i * 0.008) * gain,
            attack: 0.02,
            decay: 0.42,
        })
        tone(ctx, out, at, {
            freq: freq * 2.01,
            gain: 0.008 * gain,
            attack: 0.02,
            decay: 0.2,
        })
    })
}

/** A very soft tick for menu buttons. */
export function playUiClick(
    ctx: BaseAudioContext,
    out: AudioNode,
    t: number
): void {
    tone(ctx, out, t, {
        freq: 980,
        freqEnd: 760,
        glide: 0.012,
        gain: 0.045,
        attack: 0.002,
        decay: 0.014,
    })
    noiseBurst(ctx, out, t, {
        type: 'bandpass',
        freq: 2600,
        q: 1,
        gain: 0.012,
        decay: 0.005,
    })
}
