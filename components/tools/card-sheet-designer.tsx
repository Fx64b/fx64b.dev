import {
    Download,
    FileUp,
    Loader2,
    Minus,
    Plus,
    Printer,
    RotateCcw,
} from 'lucide-react'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import BackgroundControls from '@/components/tools/card-sheet-designer/BackgroundControls'
import CardEditor from '@/components/tools/card-sheet-designer/CardEditor'
import CardSheet from '@/components/tools/card-sheet-designer/CardSheet'
import ImagePicker from '@/components/tools/card-sheet-designer/ImagePicker'
import LayoutPanel from '@/components/tools/card-sheet-designer/LayoutPanel'
import TextStylePanel, {
    BulkTextInput,
} from '@/components/tools/card-sheet-designer/TextPanel'
import { Segmented } from '@/components/tools/card-sheet-designer/controls'
import {
    MAX_PAGES,
    applyEntries,
    createDefaultDesign,
    ensureCardCount,
    googleFontsUrl,
    normalizeDesign,
    parseBulkText,
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
    BackgroundMode,
    CardData,
    Design,
    ImageCredit,
} from '@/components/tools/card-sheet-designer/types'
import { ToolInfoSection } from '@/components/tools/tool-info-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

function PreviewPane({
    design,
    page,
    selectedIndex,
    onSelect,
}: {
    design: Design
    page: number
    selectedIndex: number
    onSelect: (index: number) => void
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

    const pageWidthPx = A4.width * PX_PER_MM
    const scale = width > 0 ? width / pageWidthPx : 0.6

    return (
        <div ref={wrapRef} className="w-full">
            <div
                className="relative overflow-hidden rounded-sm shadow-[0_1px_8px_rgba(0,0,0,0.18)] ring-1 ring-black/10"
                style={{ height: A4.height * PX_PER_MM * scale }}
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

export default function CardSheetDesigner() {
    const [design, setDesign] = useState<Design>(createDefaultDesign)
    const [selected, setSelected] = useState(0)
    const [tab, setTab] = useState('text')
    const [restored, setRestored] = useState(false)
    const [saveFailed, setSaveFailed] = useState(false)
    const [printing, setPrinting] = useState(false)
    const [importError, setImportError] = useState<string | null>(null)
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

    const grid = computeGrid(design.layout)
    const total = visibleCardCount(design)
    const sel = Math.max(0, Math.min(selected, total - 1))
    const card: CardData | undefined = design.cards[sel]
    const perPage = Math.max(1, grid.perPage)
    const page = Math.min(design.pages - 1, Math.floor(sel / perPage))
    const pixels = imagePixelsFor(grid)
    // Cards kept from a roomier layout that no longer fit on the sheets.
    const hiddenWithText = design.cards
        .slice(total)
        .filter((c) => c.text || c.reference).length
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

    // ----- backgrounds -----------------------------------------------------

    const individual = design.backgroundMode === 'individual'
    const cardBg: Background = card?.background ?? design.background

    const withImage = (
        base: Background,
        image: string,
        credit: ImageCredit
    ): Background => ({
        ...base,
        image,
        credit,
        posX: 50,
        posY: 50,
        zoom: 1,
    })

    const pickImage = (image: string, credit: ImageCredit) => {
        if (individual) {
            updateCard(sel, { background: withImage(cardBg, image, credit) })
        } else {
            update((d) => ({
                ...d,
                background: withImage(d.background, image, credit),
            }))
        }
    }

    const patchBackground = (patch: Partial<Background>) => {
        if (individual) {
            updateCard(sel, { background: { ...cardBg, ...patch } })
        } else {
            update((d) => ({ ...d, background: { ...d.background, ...patch } }))
        }
    }

    const fillWithPhotos = (results: ImageResult[]) => {
        if (results.length === 0) {
            return
        }
        mapVisibleCards((c, i, d) => {
            const r = results[i % results.length]
            return {
                ...c,
                background: withImage(
                    c.background ?? d.background,
                    r.full,
                    r.credit
                ),
            }
        })
    }

    const randomPhotoEach = () => {
        const seed = Math.random().toString(36).slice(2, 8)
        mapVisibleCards((c, i, d) => ({
            ...c,
            background: withImage(
                c.background ?? d.background,
                picsumSeedUrl(`${seed}-${i}`, pixels.width, pixels.height),
                {
                    provider: 'picsum',
                    license: 'Unsplash License',
                }
            ),
        }))
    }

    const applyCardBgToAll = () => {
        const bg = cardBg
        mapVisibleCards((c) => ({ ...c, background: { ...bg } }))
    }

    // ----- texts -----------------------------------------------------------

    const fillFromList = (text: string) => {
        const entries = parseBulkText(text)
        update((d) => applyEntries(d, entries, 0))
        setSelected(0)
    }

    const sameTextForAll = (text: string) => {
        const [entry] = parseBulkText(text)
        if (entry) {
            mapVisibleCards((c) => ({
                ...c,
                text: entry.text,
                reference: entry.reference,
            }))
        }
    }

    const copyCardTextToAll = () => {
        if (!card) {
            return
        }
        const { text, reference, style } = card
        mapVisibleCards((c) => ({ ...c, text, reference, style }))
    }

    const clearAllTexts = () =>
        mapVisibleCards((c) => ({ ...c, text: '', reference: '' }))

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
            `card-sheet-${new Date().toISOString().slice(0, 10)}.json`,
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
            setImportError(null)
        } catch (e) {
            setImportError(
                e instanceof SyntaxError
                    ? 'This file is not valid JSON.'
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

    return (
        <div className="space-y-6">
            <style>{PRINT_CSS}</style>

            <Card>
                <CardContent className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        onClick={() => void print()}
                        disabled={printing || grid.perPage === 0}
                    >
                        {printing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Printer className="size-4" />
                        )}
                        Print / save as PDF
                    </Button>
                    <div className="border-border flex items-center gap-1 rounded-md border px-1">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label="Remove a page"
                            disabled={design.pages <= 1}
                            onClick={() => setPages(design.pages - 1)}
                        >
                            <Minus className="size-3.5" />
                        </Button>
                        <span
                            className="min-w-16 text-center text-[13px] tabular-nums"
                            data-testid="page-count"
                        >
                            {design.pages}{' '}
                            {design.pages === 1 ? 'sheet' : 'sheets'}
                        </span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label="Add a page"
                            disabled={design.pages >= MAX_PAGES}
                            onClick={() => setPages(design.pages + 1)}
                        >
                            <Plus className="size-3.5" />
                        </Button>
                    </div>
                    <div className="ml-auto flex flex-wrap gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={exportDesign}
                        >
                            <Download className="size-3.5" />
                            Export
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => importRef.current?.click()}
                        >
                            <FileUp className="size-3.5" />
                            Import
                        </Button>
                        <input
                            ref={importRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            aria-label="Import design file"
                            onChange={(e) =>
                                void importDesign(e.target.files?.[0])
                            }
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={reset}
                        >
                            <RotateCcw className="size-3.5" />
                            {confirmReset ? 'Click again to reset' : 'Reset'}
                        </Button>
                    </div>
                    <p className="text-muted-foreground w-full text-[12px]">
                        {total} cards ·{' '}
                        {saveFailed
                            ? 'could not autosave - use Export to keep your design'
                            : 'saved automatically in this browser'}
                    </p>
                    {hiddenWithText > 0 && grid.perPage > 0 && (
                        <p className="w-full text-[13px] text-amber-700 dark:text-amber-400">
                            {hiddenWithText} more{' '}
                            {hiddenWithText === 1 ? 'card has' : 'cards have'}{' '}
                            text but{' '}
                            {hiddenWithText === 1 ? "doesn't" : "don't"} fit on{' '}
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
                    {importError && (
                        <p
                            role="alert"
                            className="text-destructive w-full text-[13px]"
                        >
                            {importError}
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-2">
                    {design.pages > 1 && (
                        <div
                            className="flex flex-wrap gap-1"
                            aria-label="Sheets"
                        >
                            {Array.from({ length: design.pages }, (_, p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setSelected(p * perPage)}
                                    aria-current={
                                        p === page ? 'page' : undefined
                                    }
                                    className={
                                        p === page
                                            ? 'bg-foreground text-background rounded px-2 py-0.5 text-[12px]'
                                            : 'text-muted-foreground hover:text-foreground rounded border px-2 py-0.5 text-[12px]'
                                    }
                                >
                                    Sheet {p + 1}
                                </button>
                            ))}
                        </div>
                    )}
                    <PreviewPane
                        design={design}
                        page={page}
                        selectedIndex={sel}
                        onSelect={setSelected}
                    />
                    <p className="text-muted-foreground text-[12px]">
                        Click a card to edit it.
                    </p>
                </div>
                <div>
                    {card && (
                        <CardEditor
                            card={card}
                            index={sel}
                            total={total}
                            baseStyle={design.textStyle}
                            onChange={(patch) => updateCard(sel, patch)}
                            onSelect={(i) =>
                                setSelected(Math.max(0, Math.min(total - 1, i)))
                            }
                            onCopyTextToAll={copyCardTextToAll}
                        >
                            {individual && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setTab('background')}
                                >
                                    Change this card&apos;s photo
                                </Button>
                            )}
                        </CardEditor>
                    )}
                </div>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="text">Text</TabsTrigger>
                    <TabsTrigger value="background">Background</TabsTrigger>
                    <TabsTrigger value="layout">
                        Layout &amp; borders
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-4 space-y-6">
                    <BulkTextInput
                        totalCards={total}
                        onApply={fillFromList}
                        onSameForAll={sameTextForAll}
                        onClearAll={clearAllTexts}
                    />
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">
                            Text style for all cards
                        </h3>
                        <TextStylePanel
                            style={design.textStyle}
                            onChange={(patch) =>
                                update((d) => ({
                                    ...d,
                                    textStyle: { ...d.textStyle, ...patch },
                                }))
                            }
                        />
                    </div>
                </TabsContent>

                <TabsContent value="background" className="mt-4 space-y-5">
                    <Segmented<BackgroundMode>
                        label="Backgrounds"
                        value={design.backgroundMode}
                        options={[
                            { value: 'same', label: 'Same for all cards' },
                            {
                                value: 'individual',
                                label: 'Individual per card',
                            },
                        ]}
                        onChange={(backgroundMode) =>
                            update((d) => ({ ...d, backgroundMode }))
                        }
                    />
                    {individual && (
                        <p className="text-muted-foreground text-[13px]">
                            Editing{' '}
                            <strong className="text-foreground">
                                card {sel + 1}
                            </strong>
                            . Click another card in the preview to change its
                            photo. Cards without their own photo use the shared
                            background.
                        </p>
                    )}
                    <ImagePicker
                        targetLabel={
                            individual ? `card ${sel + 1}` : 'all cards'
                        }
                        pixelSize={pixels}
                        onPick={pickImage}
                        onFillMany={individual ? fillWithPhotos : undefined}
                        onRandomEach={individual ? randomPhotoEach : undefined}
                    />
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">
                            {individual
                                ? `Background of card ${sel + 1}`
                                : 'Background for all cards'}
                        </h3>
                        <BackgroundControls
                            bg={individual ? cardBg : design.background}
                            onChange={patchBackground}
                        />
                        {individual && (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={applyCardBgToAll}
                                >
                                    Use this background on all cards
                                </Button>
                                {card?.background && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            updateCard(sel, {
                                                background: undefined,
                                            })
                                        }
                                    >
                                        Reset to shared background
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="layout" className="mt-4">
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
                </TabsContent>
            </Tabs>

            <ToolInfoSection title="Printing tips">
                <div className="text-muted-foreground space-y-2 text-[14px] leading-relaxed">
                    <p>
                        In the print dialog choose paper size{' '}
                        <strong className="text-foreground">A4</strong> and
                        scale{' '}
                        <strong className="text-foreground">
                            100% / Actual size
                        </strong>{' '}
                        (not &quot;Fit to page&quot;), otherwise the cards
                        won&apos;t be business-card size.
                    </p>
                    <p>
                        Margins are already part of the design - leave them on
                        &quot;Default&quot; or &quot;None&quot;. To get a PDF,
                        pick &quot;Save as PDF&quot; as the printer.
                    </p>
                </div>
                <div className="text-muted-foreground space-y-2 text-[14px] leading-relaxed">
                    <p>
                        Most home printers can&apos;t print right to the paper
                        edge, so keep the minimum page margin at 5 mm or more.
                        Use 250-300 g/m² card stock for sturdy cards.
                    </p>
                    <p>
                        Photos that fill the whole card are easiest to cut
                        cleanly with a few millimetres of space between cards
                        and crop marks turned on.
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
