// Ground queries on a generated hole: height, normal and surface.
//
// Only + - * / and Math.sqrt are used, so the answers are identical in every
// JavaScript engine.
import type { HoleData, SurfaceId, Vec3 } from '../shared/hole'
import { SURFACE_IDS } from '../shared/hole'

export interface Ground {
    /** Ground height (y) at a point. */
    height(x: number, z: number): number
    /** Unit normal of the ground at a point. */
    normal(x: number, z: number): Vec3
    surface(x: number, z: number): SurfaceId
}

/** Width of the band where the green heightfield fades into the terrain. */
export const GREEN_SEAM = 1.5

/** Step of the central difference used for normals. */
const NORMAL_STEP = 0.2

export function createGround(hole: HoleData): Ground {
    const { terrain, greenField, surfaces, bounds } = hole

    const tH = terrain.heights
    const tCols = terrain.cols
    const tMaxC = terrain.cols - 1
    const tMaxR = terrain.rows - 1
    const tInv = 1 / terrain.cellSize
    const tx0 = terrain.originX
    const tz0 = terrain.originZ

    const gH = greenField.heights
    const gCols = greenField.cols
    const gMaxC = greenField.cols - 1
    const gMaxR = greenField.rows - 1
    const gInv = 1 / greenField.cellSize
    const gx0 = greenField.originX
    const gz0 = greenField.originZ
    const gx1 = gx0 + gMaxC * greenField.cellSize
    const gz1 = gz0 + gMaxR * greenField.cellSize

    const sData = surfaces.data
    const sCols = surfaces.cols
    const sRows = surfaces.rows
    const sInv = 1 / surfaces.cellSize
    const sx0 = surfaces.originX
    const sz0 = surfaces.originZ

    function coarse(x: number, z: number): number {
        let fx = (x - tx0) * tInv
        let fz = (z - tz0) * tInv
        // Outside the grid the edge height continues.
        fx = fx < 0 ? 0 : fx > tMaxC ? tMaxC : fx
        fz = fz < 0 ? 0 : fz > tMaxR ? tMaxR : fz
        let c = Math.floor(fx)
        let r = Math.floor(fz)
        if (c >= tMaxC) {
            c = tMaxC - 1
        }
        if (r >= tMaxR) {
            r = tMaxR - 1
        }
        const u = fx - c
        const v = fz - r
        const i = r * tCols + c
        const a = tH[i] + (tH[i + 1] - tH[i]) * u
        const b = tH[i + tCols] + (tH[i + tCols + 1] - tH[i + tCols]) * u
        return a + (b - a) * v
    }

    function fine(x: number, z: number): number {
        const fx = (x - gx0) * gInv
        const fz = (z - gz0) * gInv
        let c = Math.floor(fx)
        let r = Math.floor(fz)
        if (c >= gMaxC) {
            c = gMaxC - 1
        }
        if (r >= gMaxR) {
            r = gMaxR - 1
        }
        const u = fx - c
        const v = fz - r
        const i = r * gCols + c
        const a = gH[i] + (gH[i + 1] - gH[i]) * u
        const b = gH[i + gCols] + (gH[i + gCols + 1] - gH[i + gCols]) * u
        return a + (b - a) * v
    }

    function height(x: number, z: number): number {
        const base = coarse(x, z)
        if (x <= gx0 || x >= gx1 || z <= gz0 || z >= gz1) {
            return base
        }
        // Distance to the nearest edge of the green heightfield.
        const ex = x - gx0 < gx1 - x ? x - gx0 : gx1 - x
        const ez = z - gz0 < gz1 - z ? z - gz0 : gz1 - z
        const edge = ex < ez ? ex : ez
        const detail = fine(x, z)
        if (edge >= GREEN_SEAM) {
            return detail
        }
        const t = edge / GREEN_SEAM
        return base + (detail - base) * (t * t * (3 - 2 * t))
    }

    function normal(x: number, z: number): Vec3 {
        const e = NORMAL_STEP
        const dx = (height(x + e, z) - height(x - e, z)) / (2 * e)
        const dz = (height(x, z + e) - height(x, z - e)) / (2 * e)
        const inv = 1 / Math.sqrt(dx * dx + 1 + dz * dz)
        return { x: -dx * inv, y: inv, z: -dz * inv }
    }

    function surface(x: number, z: number): SurfaceId {
        if (!(
            x >= bounds.minX &&
            x <= bounds.maxX &&
            z >= bounds.minZ &&
            z <= bounds.maxZ
        )) {
            return 'ob'
        }
        const c = Math.floor((x - sx0) * sInv)
        const r = Math.floor((z - sz0) * sInv)
        if (c < 0 || r < 0 || c >= sCols || r >= sRows) {
            return 'ob'
        }
        return SURFACE_IDS[sData[r * sCols + c]] ?? 'ob'
    }

    return { height, normal, surface }
}
