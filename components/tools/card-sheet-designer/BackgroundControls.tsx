import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { ColorField, RangeField } from './controls'
import type { Background } from './types'

export function CreditLine({ bg }: { bg: Background }) {
    const c = bg.credit
    if (!bg.image || !c || c.provider === 'upload' || c.provider === 'url') {
        return null
    }
    const text = [
        c.title ? `"${c.title}"` : 'Photo',
        c.creator && `by ${c.creator}`,
        c.license,
        c.provider === 'openverse' ? 'via Openverse' : 'via Lorem Picsum',
    ]
        .filter(Boolean)
        .join(' · ')
    return (
        <p className="text-muted-foreground text-[12px] leading-snug">
            {c.sourceUrl ? (
                <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline underline-offset-2"
                >
                    {text}
                </a>
            ) : (
                text
            )}
        </p>
    )
}

export default function BackgroundControls({
    bg,
    onChange,
}: {
    bg: Background
    onChange: (patch: Partial<Background>) => void
}) {
    return (
        <div className="space-y-3">
            {bg.image && (
                <div className="flex items-center gap-3">
                    <img
                        src={bg.image}
                        alt=""
                        className="h-12 w-[74px] shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                        <CreditLine bg={bg} />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            onChange({ image: undefined, credit: undefined })
                        }
                    >
                        <X className="size-3.5" />
                        Remove photo
                    </Button>
                </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
                <ColorField
                    label="Background colour"
                    value={bg.color}
                    onChange={(color) => onChange({ color })}
                />
                <ColorField
                    label="Tint colour"
                    value={bg.overlayColor}
                    onChange={(overlayColor) => onChange({ overlayColor })}
                />
                <RangeField
                    label="Tint strength"
                    value={bg.overlayOpacity}
                    min={0}
                    max={0.9}
                    step={0.05}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(overlayOpacity) => onChange({ overlayOpacity })}
                />
                {bg.image && (
                    <>
                        <RangeField
                            label="Zoom"
                            value={bg.zoom}
                            min={1}
                            max={3}
                            step={0.05}
                            format={(v) => `${v.toFixed(2)}×`}
                            onChange={(zoom) => onChange({ zoom })}
                        />
                        <RangeField
                            label="Photo position (left - right)"
                            value={bg.posX}
                            min={0}
                            max={100}
                            step={1}
                            unit="%"
                            onChange={(posX) => onChange({ posX })}
                        />
                        <RangeField
                            label="Photo position (top - bottom)"
                            value={bg.posY}
                            min={0}
                            max={100}
                            step={1}
                            unit="%"
                            onChange={(posY) => onChange({ posY })}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
