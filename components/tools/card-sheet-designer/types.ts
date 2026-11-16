export type HAlign = 'left' | 'center' | 'right'
export type VAlign = 'top' | 'center' | 'bottom'
export type Orientation = 'landscape' | 'portrait'
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'double'

export interface ImageCredit {
    title?: string
    creator?: string
    license?: string
    sourceUrl?: string
    provider: 'openverse' | 'picsum' | 'upload' | 'url'
}

export interface Background {
    /** Solid colour painted under the image (or alone when there is none). */
    color: string
    /** Image source: a remote URL or a data: URL from an upload. */
    image?: string
    credit?: ImageCredit
    /** Focal point of the image in percent (object-position). */
    posX: number
    posY: number
    /** 1 = cover the card exactly, larger values zoom in. */
    zoom: number
    /** Tint laid over the image to keep text readable. */
    overlayColor: string
    /** 0..1 */
    overlayOpacity: number
}

export interface TextStyle {
    fontFamily: string
    /** Main text size in pt. */
    fontSize: number
    /** Reference / signature line size in pt. */
    refSize: number
    color: string
    align: HAlign
    vAlign: VAlign
    lineHeight: number
    bold: boolean
    italic: boolean
    refItalic: boolean
    shadow: boolean
    /** Inner padding in mm. */
    padding: number
    /** Shrink the text until it fits inside the card. */
    autoFit: boolean
    /** Optional translucent panel behind the text. */
    panel: boolean
    panelColor: string
    /** 0..1 */
    panelOpacity: number
}

export type TextOverrides = Partial<
    Pick<
        TextStyle,
        'fontFamily' | 'fontSize' | 'refSize' | 'color' | 'align' | 'vAlign'
    >
>

export interface CardData {
    id: string
    text: string
    /** Smaller line under the text, e.g. "John 3:16" or "- Anna". */
    reference: string
    /** Used in "individual" background mode; falls back to the shared one. */
    background?: Background
    style?: TextOverrides
}

export interface CardSize {
    /** Width and height of the card in landscape orientation, in mm. */
    width: number
    height: number
}

export interface LayoutSettings {
    preset: string
    size: CardSize
    orientation: Orientation
    /** Space between neighbouring cards in mm. */
    gap: number
    /** Minimum distance from the paper edge to any card in mm. */
    minMargin: number
    /** Thin cut line around every card. */
    outline: boolean
    outlineColor: string
    /** Line width in mm. */
    outlineWidth: number
    /** Crop marks in the page margin, aligned with the card edges. */
    cropMarks: boolean
    /** Decorative frame drawn inside each card. */
    frame: boolean
    frameColor: string
    frameWidth: number
    frameInset: number
    frameRadius: number
    frameStyle: LineStyle
}

export interface Design {
    version: 1
    layout: LayoutSettings
    /** Shared background; a card's own background takes precedence. */
    background: Background
    textStyle: TextStyle
    pages: number
    /** When on, every card shows `sharedText` instead of its own text. */
    sameText: boolean
    sharedText: { text: string; reference: string }
    cards: CardData[]
}

export interface GridLayout {
    pageWidth: number
    pageHeight: number
    /** Card width and height after orientation, in mm. */
    cardWidth: number
    cardHeight: number
    cols: number
    rows: number
    perPage: number
    gap: number
    /** Left and top offset of the grid, in mm (the grid is centered). */
    marginX: number
    marginY: number
}
