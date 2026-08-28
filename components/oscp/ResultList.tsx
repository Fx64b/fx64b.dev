import type { OscpNode } from '@/types/oscp'

import { PHASE_MAP } from '@/data/oscp'

import { cn } from '@/lib/utils'

import { TypeBadge } from '@/components/oscp/badges'

interface ResultListProps {
    nodes: OscpNode[]
    selectedId: string | null
    onSelect: (id: string) => void
    /** Optional label for the action, e.g. "Start here". */
    emptyHint?: string
}

export function ResultList({
    nodes,
    selectedId,
    onSelect,
    emptyHint = 'No nodes match. Loosen the filters.',
}: ResultListProps) {
    if (nodes.length === 0) {
        return (
            <p className="text-muted-foreground px-1 py-6 text-center text-[13px]">
                {emptyHint}
            </p>
        )
    }
    return (
        <ul className="flex w-px min-w-full flex-col gap-0.5">
            {nodes.map((n) => {
                const color = PHASE_MAP[n.phase].color
                const selected = n.id === selectedId
                return (
                    <li key={n.id}>
                        <button
                            onClick={() => onSelect(n.id)}
                            className={cn(
                                'flex w-full items-center gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-left transition-colors',
                                selected
                                    ? 'bg-muted'
                                    : 'hover:bg-muted/60 border-l-transparent'
                            )}
                            style={
                                selected
                                    ? { borderLeftColor: color }
                                    : undefined
                            }
                        >
                            <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                                aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-medium">
                                    {n.title}
                                </span>
                                <span className="text-muted-foreground block text-[11.5px]">
                                    {PHASE_MAP[n.phase].label}
                                </span>
                            </span>
                            <TypeBadge type={n.type} className="shrink-0" />
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}
