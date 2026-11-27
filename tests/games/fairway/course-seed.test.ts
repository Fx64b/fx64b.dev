import { describe, expect, it } from 'vitest'

import {
    CURRENT_VERSION,
    GENERATORS,
    LAUNCH_DATE,
    VERSION_SCHEDULE,
    addDays,
    archiveDates,
    createRng,
    dailySeed,
    hashString,
    holeNumberFor,
    parseDateSeed,
    randomSeed,
    versionForDate,
    versionForSeed,
    versionInSchedule,
} from '../../../games/fairway/src/course'

describe('fairway seeds', () => {
    it('uses the UTC date as the daily seed', () => {
        expect(dailySeed(new Date('2026-11-27T00:00:00Z'))).toBe('2026-11-27')
        expect(dailySeed(new Date('2026-11-27T23:59:59Z'))).toBe('2026-11-27')
        // Late evening in New York is already the next day in UTC.
        expect(dailySeed(new Date('2026-12-31T21:30:00-05:00'))).toBe(
            '2027-01-01'
        )
        expect(dailySeed(new Date('2027-03-05T12:00:00Z'))).toBe('2027-03-05')
    })

    it('numbers the daily holes from launch day', () => {
        expect(LAUNCH_DATE).toBe('2026-11-27')
        expect(holeNumberFor(new Date('2026-11-27T00:00:00Z'))).toBe(1)
        expect(holeNumberFor(new Date('2026-11-27T23:59:59Z'))).toBe(1)
        expect(holeNumberFor(new Date('2026-11-28T00:00:00Z'))).toBe(2)
        expect(holeNumberFor(new Date('2027-11-27T08:00:00Z'))).toBe(366)
        expect(holeNumberFor(new Date('2026-11-26T12:00:00Z'))).toBe(0)
    })

    it('parses only real dates', () => {
        expect(parseDateSeed('2026-11-27')?.toISOString()).toBe(
            '2026-11-27T00:00:00.000Z'
        )
        expect(parseDateSeed('2026-02-30')).toBeNull()
        expect(parseDateSeed('2026-13-01')).toBeNull()
        expect(parseDateSeed('fairway')).toBeNull()
        expect(parseDateSeed('2026-11-27x')).toBeNull()
        expect(parseDateSeed('27.11.2026')).toBeNull()
    })

    it('steps date seeds by whole UTC days', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
        expect(addDays('2026-11-27', -1)).toBe('2026-11-26')
        expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
        expect(holeNumberFor(new Date('2027-01-01T00:00:00Z'))).toBe(36)
        expect(() => addDays('2026-02-30', 1)).toThrow()
    })

    it('lists archive dates from launch to today, newest first', () => {
        expect(archiveDates(LAUNCH_DATE)).toEqual(['2026-11-27'])
        expect(archiveDates('2026-11-30')).toEqual([
            '2026-11-30',
            '2026-11-29',
            '2026-11-28',
            '2026-11-27',
        ])
        expect(archiveDates('2027-01-01')).toHaveLength(36)
        expect(archiveDates('2026-11-26')).toEqual([])
    })

    it('makes random seeds from the entropy it is given', () => {
        const a = randomSeed([123456789, 987654321])
        expect(randomSeed([123456789, 987654321])).toBe(a)
        expect(randomSeed(new Uint32Array([123456789, 987654321]))).toBe(a)
        expect(randomSeed([123456789, 987654322])).not.toBe(a)
        expect(randomSeed(0.123)).not.toBe(randomSeed(0.124))
        expect(a).toMatch(/^[bcdfghjkmnpqrstvwxz2-9]{8}$/)
        const seen = new Set<string>()
        for (let i = 0; i < 500; i++) {
            seen.add(randomSeed([i, i * 7919]))
        }
        expect(seen.size).toBe(500)
    })
})

describe('fairway prng', () => {
    it('is stable: these values must never change', () => {
        expect(hashString('fairway')).toEqual(hashString('fairway'))
        expect(hashString('2026-11-27')).toMatchInlineSnapshot(`
          [
            2507074164,
            2883187953,
            1205192657,
            68575566,
          ]
        `)
        const rng = createRng('2026-11-27', 'layout')
        expect([rng.next(), rng.next(), rng.next()]).toMatchInlineSnapshot(`
          [
            0.5071819599252194,
            0.20883475593291223,
            0.13255729316733778,
          ]
        `)
    })

    it('gives floats in [0, 1) with a flat spread', () => {
        const rng = createRng('spread')
        const bins = new Array(10).fill(0)
        for (let i = 0; i < 20000; i++) {
            const v = rng.next()
            expect(v).toBeGreaterThanOrEqual(0)
            expect(v).toBeLessThan(1)
            bins[Math.floor(v * 10)]++
        }
        for (const count of bins) {
            expect(count).toBeGreaterThan(1800)
            expect(count).toBeLessThan(2200)
        }
    })

    it('has independent sub-streams', () => {
        const a = createRng('seed', 'trees')
        const b = createRng('seed', 'green')
        const c = createRng('seed', 'trees')
        const first = a.next()
        expect(c.next()).toBe(first)
        expect(b.next()).not.toBe(first)
        expect(createRng('seed2', 'trees').next()).not.toBe(first)
    })

    it('has working helpers', () => {
        const rng = createRng('helpers')
        for (let i = 0; i < 200; i++) {
            const n = rng.int(2, 5)
            expect(Number.isInteger(n)).toBe(true)
            expect(n).toBeGreaterThanOrEqual(2)
            expect(n).toBeLessThanOrEqual(5)
            const r = rng.range(-3, 3)
            expect(r).toBeGreaterThanOrEqual(-3)
            expect(r).toBeLessThan(3)
            expect([1, -1]).toContain(rng.sign())
            expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']))
        }
    })
})

describe('fairway generator versions', () => {
    it('has a generator for every scheduled version', () => {
        expect(GENERATORS[CURRENT_VERSION]).toBeTypeOf('function')
        let last = ''
        for (const entry of VERSION_SCHEDULE) {
            expect(GENERATORS[entry.version]).toBeTypeOf('function')
            expect(parseDateSeed(entry.from)).not.toBeNull()
            expect(entry.from > last).toBe(true)
            last = entry.from
        }
        expect(VERSION_SCHEDULE[0].from).toBe(LAUNCH_DATE)
        expect(VERSION_SCHEDULE[VERSION_SCHEDULE.length - 1].version).toBe(
            CURRENT_VERSION
        )
    })

    it('maps dates to the version of their day', () => {
        expect(versionForDate('2026-11-27')).toBe(1)
        expect(versionForDate(new Date('2026-11-27T10:00:00Z'))).toBe(1)
        // Before the launch: the first version.
        expect(versionForDate('2025-01-01')).toBe(1)

        const schedule = [
            { from: '2026-11-27', version: 1 },
            { from: '2027-03-01', version: 2 },
            { from: '2027-09-15', version: 3 },
        ]
        expect(versionInSchedule(schedule, '2026-01-01')).toBe(1)
        expect(versionInSchedule(schedule, '2026-11-27')).toBe(1)
        expect(versionInSchedule(schedule, '2027-02-28')).toBe(1)
        expect(versionInSchedule(schedule, '2027-03-01')).toBe(2)
        expect(versionInSchedule(schedule, '2027-09-14')).toBe(2)
        expect(versionInSchedule(schedule, '2027-09-15')).toBe(3)
        expect(versionInSchedule(schedule, '2031-01-01')).toBe(3)
        expect(
            versionInSchedule(schedule, new Date('2027-02-28T23:59:59Z'))
        ).toBe(1)
        expect(
            versionInSchedule(schedule, new Date('2027-03-01T00:00:00Z'))
        ).toBe(2)
    })

    it('uses the current version for seeds that are not dates', () => {
        expect(versionForSeed('2026-11-27')).toBe(1)
        expect(versionForSeed('hello')).toBe(CURRENT_VERSION)
        expect(versionForSeed('2026-99-99')).toBe(CURRENT_VERSION)
    })
})
