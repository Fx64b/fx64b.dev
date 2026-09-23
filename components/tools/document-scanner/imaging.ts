import type {
    PageSettings,
    PageSize,
    Point,
    Quad,
    QualityPreset,
} from './types'

export const FULL_FRAME: Quad = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
]

export const DEFAULT_SETTINGS: Omit<PageSettings, 'corners' | 'autoCorners'> = {
    rotation: 0,
    filter: 'color',
    brightness: 0,
    contrast: 0,
    threshold: 12,
}

/**
 * Orders four arbitrary points as top-left, top-right, bottom-right,
 * bottom-left by sorting them around their centroid.
 */
export function orderCorners(points: Point[]): Quad {
    if (points.length !== 4) {
        throw new Error('orderCorners expects exactly 4 points')
    }
    const cx = points.reduce((s, p) => s + p.x, 0) / 4
    const cy = points.reduce((s, p) => s + p.y, 0) / 4
    // Clockwise in screen space (y down), starting from the top-left quadrant.
    const sorted = [...points].sort(
        (a, b) =>
            Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
    )
    // After sorting by angle, the top-left corner is the one with the
    // smallest x + y; rotate the array so it comes first.
    let start = 0
    for (let i = 1; i < 4; i++) {
        if (sorted[i].x + sorted[i].y < sorted[start].x + sorted[start].y) {
            start = i
        }
    }
    return [0, 1, 2, 3].map((i) => sorted[(start + i) % 4]) as Quad
}

/** Polygon area via the shoelace formula (same units as the points, squared). */
export function quadArea(q: Quad): number {
    let sum = 0
    for (let i = 0; i < 4; i++) {
        const a = q[i]
        const b = q[(i + 1) % 4]
        sum += a.x * b.y - b.x * a.y
    }
    return Math.abs(sum) / 2
}

export function isConvexQuad(q: Quad): boolean {
    let sign = 0
    for (let i = 0; i < 4; i++) {
        const a = q[i]
        const b = q[(i + 1) % 4]
        const c = q[(i + 2) % 4]
        const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
        if (cross === 0) {
            return false
        }
        const s = Math.sign(cross)
        if (sign === 0) {
            sign = s
        } else if (s !== sign) {
            return false
        }
    }
    return true
}

/** Largest distance any corner moved between two quads. */
export function maxCornerDelta(a: Quad, b: Quad): number {
    let max = 0
    for (let i = 0; i < 4; i++) {
        max = Math.max(max, Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y))
    }
    return max
}

export function scaleQuad(q: Quad, sx: number, sy: number): Quad {
    return q.map((p) => ({ x: p.x * sx, y: p.y * sy })) as Quad
}

export function clampQuad(q: Quad): Quad {
    return q.map((p) => ({
        x: Math.min(1, Math.max(0, p.x)),
        y: Math.min(1, Math.max(0, p.y)),
    })) as Quad
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

// Common paper aspect ratios (long / short). A detected page whose ratio is
// close to one of these is snapped to it, which undoes most of the
// foreshortening a tilted camera introduces.
const PAPER_RATIOS = [Math.SQRT2, 11 / 8.5, 14 / 8.5]
const SNAP_TOLERANCE = 0.07

/**
 * Pixel size of the flattened page for a quad given in source pixels,
 * limited so the longer side is at most `maxSide`.
 */
export function warpedSize(
    quad: Quad,
    maxSide: number,
    snapToPaper = true
): { width: number; height: number } {
    let width = Math.max(dist(quad[0], quad[1]), dist(quad[3], quad[2]))
    let height = Math.max(dist(quad[0], quad[3]), dist(quad[1], quad[2]))

    if (snapToPaper && width > 0 && height > 0) {
        const long = Math.max(width, height)
        const short = Math.min(width, height)
        const ratio = long / short
        for (const target of PAPER_RATIOS) {
            if (Math.abs(ratio - target) / target < SNAP_TOLERANCE) {
                const snappedShort = long / target
                if (width >= height) {
                    height = snappedShort
                } else {
                    width = snappedShort
                }
                break
            }
        }
    }

    const scale = Math.min(1, maxSide / Math.max(width, height))
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    }
}

// PDF points (1/72 inch).
const PAGE_SIZES_PT: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
    a4: [595.28, 841.89],
    letter: [612, 792],
}

export const QUALITY_PRESETS: Record<
    QualityPreset,
    { dpi: number; jpegQuality: number; label: string }
> = {
    small: { dpi: 150, jpegQuality: 0.7, label: 'Small (150 dpi)' },
    balanced: { dpi: 200, jpegQuality: 0.82, label: 'Balanced (200 dpi)' },
    high: { dpi: 300, jpegQuality: 0.9, label: 'High (300 dpi)' },
}

/** Longest pixel side worth rendering for the chosen page size and DPI. */
export function exportMaxSide(pageSize: PageSize, dpi: number): number {
    const longPt =
        pageSize === 'fit' ? PAGE_SIZES_PT.a4[1] : PAGE_SIZES_PT[pageSize][1]
    return Math.round((longPt / 72) * dpi)
}

export interface PageLayout {
    pageWidth: number
    pageHeight: number
    x: number
    y: number
    width: number
    height: number
}

/**
 * Places an image on a PDF page. Fixed page sizes follow the image's
 * orientation; "fit" makes the page exactly the image size at `dpi`.
 */
export function layoutPage(
    imageWidth: number,
    imageHeight: number,
    pageSize: PageSize,
    margin: boolean,
    dpi: number
): PageLayout {
    const marginPt = margin ? 18 : 0
    const landscape = imageWidth > imageHeight

    if (pageSize === 'fit') {
        const width = (imageWidth / dpi) * 72
        const height = (imageHeight / dpi) * 72
        return {
            pageWidth: width + marginPt * 2,
            pageHeight: height + marginPt * 2,
            x: marginPt,
            y: marginPt,
            width,
            height,
        }
    }

    const [short, long] = PAGE_SIZES_PT[pageSize]
    const pageWidth = landscape ? long : short
    const pageHeight = landscape ? short : long
    const boxW = pageWidth - marginPt * 2
    const boxH = pageHeight - marginPt * 2
    const scale = Math.min(boxW / imageWidth, boxH / imageHeight)
    const width = imageWidth * scale
    const height = imageHeight * scale
    return {
        pageWidth,
        pageHeight,
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
    }
}

/**
 * Tracks how long a detected quad has stayed put, for auto-capture.
 * Returns the timestamp the current stable streak began, or null.
 */
export function nextStableSince(
    prev: Quad | null,
    next: Quad | null,
    stableSince: number | null,
    now: number,
    tolerance = 0.02
): number | null {
    if (!next) {
        return null
    }
    if (!prev || maxCornerDelta(prev, next) > tolerance) {
        return now
    }
    return stableSince ?? now
}
