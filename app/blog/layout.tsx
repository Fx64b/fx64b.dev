import { ReactNode } from 'react'

export default function BlogPostLayout({ children }: { children: ReactNode }) {
    return (
        <div className="blog flex min-h-screen flex-col">
            <article className="container mx-auto flex-grow px-4 pb-8">
                {children}
            </article>
        </div>
    )
}
