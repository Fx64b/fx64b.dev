import type { CardSize, GridLayout, LayoutSettings } from './types'

export const A4 = { width: 210, height: 297 } as const

/** 1 mm in CSS pixels (CSS defines 96 px per inch). */
export const PX_PER_MM = 96 / 25.4

export const CARD_PRESETS: { id: string; label: string; size: CardSize }[] = [
    {
        id: 'eu',
        label: 'Business card EU (85 × 55 mm)',
        size: { width: 85, height: 55 },
    },
    {
        id: 'us',
        label: 'Business card US (3.5 × 2 in)',
        size: { width: 88.9, height: 50.8 },
    },
    {
        id: 'id1',
        label: 'Credit card / ID-1 (85.6 × 54 mm)',
        size: { width: 85.6, height: 53.98 },
    },
    {
        id: 'jp',
        label: 'Business card JP (91 × 55 mm)',
        size: { width: 91, height: 55 },
    },
    { id: 'a7', label: 'A7 (105 × 74 mm)', size: { width: 105, height: 74 } },
    { id: 'custom', label: 'Custom size', size: { width: 85, height: 55 } },
]

export const MIN_CARD_MM = 20

export function clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) {
        return min
    }
    return Math.min(max, Math.max(min, value))
}

/**
 * Works out how many cards fit on an A4 sheet and where the grid sits.
 * The grid is centered so the leftover space is split evenly, which keeps
 * the sheet symmetric and makes double-sided printing line up.
 */
export function computeGrid(layout: LayoutSettings): GridLayout {
    const base = layout.size
    const long = Math.max(base.width, base.height)
    const short = Math.min(base.width, base.height)
    const cardWidth = layout.orientation === 'landscape' ? long : short
    const cardHeight = layout.orientation === 'landscape' ? short : long
    const gap = Math.max(0, layout.gap)
    const margin = Math.max(0, layout.minMargin)

    const fit = (space: number, size: number) =>
        Math.max(
            0,
            Math.floor((space - 2 * margin + gap + 1e-6) / (size + gap))
        )

    const cols = fit(A4.width, cardWidth)
    const rows = fit(A4.height, cardHeight)
    const usedW = cols > 0 ? cols * cardWidth + (cols - 1) * gap : 0
    const usedH = rows > 0 ? rows * cardHeight + (rows - 1) * gap : 0

    return {
        pageWidth: A4.width,
        pageHeight: A4.height,
        cardWidth,
        cardHeight,
        cols,
        rows,
        perPage: cols * rows,
        gap,
        marginX: (A4.width - usedW) / 2,
        marginY: (A4.height - usedH) / 2,
    }
}

/** Top-left corner of the card at `index` (0-based, row-major) in mm. */
export function cardPosition(grid: GridLayout, index: number) {
    const col = index % grid.cols
    const row = Math.floor(index / grid.cols)
    return {
        x: grid.marginX + col * (grid.cardWidth + grid.gap),
        y: grid.marginY + row * (grid.cardHeight + grid.gap),
    }
}

/**
 * Distinct x and y coordinates of all card edges, used to draw crop marks
 * in the page margin.
 */
export function cutLines(grid: GridLayout): { xs: number[]; ys: number[] } {
    const xs = new Set<number>()
    const ys = new Set<number>()
    for (let c = 0; c < grid.cols; c++) {
        const x = grid.marginX + c * (grid.cardWidth + grid.gap)
        xs.add(round(x))
        xs.add(round(x + grid.cardWidth))
    }
    for (let r = 0; r < grid.rows; r++) {
        const y = grid.marginY + r * (grid.cardHeight + grid.gap)
        ys.add(round(y))
        ys.add(round(y + grid.cardHeight))
    }
    return {
        xs: [...xs].sort((a, b) => a - b),
        ys: [...ys].sort((a, b) => a - b),
    }
}

function round(n: number) {
    return Math.round(n * 1000) / 1000
}

/** Pixel size to request from image services for roughly 300 dpi. */
export function imagePixelsFor(grid: GridLayout, dpi = 300) {
    const toPx = (mm: number) => Math.round((mm / 25.4) * dpi)
    return { width: toPx(grid.cardWidth), height: toPx(grid.cardHeight) }
}
