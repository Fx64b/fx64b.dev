/*
 * The shared data contract between the course generator (src/course), the
 * physics (src/physics), the renderer (src/render) and the game (src/game).
 *
 * Conventions:
 * - SI units: metres, seconds, m/s, radians.
 * - y is up. The ground is the x/z plane.
 * - The tee is near the origin. The hole runs roughly toward +z.
 * - A hole is plain data. It must be fully reproducible from (seed, version).
 */

export type SurfaceId =
    | 'tee'
    | 'fairway'
    | 'firstCut'
    | 'rough'
    | 'bunker'
    | 'green'
    | 'water'
    | 'ob'

// Index order for SurfaceGrid.data. Do not reorder: saved data depends on it.
export const SURFACE_IDS: readonly SurfaceId[] = [
    'tee',
    'fairway',
    'firstCut',
    'rough',
    'bunker',
    'green',
    'water',
    'ob',
]

export interface Vec2 {
    x: number
    z: number
}

export interface Vec3 {
    x: number
    y: number
    z: number
}

/** A regular grid of heights. Sample (col, row) is at
 *  (originX + col * cellSize, originZ + row * cellSize). Row-major. */
export interface Heightfield {
    originX: number
    originZ: number
    cellSize: number
    cols: number
    rows: number
    heights: Float32Array // length cols * rows
}

/** A regular grid of surface indices into SURFACE_IDS. Cell (col, row)
 *  covers [originX + col * cellSize, originX + (col + 1) * cellSize). */
export interface SurfaceGrid {
    originX: number
    originZ: number
    cellSize: number
    cols: number
    rows: number
    data: Uint8Array // length cols * rows
}

export type TreeKind = 'broadleaf' | 'pine' | 'birch'

export interface Tree {
    x: number
    z: number
    /** Ground height at the trunk. */
    y: number
    height: number
    /** Canopy radius. */
    radius: number
    kind: TreeKind
}

export interface Bunker {
    /** Closed outline in the x/z plane. */
    outline: Vec2[]
    greenside: boolean
}

export interface WaterBody {
    /** Closed outline in the x/z plane. */
    outline: Vec2[]
    /** Water surface height. */
    level: number
}

export interface HoleConditions {
    /** Wind at 10 m height, in m/s. Direction the wind blows TOWARD,
     *  in radians from +x toward +z, atan2(dz, dx). */
    windSpeed: number
    windDirection: number
    /** kg/m^3 */
    airDensity: number
    /** Green speed in feet. */
    stimp: number
}

export interface HoleData {
    /** Generator version that made this hole. */
    version: number
    seed: string
    /** Display number (days since launch for daily holes, else 0). */
    number: number
    par: 3 | 4 | 5
    /** 0 = easy, 1 = hard. */
    difficulty: number
    /** Playable area. Outside of it is out of bounds. */
    bounds: { minX: number; minZ: number; maxX: number; maxZ: number }
    /** Ball start on the tee (y is the ground height). */
    tee: Vec3
    /** Cup centre (y is the ground height). */
    pin: Vec3
    /** Spline control points from tee to green, for cameras and layout. */
    centerline: Vec2[]
    /** Coarse terrain for the whole hole (about 1 m cells). */
    terrain: Heightfield
    /** Fine height detail for the green (about 0.25 m cells). It replaces
     *  the coarse terrain inside its area. */
    greenField: Heightfield
    surfaces: SurfaceGrid
    bunkers: Bunker[]
    water: WaterBody[]
    trees: Tree[]
    conditions: HoleConditions
}
