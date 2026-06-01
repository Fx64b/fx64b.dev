'use client'

import { RefreshCw } from 'lucide-react'

import { useCallback, useEffect, useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

function generateV4(): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID()
    }
    // Fallback for environments without crypto.randomUUID.
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
        .slice(6, 8)
        .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
}

export default function UuidGenerator() {
    const [count, setCount] = useState(5)
    const [uppercase, setUppercase] = useState(false)
    const [hyphens, setHyphens] = useState(true)
    const [uuids, setUuids] = useState<string[]>([])

    const generate = useCallback(() => {
        const n = Math.min(Math.max(count, 1), 100)
        setUuids(Array.from({ length: n }, () => generateV4()))
    }, [count])

    useEffect(() => {
        generate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const format = (uuid: string) => {
        let value = uuid
        if (!hyphens) value = value.replace(/-/g, '')
        if (uppercase) value = value.toUpperCase()
        return value
    }

    const formatted = uuids.map(format)
    const allText = formatted.join('\n')

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-4">
                <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label
                                htmlFor="uuid-count"
                                className="mb-1.5 block text-sm font-medium"
                            >
                                How many
                            </label>
                            <Input
                                id="uuid-count"
                                type="number"
                                min={1}
                                max={100}
                                value={count}
                                onChange={(e) =>
                                    setCount(Number(e.target.value))
                                }
                                className="w-28"
                            />
                        </div>
                        <Button onClick={generate} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Generate
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={uppercase}
                                onChange={(e) => setUppercase(e.target.checked)}
                                aria-label="Uppercase"
                            />
                            Uppercase
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={hyphens}
                                onChange={(e) => setHyphens(e.target.checked)}
                                aria-label="Hyphens"
                            />
                            Hyphens
                        </label>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">
                            Generated UUIDs (v4)
                        </span>
                        <CopyButton value={allText} label="Copy all" />
                    </div>
                    <div className="bg-secondary/20 space-y-1 rounded-md p-3 font-mono text-sm">
                        {formatted.map((uuid, i) => (
                            <div key={`${uuid}-${i}`} className="break-all">
                                {uuid}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUuids([NIL_UUID])}
                        >
                            Insert NIL UUID
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
