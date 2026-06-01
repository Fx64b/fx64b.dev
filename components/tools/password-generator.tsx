'use client'

import { RefreshCw } from 'lucide-react'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const SETS = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
}

const AMBIGUOUS = new Set('Il1O0o'.split(''))

function randomInt(max: number): number {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    return arr[0] % max
}

export default function PasswordGenerator() {
    const [length, setLength] = useState(16)
    const [lowercase, setLowercase] = useState(true)
    const [uppercase, setUppercase] = useState(true)
    const [numbers, setNumbers] = useState(true)
    const [symbols, setSymbols] = useState(true)
    const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
    const [password, setPassword] = useState('')

    const pool = useMemo(() => {
        let chars = ''
        if (lowercase) chars += SETS.lowercase
        if (uppercase) chars += SETS.uppercase
        if (numbers) chars += SETS.numbers
        if (symbols) chars += SETS.symbols
        if (excludeAmbiguous) {
            chars = chars
                .split('')
                .filter((c) => !AMBIGUOUS.has(c))
                .join('')
        }
        return chars
    }, [lowercase, uppercase, numbers, symbols, excludeAmbiguous])

    const generate = useCallback(() => {
        if (!pool) {
            setPassword('')
            return
        }
        const len = Math.min(Math.max(length, 4), 128)
        let result = ''
        for (let i = 0; i < len; i++) {
            result += pool[randomInt(pool.length)]
        }
        setPassword(result)
    }, [pool, length])

    useEffect(() => {
        generate()
    }, [generate])

    const strength = useMemo(() => {
        if (!password) return { label: 'None', score: 0 }
        const entropy = password.length * Math.log2(pool.length || 1)
        if (entropy < 40) return { label: 'Weak', score: 1 }
        if (entropy < 60) return { label: 'Fair', score: 2 }
        if (entropy < 80) return { label: 'Strong', score: 3 }
        return { label: 'Very strong', score: 4 }
    }, [password, pool])

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-4">
                <CardContent className="pt-6">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">Password</span>
                        <CopyButton value={password} />
                    </div>
                    <div
                        data-testid="password-output"
                        className="bg-secondary/20 min-h-[48px] rounded-md p-3 font-mono text-lg break-all"
                    >
                        {password || (
                            <span className="text-muted-foreground text-sm">
                                Select at least one character set…
                            </span>
                        )}
                    </div>
                    {password && (
                        <p className="text-muted-foreground mt-2 text-sm">
                            Strength:{' '}
                            <span className="text-foreground font-medium">
                                {strength.label}
                            </span>
                        </p>
                    )}
                    <div className="mt-4">
                        <Button onClick={generate} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Regenerate
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div>
                        <label
                            htmlFor="pw-length"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Length: {length}
                        </label>
                        <input
                            id="pw-length"
                            type="range"
                            min={4}
                            max={64}
                            value={length}
                            onChange={(e) => setLength(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Toggle
                            label="Lowercase (a-z)"
                            checked={lowercase}
                            onChange={setLowercase}
                        />
                        <Toggle
                            label="Uppercase (A-Z)"
                            checked={uppercase}
                            onChange={setUppercase}
                        />
                        <Toggle
                            label="Numbers (0-9)"
                            checked={numbers}
                            onChange={setNumbers}
                        />
                        <Toggle
                            label="Symbols (!@#$)"
                            checked={symbols}
                            onChange={setSymbols}
                        />
                        <Toggle
                            label="Exclude ambiguous (Il1O0o)"
                            checked={excludeAmbiguous}
                            onChange={setExcludeAmbiguous}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string
    checked: boolean
    onChange: (value: boolean) => void
}) {
    return (
        <label className="flex items-center gap-2 text-sm">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                aria-label={label}
            />
            {label}
        </label>
    )
}
