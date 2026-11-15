import type React from 'react'
import { useId } from 'react'

import { cn } from '@/lib/utils'

export function Field({
    label,
    hint,
    children,
    className,
}: {
    label: string
    hint?: string
    children: (id: string) => React.ReactNode
    className?: string
}) {
    const id = useId()
    return (
        <div className={cn('space-y-1', className)}>
            <label
                htmlFor={id}
                className="flex items-baseline justify-between gap-2 text-[13px] font-medium"
            >
                <span>{label}</span>
                {hint && (
                    <span className="text-muted-foreground font-normal tabular-nums">
                        {hint}
                    </span>
                )}
            </label>
            {children(id)}
        </div>
    )
}

export function RangeField({
    label,
    value,
    min,
    max,
    step,
    unit = '',
    onChange,
    format,
}: {
    label: string
    value: number
    min: number
    max: number
    step: number
    unit?: string
    onChange: (v: number) => void
    format?: (v: number) => string
}) {
    return (
        <Field
            label={label}
            hint={format ? format(value) : `${round(value)}${unit}`}
        >
            {(id) => (
                <input
                    id={id}
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="accent-foreground h-5 w-full"
                />
            )}
        </Field>
    )
}

function round(v: number) {
    return Math.round(v * 100) / 100
}

export function NumberField({
    label,
    value,
    min,
    max,
    step = 1,
    unit,
    onChange,
}: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    unit?: string
    onChange: (v: number) => void
}) {
    return (
        <Field label={unit ? `${label} (${unit})` : label}>
            {(id) => (
                <input
                    id={id}
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => {
                        const n = Number(e.target.value)
                        if (e.target.value !== '' && Number.isFinite(n)) {
                            onChange(Math.min(max, Math.max(min, n)))
                        }
                    }}
                    className="border-input dark:bg-input/30 focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
                />
            )}
        </Field>
    )
}

export function SelectField<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string
    value: T
    options: { value: T; label: string }[]
    onChange: (v: T) => void
}) {
    return (
        <Field label={label}>
            {(id) => (
                <select
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value as T)}
                    className="border-input dark:bg-input/30 focus-visible:ring-ring/50 bg-background h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]"
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            )}
        </Field>
    )
}

export function ColorField({
    label,
    value,
    onChange,
}: {
    label: string
    value: string
    onChange: (v: string) => void
}) {
    return (
        <Field label={label} hint={value.toUpperCase()}>
            {(id) => (
                <input
                    id={id}
                    type="color"
                    value={value.length === 7 ? value : '#000000'}
                    onChange={(e) => onChange(e.target.value)}
                    className="border-input h-9 w-full cursor-pointer rounded-md border bg-transparent p-1"
                />
            )}
        </Field>
    )
}

export function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <label className="flex cursor-pointer items-center gap-2 text-[13px] select-none">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="accent-foreground size-4"
            />
            {label}
        </label>
    )
}

export function Segmented<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string
    value: T
    options: { value: T; label: React.ReactNode; title?: string }[]
    onChange: (v: T) => void
}) {
    return (
        <div className="space-y-1">
            <div className="text-[13px] font-medium">{label}</div>
            <div
                role="radiogroup"
                aria-label={label}
                className="border-border inline-flex rounded-md border p-0.5"
            >
                {options.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={value === o.value}
                        title={o.title}
                        aria-label={o.title}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            'inline-flex h-7 min-w-8 items-center justify-center gap-1 rounded px-2 text-[13px] transition-colors',
                            value === o.value
                                ? 'bg-foreground text-background'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
