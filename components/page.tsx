import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface PageProps {
    children: ReactNode
    /** `prose` narrows the column to 640px for long-form reading. */
    width?: 'default' | 'prose'
    className?: string
}

interface PageHeaderProps {
    title: string
    /** Optional lede below the title. */
    children?: ReactNode
    className?: string
}

/** Page title (36px/800) with an optional muted lede. */
export function PageHeader({ title, children, className }: PageHeaderProps) {
    return (
        <div className={cn('mb-10', className)}>
            <h1 className="text-[30px] font-extrabold tracking-[-0.02em] sm:text-[36px]">
                {title}
            </h1>
            {children && (
                <p className="text-muted-foreground mt-3 max-w-[560px] text-[15.5px] leading-[1.7]">
                    {children}
                </p>
            )}
        </div>
    )
}

/** Centered content column shared by every page that is not the homepage. */
export function Page({ children, width = 'default', className }: PageProps) {
    return (
        <main
            className={cn(
                'mx-auto w-full px-5 pt-12 pb-24 sm:px-6 sm:pt-16',
                width === 'prose' ? 'max-w-[640px]' : 'max-w-[720px]',
                className
            )}
        >
            {children}
        </main>
    )
}
