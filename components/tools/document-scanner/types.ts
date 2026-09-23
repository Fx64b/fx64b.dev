export interface Point {
    x: number
    y: number
}

/** Four corners ordered top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point]

export type ScanFilter = 'color' | 'grayscale' | 'bw'

export type Rotation = 0 | 90 | 180 | 270

export interface PageSettings {
    /** Crop corners, normalized to 0..1 of the (EXIF-oriented) source photo. */
    corners: Quad
    /** Auto-detected corners, kept so the user can reset their edits. */
    autoCorners: Quad | null
    rotation: Rotation
    filter: ScanFilter
    /** -100..100 */
    brightness: number
    /** -100..100 */
    contrast: number
    /** B&W threshold strength, 0..40 (higher removes more faint marks). */
    threshold: number
}

export interface ScanPage extends PageSettings {
    id: string
    blob: Blob
}

/** RGBA pixel buffer, structurally compatible with ImageData. */
export interface RgbaImage {
    data: Uint8ClampedArray
    width: number
    height: number
}

export type PageSize = 'a4' | 'letter' | 'fit'

export type QualityPreset = 'small' | 'balanced' | 'high'

export interface ExportOptions {
    pageSize: PageSize
    margin: boolean
    quality: QualityPreset
}
