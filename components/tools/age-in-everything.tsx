'use client'

import { useMemo, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// Orbital periods in Earth years.
const PLANETS = [
    { name: 'Mercury', period: 0.2408467 },
    { name: 'Venus', period: 0.61519726 },
    { name: 'Mars', period: 1.8808158 },
    { name: 'Jupiter', period: 11.862615 },
    { name: 'Saturn', period: 29.447498 },
    { name: 'Uranus', period: 84.016846 },
    { name: 'Neptune', period: 164.79132 },
]

// Rough physiological averages.
const HEARTBEATS_PER_MIN = 80
const BREATHS_PER_MIN = 16

function formatNumber(n: number, digits = 0): string {
    return n.toLocaleString('en-US', {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
    })
}

export default function AgeInEverything() {
    const [birth, setBirth] = useState('')

    const stats = useMemo(() => {
        if (!birth) return null
        const birthDate = new Date(birth)
        if (Number.isNaN(birthDate.getTime())) return null
        const ms = Date.now() - birthDate.getTime()
        if (ms < 0) return null

        const seconds = ms / 1000
        const minutes = seconds / 60
        const hours = minutes / 60
        const days = hours / 24
        const years = days / 365.25

        return {
            years,
            days,
            hours,
            minutes,
            seconds,
            weeks: days / 7,
            heartbeats: minutes * HEARTBEATS_PER_MIN,
            breaths: minutes * BREATHS_PER_MIN,
        }
    }, [birth])

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <label
                        htmlFor="age-birth"
                        className="mb-1.5 block text-sm font-medium"
                    >
                        Your date of birth
                    </label>
                    <Input
                        id="age-birth"
                        type="date"
                        value={birth}
                        onChange={(e) => setBirth(e.target.value)}
                        aria-label="Date of birth"
                        className="max-w-xs"
                    />
                </CardContent>
            </Card>

            {stats && (
                <>
                    <Card>
                        <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3">
                            <Stat
                                label="Years"
                                value={formatNumber(stats.years, 1)}
                            />
                            <Stat
                                label="Weeks"
                                value={formatNumber(stats.weeks)}
                            />
                            <Stat
                                label="Days"
                                value={formatNumber(stats.days)}
                            />
                            <Stat
                                label="Hours"
                                value={formatNumber(stats.hours)}
                            />
                            <Stat
                                label="Minutes"
                                value={formatNumber(stats.minutes)}
                            />
                            <Stat
                                label="Seconds"
                                value={formatNumber(stats.seconds)}
                            />
                            <Stat
                                label="Heartbeats"
                                value={`~${formatNumber(stats.heartbeats)}`}
                            />
                            <Stat
                                label="Breaths"
                                value={`~${formatNumber(stats.breaths)}`}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <span className="mb-3 block text-sm font-medium">
                                Your age on other planets
                            </span>
                            <div className="space-y-2">
                                {PLANETS.map((planet) => (
                                    <div
                                        key={planet.name}
                                        className="bg-secondary/20 flex items-center justify-between rounded-md p-3 text-sm"
                                    >
                                        <span>{planet.name}</span>
                                        <span className="font-mono">
                                            {formatNumber(
                                                stats.years / planet.period,
                                                2
                                            )}{' '}
                                            years
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-muted-foreground text-xs tracking-wider uppercase">
                {label}
            </div>
        </div>
    )
}
