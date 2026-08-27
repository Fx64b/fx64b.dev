import { ArrowRight, CornerDownRight, ExternalLink } from 'lucide-react'

import {
    getNode,
    incomingEdges,
    outgoingEdges,
} from '@/data/oscp'

import { cn } from '@/lib/utils'

import { OsBadge, PhaseBadge, TypeBadge } from '@/components/oscp/badges'
import { CopyBlock } from '@/components/oscp/CopyBlock'

interface NodeDetailProps {
    nodeId: string
    /** Jump the selection to another node (used by the neighbour chips). */
    onSelect: (id: string) => void
    /** In guided mode, append a next step to the path. */
    onStep?: (id: string) => void
    className?: string
}

export function NodeDetail({
    nodeId,
    onSelect,
    onStep,
    className,
}: NodeDetailProps) {
    const node = getNode(nodeId)
    if (!node) {return null}

    const outs = outgoingEdges(node.id)
    const ins = incomingEdges(node.id)

    return (
        <div className={cn('space-y-6', className)}>
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    <PhaseBadge phase={node.phase} />
                    <TypeBadge type={node.type} />
                    <OsBadge os={node.os} />
                </div>
                <h2 className="text-[22px] font-bold tracking-[-0.01em]">
                    {node.title}
                </h2>
                <p className="text-muted-foreground text-[14.5px] leading-[1.7]">
                    {node.description}
                </p>
            </div>

            {node.commands && node.commands.length > 0 && (
                <div className="space-y-4">
                    {node.commands.map((c, i) => (
                        <CopyBlock
                            key={i}
                            code={c.code}
                            label={c.label}
                            note={c.note}
                        />
                    ))}
                </div>
            )}

            {ins.length > 0 && (
                <div className="space-y-2">
                    <p className="text-muted-foreground text-[12px] font-semibold tracking-wide uppercase">
                        Reached from
                    </p>
                    <div className="flex flex-col gap-1">
                        {ins.map((e) => {
                            const src = getNode(e.from)
                            if (!src) {return null}
                            return (
                                <button
                                    key={e.from + e.to}
                                    onClick={() => onSelect(e.from)}
                                    className="group hover:bg-muted flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                                >
                                    <CornerDownRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                                    <span className="text-[13px]">
                                        <span className="font-medium">
                                            {src.title}
                                        </span>
                                        {e.label && (
                                            <span className="text-muted-foreground">
                                                {' '}
                                                - {e.label}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {outs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-muted-foreground text-[12px] font-semibold tracking-wide uppercase">
                        Next steps
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {outs.map((e) => {
                            const dst = getNode(e.to)
                            if (!dst) {return null}
                            return (
                                <button
                                    key={e.from + e.to}
                                    onClick={() =>
                                        onStep ? onStep(e.to) : onSelect(e.to)
                                    }
                                    className="group border-border hover:border-ring hover:bg-muted flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors"
                                >
                                    <ArrowRight className="text-muted-foreground group-hover:text-ring size-4 shrink-0 transition-colors" />
                                    <span className="min-w-0">
                                        <span className="block text-[13.5px] font-medium">
                                            {dst.title}
                                        </span>
                                        {e.label && (
                                            <span className="text-muted-foreground block text-[12px]">
                                                {e.label}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {node.references && node.references.length > 0 && (
                <div className="space-y-2">
                    <p className="text-muted-foreground text-[12px] font-semibold tracking-wide uppercase">
                        References
                    </p>
                    <div className="flex flex-col gap-1">
                        {node.references.map((r) => (
                            <a
                                key={r.url}
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ring inline-flex items-center gap-1.5 text-[13px] hover:underline"
                            >
                                <ExternalLink className="size-3.5" />
                                {r.label}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
