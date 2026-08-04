import Link from '@/components/link'

interface BackLinkProps {
    href: string
    children: React.ReactNode
}

export function BackLink({ href, children }: BackLinkProps) {
    return (
        <Link
            href={href}
            className="text-muted-foreground hover:text-brand focus-visible:ring-ring inline-block rounded-xs text-[13.5px] transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none"
        >
            ← {children}
        </Link>
    )
}
