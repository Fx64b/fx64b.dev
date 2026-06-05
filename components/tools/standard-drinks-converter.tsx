'use client'

import { useMemo, useState } from 'react'

import { NumberInput } from '@/components/tools/number-input'
import { Card, CardContent } from '@/components/ui/card'

const ETHANOL_DENSITY = 0.789

// Grams of pure alcohol per "standard drink" by country/standard.
const STANDARDS = [
    { key: 'us', label: 'United States', grams: 14, unit: 'standard drinks' },
    { key: 'uk', label: 'United Kingdom', grams: 8, unit: 'units' },
    { key: 'eu', label: 'EU / WHO', grams: 10, unit: 'standard drinks' },
    { key: 'au', label: 'Australia', grams: 10, unit: 'standard drinks' },
    { key: 'jp', label: 'Japan', grams: 20, unit: 'standard drinks' },
] as const

const PRESETS = [
    { label: 'Beer', volume: 330, abv: 5 },
    { label: 'Wine', volume: 150, abv: 12 },
    { label: 'Shot', volume: 40, abv: 40 },
]

export default function StandardDrinksConverter() {
    const [volume, setVolume] = useState(330)
    const [abv, setAbv] = useState(5)

    const grams = useMemo(
        () => volume * (abv / 100) * ETHANOL_DENSITY,
        [volume, abv]
    )

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="sd-volume"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Volume (ml)
                            </label>
                            <NumberInput
                                id="sd-volume"
                                min={0}
                                value={volume}
                                onValueChange={setVolume}
                                aria-label="Volume (ml)"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="sd-abv"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                Alcohol by volume (%)
                            </label>
                            <NumberInput
                                id="sd-abv"
                                min={0}
                                max={100}
                                step={0.1}
                                value={abv}
                                onValueChange={setAbv}
                                aria-label="Alcohol by volume (%)"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                    setVolume(preset.volume)
                                    setAbv(preset.abv)
                                }}
                                className="border-border text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6" role="status" aria-live="polite">
                    <span className="text-muted-foreground text-sm">
                        Pure alcohol content
                    </span>
                    <div
                        className="mt-1 text-3xl font-bold"
                        data-testid="alcohol-grams"
                    >
                        {grams.toFixed(1)} g
                    </div>

                    <div className="mt-4 space-y-2">
                        {STANDARDS.map((standard) => (
                            <div
                                key={standard.key}
                                className="bg-secondary/20 flex items-center justify-between rounded-md p-3 text-sm"
                            >
                                <span>{standard.label}</span>
                                <span className="font-mono">
                                    {(grams / standard.grams).toFixed(2)}{' '}
                                    {standard.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
