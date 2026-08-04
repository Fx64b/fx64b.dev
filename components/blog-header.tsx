import { formatMonthYear } from '@/lib/format'

interface BlogHeaderProps {
    author: string
    title: string
    date: string
    readtime?: string
}

export function BlogHeader({ author, title, date, readtime }: BlogHeaderProps) {
    const meta = [formatMonthYear(date), readtime, author].filter(Boolean)

    return (
        <header className="mb-8">
            <p className="text-muted-foreground mb-2 text-[12.5px]">
                {meta.join(' · ')}
            </p>
            <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-[34px]">
                {title}
            </h1>
        </header>
    )
}
