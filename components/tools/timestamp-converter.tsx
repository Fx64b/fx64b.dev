'use client'

import { useEffect, useMemo, useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function parseEpoch(raw: string): Date | null {
    const trimmed = raw.trim()
    if (!/^-?\d+$/.test(trimmed)) return null
    const num = Number(trimmed)
    if (!Number.isFinite(num)) return null
    // Treat 13+ digit values as milliseconds, otherwise seconds.
    const ms = trimmed.replace('-', '').length >= 13 ? num : num * 1000
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
}

export default function TimestampConverter() {
    const [epoch, setEpoch] = useState('')
    const [dateInput, setDateInput] = useState('')

    useEffect(() => {
        setEpoch(String(Math.floor(Date.now() / 1000)))
    }, [])

    const fromEpoch = useMemo(() => parseEpoch(epoch), [epoch])

    const epochToDate = useMemo(() => {
        const num = Number(dateInput)
        const date = new Date(dateInput)
        if (dateInput && !Number.isNaN(date.getTime()) && Number.isNaN(num)) {
            return Math.floor(date.getTime() / 1000)
        }
        return null
    }, [dateInput])

    const setNow = () => setEpoch(String(Math.floor(Date.now() / 1000)))

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div>
                        <label
                            htmlFor="epoch-input"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Unix timestamp → date
                        </label>
                        <div className="flex gap-2">
                            <Input
                                id="epoch-input"
                                value={epoch}
                                onChange={(e) => setEpoch(e.target.value)}
                                placeholder="1700000000"
                                className="font-mono"
                                aria-label="Unix timestamp"
                            />
                            <Button variant="outline" onClick={setNow}>
                                Now
                            </Button>
                        </div>
                    </div>

                    {epoch.trim() &&
                        (fromEpoch ? (
                            <div className="bg-secondary/20 space-y-2 rounded-md p-3 text-sm">
                                <Row
                                    label="UTC"
                                    value={fromEpoch.toUTCString()}
                                />
                                <Row
                                    label="Local"
                                    value={fromEpoch.toString()}
                                />
                                <Row
                                    label="ISO 8601"
                                    value={fromEpoch.toISOString()}
                                />
                            </div>
                        ) : (
                            <p className="text-destructive text-sm">
                                Enter a valid integer timestamp.
                            </p>
                        ))}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div>
                        <label
                            htmlFor="date-input"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Date → Unix timestamp
                        </label>
                        <Input
                            id="date-input"
                            value={dateInput}
                            onChange={(e) => setDateInput(e.target.value)}
                            placeholder="2023-11-14 or 2023-11-14T22:13:20Z"
                            className="font-mono"
                            aria-label="Date string"
                        />
                    </div>

                    {dateInput.trim() &&
                        (epochToDate !== null ? (
                            <div className="bg-secondary/20 flex items-center justify-between rounded-md p-3 font-mono text-sm">
                                <span>{epochToDate}</span>
                                <CopyButton value={String(epochToDate)} />
                            </div>
                        ) : (
                            <p className="text-destructive text-sm">
                                Enter a parseable date (e.g. 2023-11-14).
                            </p>
                        ))}
                </CardContent>
            </Card>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span>
                <span className="text-muted-foreground">{label}: </span>
                {value}
            </span>
            <CopyButton value={value} label={`Copy ${label}`} />
        </div>
    )
}
