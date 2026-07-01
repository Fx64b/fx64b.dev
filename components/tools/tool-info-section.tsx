import type React from 'react'

import { cn } from '@/lib/utils'

interface ToolInfoSectionProps {
    title: string
    columns?: 2 | 3
    className?: string
    children: React.ReactNode
}

const columnClasses: Record<2 | 3, string> = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
}

export function ToolInfoSection({
    title,
    columns = 2,
    className,
    children,
}: ToolInfoSectionProps) {
    return (
        <div className={cn('mb-8', className)}>
            <h2 className="mb-4 text-xl font-semibold">{title}</h2>
            <div className={cn('grid gap-4', columnClasses[columns])}>
                {children}
            </div>
        </div>
    )
}
