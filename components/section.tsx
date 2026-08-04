import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Reveal } from '@/components/reveal'

interface EyebrowProps {
    children: ReactNode
    /** Optional element aligned to the right of the label. */
    action?: ReactNode
    className?: string
}

/** Uppercase section label - 13px/600, 0.06em tracking. */
export function Eyebrow({ children, action, className }: EyebrowProps) {
    return (
        <div
            className={cn(
                'mb-4 flex items-baseline justify-between gap-4',
                className
            )}
        >
            <h2 className="text-muted-foreground flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.06em] uppercase">
                <span
                    aria-hidden="true"
                    className="bg-brand inline-block h-[2px] w-3 shrink-0 rounded-full"
                />
                {children}
            </h2>
            {action}
        </div>
    )
}

interface SectionProps {
    children: ReactNode
    /** Anchor target, e.g. `work` for `/#work`. */
    id?: string
    /** Uppercase eyebrow above the section content. */
    label?: string
    /** Optional element aligned to the right of the eyebrow. */
    action?: ReactNode
    /** Hairline rule above the section. */
    bordered?: boolean
    className?: string
}

/**
 * One block of the 720px content column: optional top rule, an uppercase
 * eyebrow with an optional right-hand action, and the section body.
 */
export function Section({
    children,
    id,
    label,
    action,
    bordered = false,
    className,
}: SectionProps) {
    return (
        <section
            id={id}
            className={cn(
                'mx-auto w-full max-w-[720px] px-5 pb-14 sm:px-6',
                bordered && 'border-border border-t',
                className
            )}
        >
            <Reveal>
                {label && (
                    <Eyebrow action={action} className="mt-8">
                        {label}
                    </Eyebrow>
                )}
                {children}
            </Reveal>
        </section>
    )
}
