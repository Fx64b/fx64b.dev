import { describe, expect, it } from 'vitest'

import {
    edgeSupport,
    sideContrast,
    signatureDistance,
} from '@/components/tools/document-scanner/cv-pipeline'
import type { Quad } from '@/components/tools/document-scanner/types'

const W = 100
const H = 100
const PAGE: Quad = [
    { x: 20, y: 20 },
    { x: 80, y: 20 },
    { x: 80, y: 80 },
    { x: 20, y: 80 },
]

/** Grayscale frame: bright page on a dark table, optional busy stripes. */
function frame(stripes = false) {
    const data = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const onPage = x >= 20 && x <= 80 && y >= 20 && y <= 80
            data[y * W + x] = onPage
                ? 230
                : stripes && Math.floor(x / 5) % 2
                  ? 200
                  : 60
        }
    }
    return { data, cols: W, rows: H }
}

/** Edge map with the page outline drawn in. */
function outline() {
    const data = new Uint8Array(W * H)
    for (let i = 20; i <= 80; i++) {
        data[20 * W + i] = data[80 * W + i] = 255
        data[i * W + 20] = data[i * W + 80] = 255
    }
    return { data, cols: W, rows: H }
}

describe('edgeSupport', () => {
    it('is high when every side lies on an edge', () => {
        expect(edgeSupport(outline(), PAGE)).toBe(1)
    })

    it('is low when a side runs through empty space', () => {
        const wrong: Quad = [
            PAGE[0],
            PAGE[1],
            { x: 80, y: 95 },
            { x: 20, y: 95 },
        ]
        expect(edgeSupport(outline(), wrong)).toBeLessThan(0.2)
    })
})

describe('sideContrast', () => {
    it('is strongly positive for a bright page on a dark table', () => {
        expect(sideContrast(frame(), PAGE)).toBeGreaterThan(100)
    })

    it('is zero for a side on the frame border', () => {
        const touching: Quad = [
            { x: 0, y: 0 },
            { x: 80, y: 0 },
            { x: 80, y: 80 },
            { x: 0, y: 80 },
        ]
        expect(sideContrast(frame(), touching)).toBe(0)
    })

    it('rejects outlines drawn through a busy background', () => {
        // A quad whose left side sits between background stripes.
        const inBackground: Quad = [
            { x: 7, y: 10 },
            { x: 90, y: 10 },
            { x: 90, y: 90 },
            { x: 7, y: 90 },
        ]
        expect(sideContrast(frame(true), inBackground)).toBeLessThan(6)
    })
})

describe('signatureDistance', () => {
    const a = [1, -1, 1, -1]
    it('is ~0 for identical content and 2 for inverted content', () => {
        expect(signatureDistance(a, a)).toBeCloseTo(0)
        expect(signatureDistance(a, [-1, 1, -1, 1])).toBeCloseTo(2)
    })

    it('treats mismatched signatures as different pages', () => {
        expect(signatureDistance(a, [1, 2])).toBe(1)
    })
})
