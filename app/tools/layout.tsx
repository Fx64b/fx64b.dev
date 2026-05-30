import { ReactNode } from 'react'

export default function ToolsLayout({ children }: { children: ReactNode }) {
    return <div className="min-h-screen pb-16">{children}</div>
}
