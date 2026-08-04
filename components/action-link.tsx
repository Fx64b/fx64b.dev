import { cn } from '@/lib/utils'

import Link from '@/components/link'

interface ActionLinkProps {
    href: string
    children: React.ReactNode
    /** `primary` is the inverted fill, `secondary` the bordered variant. */
    variant?: 'primary' | 'secondary'
    external?: boolean
    className?: string
}

/** Button-styled link: 14px/600, 9px 18px padding, 7px radius. */
export function ActionLink({
    href,
    children,
    variant = 'primary',
    external = false,
    className,
}: ActionLinkProps) {
    return (
        <Link
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className={cn(
                'focus-visible:ring-ring inline-flex items-center gap-2 rounded-md px-[18px] py-[9px] text-[14px] font-semibold transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none',
                variant === 'primary'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border-border text-foreground hover:bg-muted border',
                className
            )}
        >
            {children}
        </Link>
    )
}
