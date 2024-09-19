import { ReactNode } from 'react'

export default function BlogPostLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <div></div>
            <article className="container mx-auto flex-grow px-4 py-8">
                {children}
            </article>
        </div>
    )
}
