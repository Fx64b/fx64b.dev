'use client'

import { useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Base = 'binary' | 'octal' | 'decimal' | 'hex'

const BASES: { key: Base; label: string; radix: number; pattern: RegExp }[] = [
    { key: 'binary', label: 'Binary', radix: 2, pattern: /^[01]+$/ },
    { key: 'octal', label: 'Octal', radix: 8, pattern: /^[0-7]+$/ },
    { key: 'decimal', label: 'Decimal', radix: 10, pattern: /^[0-9]+$/ },
    { key: 'hex', label: 'Hexadecimal', radix: 16, pattern: /^[0-9a-fA-F]+$/ },
]

const EMPTY: Record<Base, string> = {
    binary: '',
    octal: '',
    decimal: '',
    hex: '',
}

export default function NumberBaseConverter() {
    const [values, setValues] = useState<Record<Base, string>>(EMPTY)
    const [error, setError] = useState('')

    const handleChange = (base: Base, raw: string) => {
        setError('')
        const value = raw.trim()
        if (value === '') {
            setValues(EMPTY)
            return
        }

        const config = BASES.find((b) => b.key === base)!
        if (!config.pattern.test(value)) {
            setError(`Invalid ${config.label.toLowerCase()} number.`)
            setValues({ ...EMPTY, [base]: raw })
            return
        }

        const decimal = parseInt(value, config.radix)
        if (!Number.isSafeInteger(decimal)) {
            setError('Number is too large to convert safely.')
            setValues({ ...EMPTY, [base]: raw })
            return
        }

        setValues({
            binary: decimal.toString(2),
            octal: decimal.toString(8),
            decimal: decimal.toString(10),
            hex: decimal.toString(16),
        })
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    {BASES.map((base) => (
                        <div key={base.key}>
                            <label
                                htmlFor={`base-${base.key}`}
                                className="mb-1.5 block text-sm font-medium"
                            >
                                {base.label}
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    id={`base-${base.key}`}
                                    value={values[base.key]}
                                    onChange={(e) =>
                                        handleChange(base.key, e.target.value)
                                    }
                                    placeholder={`Enter a ${base.label.toLowerCase()} value`}
                                    className="font-mono"
                                    aria-label={base.label}
                                />
                                <CopyButton
                                    value={values[base.key]}
                                    label={`Copy ${base.label}`}
                                />
                            </div>
                        </div>
                    ))}
                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
