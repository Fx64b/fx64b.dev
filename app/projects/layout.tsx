import type { ReactNode } from 'react'

export default function ProjectLayout({ children }: { children: ReactNode }) {
    return (
        <div className="projects flex min-h-screen flex-col">
            <div className="container mx-auto grow px-4 pb-8">{children}</div>
        </div>
    )
}
