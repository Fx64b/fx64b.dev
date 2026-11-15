import { describe, expect, it } from 'vitest'

import {
    MAX_PAGES,
    TEXT_PRESETS,
    applyEntries,
    backgroundFor,
    createDefaultDesign,
    ensureCardCount,
    formatBulkText,
    normalizeDesign,
    parseBulkText,
    safeImageSrc,
    visibleCardCount,
} from '@/components/tools/card-sheet-designer/design'

describe('parseBulkText', () => {
    it('splits on blank lines and reads reference lines', () => {
        const entries = parseBulkText(
            'The LORD is my shepherd; I shall not want.\n— Psalm 23:1\n\n\nMerry Christmas!\n\nLine one\nLine two\n-- Anna'
        )
        expect(entries).toEqual([
            {
                text: 'The LORD is my shepherd; I shall not want.',
                reference: 'Psalm 23:1',
            },
            { text: 'Merry Christmas!', reference: '' },
            { text: 'Line one\nLine two', reference: 'Anna' },
        ])
    })

    it('accepts en dashes, tildes and Windows line endings', () => {
        expect(
            parseBulkText('Hello\r\n– John 1:1\r\n\r\nWorld\r\n~ Tom')
        ).toEqual([
            { text: 'Hello', reference: 'John 1:1' },
            { text: 'World', reference: 'Tom' },
        ])
    })

    it('keeps a lone dash line as text and ignores whitespace-only blocks', () => {
        expect(parseBulkText('— just this\n\n   \n\n')).toEqual([
            { text: '— just this', reference: '' },
        ])
    })

    it('round-trips with formatBulkText', () => {
        const cards = [
            { text: 'A\nB', reference: 'Ref' },
            { text: 'C', reference: '' },
        ]
        expect(parseBulkText(formatBulkText(cards))).toEqual(cards)
    })

    it('parses every preset into ten cards with text', () => {
        for (const preset of TEXT_PRESETS) {
            const entries = parseBulkText(preset.text)
            expect(entries, preset.id).toHaveLength(10)
            expect(entries.every((e) => e.text.length > 0)).toBe(true)
        }
        const bible = parseBulkText(TEXT_PRESETS[0].text)
        expect(bible.every((e) => e.reference.length > 0)).toBe(true)
    })
})

describe('card counts', () => {
    it('starts with one sheet of ten cards', () => {
        const d = createDefaultDesign()
        expect(d.pages).toBe(1)
        expect(d.cards).toHaveLength(10)
        expect(visibleCardCount(d)).toBe(10)
        expect(new Set(d.cards.map((c) => c.id)).size).toBe(10)
    })

    it('keeps cards that no longer fit instead of deleting them', () => {
        const d = createDefaultDesign()
        d.cards[9].text = 'last'
        const smaller = ensureCardCount({
            ...d,
            layout: { ...d.layout, gap: 4 },
        })
        expect(visibleCardCount(smaller)).toBe(8)
        expect(smaller.cards).toHaveLength(10)
        expect(smaller.cards[9].text).toBe('last')
    })

    it('adds pages when there are more entries than cards', () => {
        const entries = Array.from({ length: 23 }, (_, i) => ({
            text: `#${i + 1}`,
            reference: '',
        }))
        const d = applyEntries(createDefaultDesign(), entries)
        expect(d.pages).toBe(3)
        expect(d.cards).toHaveLength(30)
        expect(d.cards[22].text).toBe('#23')
        expect(d.cards[23].text).toBe('')
    })

    it('never grows past the page limit', () => {
        const entries = Array.from({ length: 500 }, (_, i) => ({
            text: String(i),
            reference: '',
        }))
        const d = applyEntries(createDefaultDesign(), entries)
        expect(d.pages).toBe(MAX_PAGES)
        expect(d.cards).toHaveLength(MAX_PAGES * 10)
    })
})

describe('backgroundFor', () => {
    it('uses the card background only in individual mode', () => {
        const d = createDefaultDesign()
        const own = { ...d.background, color: '#ff0000' }
        const card = { ...d.cards[0], background: own }
        expect(backgroundFor(d, card)).toBe(d.background)
        expect(
            backgroundFor({ ...d, backgroundMode: 'individual' }, card)
        ).toBe(own)
        expect(
            backgroundFor({ ...d, backgroundMode: 'individual' }, d.cards[1])
        ).toBe(d.background)
    })
})

describe('normalizeDesign', () => {
    it('round-trips a design through JSON', () => {
        const d = createDefaultDesign()
        d.cards[0] = {
            ...d.cards[0],
            text: 'Hi',
            reference: 'me',
            style: { color: '#ff0000' },
        }
        d.background.image = 'https://picsum.photos/id/1/100/100'
        d.background.credit = { provider: 'picsum', creator: 'Someone' }
        expect(normalizeDesign(JSON.parse(JSON.stringify(d)))).toEqual(d)
    })

    it('rejects things that are not designs', () => {
        expect(() => normalizeDesign(null)).toThrow()
        expect(() => normalizeDesign({ hello: 1 })).toThrow()
        expect(() => normalizeDesign([1, 2])).toThrow()
    })

    it('repairs bad values with defaults and clamps numbers', () => {
        const d = normalizeDesign({
            cards: [{ text: 42 }, 'junk'],
            pages: 999,
            layout: {
                gap: -5,
                orientation: 'sideways',
                outlineColor: 'red; x: y',
            },
            textStyle: { fontSize: 1000, align: 'justify' },
            backgroundMode: 'chaos',
        })
        expect(d.pages).toBe(MAX_PAGES)
        expect(d.layout.gap).toBe(0)
        expect(d.layout.orientation).toBe('landscape')
        expect(d.layout.outlineColor).toBe('#9ca3af')
        expect(d.textStyle.fontSize).toBe(48)
        expect(d.textStyle.align).toBe('center')
        expect(d.backgroundMode).toBe('same')
        expect(d.cards[0].text).toBe('')
        expect(d.cards).toHaveLength(MAX_PAGES * 10)
    })

    it('drops image sources that could be unsafe', () => {
        const d = normalizeDesign({
            cards: [{ background: { image: 'javascript:alert(1)' } }],
            background: { image: 'data:text/html;base64,PHNjcmlwdD4=' },
        })
        expect(d.background.image).toBeUndefined()
        expect(d.cards[0].background?.image).toBeUndefined()
    })
})

describe('safeImageSrc', () => {
    it('allows http(s) and raster data URLs only', () => {
        expect(safeImageSrc('https://example.com/a.jpg')).toBe(
            'https://example.com/a.jpg'
        )
        expect(safeImageSrc('data:image/jpeg;base64,AAAA')).toBe(
            'data:image/jpeg;base64,AAAA'
        )
        expect(safeImageSrc('data:image/svg+xml;base64,AAAA')).toBeUndefined()
        expect(safeImageSrc('ftp://x')).toBeUndefined()
        expect(safeImageSrc(5)).toBeUndefined()
    })
})
