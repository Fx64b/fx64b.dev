import { ReactNode } from 'react'

export default function BlogPostLayout({ children }: { children: ReactNode }) {
    return (
        <div className="markdown flex min-h-screen flex-col">
            <article className="container mx-auto grow px-4 pb-8">
                {children}
            </article>
        </div>
    )
}
