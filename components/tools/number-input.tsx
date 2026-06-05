'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'

import { Input } from '@/components/ui/input'

interface NumberInputProps extends Omit<
    React.ComponentProps<'input'>,
    'value' | 'onChange' | 'type'
> {
    value: number
    onValueChange: (value: number) => void
    /** Value emitted when the field is cleared. Defaults to `min ?? 0`. */
    min?: number
    max?: number
}

function clamp(n: number, min?: number, max?: number): number {
    if (min !== undefined && n < min) return min
    if (max !== undefined && n > max) return max
    return n
}

/**
 * Numeric input that keeps a local text buffer so users can freely clear and
 * edit the field. The parent always receives a clamped number, but the visible
 * text is never force-reset to "0" while typing — fixing leading-zero and
 * "can't delete the value" problems. Selecting all on focus lets a click-and-type
 * replace the current value.
 */
export function NumberInput({
    value,
    onValueChange,
    min,
    max,
    onFocus,
    ...props
}: NumberInputProps) {
    const [text, setText] = useState(String(value))
    const lastEmitted = useRef(value)

    // Reflect external changes (presets, "Now" buttons, etc.) but never clobber
    // what the user is actively typing.
    useEffect(() => {
        if (value !== lastEmitted.current) {
            setText(String(value))
            lastEmitted.current = value
        }
    }, [value])

    const handleChange = (raw: string) => {
        setText(raw)
        if (raw.trim() === '') {
            const fallback = min ?? 0
            lastEmitted.current = fallback
            onValueChange(fallback)
            return
        }
        const parsed = Number(raw)
        if (Number.isNaN(parsed)) return
        const next = clamp(parsed, min, max)
        lastEmitted.current = next
        onValueChange(next)
    }

    return (
        <Input
            {...props}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={(e) => {
                e.target.select()
                onFocus?.(e)
            }}
        />
    )
}
