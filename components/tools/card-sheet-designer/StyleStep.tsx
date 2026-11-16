import { ChevronRight } from 'lucide-react'

import { useState } from 'react'

import { cn } from '@/lib/utils'

import {
    ColorField,
    PositionPicker,
    RangeField,
    ScopeSwitch,
    SelectField,
    Toggle,
} from './controls'
import { FONTS, TEXT_LOOKS, activeLook } from './design'
import type { TextStyle } from './types'

function fontOptions(current: string) {
    const options = FONTS.map((f) => ({ value: f.family, label: f.label }))
    if (!options.some((o) => o.value === current)) {
        options.push({
            value: current,
            label: current.split(',')[0].replace(/'/g, ''),
        })
    }
    return options
}

function LookButton({
    label,
    look,
    font,
    active,
    onClick,
}: {
    label: string
    look: Partial<TextStyle>
    font: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            onClick={onClick}
            className={cn(
                'flex flex-col items-center gap-1.5 rounded-md border p-1.5 text-[12px] transition-colors',
                active
                    ? 'border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
            )}
        >
            <span
                aria-hidden="true"
                className="flex h-10 w-full items-center justify-center rounded-sm bg-[linear-gradient(135deg,#e2e8f0,#94a3b8_50%,#475569)]"
            >
                <span
                    style={{
                        fontFamily: font,
                        color: look.color,
                        textShadow: look.shadow
                            ? '0 1px 3px rgba(0,0,0,0.6)'
                            : undefined,
                        background: look.panel
                            ? 'rgba(255,255,255,0.8)'
                            : undefined,
                    }}
                    className="rounded-sm px-1.5 text-[15px] leading-6"
                >
                    Aa
                </span>
            </span>
            {label}
        </button>
    )
}

export default function StyleStep({
    scope,
    onScopeChange,
    cardNumber,
    style,
    cardHasOwn,
    onChange,
    onResetCard,
}: {
    scope: 'all' | 'card'
    onScopeChange: (s: 'all' | 'card') => void
    cardNumber: number
    /** Style currently being edited (the card's own style in card scope). */
    style: TextStyle
    cardHasOwn: boolean
    onChange: (patch: Partial<TextStyle>) => void
    onResetCard: () => void
}) {
    const [moreOpen, setMoreOpen] = useState(false)
    const look = activeLook(style)

    return (
        <>
            <ScopeSwitch
                value={scope}
                cardNumber={cardNumber}
                onChange={onScopeChange}
            />
            {scope === 'card' && cardHasOwn && (
                <button
                    type="button"
                    onClick={onResetCard}
                    className="text-muted-foreground hover:text-foreground text-[13px] underline underline-offset-2"
                >
                    Make card {cardNumber} match the other cards again
                </button>
            )}

            {scope === 'all' && (
                <div className="space-y-1">
                    <div className="text-[13px] font-medium">Look</div>
                    <div
                        role="radiogroup"
                        aria-label="Look"
                        className="grid grid-cols-3 gap-2"
                    >
                        {TEXT_LOOKS.map((l) => (
                            <LookButton
                                key={l.id}
                                label={l.label}
                                look={l.style}
                                font={style.fontFamily}
                                active={look === l.id}
                                onClick={() => onChange(l.style)}
                            />
                        ))}
                    </div>
                    <p className="text-muted-foreground text-[12px]">
                        White text reads best on darker photos, the panel on
                        busy ones.
                    </p>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
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
                <PositionPicker
                    align={style.align}
                    vAlign={style.vAlign}
                    onChange={(align, vAlign) => onChange({ align, vAlign })}
                />
            </div>

            {scope === 'card' ? (
                <p className="text-muted-foreground text-[12px]">
                    Further text options are shared by all cards.
                </p>
            ) : (
                <div>
                    <button
                        type="button"
                        aria-expanded={moreOpen}
                        onClick={() => setMoreOpen((o) => !o)}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[13px]"
                    >
                        <ChevronRight
                            className={`size-3.5 transition-transform ${moreOpen ? 'rotate-90' : ''}`}
                        />
                        More text options
                    </button>
                    {moreOpen && (
                        <div className="mt-4 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <RangeField
                                    label="Small line size"
                                    value={style.refSize}
                                    min={4}
                                    max={20}
                                    step={0.5}
                                    unit=" pt"
                                    onChange={(refSize) =>
                                        onChange({ refSize })
                                    }
                                />
                                <RangeField
                                    label="Line spacing"
                                    value={style.lineHeight}
                                    min={0.9}
                                    max={2}
                                    step={0.05}
                                    onChange={(lineHeight) =>
                                        onChange({ lineHeight })
                                    }
                                />
                                <RangeField
                                    label="Distance from card edge"
                                    value={style.padding}
                                    min={1}
                                    max={12}
                                    step={0.5}
                                    unit=" mm"
                                    onChange={(padding) =>
                                        onChange({ padding })
                                    }
                                />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
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
                                    label="Small line in italics"
                                    checked={style.refItalic}
                                    onChange={(refItalic) =>
                                        onChange({ refItalic })
                                    }
                                />
                                <Toggle
                                    label="Shadow behind text"
                                    checked={style.shadow}
                                    onChange={(shadow) => onChange({ shadow })}
                                />
                                <Toggle
                                    label="Shrink long text to fit"
                                    checked={style.autoFit}
                                    onChange={(autoFit) =>
                                        onChange({ autoFit })
                                    }
                                />
                                <Toggle
                                    label="Panel behind text"
                                    checked={style.panel}
                                    onChange={(panel) => onChange({ panel })}
                                />
                            </div>
                            {style.panel && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <ColorField
                                        label="Panel colour"
                                        value={style.panelColor}
                                        onChange={(panelColor) =>
                                            onChange({ panelColor })
                                        }
                                    />
                                    <RangeField
                                        label="Panel opacity"
                                        value={style.panelOpacity}
                                        min={0.1}
                                        max={1}
                                        step={0.05}
                                        format={(v) =>
                                            `${Math.round(v * 100)}%`
                                        }
                                        onChange={(panelOpacity) =>
                                            onChange({ panelOpacity })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
