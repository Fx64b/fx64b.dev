import {
    Camera,
    ChevronLeft,
    ChevronRight,
    Crop,
    Loader2,
    Maximize,
    RotateCcw,
    RotateCw,
    Trash2,
    Wand2,
} from 'lucide-react'

import { useState } from 'react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

import CornerEditor from './CornerEditor'
import { FULL_FRAME } from './imaging'
import type { PageSettings, Rotation, ScanFilter, ScanPage } from './types'

export interface Preview {
    url: string
    width: number
    height: number
}

interface PageEditorProps {
    page: ScanPage
    index: number
    total: number
    preview?: Preview
    processing: boolean
    onChange: (patch: Partial<PageSettings>) => void
    onApplyToAll: () => void
    onMove: (delta: -1 | 1) => void
    onDelete: () => void
    onRetake: () => void
}

const FILTERS: { value: ScanFilter; label: string }[] = [
    { value: 'color', label: 'Auto color' },
    { value: 'grayscale', label: 'Grayscale' },
    { value: 'bw', label: 'B&W scan' },
]

function Slider({
    id,
    label,
    value,
    min,
    max,
    onChange,
}: {
    id: string
    label: string
    value: number
    min: number
    max: number
    onChange: (v: number) => void
}) {
    // Local state while dragging; the page is updated on release.
    const [draft, setDraft] = useState<number | null>(null)
    const commit = () => {
        if (draft !== null) {
            onChange(draft)
            setDraft(null)
        }
    }
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <label htmlFor={id}>{label}</label>
                <span className="text-muted-foreground tabular-nums">
                    {draft ?? value}
                </span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                value={draft ?? value}
                onChange={(e) => setDraft(Number(e.target.value))}
                onPointerUp={commit}
                onKeyUp={commit}
                onBlur={commit}
                className="accent-primary w-full"
            />
        </div>
    )
}

export default function PageEditor({
    page,
    index,
    total,
    preview,
    processing,
    onChange,
    onApplyToAll,
    onMove,
    onDelete,
    onRetake,
}: PageEditorProps) {
    const [mode, setMode] = useState<'result' | 'crop'>('result')

    const rotate = (delta: 90 | -90) =>
        onChange({
            rotation: ((((page.rotation + delta) % 360) + 360) %
                360) as Rotation,
        })

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex rounded-md border p-0.5">
                        {(['result', 'crop'] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => setMode(m)}
                                aria-pressed={mode === m}
                                className={cn(
                                    'rounded px-3 py-1 text-sm',
                                    mode === m
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {m === 'result' ? 'Result' : 'Adjust corners'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onMove(-1)}
                            disabled={index === 0}
                            aria-label="Move page earlier"
                        >
                            <ChevronLeft />
                        </Button>
                        <span className="text-muted-foreground text-sm tabular-nums">
                            Page {index + 1} / {total}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onMove(1)}
                            disabled={index === total - 1}
                            aria-label="Move page later"
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                </div>

                <div className="bg-muted/40 flex min-h-[40vh] items-center justify-center rounded-lg p-3">
                    {mode === 'crop' ? (
                        <CornerEditor
                            blob={page.blob}
                            corners={page.corners}
                            onCommit={(corners) => onChange({ corners })}
                        />
                    ) : preview ? (
                        <div className="relative">
                            <img
                                src={preview.url}
                                alt={`Processed page ${index + 1}`}
                                className="max-h-[60vh] w-auto max-w-full shadow-md"
                            />
                            {processing && (
                                <Loader2 className="text-primary absolute top-2 right-2 size-5 animate-spin" />
                            )}
                        </div>
                    ) : (
                        <Loader2 className="text-muted-foreground size-8 animate-spin" />
                    )}
                </div>
                {mode === 'crop' && (
                    <div className="flex flex-wrap justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                page.autoCorners &&
                                onChange({ corners: page.autoCorners })
                            }
                            disabled={!page.autoCorners}
                        >
                            <Crop />
                            Auto-detected
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onChange({ corners: FULL_FRAME })}
                        >
                            <Maximize />
                            Whole photo
                        </Button>
                    </div>
                )}
            </div>

            <div className="space-y-5">
                <div className="space-y-2">
                    <span className="text-sm font-medium">Filter</span>
                    <div className="grid grid-cols-3 gap-1">
                        {FILTERS.map((f) => (
                            <Button
                                key={f.value}
                                variant={
                                    page.filter === f.value
                                        ? 'default'
                                        : 'outline'
                                }
                                size="sm"
                                className="px-1 text-xs"
                                aria-pressed={page.filter === f.value}
                                onClick={() => onChange({ filter: f.value })}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                    {total > 1 && (
                        <Button
                            variant="link"
                            size="sm"
                            className="h-auto px-0"
                            onClick={onApplyToAll}
                        >
                            <Wand2 />
                            Apply filter and tuning to all pages
                        </Button>
                    )}
                </div>

                {page.filter === 'bw' ? (
                    <Slider
                        key={`t-${page.id}`}
                        id="threshold"
                        label="Clean-up strength"
                        value={page.threshold}
                        min={0}
                        max={40}
                        onChange={(threshold) => onChange({ threshold })}
                    />
                ) : (
                    <>
                        <Slider
                            key={`b-${page.id}`}
                            id="brightness"
                            label="Brightness"
                            value={page.brightness}
                            min={-100}
                            max={100}
                            onChange={(brightness) => onChange({ brightness })}
                        />
                        <Slider
                            key={`c-${page.id}`}
                            id="contrast"
                            label="Contrast"
                            value={page.contrast}
                            min={-100}
                            max={100}
                            onChange={(contrast) => onChange({ contrast })}
                        />
                    </>
                )}

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rotate(-90)}
                        aria-label="Rotate left"
                    >
                        <RotateCcw />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rotate(90)}
                        aria-label="Rotate right"
                    >
                        <RotateCw />
                    </Button>
                    <Button variant="outline" size="sm" onClick={onRetake}>
                        <Camera />
                        Retake
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDelete}
                        className="text-destructive"
                    >
                        <Trash2 />
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    )
}
