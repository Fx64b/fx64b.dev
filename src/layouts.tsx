import { Outlet } from 'react-router-dom'

function PageLayout() {
    return (
        <div className="flex min-h-screen flex-col">
            <div className="grow">
                <Outlet />
            </div>
        </div>
    )
}

export function BlogLayout() {
    return <PageLayout />
}

export function ProjectsLayout() {
    return <PageLayout />
}

export function ToolsLayout() {
    return <PageLayout />
}
