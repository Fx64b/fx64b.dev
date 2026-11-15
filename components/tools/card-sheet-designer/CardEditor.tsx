import { ChevronLeft, ChevronRight, Copy, RotateCcw } from 'lucide-react'

import type React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { H_ALIGN_OPTIONS, V_ALIGN_OPTIONS, fontOptions } from './TextPanel'
import { ColorField, RangeField, Segmented, SelectField } from './controls'
import type {
    CardData,
    HAlign,
    TextOverrides,
    TextStyle,
    VAlign,
} from './types'

export default function CardEditor({
    card,
    index,
    total,
    baseStyle,
    onChange,
    onSelect,
    onCopyTextToAll,
    children,
}: {
    card: CardData
    index: number
    total: number
    baseStyle: TextStyle
    onChange: (patch: Partial<CardData>) => void
    onSelect: (index: number) => void
    onCopyTextToAll: () => void
    /** Background controls for this card. */
    children?: React.ReactNode
}) {
    const s = { ...baseStyle, ...card.style }
    const setStyle = (patch: TextOverrides) =>
        onChange({ style: { ...card.style, ...patch } })
    const hasOverrides = Boolean(card.style && Object.keys(card.style).length)

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h3
                    className="text-sm font-semibold"
                    data-testid="card-editor-title"
                >
                    Card {index + 1}{' '}
                    <span className="text-muted-foreground font-normal">
                        of {total}
                    </span>
                </h3>
                <div className="flex gap-1">
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8"
                        aria-label="Previous card"
                        disabled={index === 0}
                        onClick={() => onSelect(index - 1)}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="size-8"
                        aria-label="Next card"
                        disabled={index >= total - 1}
                        onClick={() => onSelect(index + 1)}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-1">
                <label
                    htmlFor="csd-card-text"
                    className="text-[13px] font-medium"
                >
                    Text
                </label>
                <Textarea
                    id="csd-card-text"
                    value={card.text}
                    rows={4}
                    placeholder="e.g. a Bible verse or a Christmas greeting"
                    onChange={(e) => onChange({ text: e.target.value })}
                />
            </div>
            <div className="space-y-1">
                <label
                    htmlFor="csd-card-ref"
                    className="text-[13px] font-medium"
                >
                    Reference / signature{' '}
                    <span className="text-muted-foreground font-normal">
                        (optional)
                    </span>
                </label>
                <Input
                    id="csd-card-ref"
                    value={card.reference}
                    placeholder="e.g. John 3:16 or - Anna & Tom"
                    onChange={(e) => onChange({ reference: e.target.value })}
                />
            </div>
            <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCopyTextToAll}
            >
                <Copy className="size-3.5" />
                Copy this text to all cards
            </Button>

            <details className="group rounded-md border px-3 py-2">
                <summary className="cursor-pointer text-[13px] font-medium select-none">
                    Style for this card only
                    {hasOverrides && (
                        <span className="text-muted-foreground">
                            {' '}
                            (customised)
                        </span>
                    )}
                </summary>
                <div className="mt-3 space-y-3">
                    <SelectField
                        label="Font"
                        value={s.fontFamily}
                        options={fontOptions(s.fontFamily)}
                        onChange={(fontFamily) => setStyle({ fontFamily })}
                    />
                    <ColorField
                        label="Text colour"
                        value={s.color}
                        onChange={(color) => setStyle({ color })}
                    />
                    <RangeField
                        label="Text size"
                        value={s.fontSize}
                        min={5}
                        max={28}
                        step={0.5}
                        unit=" pt"
                        onChange={(fontSize) => setStyle({ fontSize })}
                    />
                    <RangeField
                        label="Reference size"
                        value={s.refSize}
                        min={4}
                        max={20}
                        step={0.5}
                        unit=" pt"
                        onChange={(refSize) => setStyle({ refSize })}
                    />
                    <Segmented<HAlign>
                        label="Alignment"
                        value={s.align}
                        options={H_ALIGN_OPTIONS}
                        onChange={(align) => setStyle({ align })}
                    />
                    <Segmented<VAlign>
                        label="Position"
                        value={s.vAlign}
                        options={V_ALIGN_OPTIONS}
                        onChange={(vAlign) => setStyle({ vAlign })}
                    />
                    {hasOverrides && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onChange({ style: undefined })}
                        >
                            <RotateCcw className="size-3.5" />
                            Use the shared text style
                        </Button>
                    )}
                </div>
            </details>

            {children}
        </div>
    )
}
