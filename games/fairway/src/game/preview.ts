// The path preview (SPEC 8): faint dots along the start of the predicted
// path. A full shot shows only its launch angle and direction, a putt a
// little more of its line, so the player still judges the distance.
import type { ShotResult } from '../physics'
import type { Vec3 } from '../shared/hole'

/** Share of the carry that a full shot shows. */
export const PREVIEW_SHARE_FLIGHT = 0.015
/** Share of the roll that a putt shows. */
export const PREVIEW_SHARE_PUTT = 0.1
/** The preview is at least this long (horizontal), in m. */
export const PREVIEW_MIN_LENGTH = 1
/** While charging, the preview shows at least this power. */
export const PREVIEW_MIN_POWER = 0.04

/** Horizontal length of the path that the preview shows, in m. */
export function previewLength(result: ShotResult, putt: boolean): number {
    return Math.max(
        PREVIEW_MIN_LENGTH,
        putt
            ? PREVIEW_SHARE_PUTT * result.total
            : PREVIEW_SHARE_FLIGHT * result.carry
    )
}

/**
 * The path from its first point up to a horizontal distance from it. The
 * last point is interpolated to end exactly at that distance.
 */
export function pathStart(path: readonly Vec3[], length: number): Vec3[] {
    const points: Vec3[] = []
    const start = path[0]
    for (const p of path) {
        const d = Math.hypot(p.x - start.x, p.z - start.z)
        if (points.length > 0 && d > length) {
            const prev = points[points.length - 1]
            const pd = Math.hypot(prev.x - start.x, prev.z - start.z)
            const f = d > pd ? (length - pd) / (d - pd) : 0
            points.push({
                x: prev.x + (p.x - prev.x) * f,
                y: prev.y + (p.y - prev.y) * f,
                z: prev.z + (p.z - prev.z) * f,
            })
            break
        }
        points.push({ x: p.x, y: p.y, z: p.z })
    }
    return points
}

/** The preview dots for a simulated shot, or null if there is no path. */
export function previewPoints(
    result: ShotResult,
    putt: boolean
): Vec3[] | null {
    const points = pathStart(result.samples, previewLength(result, putt))
    return points.length > 1 ? points : null
}
