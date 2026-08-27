import type { OscpNodeType, OscpOS, OscpPhase } from '@/types/oscp'

import { OS_LABELS, PHASE_MAP, TYPE_LABELS } from '@/data/oscp'

import { cn } from '@/lib/utils'

/** Phase chip with the phase's accent colour as a leading dot. */
export function PhaseBadge({
    phase,
    className,
}: {
    phase: OscpPhase
    className?: string
}) {
    const meta = PHASE_MAP[phase]
    return (
        <span
            className={cn(
                'border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                className
            )}
        >
            <span
                className="size-2 rounded-full"
                style={{ backgroundColor: meta.color }}
                aria-hidden
            />
            {meta.label}
        </span>
    )
}

const TYPE_CLASS: Record<OscpNodeType, string> = {
    finding: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    technique: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
    state: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
}

/** Node-type chip (finding / technique / state). */
export function TypeBadge({
    type,
    className,
}: {
    type: OscpNodeType
    className?: string
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                TYPE_CLASS[type],
                className
            )}
        >
            {TYPE_LABELS[type]}
        </span>
    )
}

/** OS chip (Linux / Windows / AD / Any). */
export function OsBadge({
    os,
    className,
}: {
    os: OscpOS
    className?: string
}) {
    if (os === 'agnostic') {return null}
    return (
        <span
            className={cn(
                'border-border text-muted-foreground inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                className
            )}
        >
            {OS_LABELS[os]}
        </span>
    )
}
