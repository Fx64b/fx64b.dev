// The background music as notes: slow, warm chords and sparse melody
// fragments, generated from a seed. Pure: no Web Audio in here. The same
// seed always gives the same music; it never repeats as a loop.
import { hashString, sfc32 } from '../course/prng'

export type MusicVoice = 'keys' | 'pad' | 'bass'

export interface MusicNote {
    voice: MusicVoice
    /** Start in beats from the start of the bar (0 to under 4). */
    beat: number
    /** MIDI note number (60 = middle C). */
    midi: number
    /** Length in beats. Pads and basses last for the whole chord. */
    beats: number
    /** Loudness 0..1. */
    velocity: number
}

export interface MusicBar {
    index: number
    /** Chord name, e.g. "Fmaj7". */
    chord: string
    /** True on the first bar of a chord. */
    change: boolean
    notes: MusicNote[]
}

export interface Composer {
    /** Beats per minute, 60 to 72. */
    readonly bpm: number
    /** Key name, e.g. "F". */
    readonly key: string
    /** The next bar (4 beats). */
    next(): MusicBar
}

export const BEATS_PER_BAR = 4
export const BPM_MIN = 60
export const BPM_MAX = 72
/** Lowest and highest MIDI note the music uses. */
export const MIDI_MIN = 36
export const MIDI_MAX = 86

type Quality = 'maj7' | 'add9' | 'm7' | 'sus' | 'six9'

interface Step {
    /** Semitones of the chord root above the key note. */
    root: number
    quality: Quality
}

const INTERVALS: Record<Quality, number[]> = {
    maj7: [0, 4, 7, 11],
    add9: [0, 4, 7, 14],
    m7: [0, 3, 7, 10],
    // A dominant without its third: open, no pull.
    sus: [0, 5, 7, 10],
    six9: [0, 4, 9, 14],
}

const SUFFIX: Record<Quality, string> = {
    maj7: 'maj7',
    add9: 'add9',
    m7: 'm7',
    sus: '7sus4',
    six9: '6/9',
}

const I = (quality: Quality): Step => ({ root: 0, quality })
const ii: Step = { root: 2, quality: 'm7' }
const iii: Step = { root: 4, quality: 'm7' }
const IV = (quality: Quality): Step => ({ root: 5, quality })
const V: Step = { root: 7, quality: 'sus' }
const vi: Step = { root: 9, quality: 'm7' }

/** Simple, warm progressions. One follows another at random. */
const PROGRESSIONS: Step[][] = [
    [I('maj7'), IV('maj7'), I('add9'), V],
    [I('add9'), vi, IV('maj7'), V],
    [IV('maj7'), I('add9'), ii, V],
    [I('maj7'), iii, IV('maj7'), IV('add9')],
    [vi, IV('maj7'), I('add9'), V],
    [I('six9'), IV('maj7'), ii, I('maj7')],
]

const NOTE_NAMES = [
    'C',
    'Db',
    'D',
    'Eb',
    'E',
    'F',
    'Gb',
    'G',
    'Ab',
    'A',
    'Bb',
    'B',
]
/** Comfortable keys (pitch class of the key note). */
const KEYS = [0, 2, 3, 5, 7, 9, 10]
/** Major pentatonic: every note of it sits well on every chord here. */
const PENTATONIC = [0, 2, 4, 7, 9]

/** Move a note by octaves into [low, low + 12). */
function into(midi: number, low: number): number {
    return low + ((((midi - low) % 12) + 12) % 12)
}

export function createComposer(seed: string): Composer {
    const [a, b, c, d] = hashString(`fairway-music:${seed}`)
    const rand = sfc32(a, b, c, d)
    const range = (lo: number, hi: number): number => lo + (hi - lo) * rand()
    const int = (lo: number, hi: number): number =>
        lo + Math.floor(rand() * (hi - lo + 1))
    const chance = (p: number): boolean => rand() < p

    const keyNote = KEYS[int(0, KEYS.length - 1)]
    const bpm = int(BPM_MIN, BPM_MAX)

    let index = 0
    let progression = PROGRESSIONS[int(0, PROGRESSIONS.length - 1)]
    let stepIndex = 0
    let step = progression[0]
    let barsLeft = 0
    let chordBars = 0
    // Melody: a slow walk on the pentatonic scale, with long rests.
    let melodyDegree = int(5, 9)
    let melodyRest = int(1, 3)

    /** The pentatonic note of a degree (0 = the key note near MIDI 60). */
    function pentatonic(degree: number): number {
        const octave = Math.floor(degree / 5)
        const within = ((degree % 5) + 5) % 5
        return into(keyNote, 55) + 12 * octave + PENTATONIC[within]
    }

    function nextChord(): void {
        if (index > 0) {
            stepIndex++
            if (stepIndex >= progression.length) {
                stepIndex = 0
                progression = PROGRESSIONS[int(0, PROGRESSIONS.length - 1)]
            }
        }
        step = progression[stepIndex]
        // Slow changes: mostly two bars, sometimes three or four.
        const r = rand()
        chordBars = r < 0.55 ? 2 : r < 0.75 ? 3 : 4
        barsLeft = chordBars
    }

    return {
        bpm,
        key: NOTE_NAMES[keyNote],
        next() {
            const change = barsLeft <= 0
            if (change) {
                nextChord()
            }
            barsLeft--
            const root = keyNote + step.root
            const tones = INTERVALS[step.quality]
            const notes: MusicNote[] = []
            // The chord in a close, warm middle voicing (G3 to F#4).
            const voicing = tones.map((t) => into(root + t, 55))
            voicing.sort((x, y) => x - y)

            if (change) {
                const length = chordBars * BEATS_PER_BAR
                for (const midi of voicing) {
                    notes.push({
                        voice: 'pad',
                        beat: 0,
                        midi,
                        beats: length,
                        velocity: 0.5,
                    })
                }
                notes.push({
                    voice: 'bass',
                    beat: 0,
                    midi: into(root, MIDI_MIN),
                    beats: length,
                    velocity: 0.6,
                })
            }

            // Keys: a softly rolled chord on most changes, now and then a
            // lighter one in between, and bars with nothing at all.
            const roll = change ? chance(0.8) : chance(0.22)
            if (roll) {
                const start = change ? 0 : chance(0.5) ? 0 : 2
                const picked = change
                    ? voicing
                    : voicing.filter(() => chance(0.65))
                let at = start
                for (const midi of picked) {
                    notes.push({
                        voice: 'keys',
                        beat: at,
                        midi: midi + (chance(0.25) ? 12 : 0),
                        beats: 3,
                        velocity: range(0.32, 0.5) * (change ? 1 : 0.8),
                    })
                    at += range(0.1, 0.24)
                }
            }

            // Melody: a fragment of two to five notes, then silence.
            if (melodyRest > 0) {
                melodyRest--
            } else {
                const count = int(2, 5)
                let at = chance(0.5) ? 1 : chance(0.5) ? 0.5 : 2
                for (let i = 0; i < count && at < BEATS_PER_BAR; i++) {
                    const stepBy = chance(0.7) ? int(-1, 1) : int(-2, 2)
                    melodyDegree = Math.max(
                        4,
                        Math.min(11, melodyDegree + stepBy)
                    )
                    const beats = chance(0.6) ? 1 : chance(0.5) ? 1.5 : 0.5
                    notes.push({
                        voice: 'keys',
                        beat: at,
                        midi: pentatonic(melodyDegree),
                        beats: beats + 1.5,
                        velocity: range(0.45, 0.7),
                    })
                    at += beats
                }
                melodyRest = int(1, 4)
            }

            for (const n of notes) {
                n.midi = Math.max(MIDI_MIN, Math.min(MIDI_MAX, n.midi))
            }
            notes.sort((x, y) => x.beat - y.beat)
            return {
                index: index++,
                chord: `${NOTE_NAMES[root % 12]}${SUFFIX[step.quality]}`,
                change,
                notes,
            }
        },
    }
}

/** The first `count` bars of a seed. */
export function composeBars(seed: string, count: number): MusicBar[] {
    const composer = createComposer(seed)
    const bars: MusicBar[] = []
    for (let i = 0; i < count; i++) {
        bars.push(composer.next())
    }
    return bars
}

/** Frequency of a MIDI note in Hz (A4 = 69 = 440 Hz). */
export function midiToHz(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12)
}
