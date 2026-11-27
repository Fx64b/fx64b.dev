import { describe, expect, it } from 'vitest'

import {
    formatDate,
    formatKmhValue,
    formatToPar,
    formatYards,
    formatYardsValue,
    lieName,
    scoreName,
    shareText,
    todayUtc,
} from '../../../games/fairway/src/ui/format'

describe('units', () => {
    it('formats yards', () => {
        expect(formatYards(215)).toBe('235 yd')
        expect(formatYardsValue(376.7328)).toBe('412')
        expect(formatYardsValue(3)).toBe('3.3')
        expect(formatYardsValue(0)).toBe('0.0')
        expect(formatYardsValue(-5)).toBe('0.0')
        expect(formatYardsValue(Number.NaN)).toBe('-')
    })

    it('formats km/h', () => {
        expect(formatKmhValue(3.9)).toBe('14')
        expect(formatKmhValue(0)).toBe('0')
        expect(formatKmhValue(-2)).toBe('0')
        expect(formatKmhValue(Number.NaN)).toBe('-')
    })
})

describe('golf names', () => {
    it('names scores', () => {
        expect(scoreName(1, 3)).toBe('Hole in one')
        expect(scoreName(2, 5)).toBe('Albatross')
        expect(scoreName(3, 5)).toBe('Eagle')
        expect(scoreName(3, 4)).toBe('Birdie')
        expect(scoreName(4, 4)).toBe('Par')
        expect(scoreName(5, 4)).toBe('Bogey')
        expect(scoreName(6, 4)).toBe('Double bogey')
        expect(scoreName(7, 4)).toBe('Triple bogey')
        expect(scoreName(9, 4)).toBe('5 over par')
    })

    it('formats score to par', () => {
        expect(formatToPar(0)).toBe('E')
        expect(formatToPar(2)).toBe('+2')
        expect(formatToPar(-1)).toBe('−1')
        expect(formatToPar(-1, true)).toBe('-1')
    })

    it('names lies', () => {
        expect(lieName('firstCut')).toBe('First cut')
        expect(lieName('bunker')).toBe('Bunker')
        expect(lieName('ob')).toBe('Out of bounds')
    })
})

describe('shareText', () => {
    it('uses the daily format', () => {
        expect(
            shareText({
                number: 12,
                seed: '2026-12-08',
                strokes: 4,
                par: 4,
                putts: 2,
                penalties: 0,
                bunkers: 0,
            })
        ).toBe('Fairway #12 - 4 (par 4)\nPar - 2 putts, no penalties')
    })

    it('adds penalties, bunkers and a link', () => {
        expect(
            shareText({
                number: 3,
                seed: 'x',
                strokes: 6,
                par: 4,
                putts: 1,
                penalties: 1,
                bunkers: 2,
                url: 'https://example.test/x',
            })
        ).toBe(
            'Fairway #3 - 6 (par 4)\nDouble bogey - 1 putt, 1 penalty, 2 bunkers\nhttps://example.test/x'
        )
    })

    it('names the seed for non-daily holes', () => {
        expect(
            shareText({
                number: 0,
                seed: 'maple',
                strokes: 3,
                par: 3,
                putts: 2,
                penalties: 2,
                bunkers: 0,
            }).split('\n')[0]
        ).toBe('Fairway seed "maple" - 3 (par 3)')
    })
})

describe('dates', () => {
    it('takes today in UTC', () => {
        expect(todayUtc(new Date(Date.UTC(2026, 10, 27, 23, 59)))).toBe(
            '2026-11-27'
        )
        expect(todayUtc(new Date('2026-12-31T21:30:00-05:00'))).toBe(
            '2027-01-01'
        )
    })

    it('formats dates', () => {
        expect(formatDate('2026-11-27')).toBe('Fri 27 Nov')
        expect(formatDate('2026-11-27', 'long')).toBe(
            'Friday, 27 November 2026'
        )
        expect(() => formatDate('2026-02-30')).toThrow()
    })
})
