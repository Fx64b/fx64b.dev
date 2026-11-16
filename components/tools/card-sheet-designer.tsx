import {
    ChevronLeft,
    ChevronRight,
    Download,
    FileUp,
    Loader2,
    Plus,
    Printer,
    RotateCcw,
    Trash2,
} from 'lucide-react'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import BackgroundStep from '@/components/tools/card-sheet-designer/BackgroundStep'
import CardSheet from '@/components/tools/card-sheet-designer/CardSheet'
import LayoutPanel from '@/components/tools/card-sheet-designer/LayoutPanel'
import StyleStep from '@/components/tools/card-sheet-designer/StyleStep'
import TextStep from '@/components/tools/card-sheet-designer/TextStep'
import { Step } from '@/components/tools/card-sheet-designer/controls'
import {
    LIGHT_TEXT,
    MAX_PAGES,
    MIN_TEXT_CONTRAST,
    applyEntries,
    backgroundAllCards,
    backgroundFor,
    cardsWithOwnBackground,
    contrastRatio,
    createDefaultDesign,
    ensureCardCount,
    googleFontsUrl,
    normalizeDesign,
    parseBulkText,
    readableTextOn,
    styleAllCards,
    textFor,
    visibleCardCount,
} from '@/components/tools/card-sheet-designer/design'
import {
    type ImageResult,
    picsumSeedUrl,
} from '@/components/tools/card-sheet-designer/images'
import {
    A4,
    PX_PER_MM,
    computeGrid,
    imagePixelsFor,
} from '@/components/tools/card-sheet-designer/layout'
import {
    loadSavedDesign,
    saveDesign,
} from '@/components/tools/card-sheet-designer/storage'
import type {
    Background,
    CardData,
    Design,
    ImageCredit,
    TextOverrides,
    TextStyle,
} from '@/components/tools/card-sheet-designer/types'
import { ToolInfoSection } from '@/components/tools/tool-info-section'
import { Button } from '@/components/ui/button'

/**
 * The printed sheet lives in its own element directly under <body>. While
 * printing, everything else is hidden and the page box is A4 with no
 * browser margins, so 1 mm in the design is 1 mm on paper.
 */
const PRINT_CSS = `
.csd-print-root { position: fixed; left: -10000mm; top: 0; visibility: hidden; pointer-events: none; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; min-height: 0 !important; height: auto !important; }
  body > *:not(.csd-print-root) { display: none !important; }
  .csd-print-root { position: static !important; left: auto !important; visibility: visible !important; }
  .csd-print-root, .csd-print-root * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .csd-print-root .csd-page { break-after: page; page-break-after: always; break-inside: avoid; }
  .csd-print-root .csd-page:last-child { break-after: auto; page-break-after: auto; }
  .csd-screen-only { display: none !important; }
}
`

const FONT_LINK_ID = 'csd-google-fonts'

function useWebFonts() {
    useEffect(() => {
        if (document.getElementById(FONT_LINK_ID)) {
            return
        }
        const link = document.createElement('link')
        link.id = FONT_LINK_ID
        link.rel = 'stylesheet'
        link.href = googleFontsUrl()
        document.head.appendChild(link)
    }, [])
}

/** Waits until every image inside `root` has loaded or failed. */
function waitForImages(root: HTMLElement | null, timeoutMs: number) {
    if (!root) {
        return Promise.resolve()
    }
    const pending = [...root.querySelectorAll('img')].filter(
        (img) => !img.complete
    )
    if (pending.length === 0) {
        return Promise.resolve()
    }
    const all = Promise.all(
        pending.map(
            (img) =>
                new Promise<void>((resolve) => {
                    img.addEventListener('load', () => resolve(), {
                        once: true,
                    })
                    img.addEventListener('error', () => resolve(), {
                        once: true,
                    })
                })
        )
    )
    return Promise.race([
        all,
        new Promise<void>((r) => setTimeout(r, timeoutMs)),
    ])
}

function downloadText(text: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const PAGE_W = A4.width * PX_PER_MM
const PAGE_H = A4.height * PX_PER_MM

/** Height the sticky column needs besides the sheet (nav, sheet bar, print). */
const STICKY_CHROME = 230

function useViewportHeight() {
    const [height, setHeight] = useState(0)
    useEffect(() => {
        const update = () => setHeight(window.innerHeight)
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])
    return height
}

function useIsDesktop() {
    const [desktop, setDesktop] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)')
        const update = () => setDesktop(mq.matches)
        update()
        mq.addEventListener?.('change', update)
        return () => mq.removeEventListener?.('change', update)
    }, [])
    return desktop
}

function PreviewPane({
    design,
    page,
    selectedIndex,
    onSelect,
    scale: fixedScale,
}: {
    design: Design
    page: number
    selectedIndex: number
    onSelect: (index: number) => void
    /** Fixed scale (sticky desktop column); otherwise fit the width. */
    scale?: number
}) {
    const grid = computeGrid(design.layout)
    const wrapRef = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(0)

    useLayoutEffect(() => {
        const el = wrapRef.current
        if (!el) {
            return
        }
        const measure = () => setWidth(el.clientWidth)
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const scale = fixedScale ?? (width > 0 ? width / PAGE_W : 0.6)

    return (
        <div ref={wrapRef} className="w-full">
            <div
                className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-[0_1px_10px_rgba(0,0,0,0.18)] ring-1 ring-black/10"
                style={{ height: PAGE_H * scale, width: PAGE_W * scale }}
                data-testid="sheet-preview"
            >
                <div
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: '0 0',
                        width: `${A4.width}mm`,
                    }}
                >
                    <CardSheet
                        design={design}
                        grid={grid}
                        page={page}
                        interactive
                        selectedIndex={selectedIndex}
                        onSelect={onSelect}
                    />
                </div>
            </div>
        </div>
    )
}

type Scope = 'all' | 'card'
type StepId = 'text' | 'background' | 'style' | 'layout'

export default function CardSheetDesigner() {
    const [design, setDesign] = useState<Design>(createDefaultDesign)
    const [selected, setSelected] = useState(0)
    const [openSteps, setOpenSteps] = useState<Record<StepId, boolean>>({
        text: true,
        background: true,
        style: false,
        layout: false,
    })
    const [bgScope, setBgScope] = useState<Scope>('all')
    const [styleScope, setStyleScope] = useState<Scope>('all')
    const [restored, setRestored] = useState(false)
    const [saveFailed, setSaveFailed] = useState(false)
    const [printing, setPrinting] = useState(false)
    const [fileError, setFileError] = useState<string | null>(null)
    const [confirmReset, setConfirmReset] = useState(false)
    const printRootRef = useRef<HTMLDivElement>(null)
    const importRef = useRef<HTMLInputElement>(null)

    useWebFonts()

    // Restore the last design from this browser.
    useEffect(() => {
        let alive = true
        loadSavedDesign().then((saved) => {
            if (!alive) {
                return
            }
            if (saved) {
                try {
                    setDesign(normalizeDesign(saved))
                } catch {
                    // Ignore a broken save and start fresh.
                }
            }
            setRestored(true)
        })
        return () => {
            alive = false
        }
    }, [])

    // Autosave, debounced.
    useEffect(() => {
        if (!restored) {
            return
        }
        const t = setTimeout(() => {
            saveDesign(design).then((ok) => setSaveFailed(!ok))
        }, 400)
        return () => clearTimeout(t)
    }, [design, restored])

    const desktop = useIsDesktop()
    const viewportHeight = useViewportHeight()
    // On wide screens the sheet stays in view next to the steps, so it is
    // sized to the window height; on phones it uses the full width.
    const desktopScale =
        desktop && viewportHeight > 0
            ? Math.min(
                  0.72,
                  Math.max(0.42, (viewportHeight - STICKY_CHROME) / PAGE_H)
              )
            : undefined

    const grid = computeGrid(design.layout)
    const total = visibleCardCount(design)
    const sel = Math.max(0, Math.min(selected, total - 1))
    const card: CardData | undefined = design.cards[sel]
    const perPage = Math.max(1, grid.perPage)
    const page = Math.min(design.pages - 1, Math.floor(sel / perPage))
    const pixels = imagePixelsFor(grid)
    // Cards kept from a roomier layout that no longer fit on the sheets.
    const hiddenWithText = design.sameText
        ? 0
        : design.cards.slice(total).filter((c) => c.text || c.reference).length
    const lastTextIndex = design.cards.findLastIndex(
        (c) => c.text || c.reference
    )

    const update = (fn: (d: Design) => Design) =>
        setDesign((d) => ensureCardCount(fn(d)))

    const updateCard = (index: number, patch: Partial<CardData>) =>
        update((d) => {
            const cards = d.cards.slice()
            cards[index] = { ...cards[index], ...patch }
            return { ...d, cards }
        })

    const mapVisibleCards = (
        fn: (c: CardData, i: number, d: Design) => CardData
    ) =>
        update((d) => {
            const count = visibleCardCount(d)
            return {
                ...d,
                cards: d.cards.map((c, i) => (i < count ? fn(c, i, d) : c)),
            }
        })

    const setPages = (pages: number) =>
        update((d) => ({
            ...d,
            pages: Math.max(1, Math.min(MAX_PAGES, pages)),
        }))

    const selectCard = (index: number) =>
        setSelected(Math.max(0, Math.min(total - 1, index)))

    const toggleStep = (id: StepId) =>
        setOpenSteps((s) => ({ ...s, [id]: !s[id] }))

    // ----- text ------------------------------------------------------------

    const cardText = card ? textFor(design, card) : { text: '', reference: '' }

    const changeText = (
        patch: Partial<{ text: string; reference: string }>
    ) => {
        if (design.sameText) {
            update((d) => ({ ...d, sharedText: { ...d.sharedText, ...patch } }))
        } else {
            updateCard(sel, patch)
        }
    }

    const setSameText = (on: boolean) =>
        update((d) => {
            if (!on) {
                return { ...d, sameText: false }
            }
            // Start from the selected card's text, or the first card with any.
            const visible = d.cards.slice(0, visibleCardCount(d))
            const source =
                [d.cards[sel], ...visible].find(
                    (c) => c && (c.text || c.reference)
                ) ?? d.sharedText
            return {
                ...d,
                sameText: true,
                sharedText:
                    d.sharedText.text || d.sharedText.reference
                        ? d.sharedText
                        : { text: source.text, reference: source.reference },
            }
        })

    const applyList = (text: string) => {
        update((d) => ({
            ...applyEntries(d, parseBulkText(text), 0),
            sameText: false,
        }))
        setSelected(0)
    }

    const clearAllTexts = () =>
        update((d) => ({
            ...d,
            sharedText: { text: '', reference: '' },
            cards: d.cards.map((c) => ({ ...c, text: '', reference: '' })),
        }))

    // ----- background ------------------------------------------------------

    const editedBg: Background =
        bgScope === 'card' && card
            ? backgroundFor(design, card)
            : design.background

    const withImage = (
        base: Background,
        image: string,
        credit: ImageCredit
    ): Background => ({ ...base, image, credit, posX: 50, posY: 50, zoom: 1 })

    const patchBackground = (patch: Partial<Background>) => {
        if (bgScope === 'card') {
            updateCard(sel, { background: { ...editedBg, ...patch } })
        } else {
            update((d) => backgroundAllCards(d, patch))
        }
    }

    const pickImage = (image: string, credit: ImageCredit) => {
        const next = withImage(editedBg, image, credit)
        patchBackground({
            image: next.image,
            credit: next.credit,
            posX: 50,
            posY: 50,
            zoom: 1,
        })
    }

    const pickColour = (color: string): string | null => {
        patchBackground({
            color,
            image: undefined,
            credit: undefined,
            overlayOpacity: 0,
        })
        // Keep the text readable on the new colour.
        const current =
            bgScope === 'card' && card
                ? { ...design.textStyle, ...card.style }.color
                : design.textStyle.color
        if (contrastRatio(current, color) >= MIN_TEXT_CONTRAST) {
            return null
        }
        const better = readableTextOn(color)
        if (bgScope === 'card' && card) {
            updateCard(sel, { style: { ...card.style, color: better } })
        } else {
            update((d) => ({
                ...d,
                textStyle: { ...d.textStyle, color: better },
            }))
        }
        return `Text changed to ${better === LIGHT_TEXT ? 'white' : 'dark'} so it stays readable.`
    }

    const fillWithPhotos = (results: ImageResult[]) => {
        if (results.length === 0) {
            return
        }
        mapVisibleCards((c, i, d) => {
            const r = results[i % results.length]
            return {
                ...c,
                background: withImage(backgroundFor(d, c), r.full, r.credit),
            }
        })
    }

    const randomPhotoEach = () => {
        const seed = Math.random().toString(36).slice(2, 8)
        mapVisibleCards((c, i, d) => ({
            ...c,
            background: withImage(
                backgroundFor(d, c),
                picsumSeedUrl(`${seed}-${i}`, pixels.width, pixels.height),
                { provider: 'picsum', license: 'Unsplash License' }
            ),
        }))
    }

    // ----- text style ------------------------------------------------------

    const editedStyle: TextStyle =
        styleScope === 'card' && card
            ? { ...design.textStyle, ...card.style }
            : design.textStyle

    const changeStyle = (patch: Partial<TextStyle>) => {
        if (styleScope === 'card' && card) {
            updateCard(sel, {
                style: { ...card.style, ...(patch as TextOverrides) },
            })
        } else {
            update((d) => styleAllCards(d, patch))
        }
    }

    // ----- file actions ----------------------------------------------------

    const print = async () => {
        setPrinting(true)
        try {
            await document.fonts?.ready
            await waitForImages(printRootRef.current, 10_000)
        } finally {
            setPrinting(false)
        }
        window.print()
    }

    const exportDesign = () =>
        downloadText(
            JSON.stringify(design, null, 2),
            `cards-${new Date().toISOString().slice(0, 10)}.json`,
            'application/json'
        )

    const importDesign = async (file: File | undefined) => {
        if (!file) {
            return
        }
        try {
            const next = normalizeDesign(JSON.parse(await file.text()))
            setDesign(next)
            setSelected(0)
            setFileError(null)
        } catch (e) {
            setFileError(
                e instanceof SyntaxError
                    ? 'This file is not a saved card design.'
                    : (e as Error).message
            )
        } finally {
            if (importRef.current) {
                importRef.current.value = ''
            }
        }
    }

    const reset = () => {
        if (!confirmReset) {
            setConfirmReset(true)
            setTimeout(() => setConfirmReset(false), 4000)
            return
        }
        setConfirmReset(false)
        setDesign(createDefaultDesign())
        setSelected(0)
    }

    const bgSummary = design.background.image
        ? cardsWithOwnBackground(design) > 0
            ? 'Different photos'
            : 'Photo'
        : cardsWithOwnBackground(design) > 0
          ? 'Different photos'
          : 'Plain colour'

    return (
        <div>
            <style>{PRINT_CSS}</style>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-[auto_minmax(0,1fr)] lg:gap-12">
                {/* Sheet preview and the main action, always in view. */}
                <div
                    className="min-w-0 space-y-3 md:sticky md:top-24 md:self-start"
                    style={
                        desktopScale
                            ? { width: PAGE_W * desktopScale }
                            : undefined
                    }
                >
                    <div className="flex h-8 items-center justify-between gap-2 text-[13px]">
                        <div className="flex items-center gap-1">
                            {design.pages > 1 && (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-7"
                                    aria-label="Previous sheet"
                                    disabled={page === 0}
                                    onClick={() =>
                                        selectCard((page - 1) * perPage)
                                    }
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                            )}
                            <span
                                className="font-medium"
                                data-testid="page-count"
                            >
                                Sheet {page + 1} of {design.pages}
                            </span>
                            {design.pages > 1 && (
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-7"
                                    aria-label="Next sheet"
                                    disabled={page >= design.pages - 1}
                                    onClick={() =>
                                        selectCard((page + 1) * perPage)
                                    }
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                            )}
                            <span className="text-muted-foreground">
                                · {total} cards
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {design.pages > 1 && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7"
                                    aria-label="Remove last sheet"
                                    onClick={() => setPages(design.pages - 1)}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            )}
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7"
                                disabled={design.pages >= MAX_PAGES}
                                onClick={() => {
                                    setPages(design.pages + 1)
                                    setSelected(design.pages * perPage)
                                }}
                            >
                                <Plus className="size-3.5" />
                                Add sheet
                            </Button>
                        </div>
                    </div>

                    <PreviewPane
                        design={design}
                        page={page}
                        selectedIndex={sel}
                        onSelect={setSelected}
                        scale={desktopScale}
                    />

                    {hiddenWithText > 0 && grid.perPage > 0 && (
                        <p className="text-[13px] text-amber-700 dark:text-amber-400">
                            {hiddenWithText}{' '}
                            {hiddenWithText === 1
                                ? 'card with text no longer fits'
                                : 'cards with text no longer fit'}{' '}
                            on{' '}
                            {design.pages === 1 ? 'this sheet' : 'these sheets'}
                            .{' '}
                            {design.pages < MAX_PAGES && (
                                <button
                                    type="button"
                                    className="underline underline-offset-2"
                                    onClick={() =>
                                        setPages(
                                            Math.ceil(
                                                (lastTextIndex + 1) / perPage
                                            )
                                        )
                                    }
                                >
                                    Add sheets to print them
                                </button>
                            )}
                        </p>
                    )}

                    <div className="space-y-1.5">
                        <Button
                            type="button"
                            size="lg"
                            className="w-full"
                            onClick={() => void print()}
                            disabled={printing || grid.perPage === 0}
                        >
                            {printing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Printer className="size-4" />
                            )}
                            Print{' '}
                            {design.pages === 1
                                ? 'sheet'
                                : `${design.pages} sheets`}
                        </Button>
                        <p className="text-muted-foreground text-center text-[12px]">
                            Print on{' '}
                            <strong className="text-foreground">A4</strong> at{' '}
                            <strong className="text-foreground">
                                100% scale
                            </strong>
                            , not &quot;Fit to page&quot;.
                        </p>
                    </div>
                </div>

                {/* Editing steps. */}
                <div className="min-w-0">
                    <Step
                        number={1}
                        title="Text"
                        summary={
                            design.sameText ? 'Same on every card' : undefined
                        }
                        open={openSteps.text}
                        onToggle={() => toggleStep('text')}
                    >
                        <TextStep
                            sameText={design.sameText}
                            value={cardText}
                            index={sel}
                            total={total}
                            onSelect={selectCard}
                            onChange={changeText}
                            onSameTextChange={setSameText}
                            onApplyList={applyList}
                            onClearAll={clearAllTexts}
                        />
                    </Step>
                    <Step
                        number={2}
                        title="Background"
                        summary={bgSummary}
                        open={openSteps.background}
                        onToggle={() => toggleStep('background')}
                    >
                        <BackgroundStep
                            scope={bgScope}
                            onScopeChange={setBgScope}
                            cardNumber={sel + 1}
                            bg={editedBg}
                            ownCount={cardsWithOwnBackground(design)}
                            ownImages={design.cards
                                .slice(0, total)
                                .flatMap((c) =>
                                    c.background?.image
                                        ? [c.background.image]
                                        : []
                                )
                                .slice(0, 4)}
                            cardHasOwn={Boolean(card?.background)}
                            pixelSize={pixels}
                            onPick={pickImage}
                            onPickColour={pickColour}
                            onPatch={patchBackground}
                            onFillMany={fillWithPhotos}
                            onRandomEach={randomPhotoEach}
                            onResetCard={() =>
                                updateCard(sel, { background: undefined })
                            }
                        />
                    </Step>
                    <Step
                        number={3}
                        title="Text style"
                        open={openSteps.style}
                        onToggle={() => toggleStep('style')}
                    >
                        <StyleStep
                            scope={styleScope}
                            onScopeChange={setStyleScope}
                            cardNumber={sel + 1}
                            style={editedStyle}
                            cardHasOwn={Boolean(
                                card?.style && Object.keys(card.style).length
                            )}
                            onChange={changeStyle}
                            onResetCard={() =>
                                updateCard(sel, { style: undefined })
                            }
                        />
                    </Step>
                    <Step
                        number={4}
                        title="Size & cutting"
                        summary={`${grid.perPage} per sheet`}
                        open={openSteps.layout}
                        onToggle={() => toggleStep('layout')}
                    >
                        <LayoutPanel
                            layout={design.layout}
                            grid={grid}
                            onChange={(patch) =>
                                update((d) => ({
                                    ...d,
                                    layout: { ...d.layout, ...patch },
                                }))
                            }
                        />
                    </Step>

                    <div className="border-border space-y-1 border-t pt-4">
                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-1 text-[12px]">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[12px]"
                                onClick={exportDesign}
                            >
                                <Download className="size-3.5" />
                                Save design
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[12px]"
                                onClick={() => importRef.current?.click()}
                            >
                                <FileUp className="size-3.5" />
                                Open design
                            </Button>
                            <input
                                ref={importRef}
                                type="file"
                                accept="application/json,.json"
                                className="hidden"
                                aria-label="Open design file"
                                onChange={(e) =>
                                    void importDesign(e.target.files?.[0])
                                }
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[12px]"
                                onClick={reset}
                            >
                                <RotateCcw className="size-3.5" />
                                {confirmReset
                                    ? 'Click again to start over'
                                    : 'Start over'}
                            </Button>
                        </div>
                        <p className="text-muted-foreground px-3 text-[12px]">
                            {saveFailed
                                ? 'Could not save in this browser - use "Save design" to keep your work.'
                                : 'Your work is saved in this browser automatically.'}
                        </p>
                        {fileError && (
                            <p
                                role="alert"
                                className="text-destructive px-3 text-[13px]"
                            >
                                {fileError}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <ToolInfoSection title="Tips for good cards" className="mt-16">
                <div className="text-muted-foreground space-y-2 text-[14px] leading-relaxed">
                    <p>
                        Print at{' '}
                        <strong className="text-foreground">
                            100% / Actual size
                        </strong>
                        , never &quot;Fit to page&quot; - otherwise the cards
                        come out smaller than business-card size.
                    </p>
                    <p>
                        Thick paper (250-300 g/m²) makes sturdy cards. Try one
                        sheet on normal paper first.
                    </p>
                </div>
                <div className="text-muted-foreground space-y-2 text-[14px] leading-relaxed">
                    <p>
                        Cut along the thin lines with a paper cutter or a craft
                        knife and a ruler. For photos that fill the whole card,
                        add a little space between cards and turn on crop marks.
                    </p>
                    <p>
                        Photos from the search are openly licensed; check the
                        licence if you sell the cards.
                    </p>
                </div>
            </ToolInfoSection>

            {typeof document !== 'undefined' &&
                createPortal(
                    <div
                        className="csd-print-root"
                        ref={printRootRef}
                        aria-hidden="true"
                    >
                        <CardSheet design={design} grid={grid} />
                    </div>,
                    document.body
                )}
        </div>
    )
}
