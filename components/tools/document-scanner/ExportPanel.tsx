import { Download, Loader2, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { QUALITY_PRESETS } from './imaging'
import type { ExportOptions, PageSize, QualityPreset } from './types'

interface ExportPanelProps {
    options: ExportOptions
    onOptionsChange: (options: ExportOptions) => void
    fileName: string
    onFileNameChange: (name: string) => void
    pageCount: number
    estimatedBytes: number
    progress: { done: number; total: number } | null
    canShare: boolean
    onDownload: () => void
    onShare: () => void
}

const PAGE_SIZES: { value: PageSize; label: string }[] = [
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'US Letter' },
    { value: 'fit', label: 'Fit to image' },
]

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ExportPanel({
    options,
    onOptionsChange,
    fileName,
    onFileNameChange,
    pageCount,
    estimatedBytes,
    progress,
    canShare,
    onDownload,
    onShare,
}: ExportPanelProps) {
    const busy = progress !== null
    const set = (patch: Partial<ExportOptions>) =>
        onOptionsChange({ ...options, ...patch })

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="page-size">
                        Page size
                    </label>
                    <Select
                        value={options.pageSize}
                        onValueChange={(v) => set({ pageSize: v as PageSize })}
                    >
                        <SelectTrigger id="page-size" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="quality">
                        Quality
                    </label>
                    <Select
                        value={options.quality}
                        onValueChange={(v) =>
                            set({ quality: v as QualityPreset })
                        }
                    >
                        <SelectTrigger id="quality" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(
                                Object.keys(QUALITY_PRESETS) as QualityPreset[]
                            ).map((q) => (
                                <SelectItem key={q} value={q}>
                                    {QUALITY_PRESETS[q].label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium" htmlFor="file-name">
                        File name
                    </label>
                    <Input
                        id="file-name"
                        value={fileName}
                        onChange={(e) => onFileNameChange(e.target.value)}
                        spellCheck={false}
                    />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input
                        type="checkbox"
                        checked={options.margin}
                        onChange={(e) => set({ margin: e.target.checked })}
                        className="accent-primary size-4"
                    />
                    Add page margin
                </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onDownload} disabled={busy || pageCount === 0}>
                    {busy ? <Loader2 className="animate-spin" /> : <Download />}
                    {busy
                        ? `Processing page ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                        : `Download PDF (${pageCount} page${pageCount === 1 ? '' : 's'})`}
                </Button>
                {canShare && (
                    <Button
                        variant="outline"
                        onClick={onShare}
                        disabled={busy || pageCount === 0}
                    >
                        <Share2 />
                        Share
                    </Button>
                )}
                {pageCount > 0 && !busy && (
                    <span className="text-muted-foreground text-sm">
                        ≈ {formatBytes(estimatedBytes)}
                    </span>
                )}
            </div>
        </div>
    )
}
