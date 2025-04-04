import { ReactNode } from 'react'

export default function ToolsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen pb-10">
            <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
    )
}
