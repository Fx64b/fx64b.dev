import { cn } from '@/lib/utils'

import Link from '@/components/link'

interface PillProps {
    children: React.ReactNode
    /** `sm` is the 12px tag pill, `md` the 12.5px skill pill. */
    size?: 'sm' | 'md'
    className?: string
}

const pillClasses =
    'border-border text-muted-foreground inline-flex items-center rounded-full border'

/** Bordered, capsule-shaped tag. */
export function Pill({ children, size = 'md', className }: PillProps) {
    return (
        <span
            className={cn(
                pillClasses,
                size === 'sm'
                    ? 'px-[9px] py-1 text-[12px]'
                    : 'px-2.5 py-[5px] text-[12.5px]',
                className
            )}
        >
            {children}
        </span>
    )
}

interface PillLinkProps {
    href: string
    children: React.ReactNode
    external?: boolean
    className?: string
}

/** Bordered link chip used by the contact row (7px radius, 13.5px). */
export function PillLink({
    href,
    children,
    external = false,
    className,
}: PillLinkProps) {
    return (
        <Link
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className={cn(
                'border-border text-foreground hover:bg-muted focus-visible:ring-ring inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[13.5px] transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none',
                className
            )}
        >
            {children}
        </Link>
    )
}
