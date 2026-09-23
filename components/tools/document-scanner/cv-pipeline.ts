/**
 * Document detection and cleanup on top of OpenCV.js. Everything here is a
 * pure function of `cv` and pixel buffers so it can run in the worker (and in
 * Node for tuning). Every Mat allocated is released before returning.
 */
import {
    clampQuad,
    isConvexQuad,
    orderCorners,
    quadArea,
    scaleQuad,
    warpedSize,
} from './imaging'
import type { PageSettings, Point, Quad, RgbaImage } from './types'

// OpenCV.js ships without types; keep the surface loosely typed.
type CV = any
type Mat = any

export interface Detection {
    /** Normalized corners, or null when no page was found. */
    quad: Quad | null
    /** Fraction of the frame the page covers (0 when not found). */
    area: number
    /**
     * Tiny flattened, contrast-normalized thumbnail of the page content.
     * Unlike the raw frame it barely changes with hand jitter, so it tells
     * "the same page again" from "the next page" (see signatureDistance).
     */
    signature?: number[]
}

const SIGNATURE_SIDE = 16

/** Flattens the quad to a tiny grayscale patch, normalized to mean 0 / std 1. */
function pageSignature(cv: CV, gray: Mat, quad: Quad): number[] {
    return withMats((track) => {
        const src = track(
            cv.matFromArray(
                4,
                1,
                cv.CV_32FC2,
                quad.flatMap((p) => [p.x, p.y])
            )
        )
        const n = SIGNATURE_SIDE
        // Warp at 4x and shrink so every output pixel averages many inputs.
        const w = n * 4
        const dst = track(
            cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, w, 0, w])
        )
        const m = track(cv.getPerspectiveTransform(src, dst))
        const big = track(new cv.Mat())
        cv.warpPerspective(
            gray,
            big,
            m,
            new cv.Size(w, w),
            cv.INTER_LINEAR,
            cv.BORDER_REPLICATE
        )
        const patch = track(new cv.Mat())
        cv.resize(big, patch, new cv.Size(n, n), 0, 0, cv.INTER_AREA)
        const values = Array.from(patch.data as Uint8Array)
        const mean = values.reduce((s, v) => s + v, 0) / values.length
        const std =
            Math.sqrt(
                values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
            ) || 1
        return values.map((v) => (v - mean) / std)
    })
}

/**
 * 1 - correlation of two page signatures: ~0 for the same page, larger for
 * a different page.
 */
export function signatureDistance(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
        return 1
    }
    let dot = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
    }
    return 1 - dot / a.length
}

const MIN_AREA = 0.2
// Fraction of the page trimmed on each side after warping.
const EDGE_TRIM = 0.005

/** Runs `fn` with a scratch list; every Mat pushed to it is deleted after. */
function withMats<T>(fn: (track: <M extends Mat>(m: M) => M) => T): T {
    const mats: Mat[] = []
    try {
        return fn((m) => {
            mats.push(m)
            return m
        })
    } finally {
        for (const m of mats) {
            if (m && !m.isDeleted?.()) {
                m.delete()
            }
        }
    }
}

function matToPoints(mat: Mat): Point[] {
    const pts: Point[] = []
    for (let i = 0; i < mat.rows; i++) {
        pts.push({ x: mat.data32S[i * 2], y: mat.data32S[i * 2 + 1] })
    }
    return pts
}

function resizeToMax(cv: CV, src: Mat, maxSide: number): Mat {
    const scale = Math.min(1, maxSide / Math.max(src.cols, src.rows))
    const dst = new cv.Mat()
    if (scale === 1) {
        src.copyTo(dst)
    } else {
        cv.resize(
            src,
            dst,
            new cv.Size(
                Math.round(src.cols * scale),
                Math.round(src.rows * scale)
            ),
            0,
            0,
            cv.INTER_AREA
        )
    }
    return dst
}

/**
 * Collects plausible 4-corner outlines from a binary edge / mask image, in
 * the mask's pixel space.
 */
function collectQuads(
    cv: CV,
    mask: Mat,
    minArea: number,
    out: Quad[],
    allowRectFallback: boolean
): void {
    withMats((track) => {
        const contours = track(new cv.MatVector())
        const hierarchy = track(new cv.Mat())
        cv.findContours(
            mask,
            contours,
            hierarchy,
            cv.RETR_LIST,
            cv.CHAIN_APPROX_SIMPLE
        )

        const candidates: { idx: number; area: number }[] = []
        for (let i = 0; i < contours.size(); i++) {
            const c = contours.get(i)
            // The hull area counts open (unclosed) edge contours too.
            const hull = new cv.Mat()
            cv.convexHull(c, hull, false, true)
            const area = cv.contourArea(hull)
            hull.delete()
            c.delete()
            if (area >= minArea) {
                candidates.push({ idx: i, area })
            }
        }
        candidates.sort((a, b) => b.area - a.area)

        const tryApprox = (poly: Mat) => {
            const peri = cv.arcLength(poly, true)
            for (const eps of [0.02, 0.035, 0.05, 0.08]) {
                const approx = new cv.Mat()
                cv.approxPolyDP(poly, approx, eps * peri, true)
                const rows = approx.rows
                if (rows === 4) {
                    const quad = orderCorners(matToPoints(approx))
                    if (isConvexQuad(quad) && quadArea(quad) >= minArea) {
                        out.push(quad)
                    }
                }
                approx.delete()
                if (rows <= 4) {
                    break
                }
            }
        }

        for (const { idx } of candidates.slice(0, 6)) {
            const contour = track(contours.get(idx))
            tryApprox(contour)
            const hull = track(new cv.Mat())
            cv.convexHull(contour, hull, false, true)
            tryApprox(hull)
            if (allowRectFallback) {
                const rect = cv.minAreaRect(hull)
                const quad = orderCorners(
                    cv.RotatedRect.points(rect) as Point[]
                )
                if (quadArea(quad) >= minArea) {
                    out.push(quad)
                }
            }
        }
    })
}

/**
 * Fraction of each side of `quad` that runs along edge pixels, returned as
 * the weakest side's value. Real paper borders score high on all four
 * sides; outlines that cut through the background or hug the frame don't.
 */
export function edgeSupport(
    edges: {
        data: Uint8Array
        cols: number
        rows: number
    },
    quad: Quad
): number {
    let weakest = 1
    for (let s = 0; s < 4; s++) {
        const a = quad[s]
        const b = quad[(s + 1) % 4]
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        const samples = Math.max(8, Math.round(len / 2))
        let hits = 0
        let counted = 0
        // Skip the ends; corners are often rounded or occluded.
        for (let i = 0; i <= samples; i++) {
            const t = 0.05 + (0.9 * i) / samples
            const x = Math.round(a.x + (b.x - a.x) * t)
            const y = Math.round(a.y + (b.y - a.y) * t)
            if (x < 0 || y < 0 || x >= edges.cols || y >= edges.rows) {
                continue
            }
            counted++
            if (edges.data[y * edges.cols + x] > 0) {
                hits++
            }
        }
        weakest = Math.min(weakest, counted ? hits / counted : 0)
    }
    return weakest
}

/**
 * Mean brightness step across each side (inside minus outside), returned as
 * the weakest side's value. Paper is brighter than its surroundings along
 * its whole outline, whereas lines in a busy background flip sign.
 */
export function sideContrast(
    gray: { data: Uint8Array; cols: number; rows: number },
    quad: Quad,
    offset = 5
): number {
    const cx = quad.reduce((s, p) => s + p.x, 0) / 4
    const cy = quad.reduce((s, p) => s + p.y, 0) / 4
    const at = (x: number, y: number) => {
        const xi = Math.round(x)
        const yi = Math.round(y)
        if (xi < 0 || yi < 0 || xi >= gray.cols || yi >= gray.rows) {
            return -1
        }
        return gray.data[yi * gray.cols + xi]
    }
    let weakest = Infinity
    for (let s = 0; s < 4; s++) {
        const a = quad[s]
        const b = quad[(s + 1) % 4]
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
        let nx = -(b.y - a.y) / len
        let ny = (b.x - a.x) / len
        // Point the normal inwards.
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        if (nx * (cx - mx) + ny * (cy - my) < 0) {
            nx = -nx
            ny = -ny
        }
        const samples = Math.max(8, Math.round(len / 3))
        let sum = 0
        let n = 0
        for (let i = 0; i <= samples; i++) {
            const t = 0.1 + (0.8 * i) / samples
            const x = a.x + (b.x - a.x) * t
            const y = a.y + (b.y - a.y) * t
            const inside = at(x + nx * offset, y + ny * offset)
            const outside = at(x - nx * offset, y - ny * offset)
            if (inside < 0 || outside < 0) {
                continue
            }
            sum += inside - outside
            n++
        }
        // A side with no pixels beyond it (on the frame border) can't be
        // confirmed as a paper edge.
        weakest = Math.min(weakest, n > samples * 0.3 ? sum / n : 0)
    }
    return weakest
}

const MIN_SUPPORT = 0.55
const MIN_CONTRAST = 6

/** Finds the document outline in an RGBA frame. */
export function detectDocument(
    cv: CV,
    image: RgbaImage,
    workSide = 640
): Detection {
    return withMats((track) => {
        const rgba = track(cv.matFromImageData(image))
        const small = track(resizeToMax(cv, rgba, workSide))
        const gray = track(new cv.Mat())
        cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY)
        const blurred = track(new cv.Mat())
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

        const frameArea = small.cols * small.rows
        const minArea = frameArea * MIN_AREA
        const k3 = track(
            cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
        )
        const candidates: Quad[] = []

        const otsu = track(new cv.Mat())
        const otsuValue = cv.threshold(
            blurred,
            otsu,
            0,
            255,
            cv.THRESH_BINARY + cv.THRESH_OTSU
        )

        // Candidates from Canny at a normal and a sensitive threshold (the
        // latter for white paper on a light table), plus the Otsu mask:
        // paper is usually brighter than what it lies on.
        const support = track(cv.Mat.zeros(small.rows, small.cols, cv.CV_8U))
        for (const [lo, hi] of [
            [otsuValue * 0.5, otsuValue],
            [otsuValue * 0.15, otsuValue * 0.35],
        ]) {
            const edges = track(new cv.Mat())
            cv.Canny(blurred, edges, lo, hi)
            cv.bitwise_or(support, edges, support)
            cv.dilate(edges, edges, k3)
            collectQuads(cv, edges, minArea, candidates, false)
        }
        const closeK = track(
            cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(15, 15))
        )
        cv.morphologyEx(otsu, otsu, cv.MORPH_CLOSE, closeK)
        cv.morphologyEx(otsu, otsu, cv.MORPH_OPEN, k3)
        collectQuads(cv, otsu, minArea, candidates, true)

        // Tolerate a few pixels of misalignment when scoring.
        const k5 = track(
            cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
        )
        cv.dilate(support, support, k5)

        let best: Quad | null = null
        let bestScore = 0
        for (const quad of candidates) {
            const s = edgeSupport(support, quad)
            if (s < MIN_SUPPORT) {
                continue
            }
            const c = sideContrast(blurred, quad)
            if (c < MIN_CONTRAST) {
                continue
            }
            const score =
                (quadArea(quad) / frameArea) * s * s * Math.min(1, c / 30)
            if (score > bestScore) {
                bestScore = score
                best = quad
            }
        }

        if (!best) {
            return { quad: null, area: 0 }
        }
        const normalized = clampQuad(
            scaleQuad(best, 1 / small.cols, 1 / small.rows)
        )
        return {
            quad: normalized,
            area: quadArea(normalized),
            signature: pageSignature(cv, gray, best),
        }
    })
}

/**
 * Estimates the skew of text lines, in degrees, for photos where no page
 * outline was found. Returns 0 when there is no confident estimate.
 */
function estimateTextSkew(cv: CV, gray: Mat): number {
    return withMats((track) => {
        const small = track(resizeToMax(cv, gray, 1000))
        const bin = track(new cv.Mat())
        cv.adaptiveThreshold(
            small,
            bin,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY_INV,
            25,
            15
        )
        // Smear characters horizontally so each text line becomes one blob.
        const k = track(
            cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(25, 3))
        )
        cv.morphologyEx(bin, bin, cv.MORPH_CLOSE, k)
        const contours = track(new cv.MatVector())
        const hierarchy = track(new cv.Mat())
        cv.findContours(
            bin,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        )

        const angles: { angle: number; weight: number }[] = []
        for (let i = 0; i < contours.size(); i++) {
            const c = contours.get(i)
            const rect = cv.minAreaRect(c)
            c.delete()
            let { width, height } = rect.size
            let angle = rect.angle as number
            if (width < height) {
                ;[width, height] = [height, width]
                angle -= 90
            }
            // Only long, thin blobs are text lines.
            if (width < small.cols * 0.15 || width < height * 5) {
                continue
            }
            while (angle > 45) {
                angle -= 90
            }
            while (angle <= -45) {
                angle += 90
            }
            angles.push({ angle, weight: width })
        }
        if (angles.length < 3) {
            return 0
        }
        angles.sort((a, b) => a.angle - b.angle)
        const total = angles.reduce((s, a) => s + a.weight, 0)
        let acc = 0
        for (const a of angles) {
            acc += a.weight
            if (acc >= total / 2) {
                return Math.abs(a.angle) > 15 ? 0 : a.angle
            }
        }
        return 0
    })
}

/**
 * Divides out the slowly varying illumination (shadows, vignetting, colour
 * casts) of a single-channel image so the paper becomes uniformly white.
 */
function flattenIllumination(cv: CV, channel: Mat): Mat {
    return withMats((track) => {
        const scale = Math.min(1, 480 / Math.max(channel.cols, channel.rows))
        const small = track(new cv.Mat())
        cv.resize(
            channel,
            small,
            new cv.Size(
                Math.max(1, Math.round(channel.cols * scale)),
                Math.max(1, Math.round(channel.rows * scale))
            ),
            0,
            0,
            cv.INTER_AREA
        )
        // Dilation replaces dark ink with nearby paper brightness, the
        // median then smooths what remains into a background estimate.
        const k = track(
            cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(11, 11))
        )
        cv.dilate(small, small, k)
        cv.medianBlur(small, small, 21)
        const bg = track(new cv.Mat())
        cv.resize(
            small,
            bg,
            new cv.Size(channel.cols, channel.rows),
            0,
            0,
            cv.INTER_LINEAR
        )
        const out = new cv.Mat()
        cv.divide(channel, bg, out, 255)
        return out
    })
}

/** Value below which `fraction` of the pixels of an 8-bit Mat fall. */
function percentile(cv: CV, gray: Mat, fraction: number): number {
    return withMats((track) => {
        const vec = track(new cv.MatVector())
        vec.push_back(gray)
        const hist = track(new cv.Mat())
        const mask = track(new cv.Mat())
        cv.calcHist(vec, [0], mask, hist, [256], [0, 256])
        const total = gray.rows * gray.cols
        let acc = 0
        for (let i = 0; i < 256; i++) {
            acc += hist.data32F[i]
            if (acc >= total * fraction) {
                return i
            }
        }
        return 255
    })
}

/**
 * Builds a lookup table that maps [black, white] to [0, 255] (so paper
 * grain clips to clean white), deepens the mid-tones slightly so text reads
 * darker, and applies the user's brightness/contrast (-100..100).
 */
function toneLut(
    cv: CV,
    black: number,
    white: number,
    brightness: number,
    contrast: number
): Mat {
    const lut = new cv.Mat(1, 256, cv.CV_8U)
    const c = 1 + contrast / 100
    const range = Math.max(1, white - black)
    for (let i = 0; i < 256; i++) {
        let v = Math.min(1, Math.max(0, (i - black) / range))
        v = Math.pow(v, 1.25) * 255
        v = (v - 128) * c + 128 + brightness * 1.28
        lut.data[i] = Math.max(0, Math.min(255, Math.round(v)))
    }
    return lut
}

/** Stretches the tones of `mat`, measuring black/white points on `gray`. */
function applyTone(cv: CV, mat: Mat, gray: Mat, settings: PageSettings): void {
    // After flattening the paper sits near 255; its lower spread is grain.
    const black = Math.min(percentile(cv, gray, 0.01), 110)
    const white = Math.max(black + 40, percentile(cv, gray, 0.3) - 6)
    const lut = toneLut(
        cv,
        black,
        white,
        settings.brightness,
        settings.contrast
    )
    cv.LUT(mat, lut, mat)
    lut.delete()
}

/** Warps and cleans one page. Returns an RGBA image ready to encode. */
export function processPage(
    cv: CV,
    image: RgbaImage,
    settings: PageSettings,
    maxSide: number
): RgbaImage {
    return withMats((track) => {
        const src = track(cv.matFromImageData(image))
        const rgb = track(new cv.Mat())
        cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB)

        // Perspective correction.
        const quad = scaleQuad(settings.corners, image.width, image.height)
        const size = warpedSize(quad, maxSide)
        const srcTri = track(
            cv.matFromArray(
                4,
                1,
                cv.CV_32FC2,
                quad.flatMap((p) => [p.x, p.y])
            )
        )
        // Map the outline slightly outside the output so the last pixel or
        // two of background along a detected edge are trimmed away.
        const inset = isFullFrame(settings.corners) ? 0 : EDGE_TRIM
        const dx = size.width * inset
        const dy = size.height * inset
        const dstTri = track(
            cv.matFromArray(4, 1, cv.CV_32FC2, [
                -dx,
                -dy,
                size.width + dx,
                -dy,
                size.width + dx,
                size.height + dy,
                -dx,
                size.height + dy,
            ])
        )
        const m = track(cv.getPerspectiveTransform(srcTri, dstTri))
        const page = track(new cv.Mat())
        cv.warpPerspective(
            rgb,
            page,
            m,
            new cv.Size(size.width, size.height),
            cv.INTER_AREA,
            cv.BORDER_REPLICATE
        )

        const gray = track(new cv.Mat())
        cv.cvtColor(page, gray, cv.COLOR_RGB2GRAY)

        // Text-line skew for photos where no page edge was used (the whole
        // frame is the crop). Applied after filtering so the exposed
        // corners can be filled with clean white.
        const skew =
            !settings.autoCorners && isFullFrame(settings.corners)
                ? estimateTextSkew(cv, gray)
                : 0

        const out = track(new cv.Mat())
        if (settings.filter === 'color') {
            const channels = track(new cv.MatVector())
            cv.split(page, channels)
            const flat = track(new cv.MatVector())
            for (let i = 0; i < 3; i++) {
                const ch = channels.get(i)
                const f = flattenIllumination(cv, ch)
                ch.delete()
                flat.push_back(f)
                f.delete()
            }
            cv.merge(flat, out)
            const flatGray = track(new cv.Mat())
            cv.cvtColor(out, flatGray, cv.COLOR_RGB2GRAY)
            applyTone(cv, out, flatGray, settings)
            cv.cvtColor(out, out, cv.COLOR_RGB2RGBA)
        } else {
            const flat = track(flattenIllumination(cv, gray))
            if (settings.filter === 'grayscale') {
                applyTone(cv, flat, flat, settings)
            } else {
                const block = Math.max(15, Math.round(flat.cols / 40) | 1)
                cv.GaussianBlur(flat, flat, new cv.Size(3, 3), 0)
                cv.adaptiveThreshold(
                    flat,
                    flat,
                    255,
                    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                    cv.THRESH_BINARY,
                    block,
                    settings.threshold
                )
            }
            cv.cvtColor(flat, out, cv.COLOR_GRAY2RGBA)
        }

        if (Math.abs(skew) > 0.3) {
            const center = new cv.Point(out.cols / 2, out.rows / 2)
            const rot = track(cv.getRotationMatrix2D(center, skew, 1))
            cv.warpAffine(
                out,
                out,
                rot,
                new cv.Size(out.cols, out.rows),
                cv.INTER_LINEAR,
                cv.BORDER_CONSTANT,
                new cv.Scalar(255, 255, 255, 255)
            )
        }

        let final = out
        if (settings.rotation !== 0) {
            final = track(new cv.Mat())
            const code =
                settings.rotation === 90
                    ? cv.ROTATE_90_CLOCKWISE
                    : settings.rotation === 180
                      ? cv.ROTATE_180
                      : cv.ROTATE_90_COUNTERCLOCKWISE
            cv.rotate(out, final, code)
        }

        return {
            data: new Uint8ClampedArray(final.data),
            width: final.cols,
            height: final.rows,
        }
    })
}

function isFullFrame(q: Quad): boolean {
    return q.every(
        (p, i) =>
            Math.abs(p.x - (i === 1 || i === 2 ? 1 : 0)) < 0.005 &&
            Math.abs(p.y - (i >= 2 ? 1 : 0)) < 0.005
    )
}
