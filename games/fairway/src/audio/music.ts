// The background music as sound: soft keys, a warm pad and a low bass,
// played from the generated score (score.ts). Bars are scheduled a little
// ahead on the audio clock, so the timing never drifts and the music stops
// with the clock.
import {
    BEATS_PER_BAR,
    type Composer,
    type MusicNote,
    createComposer,
    midiToHz,
} from './score'

export interface Music {
    /** New music from the next bar on (a new hole). */
    setSeed(seed: string): void
    /** Schedule the bars that are due at audio time `now`. */
    tick(now: number): void
    dispose(): void
}

/** Overall level of the music voices. */
const MUSIC_TRIM = 0.2

/** How far ahead of the audio clock a bar is scheduled, in s. */
const LOOKAHEAD_S = 0.8

export function createMusic(
    ctx: BaseAudioContext,
    out: AudioNode,
    seed: string
): Music {
    // Everything passes one lowpass: no bright edges.
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 1900
    tone.Q.value = 0.3
    // The music is very faint; the bus in index.ts only shapes it.
    const trim = ctx.createGain()
    trim.gain.value = MUSIC_TRIM
    tone.connect(trim).connect(out)

    const padTone = ctx.createBiquadFilter()
    padTone.type = 'lowpass'
    padTone.frequency.value = 620
    padTone.Q.value = 0.2
    padTone.connect(tone)

    let composer: Composer = createComposer(seed)
    let wanted = seed
    let current = seed
    let nextBar = -1

    function partial(
        dest: AudioNode,
        t: number,
        freq: number,
        gain: number,
        attack: number,
        decay: number,
        hold: number,
        type: OscillatorType = 'sine',
        detune = 0
    ): void {
        const osc = ctx.createOscillator()
        osc.type = type
        osc.frequency.value = freq
        osc.detune.value = detune
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(gain, t + attack)
        // Let it ring, then let go.
        g.gain.setTargetAtTime(gain * 0.35, t + attack, decay)
        g.gain.setTargetAtTime(0, t + attack + hold, decay * 0.5)
        osc.connect(g).connect(dest)
        osc.start(t)
        osc.stop(t + attack + hold + decay * 4)
    }

    function play(note: MusicNote, t: number, beat: number): void {
        const freq = midiToHz(note.midi)
        const length = note.beats * beat
        const v = note.velocity
        if (note.voice === 'keys') {
            // A felt piano: a soft start, a round body, little overtone.
            // Lower notes ring longer.
            const decay = 0.5 + 0.9 * Math.min(1, 220 / freq)
            let dest: AudioNode = tone
            if (typeof ctx.createStereoPanner === 'function') {
                const pan = ctx.createStereoPanner()
                pan.pan.value = Math.max(
                    -0.4,
                    Math.min(0.4, (note.midi - 66) / 40)
                )
                pan.connect(tone)
                dest = pan
            }
            partial(dest, t, freq, 0.2 * v, 0.014, decay, length)
            partial(dest, t, freq * 2, 0.035 * v, 0.01, decay * 0.45, length)
            partial(dest, t, freq * 3, 0.008 * v, 0.008, decay * 0.25, length)
        } else if (note.voice === 'pad') {
            // Two slightly detuned voices that swell in and out.
            const attack = Math.min(2.4, length * 0.3)
            for (const detune of [-5, 6]) {
                const osc = ctx.createOscillator()
                osc.type = 'triangle'
                osc.frequency.value = freq
                osc.detune.value = detune
                const g = ctx.createGain()
                g.gain.setValueAtTime(0, t)
                g.gain.linearRampToValueAtTime(0.03 * v, t + attack)
                g.gain.setTargetAtTime(0, t + length - 0.5, 1.1)
                osc.connect(g).connect(padTone)
                osc.start(t)
                osc.stop(t + length + 5)
            }
        } else {
            partial(tone, t, freq, 0.14 * v, 0.25, 2.5, length * 0.7)
        }
    }

    return {
        setSeed(s) {
            wanted = s
        },
        tick(now) {
            if (nextBar < 0 || now > nextBar + 1) {
                // The first bar, or the clock ran on without us.
                nextBar = now + 0.25
            }
            let guard = 0
            while (nextBar < now + LOOKAHEAD_S && guard++ < 4) {
                if (wanted !== current) {
                    current = wanted
                    composer = createComposer(current)
                }
                const beat = 60 / composer.bpm
                const bar = composer.next()
                for (const note of bar.notes) {
                    play(note, nextBar + note.beat * beat, beat)
                }
                nextBar += BEATS_PER_BAR * beat
            }
        },
        dispose() {
            try {
                trim.disconnect()
                padTone.disconnect()
            } catch {
                // Ignore.
            }
        },
    }
}
