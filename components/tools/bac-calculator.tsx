'use client'

import { AlertTriangle } from 'lucide-react'

import { useMemo, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// Ethanol density (g/ml) and Widmark elimination rate (‰ per hour).
const ETHANOL_DENSITY = 0.789
const ELIMINATION_PER_HOUR = 0.15

type Sex = 'male' | 'female'

// Widmark distribution ratios.
const DISTRIBUTION: Record<Sex, number> = {
    male: 0.68,
    female: 0.55,
}

const DRINKS = [
    { key: 'beer', label: 'Beer (330ml, 5%)', volume: 330, abv: 5 },
    { key: 'wine', label: 'Wine (150ml, 12%)', volume: 150, abv: 12 },
    { key: 'shot', label: 'Shot (40ml, 40%)', volume: 40, abv: 40 },
] as const

type DrinkKey = (typeof DRINKS)[number]['key']

function describe(perMille: number): string {
    if (perMille <= 0) return 'Sober'
    if (perMille < 0.3) return 'Minimal effect'
    if (perMille < 0.5) return 'Slightly relaxed, mild impairment'
    if (perMille < 0.8) return 'Impaired — over the limit in many countries'
    if (perMille < 1.5) return 'Clearly drunk: reduced coordination & judgment'
    if (perMille < 3) return 'Very drunk: serious impairment'
    return 'Dangerous — risk of alcohol poisoning'
}

export default function BacCalculator() {
    const [counts, setCounts] = useState<Record<DrinkKey, number>>({
        beer: 0,
        wine: 0,
        shot: 0,
    })
    const [weight, setWeight] = useState(80)
    const [sex, setSex] = useState<Sex>('male')
    const [hours, setHours] = useState(1)

    const grams = useMemo(() => {
        return DRINKS.reduce((total, drink) => {
            const n = counts[drink.key] || 0
            return (
                total + n * drink.volume * (drink.abv / 100) * ETHANOL_DENSITY
            )
        }, 0)
    }, [counts])

    const perMille = useMemo(() => {
        if (!weight || weight <= 0) return 0
        const raw = grams / (DISTRIBUTION[sex] * weight)
        const afterElimination = raw - ELIMINATION_PER_HOUR * Math.max(hours, 0)
        return Math.max(afterElimination, 0)
    }, [grams, weight, sex, hours])

    const hoursToSober = perMille / ELIMINATION_PER_HOUR

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                    Rough estimate only. Many factors affect real blood alcohol
                    level. Never use this to decide whether to drive — if you
                    drink, don&apos;t drive.
                </span>
            </div>

            <Card>
                <CardContent className="space-y-4 pt-6">
                    <span className="block text-sm font-medium">Drinks</span>
                    {DRINKS.map((drink) => (
                        <div
                            key={drink.key}
                            className="flex items-center justify-between gap-3"
                        >
                            <label
                                htmlFor={`drink-${drink.key}`}
                                className="text-sm"
                            >
                                {drink.label}
                            </label>
                            <Input
                                id={`drink-${drink.key}`}
                                type="number"
                                min={0}
                                value={counts[drink.key]}
                                onChange={(e) =>
                                    setCounts((prev) => ({
                                        ...prev,
                                        [drink.key]: Math.max(
                                            Number(e.target.value),
                                            0
                                        ),
                                    }))
                                }
                                aria-label={drink.label}
                                className="w-24"
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-3">
                    <div>
                        <label
                            htmlFor="bac-weight"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Body weight (kg)
                        </label>
                        <Input
                            id="bac-weight"
                            type="number"
                            min={1}
                            value={weight}
                            onChange={(e) => setWeight(Number(e.target.value))}
                            aria-label="Body weight (kg)"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="bac-sex"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Sex
                        </label>
                        <select
                            id="bac-sex"
                            value={sex}
                            onChange={(e) => setSex(e.target.value as Sex)}
                            aria-label="Sex"
                            className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                    <div>
                        <label
                            htmlFor="bac-hours"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Hours since first drink
                        </label>
                        <Input
                            id="bac-hours"
                            type="number"
                            min={0}
                            step={0.5}
                            value={hours}
                            onChange={(e) => setHours(Number(e.target.value))}
                            aria-label="Hours since first drink"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <span className="text-muted-foreground text-sm">
                        Estimated blood alcohol content
                    </span>
                    <div
                        className="mt-1 text-3xl font-bold"
                        data-testid="bac-result"
                    >
                        {perMille.toFixed(2)} ‰
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                        ({(perMille / 10).toFixed(3)} % BAC) ·{' '}
                        {Math.round(grams)} g of pure alcohol
                    </p>
                    <p className="mt-3 text-sm font-medium">
                        {describe(perMille)}
                    </p>
                    {perMille > 0 && (
                        <p className="text-muted-foreground mt-1 text-sm">
                            Roughly {hoursToSober.toFixed(1)} h until fully
                            sober (at {ELIMINATION_PER_HOUR} ‰/h).
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
