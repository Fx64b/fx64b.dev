import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'

import type React from 'react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import {
    ColorField,
    RangeField,
    Segmented,
    SelectField,
    Toggle,
} from './controls'
import { FONTS, TEXT_PRESETS, parseBulkText } from './design'
import type { HAlign, TextStyle, VAlign } from './types'

export const H_ALIGN_OPTIONS: {
    value: HAlign
    label: React.ReactNode
    title: string
}[] = [
    {
        value: 'left',
        label: <AlignLeft className="size-4" />,
        title: 'Align left',
    },
    {
        value: 'center',
        label: <AlignCenter className="size-4" />,
        title: 'Align center',
    },
    {
        value: 'right',
        label: <AlignRight className="size-4" />,
        title: 'Align right',
    },
]

export const V_ALIGN_OPTIONS: {
    value: VAlign
    label: string
    title: string
}[] = [
    { value: 'top', label: 'Top', title: 'Text at the top' },
    { value: 'center', label: 'Middle', title: 'Text in the middle' },
    { value: 'bottom', label: 'Bottom', title: 'Text at the bottom' },
]

export function fontOptions(current: string) {
    const options = FONTS.map((f) => ({ value: f.family, label: f.label }))
    if (!options.some((o) => o.value === current)) {
        options.push({
            value: current,
            label: current.split(',')[0].replace(/'/g, ''),
        })
    }
    return options
}

export function BulkTextInput({
    totalCards,
    onApply,
    onSameForAll,
    onClearAll,
}: {
    totalCards: number
    onApply: (text: string) => void
    onSameForAll: (text: string) => void
    onClearAll: () => void
}) {
    const [text, setText] = useState('')
    const entries = parseBulkText(text)

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <label htmlFor="csd-bulk" className="text-sm font-semibold">
                    Fill cards from a list
                </label>
                <select
                    aria-label="Insert ready-made texts"
                    value=""
                    onChange={(e) => {
                        const preset = TEXT_PRESETS.find(
                            (p) => p.id === e.target.value
                        )
                        if (preset) {
                            setText(preset.text)
                        }
                    }}
                    className="border-input bg-background h-8 rounded-md border px-2 text-[13px]"
                >
                    <option value="">Insert ready-made texts...</option>
                    {TEXT_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.label}
                        </option>
                    ))}
                </select>
            </div>
            <Textarea
                id="csd-bulk"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder={
                    'One card per paragraph - leave an empty line between cards.\nA last line starting with "—" or "--" becomes the small reference line:\n\nThe LORD is my shepherd; I shall not want.\n— Psalm 23:1'
                }
                className="font-mono text-[12.5px]"
            />
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    disabled={entries.length === 0}
                    onClick={() => onApply(text)}
                >
                    Fill {entries.length || ''} card
                    {entries.length === 1 ? '' : 's'}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={entries.length !== 1}
                    onClick={() => onSameForAll(text)}
                    title="Put the same text on every card"
                >
                    Same text on all {totalCards} cards
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onClearAll}
                >
                    Clear all card texts
                </Button>
            </div>
            {entries.length > totalCards && (
                <p className="text-muted-foreground text-[12px]">
                    {entries.length} entries - pages will be added as needed.
                </p>
            )}
        </div>
    )
}

export default function TextStylePanel({
    style,
    onChange,
}: {
    style: TextStyle
    onChange: (patch: Partial<TextStyle>) => void
}) {
    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                    label="Font"
                    value={style.fontFamily}
                    options={fontOptions(style.fontFamily)}
                    onChange={(fontFamily) => onChange({ fontFamily })}
                />
                <ColorField
                    label="Text colour"
                    value={style.color}
                    onChange={(color) => onChange({ color })}
                />
                <RangeField
                    label="Text size"
                    value={style.fontSize}
                    min={5}
                    max={28}
                    step={0.5}
                    unit=" pt"
                    onChange={(fontSize) => onChange({ fontSize })}
                />
                <RangeField
                    label="Reference size"
                    value={style.refSize}
                    min={4}
                    max={20}
                    step={0.5}
                    unit=" pt"
                    onChange={(refSize) => onChange({ refSize })}
                />
                <RangeField
                    label="Line spacing"
                    value={style.lineHeight}
                    min={0.9}
                    max={2}
                    step={0.05}
                    onChange={(lineHeight) => onChange({ lineHeight })}
                />
                <RangeField
                    label="Inner padding"
                    value={style.padding}
                    min={1}
                    max={12}
                    step={0.5}
                    unit=" mm"
                    onChange={(padding) => onChange({ padding })}
                />
                <Segmented<HAlign>
                    label="Alignment"
                    value={style.align}
                    options={H_ALIGN_OPTIONS}
                    onChange={(align) => onChange({ align })}
                />
                <Segmented<VAlign>
                    label="Position"
                    value={style.vAlign}
                    options={V_ALIGN_OPTIONS}
                    onChange={(vAlign) => onChange({ vAlign })}
                />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Toggle
                    label="Bold"
                    checked={style.bold}
                    onChange={(bold) => onChange({ bold })}
                />
                <Toggle
                    label="Italic"
                    checked={style.italic}
                    onChange={(italic) => onChange({ italic })}
                />
                <Toggle
                    label="Italic reference"
                    checked={style.refItalic}
                    onChange={(refItalic) => onChange({ refItalic })}
                />
                <Toggle
                    label="Text shadow"
                    checked={style.shadow}
                    onChange={(shadow) => onChange({ shadow })}
                />
                <Toggle
                    label="Shrink long text to fit"
                    checked={style.autoFit}
                    onChange={(autoFit) => onChange({ autoFit })}
                />
                <Toggle
                    label="Panel behind text"
                    checked={style.panel}
                    onChange={(panel) => onChange({ panel })}
                />
            </div>
            {style.panel && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField
                        label="Panel colour"
                        value={style.panelColor}
                        onChange={(panelColor) => onChange({ panelColor })}
                    />
                    <RangeField
                        label="Panel opacity"
                        value={style.panelOpacity}
                        min={0.1}
                        max={1}
                        step={0.05}
                        format={(v) => `${Math.round(v * 100)}%`}
                        onChange={(panelOpacity) => onChange({ panelOpacity })}
                    />
                </div>
            )}
        </div>
    )
}
