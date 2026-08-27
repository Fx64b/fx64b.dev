import { Search, X } from 'lucide-react'

import type { OscpNodeType, OscpOS } from '@/types/oscp'

import { PHASES } from '@/data/oscp'

import { cn } from '@/lib/utils'
import type { OscpFilters } from '@/lib/oscp-graph'

import { Input } from '@/components/ui/input'

const OS_OPTS: { id: OscpOS; label: string }[] = [
    { id: 'linux', label: 'Linux' },
    { id: 'windows', label: 'Windows' },
    { id: 'ad', label: 'AD' },
    { id: 'agnostic', label: 'Any' },
]

const TYPE_OPTS: { id: OscpNodeType; label: string }[] = [
    { id: 'finding', label: 'Finding' },
    { id: 'technique', label: 'Technique' },
    { id: 'state', label: 'State' },
]

function toggle<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set)
    if (next.has(value)) {next.delete(value)}
    else {next.add(value)}
    return next
}

interface FilterBarProps {
    filters: OscpFilters
    onChange: (f: OscpFilters) => void
    resultCount: number
}

export function FilterBar({ filters, onChange, resultCount }: FilterBarProps) {
    const anyFacet =
        filters.phases.size || filters.os.size || filters.types.size
    const active = anyFacet || filters.query

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    value={filters.query}
                    onChange={(e) =>
                        onChange({ ...filters, query: e.target.value })
                    }
                    placeholder="Search findings, techniques, commands..."
                    className="pl-9"
                    aria-label="Search the cheat sheet"
                />
            </div>

            <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                    {PHASES.map((p) => {
                        const on = filters.phases.has(p.id)
                        return (
                            <button
                                key={p.id}
                                onClick={() =>
                                    onChange({
                                        ...filters,
                                        phases: toggle(filters.phases, p.id),
                                    })
                                }
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                                    on
                                        ? 'border-transparent text-white'
                                        : 'border-border text-muted-foreground hover:bg-muted'
                                )}
                                style={
                                    on ? { backgroundColor: p.color } : undefined
                                }
                            >
                                <span
                                    className="size-1.5 rounded-full"
                                    style={{
                                        backgroundColor: on
                                            ? 'rgba(255,255,255,0.9)'
                                            : p.color,
                                    }}
                                />
                                {p.label}
                            </button>
                        )
                    })}
                </div>

                <div className="flex flex-wrap gap-1">
                    {OS_OPTS.map((o) => (
                        <FacetChip
                            key={o.id}
                            label={o.label}
                            on={filters.os.has(o.id)}
                            onClick={() =>
                                onChange({
                                    ...filters,
                                    os: toggle(filters.os, o.id),
                                })
                            }
                        />
                    ))}
                    <span className="text-border mx-0.5 self-center">|</span>
                    {TYPE_OPTS.map((t) => (
                        <FacetChip
                            key={t.id}
                            label={t.label}
                            on={filters.types.has(t.id)}
                            onClick={() =>
                                onChange({
                                    ...filters,
                                    types: toggle(filters.types, t.id),
                                })
                            }
                        />
                    ))}
                </div>
            </div>

            <div className="text-muted-foreground flex items-center justify-between text-[12px]">
                <span>{resultCount} nodes</span>
                {active && (
                    <button
                        onClick={() =>
                            onChange({
                                phases: new Set(),
                                os: new Set(),
                                types: new Set(),
                                query: '',
                            })
                        }
                        className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                    >
                        <X className="size-3" /> Clear
                    </button>
                )}
            </div>
        </div>
    )
}

function FacetChip({
    label,
    on,
    onClick,
}: {
    label: string
    on: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                on
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted'
            )}
        >
            {label}
        </button>
    )
}
