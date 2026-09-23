import { describe, expect, it } from 'vitest'

import {
    FULL_FRAME,
    exportMaxSide,
    isConvexQuad,
    layoutPage,
    maxCornerDelta,
    nextStableSince,
    orderCorners,
    quadArea,
    warpedSize,
} from '@/components/tools/document-scanner/imaging'
import type { Quad } from '@/components/tools/document-scanner/types'

describe('orderCorners', () => {
    it('orders shuffled points as TL, TR, BR, BL', () => {
        const q = orderCorners([
            { x: 90, y: 110 },
            { x: 10, y: 5 },
            { x: 5, y: 100 },
            { x: 100, y: 0 },
        ])
        expect(q).toEqual([
            { x: 10, y: 5 },
            { x: 100, y: 0 },
            { x: 90, y: 110 },
            { x: 5, y: 100 },
        ])
    })

    it('handles a page rotated by about 30 degrees', () => {
        const q = orderCorners([
            { x: 50, y: 0 },
            { x: 100, y: 30 },
            { x: 0, y: 90 },
            { x: 50, y: 120 },
        ])
        expect(q[0]).toEqual({ x: 50, y: 0 })
        expect(q[2]).toEqual({ x: 50, y: 120 })
        expect(isConvexQuad(q)).toBe(true)
    })

    it('rejects anything but four points', () => {
        expect(() => orderCorners([{ x: 0, y: 0 }])).toThrow()
    })
})

describe('quad helpers', () => {
    it('computes area and convexity', () => {
        expect(quadArea(FULL_FRAME)).toBe(1)
        const bowtie: Quad = [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
        ]
        expect(isConvexQuad(bowtie)).toBe(false)
        expect(isConvexQuad(FULL_FRAME)).toBe(true)
    })

    it('measures the largest corner movement', () => {
        const moved = FULL_FRAME.map((p, i) =>
            i === 2 ? { x: 0.97, y: 0.96 } : p
        ) as Quad
        expect(maxCornerDelta(FULL_FRAME, moved)).toBeCloseTo(0.05)
    })
})

describe('warpedSize', () => {
    it('snaps a near-A4 outline to the A4 ratio and caps the long side', () => {
        const quad: Quad = [
            { x: 0, y: 0 },
            { x: 1000, y: 0 },
            { x: 1000, y: 1370 },
            { x: 0, y: 1370 },
        ]
        const size = warpedSize(quad, 1000)
        expect(size.height).toBe(1000)
        expect(size.width).toBe(Math.round(1000 / Math.SQRT2))
    })

    it('keeps unusual ratios as they are', () => {
        const quad: Quad = [
            { x: 0, y: 0 },
            { x: 1000, y: 0 },
            { x: 1000, y: 1000 },
            { x: 0, y: 1000 },
        ]
        expect(warpedSize(quad, 4000)).toEqual({ width: 1000, height: 1000 })
    })
})

describe('layoutPage', () => {
    it('fits a portrait image onto A4 portrait', () => {
        const l = layoutPage(1000, 1414, 'a4', false, 200)
        expect(l.pageWidth).toBeCloseTo(595.28)
        expect(l.pageHeight).toBeCloseTo(841.89)
        expect(l.x).toBeGreaterThanOrEqual(0)
        expect(l.width).toBeLessThanOrEqual(595.28)
    })

    it('turns the page for landscape images', () => {
        const l = layoutPage(1400, 1000, 'letter', true, 200)
        expect(l.pageWidth).toBe(792)
        expect(l.pageHeight).toBe(612)
        expect(l.x).toBeGreaterThanOrEqual(18)
        expect(l.y).toBeGreaterThanOrEqual(18)
    })

    it('sizes "fit" pages from the pixel size and DPI', () => {
        const l = layoutPage(1700, 2200, 'fit', false, 200)
        expect(l.pageWidth).toBeCloseTo(612)
        expect(l.pageHeight).toBeCloseTo(792)
    })

    it('derives the render size from page size and DPI', () => {
        expect(exportMaxSide('a4', 200)).toBe(2339)
        expect(exportMaxSide('letter', 150)).toBe(1650)
    })
})

describe('nextStableSince', () => {
    const q = FULL_FRAME
    const nudged = q.map((p) => ({ x: p.x * 0.99, y: p.y })) as Quad
    const jumped = q.map((p) => ({ x: p.x * 0.8, y: p.y })) as Quad

    it('starts, keeps and resets a stable streak', () => {
        expect(nextStableSince(null, q, null, 100)).toBe(100)
        expect(nextStableSince(q, nudged, 100, 400)).toBe(100)
        expect(nextStableSince(nudged, jumped, 100, 500)).toBe(500)
        expect(nextStableSince(q, null, 100, 600)).toBeNull()
    })
})
