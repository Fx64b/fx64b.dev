import { describe, expect, it } from 'vitest'

import { DEFAULT_LAYOUT } from '@/components/tools/card-sheet-designer/design'
import {
    CARD_PRESETS,
    cardPosition,
    computeGrid,
    cutLines,
    imagePixelsFor,
} from '@/components/tools/card-sheet-designer/layout'
import type { LayoutSettings } from '@/components/tools/card-sheet-designer/types'

const layout = (patch: Partial<LayoutSettings> = {}): LayoutSettings => ({
    ...DEFAULT_LAYOUT,
    ...patch,
})

describe('computeGrid', () => {
    it('fits ten 85 × 55 mm cards on A4, centered', () => {
        const g = computeGrid(layout())
        expect(g).toMatchObject({
            cols: 2,
            rows: 5,
            perPage: 10,
            cardWidth: 85,
            cardHeight: 55,
        })
        expect(g.marginX).toBeCloseTo(20)
        expect(g.marginY).toBeCloseTo(11)
    })

    it('fits nine portrait cards', () => {
        const g = computeGrid(layout({ orientation: 'portrait' }))
        expect(g).toMatchObject({
            cols: 3,
            rows: 3,
            perPage: 9,
            cardWidth: 55,
            cardHeight: 85,
        })
        expect(g.marginX).toBeCloseTo(22.5)
        expect(g.marginY).toBeCloseTo(21)
    })

    it('normalises the orientation regardless of how the size is entered', () => {
        const g = computeGrid(layout({ size: { width: 55, height: 85 } }))
        expect(g.cardWidth).toBe(85)
        expect(g.cardHeight).toBe(55)
    })

    it('accounts for the space between cards', () => {
        const g = computeGrid(layout({ gap: 4 }))
        expect(g).toMatchObject({ cols: 2, rows: 4, perPage: 8 })
        expect(g.marginX).toBeCloseTo((210 - (2 * 85 + 4)) / 2)
        expect(g.marginY).toBeCloseTo((297 - (4 * 55 + 3 * 4)) / 2)
    })

    it('handles the US preset', () => {
        const us = CARD_PRESETS.find((p) => p.id === 'us')!
        const g = computeGrid(layout({ preset: 'us', size: us.size }))
        expect(g.perPage).toBe(10)
    })

    it('fits exactly when the cards fill the space to the margin', () => {
        // 5 × 55 = 275 = 297 - 2 × 11
        expect(computeGrid(layout({ minMargin: 11 })).rows).toBe(5)
        expect(computeGrid(layout({ minMargin: 11.1 })).rows).toBe(4)
    })

    it('returns no cards when nothing fits', () => {
        const g = computeGrid(
            layout({ size: { width: 200, height: 150 }, minMargin: 10 })
        )
        expect(g.perPage).toBe(0)
    })
})

describe('positions and cut lines', () => {
    const g = computeGrid(layout())

    it('places cards row by row', () => {
        expect(cardPosition(g, 0)).toEqual({ x: 20, y: 11 })
        expect(cardPosition(g, 1)).toEqual({ x: 105, y: 11 })
        expect(cardPosition(g, 2)).toEqual({ x: 20, y: 66 })
        expect(cardPosition(g, 9)).toEqual({ x: 105, y: 231 })
    })

    it('shares cut lines between touching cards', () => {
        const { xs, ys } = cutLines(g)
        expect(xs).toEqual([20, 105, 190])
        expect(ys).toEqual([11, 66, 121, 176, 231, 286])
    })

    it('has separate cut lines when there is a gap', () => {
        const { xs } = cutLines(computeGrid(layout({ gap: 4 })))
        expect(xs).toEqual([18, 103, 107, 192])
    })
})

describe('imagePixelsFor', () => {
    it('asks for about 300 dpi', () => {
        expect(imagePixelsFor(computeGrid(layout()))).toEqual({
            width: 1004,
            height: 650,
        })
    })
})
