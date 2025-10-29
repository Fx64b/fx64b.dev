import type { ReactNode } from 'react'

export default function ProjectLayout({ children }: { children: ReactNode }) {
    return (
        <div className="markdown flex min-h-screen flex-col">
            <div className="container grow pb-8 sm:mx-auto sm:px-2">
                {children}
            </div>
        </div>
    )
}
