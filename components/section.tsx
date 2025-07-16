import type { ReactNode } from 'react'

interface SectionProps {
    children: ReactNode
    className?: string
    id?: string
}

export function Section({ children, className = '', id }: SectionProps) {
    return (
        <section id={id} className={`py-16 md:py-24 ${className}`}>
            <div className="container mx-auto max-w-6xl px-6">{children}</div>
        </section>
    )
}
