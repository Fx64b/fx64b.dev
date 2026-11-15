import { ChevronRight, X } from 'lucide-react'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

import ImagePicker from './ImagePicker'
import { ColorField, RangeField, ScopeSwitch } from './controls'
import { brightnessOf, brightnessPatch } from './design'
import type { ImageResult } from './images'
import type { Background, ImageCredit } from './types'

export function creditText(bg: Background): string | null {
    const c = bg.credit
    if (!bg.image || !c) {
        return null
    }
    if (c.provider === 'upload') {
        return c.title ? `Your photo: ${c.title}` : 'Your photo'
    }
    if (c.provider === 'url') {
        return 'Photo from a link'
    }
    return [
        c.title ? `"${c.title}"` : 'Photo',
        c.creator && `by ${c.creator}`,
        c.license,
        c.provider === 'openverse' ? 'via Openverse' : 'via Lorem Picsum',
    ]
        .filter(Boolean)
        .join(' · ')
}

function brightnessLabel(v: number) {
    if (Math.abs(v) < 0.01) {
        return 'Original'
    }
    return `${v < 0 ? 'Darker' : 'Lighter'} ${Math.round(Math.abs(v) * 100)}%`
}

export default function BackgroundStep({
    scope,
    onScopeChange,
    cardNumber,
    bg,
    ownCount,
    ownImages,
    cardHasOwn,
    pixelSize,
    onPick,
    onPatch,
    onFillMany,
    onRandomEach,
    onResetCard,
}: {
    scope: 'all' | 'card'
    onScopeChange: (s: 'all' | 'card') => void
    cardNumber: number
    /** Background currently being edited. */
    bg: Background
    /** Visible cards that have their own background. */
    ownCount: number
    /** A few of the cards' own photos, for the "all cards" summary. */
    ownImages: string[]
    cardHasOwn: boolean
    pixelSize: { width: number; height: number }
    onPick: (image: string, credit: ImageCredit) => void
    onPatch: (patch: Partial<Background>) => void
    onFillMany: (images: ImageResult[]) => void
    onRandomEach: () => void
    onResetCard: () => void
}) {
    const [adjustOpen, setAdjustOpen] = useState(false)
    const credit = creditText(bg)
    const brightness = brightnessOf(bg)
    const target = scope === 'all' ? 'all cards' : `card ${cardNumber}`
    // In "all cards" with individual photos, show those instead of the
    // (unused) shared background.
    const mixed = scope === 'all' && ownCount > 0
    const hasPhoto = Boolean(bg.image) || mixed

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

            {mixed ? (
                <div className="flex items-center gap-3">
                    <div className="flex shrink-0 -space-x-6">
                        {ownImages.map((src, i) => (
                            <img
                                key={i}
                                src={src}
                                alt=""
                                className="ring-background h-12 w-[54px] rounded object-cover ring-2"
                            />
                        ))}
                    </div>
                    <p className="text-muted-foreground min-w-0 flex-1 text-[12px] leading-snug">
                        {ownCount === 1
                            ? '1 card has its own photo.'
                            : `${ownCount} cards have their own photo.`}{' '}
                        Changes here apply to all of them.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            onPatch({ image: undefined, credit: undefined })
                        }
                    >
                        <X className="size-3.5" />
                        Remove all
                    </Button>
                </div>
            ) : bg.image ? (
                <div className="flex items-center gap-3">
                    <img
                        src={bg.image}
                        alt="Current photo"
                        className="h-12 w-[74px] shrink-0 rounded object-cover"
                    />
                    <p className="text-muted-foreground min-w-0 flex-1 text-[12px] leading-snug">
                        {credit &&
                        bg.credit?.sourceUrl &&
                        bg.credit.provider !== 'url' ? (
                            <a
                                href={bg.credit.sourceUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="underline underline-offset-2"
                            >
                                {credit}
                            </a>
                        ) : (
                            credit
                        )}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            onPatch({ image: undefined, credit: undefined })
                        }
                    >
                        <X className="size-3.5" />
                        Remove
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                    <ColorField
                        label="Card colour"
                        value={bg.color}
                        onChange={(color) => onPatch({ color })}
                    />
                    <p className="text-muted-foreground pb-2 text-[12px]">
                        or choose a photo below
                    </p>
                </div>
            )}

            {hasPhoto && (
                <div className="space-y-3">
                    <RangeField
                        label="Photo brightness"
                        value={brightness}
                        min={-0.8}
                        max={0.8}
                        step={0.05}
                        format={brightnessLabel}
                        onChange={(v) => onPatch(brightnessPatch(v))}
                    />
                    <div>
                        <button
                            type="button"
                            aria-expanded={adjustOpen}
                            onClick={() => setAdjustOpen((o) => !o)}
                            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[13px]"
                        >
                            <ChevronRight
                                className={`size-3.5 transition-transform ${adjustOpen ? 'rotate-90' : ''}`}
                            />
                            Zoom and position
                        </button>
                        {adjustOpen && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                <RangeField
                                    label="Zoom"
                                    value={bg.zoom}
                                    min={1}
                                    max={3}
                                    step={0.05}
                                    format={(v) => `${v.toFixed(1)}×`}
                                    onChange={(zoom) => onPatch({ zoom })}
                                />
                                <RangeField
                                    label="Left / right"
                                    value={bg.posX}
                                    min={0}
                                    max={100}
                                    step={1}
                                    unit="%"
                                    onChange={(posX) => onPatch({ posX })}
                                />
                                <RangeField
                                    label="Up / down"
                                    value={bg.posY}
                                    min={0}
                                    max={100}
                                    step={1}
                                    unit="%"
                                    onChange={(posY) => onPatch({ posY })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <h3 className="text-[13px] font-medium">
                    {bg.image ? 'Choose another photo' : 'Choose a photo'}{' '}
                    <span className="text-muted-foreground font-normal">
                        for {target}
                    </span>
                </h3>
                <ImagePicker
                    targetLabel={target}
                    pixelSize={pixelSize}
                    onPick={onPick}
                    onFillMany={onFillMany}
                    onRandomEach={onRandomEach}
                />
            </div>
        </>
    )
}
