import { Outlet } from 'react-router-dom'

// Mirrors app/blog/layout.tsx
export function BlogLayout() {
    return (
        <div className="markdown flex min-h-screen flex-col">
            <article className="container mx-auto grow px-4 pb-8">
                <Outlet />
            </article>
        </div>
    )
}

// Mirrors app/projects/layout.tsx
export function ProjectsLayout() {
    return (
        <div className="markdown flex min-h-screen flex-col">
            <div className="container grow pb-8 sm:mx-auto sm:px-2">
                <Outlet />
            </div>
        </div>
    )
}

// Mirrors app/tools/layout.tsx
export function ToolsLayout() {
    return (
        <div className="min-h-screen pb-10">
            <main className="container mx-auto px-4 py-8">
                <Outlet />
            </main>
        </div>
    )
}
