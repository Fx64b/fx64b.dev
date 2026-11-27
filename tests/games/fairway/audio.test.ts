import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    DISTANCE_FLOOR,
    DISTANCE_REF,
    MIN_BOUNCE_SPEED,
    STRONG_WIND,
    bounceIntensity,
    createAudio,
    createCuePlayer,
    distanceGain,
    findLipOut,
    flightCues,
    impactSound,
    isFinalCue,
    landingSound,
    windParams,
} from '../../../games/fairway/src/audio'
import { createStorage } from '../../../games/fairway/src/game/storage'
import {
    CLUB_ORDER,
    type ShotResult,
    type TrajectorySample,
} from '../../../games/fairway/src/physics'
import {
    SURFACE_IDS,
    type SurfaceId,
} from '../../../games/fairway/src/shared/hole'
import { createHud } from '../../../games/fairway/src/ui/hud'
import { createScreens } from '../../../games/fairway/src/ui/screens'
import { hitClub } from './helpers'

function shot(over: Partial<ShotResult> = {}): ShotResult {
    return {
        samples: [],
        rest: { x: 0, y: 0, z: 100 },
        restSurface: 'fairway',
        duration: 8,
        landing: null,
        apex: null,
        bounces: [],
        carry: 90,
        total: 100,
        outcome: 'rest',
        holed: false,
        water: null,
        ob: null,
        ...over,
    }
}

function bounce(t: number, speedIn: number, surface: SurfaceId = 'fairway') {
    return { t, speedIn, surface, position: { x: 0, y: 0, z: t * 10 } }
}

describe('sound mapping', () => {
    it('maps every surface to a landing sound', () => {
        const map = Object.fromEntries(
            SURFACE_IDS.map((s) => [s, landingSound(s)])
        )
        expect(map).toEqual({
            tee: 'thud',
            fairway: 'thud',
            firstCut: 'thud',
            rough: 'softThud',
            bunker: 'sand',
            green: 'pat',
            water: null,
            ob: 'softThud',
        })
    })

    it('maps every club to an impact sound', () => {
        expect(CLUB_ORDER.map(impactSound)).toEqual([
            'wood',
            'wood',
            'iron',
            'iron',
            'iron',
            'iron',
            'iron',
            'putter',
        ])
    })

    it('makes faster bounces louder, within 0..1', () => {
        expect(bounceIntensity(0)).toBe(0)
        expect(bounceIntensity(-1)).toBe(0)
        expect(bounceIntensity(Number.NaN)).toBe(0)
        expect(bounceIntensity(3)).toBeLessThan(bounceIntensity(12))
        expect(bounceIntensity(12)).toBeLessThan(bounceIntensity(30))
        expect(bounceIntensity(500)).toBe(1)
    })

    it('fades with distance but stays audible', () => {
        expect(distanceGain(0)).toBe(1)
        expect(distanceGain(-5)).toBe(1)
        expect(distanceGain(DISTANCE_REF)).toBeCloseTo(0.5, 6)
        expect(distanceGain(20)).toBeGreaterThan(distanceGain(200))
        expect(distanceGain(200)).toBeGreaterThan(DISTANCE_FLOOR)
        expect(distanceGain(5000)).toBe(DISTANCE_FLOOR)
    })

    it('makes the wind louder and brighter with wind and flight', () => {
        const calm = windParams(0, 0.5, 0)
        const windy = windParams(1, 0.5, 0)
        const flying = windParams(0, 0.5, 1)
        expect(calm.bodyGain).toBeGreaterThan(0)
        expect(windy.bodyGain).toBeGreaterThan(calm.bodyGain)
        expect(windy.bodyFreq).toBeGreaterThan(calm.bodyFreq)
        expect(flying.bodyGain).toBeGreaterThan(calm.bodyGain)
        expect(flying.bodyFreq).toBeGreaterThan(calm.bodyFreq)
        // Clamped: a storm is not louder than a strong wind.
        expect(windParams(5, 0.5, 0)).toEqual(windy)
        expect(windy.bodyGain * 1.2).toBeLessThan(0.5)
        expect(STRONG_WIND).toBeGreaterThan(0)
    })
})

describe('flight cues', () => {
    it('lists the bounces by surface and skips water and tiny hops', () => {
        const cues = flightCues(
            shot({
                bounces: [
                    bounce(4, 25, 'fairway'),
                    bounce(5, 9, 'rough'),
                    bounce(5.6, 4, 'green'),
                    bounce(5.9, 2, 'bunker'),
                    bounce(6, MIN_BOUNCE_SPEED / 2, 'green'),
                    bounce(6.1, 5, 'water'),
                ],
            })
        )
        expect(cues.map((c) => [c.t, c.kind, c.sound])).toEqual([
            [4, 'bounce', 'thud'],
            [5, 'bounce', 'softThud'],
            [5.6, 'bounce', 'pat'],
            [5.9, 'bounce', 'sand'],
        ])
        expect(cues[0].intensity).toBeGreaterThan(cues[1].intensity)
        expect(cues[0].position).toEqual({ x: 0, y: 0, z: 40 })
    })

    it('ends with a splash in the water', () => {
        const flown = flightCues(
            shot({
                outcome: 'water',
                duration: 5,
                bounces: [bounce(5, 28, 'water')],
            })
        )
        expect(flown.map((c) => c.kind)).toEqual(['splash'])
        expect(flown[0].t).toBe(5)

        const rolled = flightCues(
            shot({
                outcome: 'water',
                duration: 9,
                bounces: [bounce(5, 28, 'fairway')],
            })
        )
        expect(rolled.map((c) => c.kind)).toEqual(['bounce', 'splash'])
        expect(rolled[1].intensity).toBeLessThan(flown[0].intensity)
    })

    it('ends with the cup drop when holed', () => {
        const cues = flightCues(
            shot({ outcome: 'holed', holed: true, duration: 3 })
        )
        expect(cues.map((c) => [c.t, c.kind])).toEqual([[3, 'cup']])
        expect(isFinalCue(cues[0])).toBe(true)
    })

    it('finds the real bounces of a simulated shot, in time order', () => {
        const result = hitClub('iron7')
        const cues = flightCues(result)
        expect(cues.length).toBeGreaterThan(0)
        expect(cues[0].t).toBeCloseTo(result.landing!.t, 6)
        expect(cues.every((c) => c.kind === 'bounce')).toBe(true)
        for (let i = 1; i < cues.length; i++) {
            expect(cues[i].t).toBeGreaterThanOrEqual(cues[i - 1].t)
        }
        expect(cues[cues.length - 1].t).toBeLessThanOrEqual(result.duration)
    })
})

describe('lip-out', () => {
    const pin = { x: 0, y: 0, z: 5 }
    /** A straight putt along +z at a constant speed, past z = `to`. */
    function roll(x: number, speed: number, to = 8): TrajectorySample[] {
        const samples: TrajectorySample[] = []
        for (let t = 0; speed * t <= to; t += 1 / 60) {
            samples.push({ t, x, y: 0, z: speed * t, phase: 'ground' })
        }
        return samples
    }

    it('finds a ball that runs over the cup', () => {
        const lip = findLipOut(shot({ samples: roll(0.02, 3) }), pin)
        expect(lip).not.toBeNull()
        expect(Math.abs(lip!.t - 5 / 3)).toBeLessThan(0.05)
        expect(Math.abs(lip!.position.z - 5)).toBeLessThan(0.1)
        const cues = flightCues(shot({ samples: roll(0.02, 3) }), pin)
        expect(cues.map((c) => c.kind)).toEqual(['lip'])
    })

    it('ignores a miss, a flight over the cup and the drop itself', () => {
        expect(findLipOut(shot({ samples: roll(0.5, 3) }), pin)).toBeNull()
        const air = roll(0, 3).map((s) => ({ ...s, phase: 'air' as const }))
        expect(findLipOut(shot({ samples: air }), pin)).toBeNull()
        const holed = roll(0, 1, 5)
        const duration = holed[holed.length - 1].t
        expect(
            findLipOut(
                shot({
                    samples: holed,
                    holed: true,
                    outcome: 'holed',
                    duration,
                }),
                pin
            )
        ).toBeNull()
        expect(findLipOut(shot(), pin)).toBeNull()
    })
})

describe('cue player', () => {
    const cues = flightCues(
        shot({
            outcome: 'water',
            duration: 7,
            bounces: [
                bounce(4, 25),
                bounce(5, 12),
                bounce(5.5, 6),
                bounce(5.8, 3),
            ],
        })
    )

    it('plays each cue once, when the playback reaches it', () => {
        const player = createCuePlayer(cues)
        const played: [number, string][] = []
        for (let f = 0; f <= 7 * 60 + 1; f++) {
            const t = Math.min(7, f / 60)
            for (const c of player.advance(t)) {
                played.push([c.t, c.kind])
                expect(t).toBeGreaterThanOrEqual(c.t)
                expect(t - c.t).toBeLessThan(1 / 60 + 1e-9)
            }
        }
        expect(played).toEqual([
            [4, 'bounce'],
            [5, 'bounce'],
            [5.5, 'bounce'],
            [5.8, 'bounce'],
            [7, 'splash'],
        ])
        expect(player.pending()).toBe(0)
        expect(player.advance(7)).toEqual([])
    })

    it('plays only the final cue after a skip', () => {
        const player = createCuePlayer(cues)
        expect(player.advance(0.5)).toEqual([])
        expect(player.advance(4.01).map((c) => c.t)).toEqual([4])
        expect(player.skip().map((c) => c.kind)).toEqual(['splash'])
        expect(player.pending()).toBe(0)
        expect(player.advance(7)).toEqual([])
        expect(player.skip()).toEqual([])
    })

    it('plays nothing after a skip of a shot that just stops', () => {
        const player = createCuePlayer(
            flightCues(shot({ bounces: [bounce(4, 25), bounce(5, 12)] }))
        )
        expect(player.skip()).toEqual([])
        expect(player.advance(8)).toEqual([])
    })

    it('treats a jump in time as a skip (no burst)', () => {
        const jump = createCuePlayer(cues)
        expect(jump.advance(0.016)).toEqual([])
        expect(jump.advance(7).map((c) => c.kind)).toEqual(['splash'])

        const noFinal = createCuePlayer(cues)
        expect(noFinal.advance(6)).toEqual([])
        expect(noFinal.advance(7).map((c) => c.kind)).toEqual(['splash'])

        // One late cue still plays.
        const late = createCuePlayer(cues)
        expect(late.advance(4.2).map((c) => c.t)).toEqual([4])
    })
})

describe('sound setting', () => {
    function memory() {
        const map = new Map<string, string>()
        return {
            getItem: (k: string) => map.get(k) ?? null,
            setItem: (k: string, v: string) => void map.set(k, v),
        }
    }

    it('is on by default and remembers the choice', () => {
        const store = memory()
        const s = createStorage(store)
        expect(s.soundOn()).toBe(true)
        s.setSoundOn(false)
        expect(s.soundOn()).toBe(false)
        expect(createStorage(store).soundOn()).toBe(false)
        s.setSoundOn(true)
        expect(createStorage(store).soundOn()).toBe(true)
    })

    it('works without storage and with broken data', () => {
        const none = createStorage(null)
        none.setSoundOn(false)
        expect(none.soundOn()).toBe(true)
        const broken = memory()
        broken.setItem('fairway:sound', '{not json')
        expect(createStorage(broken).soundOn()).toBe(true)
        const full = {
            getItem: () => null,
            setItem: () => {
                throw new Error('quota')
            },
        }
        expect(() => createStorage(full).setSoundOn(false)).not.toThrow()
    })
})

/**
 * A stand-in for an AudioContext: every node, parameter and method exists
 * and does nothing. It shows that the graph code runs without a throw.
 */
function fakeContext(calls: string[]): AudioContext {
    const make = (name: string): unknown =>
        new Proxy(function () {}, {
            get(_t, prop) {
                if (typeof prop !== 'string' || prop === 'then') {
                    return undefined
                }
                switch (prop) {
                    case 'value':
                    case 'currentTime':
                        return 0
                    case 'sampleRate':
                        return 2000
                    case 'state':
                        return 'running'
                    case 'createStereoPanner':
                        return undefined
                    case 'createBuffer':
                        return (_c: number, n: number) => ({
                            getChannelData: () => new Float32Array(n),
                        })
                    case 'connect':
                        return (dest: unknown) => dest
                    case 'resume':
                    case 'suspend':
                    case 'close':
                        return () => {
                            calls.push(prop)
                            return Promise.resolve()
                        }
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

function playEverything(audio: ReturnType<typeof createAudio>): void {
    audio.setScene('round')
    audio.setWind(4)
    audio.setFlight(0.5)
    audio.setVolume(0.5)
    audio.setListener({ x: 0, y: 2, z: -3 })
    for (const club of CLUB_ORDER) {
        audio.swing(club, 0.8)
    }
    audio.flightStart(
        shot({
            outcome: 'water',
            duration: 3,
            bounces: [
                bounce(1, 20, 'fairway'),
                bounce(1.2, 10, 'rough'),
                bounce(1.4, 8, 'green'),
                bounce(1.6, 6, 'bunker'),
            ],
        }),
        { x: 0, y: 0, z: 50 }
    )
    for (let t = 0; t <= 3; t += 1 / 60) {
        audio.flightAdvance(t)
    }
    audio.flightStart(shot({ outcome: 'holed', holed: true, duration: 2 }))
    audio.flightSkip()
    audio.chime(true)
    audio.uiClick()
    audio.update()
    audio.setScene('menu')
}

describe('audio without Web Audio', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('is silent and never throws', () => {
        expect('AudioContext' in window).toBe(false)
        const audio = createAudio()
        expect(audio.enabled()).toBe(true)
        expect(audio.info().state).toBe('none')
        expect(() => {
            playEverything(audio)
            window.dispatchEvent(new Event('pointerdown'))
            audio.unlock()
            playEverything(audio)
            audio.setEnabled(false)
            audio.setEnabled(true)
            document.dispatchEvent(new Event('visibilitychange'))
        }).not.toThrow()
        expect(audio.info()).toMatchObject({
            supported: false,
            enabled: true,
            state: 'none',
        })
        expect(() => audio.dispose()).not.toThrow()
    })

    it('survives a context that fails', () => {
        const audio = createAudio({
            createContext: () => {
                throw new Error('blocked')
            },
        })
        expect(() => {
            audio.unlock()
            playEverything(audio)
        }).not.toThrow()
        expect(audio.info().supported).toBe(false)
        audio.dispose()
    })

    it('starts only after a gesture, and stops when muted', () => {
        vi.useFakeTimers()
        const calls: string[] = []
        let made = 0
        const audio = createAudio({
            createContext: () => {
                made++
                return fakeContext(calls)
            },
        })
        playEverything(audio)
        expect(made).toBe(0)

        window.dispatchEvent(new Event('keydown'))
        expect(made).toBe(1)
        expect(audio.info()).toMatchObject({
            supported: true,
            state: 'running',
        })
        expect(() => playEverything(audio)).not.toThrow()
        expect(calls).toContain('createOscillator')
        expect(calls).toContain('createBufferSource')
        expect(calls).toContain('createDynamicsCompressor')

        audio.setEnabled(false)
        expect(audio.enabled()).toBe(false)
        const before = calls.length
        playEverything(audio)
        // Muted: only the volume and scene changes reach the graph.
        expect(calls.slice(before)).not.toContain('createOscillator')
        vi.advanceTimersByTime(1000)
        expect(calls).toContain('suspend')

        audio.setEnabled(true)
        window.dispatchEvent(new Event('pointerdown'))
        expect(made).toBe(1)
        audio.dispose()
        expect(calls).toContain('close')
    })

    it('does not make a context while the sound is off', () => {
        let made = 0
        const audio = createAudio({
            enabled: false,
            createContext: () => {
                made++
                return fakeContext([])
            },
        })
        audio.unlock()
        playEverything(audio)
        expect(made).toBe(0)
        audio.setEnabled(true)
        expect(made).toBe(1)
        audio.dispose()
    })
})

describe('sound toggle', () => {
    it('sits in the HUD and reports clicks', () => {
        const root = document.createElement('div')
        document.body.append(root)
        const hud = createHud(root)
        const btn = root.querySelector<HTMLButtonElement>('.fw-hole .fw-sound')!
        expect(btn.getAttribute('aria-label')).toBe('Sound')
        expect(btn.getAttribute('aria-pressed')).toBe('true')
        let clicks = 0
        const off = hud.onSoundToggle(() => clicks++)
        btn.click()
        expect(clicks).toBe(1)
        hud.setSound(false)
        expect(btn.getAttribute('aria-pressed')).toBe('false')
        expect(btn.title).toBe('Sound off (M)')
        off()
        btn.click()
        expect(clicks).toBe(1)
        hud.dispose()
        root.remove()
    })

    it('sits on the title screen and keeps its state', () => {
        const root = document.createElement('div')
        document.body.append(root)
        const screens = createScreens(root)
        const title = { date: '2026-11-27', number: 12, par: 4, lengthM: 350 }
        screens.setSound(false)
        screens.showTitle(title)
        const btn = root.querySelector<HTMLButtonElement>(
            '.fw-title-card .fw-title-sound'
        )!
        expect(btn.getAttribute('aria-pressed')).toBe('false')
        let clicks = 0
        screens.onSoundToggle(() => clicks++)
        btn.click()
        expect(clicks).toBe(1)
        screens.setSound(true)
        screens.showArchive([])
        screens.showTitle(title)
        const again = root.querySelector<HTMLButtonElement>(
            '.fw-title-card .fw-title-sound'
        )!
        expect(again.getAttribute('aria-pressed')).toBe('true')
        again.click()
        expect(clicks).toBe(2)
        screens.dispose()
        root.remove()
    })
})
