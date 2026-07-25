import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import Link from '@/components/link'

interface ListRowsProps {
    children: ReactNode
    className?: string
}

/** Vertical stack of rows separated by hairlines. */
export function ListRows({ children, className }: ListRowsProps) {
    return (
        <div className={cn('divide-border flex flex-col divide-y', className)}>
            {children}
        </div>
    )
}

interface ListRowProps {
    href: string
    title: string
    description?: string
    /** Muted text on the right — status, date, category. */
    meta?: ReactNode
    external?: boolean
    /** Blog rows use a slightly larger title and tighter padding. */
    variant?: 'default' | 'compact'
}

export function ListRow({
    href,
    title,
    description,
    meta,
    external = false,
    variant = 'default',
}: ListRowProps) {
    return (
        <Link
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className={cn(
                'group hover:bg-muted focus-visible:ring-ring -mx-3 flex flex-col gap-1 rounded-sm px-3 transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between sm:gap-4',
                variant === 'compact' ? 'py-4' : 'py-[18px]'
            )}
        >
            <span className="min-w-0">
                <span
                    className={cn(
                        'text-foreground block',
                        variant === 'compact'
                            ? 'text-[15px] font-semibold'
                            : 'text-[16px] font-bold'
                    )}
                >
                    {title}
                </span>
                {description && (
                    <span className="text-muted-foreground mt-0.5 block text-[13px] leading-relaxed">
                        {description}
                    </span>
                )}
            </span>
            {meta && (
                <span className="text-muted-foreground shrink-0 text-[12.5px] sm:whitespace-nowrap">
                    {meta}
                </span>
            )}
        </Link>
    )
}
