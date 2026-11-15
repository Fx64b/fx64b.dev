import { CARD_PRESETS, MIN_CARD_MM, clamp, computeGrid } from './layout'
import type {
    Background,
    CardData,
    Design,
    LayoutSettings,
    TextStyle,
} from './types'

export const MAX_PAGES = 20

export const FONTS: { label: string; family: string; google?: string }[] = [
    {
        label: 'Inter (sans)',
        family: "'Inter', ui-sans-serif, system-ui, sans-serif",
    },
    {
        label: 'Lora (serif)',
        family: "'Lora', Georgia, serif",
        google: 'Lora:ital,wght@0,400;0,700;1,400;1,700',
    },
    {
        label: 'EB Garamond (classic)',
        family: "'EB Garamond', Garamond, serif",
        google: 'EB+Garamond:ital,wght@0,400;0,700;1,400;1,700',
    },
    {
        label: 'Playfair Display (elegant)',
        family: "'Playfair Display', Georgia, serif",
        google: 'Playfair+Display:ital,wght@0,400;0,700;1,400;1,700',
    },
    {
        label: 'Cormorant (refined)',
        family: "'Cormorant Garamond', Garamond, serif",
        google: 'Cormorant+Garamond:ital,wght@0,400;0,700;1,400;1,700',
    },
    {
        label: 'Montserrat (modern)',
        family: "'Montserrat', ui-sans-serif, sans-serif",
        google: 'Montserrat:ital,wght@0,400;0,700;1,400;1,700',
    },
    {
        label: 'Dancing Script (handwriting)',
        family: "'Dancing Script', cursive",
        google: 'Dancing+Script:wght@400;700',
    },
    {
        label: 'Great Vibes (calligraphy)',
        family: "'Great Vibes', cursive",
        google: 'Great+Vibes',
    },
    {
        label: 'Mountains of Christmas (festive)',
        family: "'Mountains of Christmas', cursive",
        google: 'Mountains+of+Christmas:wght@400;700',
    },
    { label: 'Georgia (system serif)', family: 'Georgia, serif' },
]

/** One stylesheet URL for every web font the tool offers. */
export function googleFontsUrl(): string {
    const families = FONTS.filter((f) => f.google)
        .map((f) => `family=${f.google}`)
        .join('&')
    return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

export function newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const DEFAULT_BACKGROUND: Background = {
    color: '#ffffff',
    posX: 50,
    posY: 50,
    zoom: 1,
    overlayColor: '#000000',
    overlayOpacity: 0,
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
    fontFamily: FONTS[1].family,
    fontSize: 10,
    refSize: 7.5,
    color: '#1f2937',
    align: 'center',
    vAlign: 'center',
    lineHeight: 1.3,
    bold: false,
    italic: false,
    refItalic: true,
    shadow: false,
    padding: 5,
    autoFit: true,
    panel: false,
    panelColor: '#ffffff',
    panelOpacity: 0.75,
}

export const DEFAULT_LAYOUT: LayoutSettings = {
    preset: 'eu',
    size: { ...CARD_PRESETS[0].size },
    orientation: 'landscape',
    gap: 0,
    minMargin: 8,
    outline: true,
    outlineColor: '#9ca3af',
    outlineWidth: 0.2,
    cropMarks: false,
    frame: false,
    frameColor: '#b8860b',
    frameWidth: 0.6,
    frameInset: 2.5,
    frameRadius: 1.5,
    frameStyle: 'solid',
}

export function blankCard(): CardData {
    return { id: newId(), text: '', reference: '' }
}

export function createDefaultDesign(): Design {
    const design: Design = {
        version: 1,
        layout: { ...DEFAULT_LAYOUT, size: { ...DEFAULT_LAYOUT.size } },
        backgroundMode: 'same',
        background: { ...DEFAULT_BACKGROUND },
        textStyle: { ...DEFAULT_TEXT_STYLE },
        pages: 1,
        cards: [],
    }
    return ensureCardCount(design)
}

/** Number of cards visible with the current layout and page count. */
export function visibleCardCount(design: Design): number {
    return computeGrid(design.layout).perPage * design.pages
}

/**
 * Pads the card list so every visible slot has a card. Cards beyond the
 * visible range are kept, so shrinking the layout and growing it again
 * doesn't throw away text.
 */
export function ensureCardCount(design: Design): Design {
    const needed = visibleCardCount(design)
    if (design.cards.length >= needed) {
        return design
    }
    const cards = design.cards.slice()
    while (cards.length < needed) {
        cards.push(blankCard())
    }
    return { ...design, cards }
}

export interface ParsedEntry {
    text: string
    reference: string
}

const REFERENCE_PREFIX = /^\s*(?:—|–|--|~)\s*/

/**
 * Splits pasted text into card entries. Entries are separated by one or
 * more blank lines. Inside an entry, a final line starting with an em dash,
 * en dash, "--" or "~" becomes the smaller reference line, e.g.
 *
 *   The LORD is my shepherd; I shall not want.
 *   — Psalm 23:1
 */
export function parseBulkText(input: string): ParsedEntry[] {
    return input
        .replace(/\r\n?/g, '\n')
        .split(/\n\s*\n/)
        .map((block) => block.split('\n').map((l) => l.trimEnd()))
        .map((lines) => {
            while (lines.length && !lines[0].trim()) {
                lines.shift()
            }
            while (lines.length && !lines[lines.length - 1].trim()) {
                lines.pop()
            }
            let reference = ''
            // A lone dash-prefixed line stays text; it needs text above it.
            if (
                lines.length > 1 &&
                REFERENCE_PREFIX.test(lines[lines.length - 1])
            ) {
                reference = lines.pop()!.replace(REFERENCE_PREFIX, '').trim()
            }
            return { text: lines.join('\n').trim(), reference }
        })
        .filter((e) => e.text || e.reference)
}

/** Turns card entries back into the bulk text format. */
export function formatBulkText(
    cards: Pick<CardData, 'text' | 'reference'>[]
): string {
    return cards
        .filter((c) => c.text || c.reference)
        .map((c) => (c.reference ? `${c.text}\n— ${c.reference}` : c.text))
        .join('\n\n')
}

/**
 * Writes entries into the cards starting at `start`, adding pages when the
 * entries don't fit on the current ones (up to MAX_PAGES).
 */
export function applyEntries(
    design: Design,
    entries: ParsedEntry[],
    start = 0
): Design {
    const perPage = Math.max(1, computeGrid(design.layout).perPage)
    const neededCards = start + entries.length
    const pages = clamp(
        Math.max(design.pages, Math.ceil(neededCards / perPage)),
        1,
        MAX_PAGES
    )
    const next = ensureCardCount({ ...design, pages })
    const limit = Math.min(entries.length, visibleCardCount(next) - start)
    const cards = next.cards.slice()
    for (let i = 0; i < limit; i++) {
        cards[start + i] = {
            ...cards[start + i],
            text: entries[i].text,
            reference: entries[i].reference,
        }
    }
    return { ...next, cards }
}

// ---------------------------------------------------------------------------
// Import / validation
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)

function num(v: unknown, fallback: number, min: number, max: number) {
    return typeof v === 'number' && Number.isFinite(v)
        ? clamp(v, min, max)
        : fallback
}

function str(v: unknown, fallback: string, max = 5000) {
    return typeof v === 'string' ? v.slice(0, max) : fallback
}

function bool(v: unknown, fallback: boolean) {
    return typeof v === 'boolean' ? v : fallback
}

function oneOf<T extends string>(
    v: unknown,
    options: readonly T[],
    fallback: T
): T {
    return options.includes(v as T) ? (v as T) : fallback
}

const COLOR = /^#[0-9a-f]{3,8}$/i
function color(v: unknown, fallback: string) {
    return typeof v === 'string' && COLOR.test(v) ? v : fallback
}

/** Only allow image sources that can't run script when used in <img>. */
export function safeImageSrc(v: unknown): string | undefined {
    if (typeof v !== 'string') {
        return undefined
    }
    if (
        /^https?:\/\//i.test(v) ||
        /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(v)
    ) {
        return v
    }
    return undefined
}

function normalizeBackground(v: unknown, fallback: Background): Background {
    if (!isObj(v)) {
        return { ...fallback }
    }
    const credit = isObj(v.credit)
        ? {
              title: str(v.credit.title, '', 300) || undefined,
              creator: str(v.credit.creator, '', 300) || undefined,
              license: str(v.credit.license, '', 100) || undefined,
              sourceUrl:
                  typeof v.credit.sourceUrl === 'string' &&
                  /^https?:\/\//i.test(v.credit.sourceUrl)
                      ? v.credit.sourceUrl
                      : undefined,
              provider: oneOf(
                  v.credit.provider,
                  ['openverse', 'picsum', 'upload', 'url'] as const,
                  'url'
              ),
          }
        : undefined
    const image = safeImageSrc(v.image)
    return {
        color: color(v.color, fallback.color),
        image,
        credit: image ? credit : undefined,
        posX: num(v.posX, fallback.posX, 0, 100),
        posY: num(v.posY, fallback.posY, 0, 100),
        zoom: num(v.zoom, fallback.zoom, 1, 4),
        overlayColor: color(v.overlayColor, fallback.overlayColor),
        overlayOpacity: num(v.overlayOpacity, fallback.overlayOpacity, 0, 1),
    }
}

const H = ['left', 'center', 'right'] as const
const V = ['top', 'center', 'bottom'] as const

function normalizeTextStyle(v: unknown): TextStyle {
    const d = DEFAULT_TEXT_STYLE
    if (!isObj(v)) {
        return { ...d }
    }
    return {
        fontFamily: str(v.fontFamily, d.fontFamily, 200),
        fontSize: num(v.fontSize, d.fontSize, 4, 48),
        refSize: num(v.refSize, d.refSize, 4, 36),
        color: color(v.color, d.color),
        align: oneOf(v.align, H, d.align),
        vAlign: oneOf(v.vAlign, V, d.vAlign),
        lineHeight: num(v.lineHeight, d.lineHeight, 0.8, 3),
        bold: bool(v.bold, d.bold),
        italic: bool(v.italic, d.italic),
        refItalic: bool(v.refItalic, d.refItalic),
        shadow: bool(v.shadow, d.shadow),
        padding: num(v.padding, d.padding, 0, 20),
        autoFit: bool(v.autoFit, d.autoFit),
        panel: bool(v.panel, d.panel),
        panelColor: color(v.panelColor, d.panelColor),
        panelOpacity: num(v.panelOpacity, d.panelOpacity, 0, 1),
    }
}

function normalizeOverrides(v: unknown): CardData['style'] {
    if (!isObj(v)) {
        return undefined
    }
    const out: NonNullable<CardData['style']> = {}
    if (typeof v.fontFamily === 'string') {
        out.fontFamily = v.fontFamily.slice(0, 200)
    }
    if (typeof v.fontSize === 'number') {
        out.fontSize = num(v.fontSize, 10, 4, 48)
    }
    if (typeof v.refSize === 'number') {
        out.refSize = num(v.refSize, 7.5, 4, 36)
    }
    if (typeof v.color === 'string' && COLOR.test(v.color)) {
        out.color = v.color
    }
    if (H.includes(v.align as never)) {
        out.align = v.align as (typeof H)[number]
    }
    if (V.includes(v.vAlign as never)) {
        out.vAlign = v.vAlign as (typeof V)[number]
    }
    return Object.keys(out).length ? out : undefined
}

function normalizeLayout(v: unknown): LayoutSettings {
    const d = DEFAULT_LAYOUT
    if (!isObj(v)) {
        return { ...d, size: { ...d.size } }
    }
    const size = isObj(v.size) ? v.size : {}
    return {
        preset: oneOf(
            v.preset,
            CARD_PRESETS.map((p) => p.id),
            d.preset
        ),
        size: {
            width: num(size.width, d.size.width, MIN_CARD_MM, 200),
            height: num(size.height, d.size.height, MIN_CARD_MM, 200),
        },
        orientation: oneOf(
            v.orientation,
            ['landscape', 'portrait'] as const,
            d.orientation
        ),
        gap: num(v.gap, d.gap, 0, 20),
        minMargin: num(v.minMargin, d.minMargin, 0, 30),
        outline: bool(v.outline, d.outline),
        outlineColor: color(v.outlineColor, d.outlineColor),
        outlineWidth: num(v.outlineWidth, d.outlineWidth, 0.05, 3),
        cropMarks: bool(v.cropMarks, d.cropMarks),
        frame: bool(v.frame, d.frame),
        frameColor: color(v.frameColor, d.frameColor),
        frameWidth: num(v.frameWidth, d.frameWidth, 0.1, 5),
        frameInset: num(v.frameInset, d.frameInset, 0, 20),
        frameRadius: num(v.frameRadius, d.frameRadius, 0, 20),
        frameStyle: oneOf(
            v.frameStyle,
            ['solid', 'dashed', 'dotted', 'double'] as const,
            d.frameStyle
        ),
    }
}

/**
 * Validates an imported or restored design. Anything unknown or malformed
 * is replaced by defaults, so a bad file can't break the tool.
 * Throws if the input isn't a design at all.
 */
export function normalizeDesign(input: unknown): Design {
    if (!isObj(input) || !Array.isArray(input.cards)) {
        throw new Error('This file is not a card sheet design.')
    }
    const background = normalizeBackground(input.background, DEFAULT_BACKGROUND)
    const cards: CardData[] = input.cards.slice(0, 1000).map((c) => {
        const card = isObj(c) ? c : {}
        return {
            id:
                typeof card.id === 'string' && card.id
                    ? card.id.slice(0, 100)
                    : newId(),
            text: str(card.text, ''),
            reference: str(card.reference, '', 500),
            background: isObj(card.background)
                ? normalizeBackground(card.background, background)
                : undefined,
            style: normalizeOverrides(card.style),
        }
    })
    return ensureCardCount({
        version: 1,
        layout: normalizeLayout(input.layout),
        backgroundMode: oneOf(
            input.backgroundMode,
            ['same', 'individual'] as const,
            'same'
        ),
        background,
        textStyle: normalizeTextStyle(input.textStyle),
        pages: num(input.pages, 1, 1, MAX_PAGES),
        cards,
    })
}

/** The background a card is printed with. */
export function backgroundFor(design: Design, card: CardData): Background {
    if (design.backgroundMode === 'individual' && card.background) {
        return card.background
    }
    return design.background
}

// ---------------------------------------------------------------------------
// Ready-made texts
// ---------------------------------------------------------------------------

export const TEXT_PRESETS: { id: string; label: string; text: string }[] = [
    {
        id: 'bible-kjv',
        label: 'Bible verses (KJV)',
        text: `For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.
— John 3:16

The LORD is my shepherd; I shall not want.
— Psalm 23:1

I can do all things through Christ which strengtheneth me.
— Philippians 4:13

Trust in the LORD with all thine heart; and lean not unto thine own understanding.
— Proverbs 3:5

God is our refuge and strength, a very present help in trouble.
— Psalm 46:1

And we know that all things work together for good to them that love God, to them who are the called according to his purpose.
— Romans 8:28

Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.
— Joshua 1:9

Thy word is a lamp unto my feet, and a light unto my path.
— Psalm 119:105

Come unto me, all ye that labour and are heavy laden, and I will give you rest.
— Matthew 11:28

The LORD bless thee, and keep thee: the LORD make his face shine upon thee, and be gracious unto thee.
— Numbers 6:24-25`,
    },
    {
        id: 'christmas-verses',
        label: 'Christmas verses (KJV)',
        text: `For unto you is born this day in the city of David a Saviour, which is Christ the Lord.
— Luke 2:11

Glory to God in the highest, and on earth peace, good will toward men.
— Luke 2:14

For unto us a child is born, unto us a son is given: and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace.
— Isaiah 9:6

And they shall call his name Emmanuel, which being interpreted is, God with us.
— Matthew 1:23

Fear not: for, behold, I bring you good tidings of great joy, which shall be to all people.
— Luke 2:10

And the Word was made flesh, and dwelt among us, full of grace and truth.
— John 1:14

When they saw the star, they rejoiced with exceeding great joy.
— Matthew 2:10

The people that walked in darkness have seen a great light.
— Isaiah 9:2

But Mary kept all these things, and pondered them in her heart.
— Luke 2:19

Thanks be unto God for his unspeakable gift.
— 2 Corinthians 9:15`,
    },
    {
        id: 'christmas-en',
        label: 'Christmas greetings (English)',
        text: `Merry Christmas and a Happy New Year!

Wishing you peace, joy and love this Christmas.

May the light of Christmas fill your home with warmth.

Warmest wishes for a wonderful holiday season.

Peace on earth and joy in every heart.

May your days be merry and bright.

Thank you for being part of our year. Merry Christmas!

Season's greetings and all the best for the new year.

Joy to you and yours this Christmas.

Have a blessed Christmas and a hopeful new year.`,
    },
    {
        id: 'christmas-de',
        label: 'Weihnachtsgrüsse (Deutsch)',
        text: `Frohe Weihnachten und ein gutes neues Jahr!

Besinnliche Feiertage und alles Liebe.

Frohe Weihnachten und einen guten Rutsch ins neue Jahr!

Gesegnete Weihnachten!

Möge das Licht der Weihnacht dein Herz erhellen.

Wir wünschen dir ein friedvolles Weihnachtsfest.

Zeit für Ruhe, Wärme und die Menschen, die man liebt. Frohe Weihnachten!

Danke für dieses Jahr. Frohe Festtage!

Fröhliche Weihnachten und viel Freude im neuen Jahr.

Ein Fest voller Licht, Liebe und Frieden.`,
    },
]
