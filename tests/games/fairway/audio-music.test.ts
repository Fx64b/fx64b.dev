import { describe, expect, it } from 'vitest'

import {
    BEATS_PER_BAR,
    BPM_MAX,
    BPM_MIN,
    MIDI_MAX,
    MIDI_MIN,
    MUSIC_FLIGHT_DUCK,
    MUSIC_MENU,
    MUSIC_ROUND,
    composeBars,
    createAudio,
    createComposer,
    midiToHz,
} from '../../../games/fairway/src/audio'
import { createStorage } from '../../../games/fairway/src/game/storage'
import { createScreens } from '../../../games/fairway/src/ui/screens'

const SEEDS = ['alpha', 'maple', '2026-11-27', '2026-11-28', '', 'x'.repeat(48)]
const BARS = 200

describe('music score', () => {
    it('is the same for the same seed and differs between seeds', () => {
        expect(composeBars('alpha', 64)).toEqual(composeBars('alpha', 64))
        const texts = SEEDS.map((s) => JSON.stringify(composeBars(s, 32)))
        expect(new Set(texts).size).toBe(SEEDS.length)
        // The key and tempo come from the seed too.
        const a = createComposer('2026-11-27')
        const b = createComposer('2026-11-27')
        expect([a.bpm, a.key]).toEqual([b.bpm, b.key])
    })

    it('keeps a slow tempo and every note in range', () => {
        for (const seed of SEEDS) {
            const composer = createComposer(seed)
            expect(composer.bpm).toBeGreaterThanOrEqual(BPM_MIN)
            expect(composer.bpm).toBeLessThanOrEqual(BPM_MAX)
            expect(Number.isInteger(composer.bpm)).toBe(true)
            for (const bar of composeBars(seed, BARS)) {
                for (const n of bar.notes) {
                    expect(Number.isInteger(n.midi)).toBe(true)
                    expect(n.midi).toBeGreaterThanOrEqual(MIDI_MIN)
                    expect(n.midi).toBeLessThanOrEqual(MIDI_MAX)
                    expect(n.beat).toBeGreaterThanOrEqual(0)
                    expect(n.beat).toBeLessThan(BEATS_PER_BAR)
                    expect(n.beats).toBeGreaterThan(0)
                    expect(n.velocity).toBeGreaterThan(0)
                    expect(n.velocity).toBeLessThanOrEqual(1)
                }
            }
        }
    })

    it('changes the chord slowly: every two to four bars', () => {
        for (const seed of SEEDS) {
            const bars = composeBars(seed, BARS)
            expect(bars[0].change).toBe(true)
            const starts = bars.filter((b) => b.change).map((b) => b.index)
            for (let i = 1; i < starts.length; i++) {
                const length = starts[i] - starts[i - 1]
                expect(length).toBeGreaterThanOrEqual(2)
                expect(length).toBeLessThanOrEqual(4)
            }
            for (const bar of bars) {
                const pads = bar.notes.filter((n) => n.voice === 'pad')
                const bass = bar.notes.filter((n) => n.voice === 'bass')
                // The pad and bass come only with a new chord.
                expect(pads.length).toBe(bar.change ? 4 : 0)
                expect(bass.length).toBe(bar.change ? 1 : 0)
                for (const n of bass) {
                    expect(n.midi).toBeLessThan(48)
                }
                expect(bar.chord).toMatch(/^[A-G]b?(maj7|add9|m7|7sus4|6\/9)$/)
            }
        }
    })

    it('is sparse, with silent bars, and does not loop', () => {
        for (const seed of SEEDS) {
            const bars = composeBars(seed, BARS)
            const keys = bars.map(
                (b) => b.notes.filter((n) => n.voice === 'keys').length
            )
            const total = keys.reduce((a, b) => a + b, 0)
            // On average under three soft notes a bar (four slow beats).
            expect(total / BARS).toBeLessThan(3)
            expect(total / BARS).toBeGreaterThan(0.5)
            expect(Math.max(...keys)).toBeLessThanOrEqual(9)
            // At least a fifth of the bars have no new key note at all.
            expect(keys.filter((k) => k === 0).length).toBeGreaterThan(BARS / 5)
            // No 16 bars come back unchanged right after themselves.
            const text = (from: number): string =>
                JSON.stringify(
                    bars.slice(from, from + 16).map((b) => [b.chord, b.notes])
                )
            for (let i = 0; i + 32 <= BARS; i += 16) {
                expect(text(i)).not.toBe(text(i + 16))
            }
        }
    })

    it('converts MIDI notes to Hz', () => {
        expect(midiToHz(69)).toBeCloseTo(440, 6)
        expect(midiToHz(57)).toBeCloseTo(220, 6)
        expect(midiToHz(60)).toBeCloseTo(261.626, 2)
    })

    it('keeps the music level low, lower in a round and in flight', () => {
        expect(MUSIC_MENU).toBeLessThan(1)
        expect(MUSIC_ROUND).toBeLessThan(MUSIC_MENU)
        expect(MUSIC_FLIGHT_DUCK).toBeLessThan(1)
        expect(MUSIC_FLIGHT_DUCK).toBeGreaterThan(0)
    })
})

describe('music setting', () => {
    function memory() {
        const map = new Map<string, string>()
        return {
            getItem: (k: string) => map.get(k) ?? null,
            setItem: (k: string, v: string) => void map.set(k, v),
        }
    }

    it('is on by default, apart from the sound setting', () => {
        const store = memory()
        const s = createStorage(store)
        expect(s.musicOn()).toBe(true)
        s.setMusicOn(false)
        expect(s.musicOn()).toBe(false)
        expect(s.soundOn()).toBe(true)
        expect(createStorage(store).musicOn()).toBe(false)
        s.setSoundOn(false)
        s.setMusicOn(true)
        expect(createStorage(store).musicOn()).toBe(true)
        expect(createStorage(store).soundOn()).toBe(false)
    })

    it('works without storage and with broken data', () => {
        const none = createStorage(null)
        none.setMusicOn(false)
        expect(none.musicOn()).toBe(true)
        const broken = memory()
        broken.setItem('fairway:music', '{not json')
        expect(createStorage(broken).musicOn()).toBe(true)
    })
})

/** A stand-in AudioContext: everything exists and does nothing. */
function fakeContext(calls: string[]): AudioContext {
    let time = 0
    const make = (name: string): unknown =>
        new Proxy(function () {}, {
            get(_t, prop) {
                if (typeof prop !== 'string' || prop === 'then') {
                    return undefined
                }
                switch (prop) {
                    case 'value':
                        return 0
                    case 'currentTime':
                        return (time += 0.5)
                    case 'sampleRate':
                        return 2000
                    case 'state':
                        return 'running'
                    case 'createBuffer':
                        return (_c: number, n: number) => ({
                            getChannelData: () => new Float32Array(n),
                        })
                    case 'connect':
                        return (dest: unknown) => dest
                    case 'resume':
                    case 'suspend':
                    case 'close':
                        return () => Promise.resolve()
                }
                return make(prop)
            },
            set: () => true,
            apply() {
                calls.push(name)
                return make(name)
            },
        })
    return make('ctx') as AudioContext
}

describe('music playback', () => {
    it('never throws without Web Audio', () => {
        const audio = createAudio({ music: true, musicSeed: 'alpha' })
        expect(audio.musicEnabled()).toBe(true)
        expect(() => {
            audio.unlock()
            audio.setMusicSeed('maple')
            audio.setMusicEnabled(false)
            audio.setMusicEnabled(true)
            audio.setScene('round')
            audio.flightEnd()
            for (let i = 0; i < 10; i++) {
                audio.update()
            }
        }).not.toThrow()
        expect(audio.info()).toMatchObject({ supported: false, music: true })
        audio.dispose()
    })

    it('schedules notes only while the music is on', () => {
        const calls: string[] = []
        const oscillators = (): number =>
            calls.filter((c) => c === 'createOscillator').length
        const audio = createAudio({
            music: false,
            createContext: () => fakeContext(calls),
        })
        audio.unlock()
        // Only the birds make oscillators here; count them out by time.
        for (let i = 0; i < 4; i++) {
            audio.update()
        }
        const withoutMusic = oscillators()

        calls.length = 0
        audio.setMusicEnabled(true)
        audio.setMusicSeed('alpha')
        expect(audio.info().music).toBe(true)
        expect(() => {
            for (let i = 0; i < 40; i++) {
                audio.update()
            }
            audio.setScene('round')
            audio.flightEnd()
        }).not.toThrow()
        const withMusic = oscillators()
        expect(withMusic).toBeGreaterThan(withoutMusic + 20)

        // Off again: the master mute also stops the scheduling.
        audio.setEnabled(false)
        calls.length = 0
        for (let i = 0; i < 40; i++) {
            audio.update()
        }
        expect(oscillators()).toBe(0)
        audio.dispose()
    })
})

describe('music toggle', () => {
    it('sits on the title screen next to the sound toggle', () => {
        const root = document.createElement('div')
        document.body.append(root)
        const screens = createScreens(root)
        const title = { date: '2026-11-27', number: 12, par: 4, lengthM: 350 }
        screens.showTitle(title)
        const btn = root.querySelector<HTMLButtonElement>('.fw-title-music')!
        expect(btn.getAttribute('aria-label')).toBe('Music')
        expect(btn.getAttribute('aria-pressed')).toBe('true')
        expect(btn.title).toBe('Music on (N)')
        expect(root.querySelector('.fw-title-sound')).not.toBeNull()
        let clicks = 0
        let soundClicks = 0
        screens.onMusicToggle(() => clicks++)
        screens.onSoundToggle(() => soundClicks++)
        btn.click()
        expect([clicks, soundClicks]).toEqual([1, 0])
        screens.setMusic(false)
        expect(btn.getAttribute('aria-pressed')).toBe('false')
        expect(btn.title).toBe('Music off (N)')
        expect(root.querySelector('.fw-how')?.textContent).toContain(
            'N the music'
        )
        screens.dispose()
        root.remove()
    })
})
