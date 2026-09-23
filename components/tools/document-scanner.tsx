import { AlertCircleIcon, Camera, History, Trash2 } from 'lucide-react'

import { useCallback, useEffect, useRef, useState } from 'react'

import CameraView from '@/components/tools/document-scanner/CameraView'
import ExportPanel from '@/components/tools/document-scanner/ExportPanel'
import PageEditor, {
    type Preview,
} from '@/components/tools/document-scanner/PageEditor'
import PageStrip from '@/components/tools/document-scanner/PageStrip'
import {
    DEFAULT_SETTINGS,
    FULL_FRAME,
    QUALITY_PRESETS,
    exportMaxSide,
} from '@/components/tools/document-scanner/imaging'
import { buildPdf } from '@/components/tools/document-scanner/pdf'
import {
    detect,
    forgetPage,
    initScanner,
    processPage,
} from '@/components/tools/document-scanner/scanner-client'
import {
    clearSession,
    deleteBlob,
    loadSession,
    saveBlob,
    savePages,
} from '@/components/tools/document-scanner/storage'
import type {
    ExportOptions,
    PageSettings,
    ScanPage,
} from '@/components/tools/document-scanner/types'
import { ToolInfoSection } from '@/components/tools/tool-info-section'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type View = 'start' | 'camera' | 'review'

const PREVIEW_SOURCE_SIDE = 1600
const PREVIEW_SIDE = 1200
const EXPORT_SOURCE_SIDE = 4096

// Rough compressed bytes per output pixel, for the size estimate only.
const BYTES_PER_PIXEL = { color: 0.16, grayscale: 0.11, bw: 0.05 }

function toSettings(page: ScanPage): PageSettings {
    const { corners, autoCorners, rotation, filter } = page
    const { brightness, contrast, threshold } = page
    return {
        corners,
        autoCorners,
        rotation,
        filter,
        brightness,
        contrast,
        threshold,
    }
}

function settingsKey(page: ScanPage): string {
    const { autoCorners: _auto, ...rest } = toSettings(page)
    return JSON.stringify(rest)
}

function newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function defaultFileName(): string {
    return `scan-${new Date().toISOString().slice(0, 10)}`
}

function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Renders page previews in the background, newest settings winning. */
function usePreviews(
    pages: ScanPage[],
    ready: boolean,
    selectedId: string | null
) {
    const [previews, setPreviews] = useState<Record<string, Preview>>({})
    const [busyId, setBusyId] = useState<string | null>(null)
    const pagesRef = useRef(pages)
    const selectedRef = useRef(selectedId)
    useEffect(() => {
        pagesRef.current = pages
        selectedRef.current = selectedId
    })
    const rendered = useRef(new Map<string, string>())
    const running = useRef(false)

    const pump = useCallback(async () => {
        if (running.current) {
            return
        }
        running.current = true
        try {
            for (;;) {
                const current = pagesRef.current
                const stale = current.filter(
                    (p) => rendered.current.get(p.id) !== settingsKey(p)
                )
                if (stale.length === 0) {
                    break
                }
                // The page on screen goes first.
                const page =
                    stale.find((p) => p.id === selectedRef.current) ?? stale[0]
                const key = settingsKey(page)
                rendered.current.set(page.id, key)
                setBusyId(page.id)
                try {
                    const res = await processPage(
                        page.id,
                        page.blob,
                        toSettings(page),
                        {
                            sourceMaxSide: PREVIEW_SOURCE_SIDE,
                            maxSide: PREVIEW_SIDE,
                            format: 'image/jpeg',
                            quality: 0.85,
                        }
                    )
                    const url = URL.createObjectURL(res.blob)
                    setPreviews((prev) => {
                        const old = prev[page.id]
                        if (old) {
                            URL.revokeObjectURL(old.url)
                        }
                        return {
                            ...prev,
                            [page.id]: {
                                url,
                                width: res.width,
                                height: res.height,
                            },
                        }
                    })
                } catch {
                    // Leave the old preview; the key stays recorded so a
                    // failing page doesn't loop forever.
                }
            }
        } finally {
            running.current = false
            setBusyId(null)
        }
    }, [])

    useEffect(() => {
        if (!ready) {
            return
        }
        const timer = setTimeout(pump, 120)
        return () => clearTimeout(timer)
    }, [pages, ready, pump])

    // Drop previews of deleted pages.
    useEffect(() => {
        const ids = new Set(pages.map((p) => p.id))
        setPreviews((prev) => {
            const gone = Object.keys(prev).filter((id) => !ids.has(id))
            if (gone.length === 0) {
                return prev
            }
            const next = { ...prev }
            for (const id of gone) {
                URL.revokeObjectURL(next[id].url)
                delete next[id]
                rendered.current.delete(id)
                forgetPage(id).catch(() => undefined)
            }
            return next
        })
    }, [pages])

    return { previews, busyId }
}

export default function DocumentScanner() {
    const [view, setView] = useState<View>('start')
    const [pages, setPages] = useState<ScanPage[]>([])
    const [savedPages, setSavedPages] = useState<ScanPage[] | null>(null)
    const [loaded, setLoaded] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [retakeId, setRetakeId] = useState<string | null>(null)
    const [pendingCaptures, setPendingCaptures] = useState(0)
    const [scannerReady, setScannerReady] = useState(false)
    const [scannerError, setScannerError] = useState<string | null>(null)
    const [exportOptions, setExportOptions] = useState<ExportOptions>({
        pageSize: 'a4',
        margin: false,
        quality: 'balanced',
    })
    const [fileName, setFileName] = useState(defaultFileName)
    const [progress, setProgress] = useState<{
        done: number
        total: number
    } | null>(null)
    const [exportError, setExportError] = useState<string | null>(null)
    const [canShare] = useState(() => {
        try {
            const probe = new File([], 'probe.pdf', {
                type: 'application/pdf',
            })
            return Boolean(navigator.canShare?.({ files: [probe] }))
        } catch {
            return false
        }
    })
    const [confirmClear, setConfirmClear] = useState(false)

    const { previews, busyId } = usePreviews(pages, scannerReady, selectedId)
    const retakeRef = useRef(retakeId)
    useEffect(() => {
        retakeRef.current = retakeId
    })

    // Restore an unfinished session.
    useEffect(() => {
        loadSession().then((restored) => {
            if (restored.length > 0) {
                setSavedPages(restored)
            }
            setLoaded(true)
        })
    }, [])

    useEffect(() => {
        if (loaded && savedPages === null) {
            savePages(pages)
        }
    }, [pages, loaded, savedPages])

    useEffect(() => {
        if (!confirmClear) {
            return
        }
        const t = setTimeout(() => setConfirmClear(false), 3000)
        return () => clearTimeout(t)
    }, [confirmClear])

    const ensureScanner = useCallback(() => {
        setScannerError(null)
        initScanner().then(
            () => setScannerReady(true),
            (err: unknown) =>
                setScannerError(
                    err instanceof Error ? err.message : 'Unknown error'
                )
        )
    }, [])

    const startScanning = () => {
        if (savedPages) {
            // Starting over replaces the unfinished session.
            clearSession()
            setSavedPages(null)
        }
        ensureScanner()
        setView('camera')
    }

    const resumeSaved = () => {
        if (!savedPages) {
            return
        }
        setPages(savedPages)
        setSelectedId(savedPages[0].id)
        setSavedPages(null)
        ensureScanner()
        setView('review')
    }

    const discardSaved = async () => {
        await clearSession()
        setSavedPages(null)
    }

    const handleCapture = useCallback(async (blob: Blob) => {
        const id = newId()
        const replacing = retakeRef.current
        setPendingCaptures((n) => n + 1)
        let quad = null
        try {
            quad = (await detect(blob, 800)).quad
        } catch {
            quad = null
        }
        saveBlob(id, blob)
        setPages((prev) => {
            const old = replacing
                ? prev.find((p) => p.id === replacing)
                : undefined
            const base = old
                ? toSettings(old)
                : {
                      ...DEFAULT_SETTINGS,
                      // New pages inherit the look of the last page.
                      ...(prev.length > 0
                          ? {
                                filter: prev[prev.length - 1].filter,
                                brightness: prev[prev.length - 1].brightness,
                                contrast: prev[prev.length - 1].contrast,
                                threshold: prev[prev.length - 1].threshold,
                            }
                          : {}),
                  }
            const page: ScanPage = {
                ...base,
                rotation: old ? old.rotation : 0,
                id,
                blob,
                corners: quad ?? FULL_FRAME,
                autoCorners: quad,
            }
            if (old) {
                deleteBlob(old.id)
                return prev.map((p) => (p.id === old.id ? page : p))
            }
            return [...prev, page]
        })
        setPendingCaptures((n) => n - 1)
        if (replacing) {
            setSelectedId(id)
            setRetakeId(null)
            setView('review')
        } else {
            setSelectedId((cur) => cur ?? id)
        }
    }, [])

    const updatePage = (id: string, patch: Partial<PageSettings>) =>
        setPages((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
        )

    const deletePage = (id: string) => {
        const idx = pages.findIndex((p) => p.id === id)
        const next = pages.filter((p) => p.id !== id)
        setPages(next)
        deleteBlob(id)
        setSelectedId(next[Math.min(idx, next.length - 1)]?.id ?? null)
        if (next.length === 0) {
            setView('start')
        }
    }

    const movePage = (id: string, delta: -1 | 1) =>
        setPages((prev) => {
            const i = prev.findIndex((p) => p.id === id)
            const j = i + delta
            if (i < 0 || j < 0 || j >= prev.length) {
                return prev
            }
            const next = [...prev]
            ;[next[i], next[j]] = [next[j], next[i]]
            return next
        })

    const applyToAll = (source: ScanPage) =>
        setPages((prev) =>
            prev.map((p) => ({
                ...p,
                filter: source.filter,
                brightness: source.brightness,
                contrast: source.contrast,
                threshold: source.threshold,
            }))
        )

    const clearAll = async () => {
        if (!confirmClear) {
            setConfirmClear(true)
            return
        }
        setConfirmClear(false)
        setPages([])
        setSelectedId(null)
        await clearSession()
        setView('start')
    }

    const generatePdf = async (): Promise<Blob | null> => {
        setExportError(null)
        const preset = QUALITY_PRESETS[exportOptions.quality]
        const maxSide = exportMaxSide(exportOptions.pageSize, preset.dpi)
        const snapshot = pages
        setProgress({ done: 0, total: snapshot.length })
        try {
            const images = []
            for (let i = 0; i < snapshot.length; i++) {
                const page = snapshot[i]
                const png = page.filter === 'bw'
                const res = await processPage(
                    page.id,
                    page.blob,
                    toSettings(page),
                    {
                        sourceMaxSide: EXPORT_SOURCE_SIDE,
                        maxSide,
                        format: png ? 'image/png' : 'image/jpeg',
                        quality: preset.jpegQuality,
                    }
                )
                images.push({
                    bytes: new Uint8Array(await res.blob.arrayBuffer()),
                    format: png ? ('png' as const) : ('jpeg' as const),
                    width: res.width,
                    height: res.height,
                })
                setProgress({ done: i + 1, total: snapshot.length })
            }
            const bytes = await buildPdf(images, {
                pageSize: exportOptions.pageSize,
                margin: exportOptions.margin,
                dpi: preset.dpi,
                title: fileName,
            })
            return new Blob([bytes as Uint8Array<ArrayBuffer>], {
                type: 'application/pdf',
            })
        } catch (err) {
            setExportError(
                err instanceof Error ? err.message : 'Could not create the PDF'
            )
            return null
        } finally {
            setProgress(null)
        }
    }

    const pdfName = `${(fileName.trim() || defaultFileName()).replace(/\.pdf$/i, '')}.pdf`

    const download = async () => {
        const blob = await generatePdf()
        if (blob) {
            downloadBlob(blob, pdfName)
        }
    }

    const share = async () => {
        const blob = await generatePdf()
        if (!blob) {
            return
        }
        const file = new File([blob], pdfName, { type: 'application/pdf' })
        try {
            await navigator.share({ files: [file], title: pdfName })
        } catch (err) {
            if ((err as Error)?.name !== 'AbortError') {
                downloadBlob(blob, pdfName)
            }
        }
    }

    const estimatedBytes = (() => {
        const preset = QUALITY_PRESETS[exportOptions.quality]
        const maxSide = exportMaxSide(exportOptions.pageSize, preset.dpi)
        return pages.reduce((sum, p) => {
            const pv = previews[p.id]
            const aspect = pv ? pv.width / pv.height : 1 / Math.SQRT2
            const long = maxSide
            const short = aspect > 1 ? long / aspect : long * aspect
            return sum + long * short * BYTES_PER_PIXEL[p.filter]
        }, 0)
    })()

    const selectedIndex = pages.findIndex((p) => p.id === selectedId)
    const selected = selectedIndex >= 0 ? pages[selectedIndex] : null

    return (
        <div className="space-y-6">
            {scannerError && (
                <Alert variant="destructive">
                    <AlertCircleIcon className="h-5 w-5" />
                    <AlertTitle>Page detection failed to load</AlertTitle>
                    <AlertDescription>
                        <p>{scannerError}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={ensureScanner}
                        >
                            Try again
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {view === 'start' && (
                <Card>
                    <CardContent className="space-y-5 pt-6">
                        {savedPages && (
                            <div className="bg-muted/40 flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <History className="size-4" />
                                    You have an unfinished scan with{' '}
                                    {savedPages.length} page
                                    {savedPages.length === 1 ? '' : 's'}.
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={resumeSaved}>
                                        Resume
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={discardSaved}
                                    >
                                        Discard
                                    </Button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold">
                                Scan documents to PDF
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                Photograph your pages one after another. Each
                                photo is cropped to the page, straightened and
                                cleaned up. Then you can review, tweak and
                                reorder the pages and download them as one PDF.
                                Nothing leaves your device.
                            </p>
                        </div>
                        <Button
                            size="lg"
                            onClick={startScanning}
                            disabled={!loaded}
                        >
                            <Camera />
                            {pages.length > 0
                                ? 'Continue scanning'
                                : 'Start camera'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {view === 'camera' && (
                <CameraView
                    onCapture={handleCapture}
                    onDone={() => {
                        setRetakeId(null)
                        setView(
                            pages.length + pendingCaptures > 0
                                ? 'review'
                                : 'start'
                        )
                    }}
                    pageCount={pages.length + pendingCaptures}
                    retakeLabel={
                        retakeId
                            ? `Retaking page ${pages.findIndex((p) => p.id === retakeId) + 1}`
                            : undefined
                    }
                    scannerReady={scannerReady}
                />
            )}

            {view === 'review' && (
                <>
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-lg font-semibold">Pages</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={clearAll}
                                >
                                    <Trash2 />
                                    {confirmClear
                                        ? 'Tap again to clear'
                                        : 'Clear all'}
                                </Button>
                            </div>
                            <PageStrip
                                pages={pages}
                                previews={previews}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                                onReorder={setPages}
                                onAdd={startScanning}
                            />
                            {pendingCaptures > 0 && (
                                <p className="text-muted-foreground text-sm">
                                    Processing {pendingCaptures} capture
                                    {pendingCaptures === 1 ? '' : 's'}…
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {selected && (
                        <Card>
                            <CardContent className="pt-6">
                                <PageEditor
                                    key={selected.id}
                                    page={selected}
                                    index={selectedIndex}
                                    total={pages.length}
                                    preview={previews[selected.id]}
                                    processing={busyId === selected.id}
                                    onChange={(patch) =>
                                        updatePage(selected.id, patch)
                                    }
                                    onApplyToAll={() => applyToAll(selected)}
                                    onMove={(d) => movePage(selected.id, d)}
                                    onDelete={() => deletePage(selected.id)}
                                    onRetake={() => {
                                        setRetakeId(selected.id)
                                        startScanning()
                                    }}
                                />
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <h2 className="text-lg font-semibold">
                                Export PDF
                            </h2>
                            <ExportPanel
                                options={exportOptions}
                                onOptionsChange={setExportOptions}
                                fileName={fileName}
                                onFileNameChange={setFileName}
                                pageCount={pages.length}
                                estimatedBytes={estimatedBytes}
                                progress={progress}
                                canShare={canShare}
                                onDownload={download}
                                onShare={share}
                            />
                            {exportError && (
                                <Alert variant="destructive">
                                    <AlertCircleIcon className="h-5 w-5" />
                                    <AlertTitle>Export failed</AlertTitle>
                                    <AlertDescription>
                                        {exportError}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            <ToolInfoSection title="Tips" columns={3} className="mt-8">
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="mb-2 font-medium">Contrast</h3>
                        <p className="text-muted-foreground text-sm">
                            Put the page on a darker, plain surface so its edges
                            stand out. The green outline shows what will be
                            cropped.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="mb-2 font-medium">Light</h3>
                        <p className="text-muted-foreground text-sm">
                            Shadows and warm lamp light are corrected
                            automatically, but avoid glare spots. Use the torch
                            in dark rooms.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="mb-2 font-medium">Auto capture</h3>
                        <p className="text-muted-foreground text-sm">
                            With Auto on, hold steady for a second and the page
                            is captured. Swap in the next page and it captures
                            again.
                        </p>
                    </CardContent>
                </Card>
            </ToolInfoSection>
        </div>
    )
}
