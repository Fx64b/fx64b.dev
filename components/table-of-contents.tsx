'use client'

import { cn } from '@/lib/utils'

import { ChevronDown, List } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TOCItem {
    id: string
    text: string
    level: number
}

interface TableOfContentsProps {
    content: string
    variant?: 'desktop' | 'mobile'
}

export function TableOfContents({
    content,
    variant = 'desktop',
}: TableOfContentsProps) {
    const [headings, setHeadings] = useState<TOCItem[]>([])
    const [activeId, setActiveId] = useState<string>('')
    const [isExpanded, setIsExpanded] = useState(false)

    useEffect(() => {
        if (!content) {
            setHeadings([])
            return
        }

        const contentWithoutCodeBlocks = content
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`[^`\n]*`/g, '')

        const headingRegex = /^(#{1,3})\s+(.+)$/gm
        const extractedHeadings: TOCItem[] = []
        let match

        while ((match = headingRegex.exec(contentWithoutCodeBlocks)) !== null) {
            const level = match[1].length
            const text = match[2].replace(/\*\*/g, '')
            const id = text
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')

            extractedHeadings.push({ id, text, level })
        }

        setHeadings(extractedHeadings)
    }, [content])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id)
                    }
                })
            },
            { rootMargin: '-100px 0px -70% 0px', threshold: 0 }
        )

        headings.forEach(({ id }) => {
            const element = document.getElementById(id)
            if (element) observer.observe(element)
        })

        return () => {
            headings.forEach(({ id }) => {
                const element = document.getElementById(id)
                if (element) observer.unobserve(element)
            })
        }
    }, [headings])

    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id)
        if (element) {
            const offset = 100
            const bodyRect = document.body.getBoundingClientRect().top
            const elementRect = element.getBoundingClientRect().top
            const offsetPosition = elementRect - bodyRect - offset

            window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
        }
    }

    if (!content || headings.length === 0) return null

    const displayHeadings =
        headings.length >= 10
            ? headings.filter((h) => h.level <= 2)
            : headings

    const getEffectiveActiveId = () => {
        if (displayHeadings.find((h) => h.id === activeId)) return activeId

        const activeIndex = headings.findIndex((h) => h.id === activeId)
        if (activeIndex === -1) return ''

        for (let i = activeIndex; i >= 0; i--) {
            if (displayHeadings.find((h) => h.id === headings[i].id))
                return headings[i].id
        }
        for (let i = activeIndex + 1; i < headings.length; i++) {
            if (displayHeadings.find((h) => h.id === headings[i].id))
                return headings[i].id
        }

        return ''
    }

    const effectiveActiveId = getEffectiveActiveId()

    if (variant === 'desktop') {
        return (
            <nav className="sticky top-24">
                <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
                    On this page
                </p>
                <ul className="space-y-0.5">
                    {displayHeadings.map((heading) => (
                        <li
                            key={heading.id}
                            style={{
                                paddingLeft: `${(heading.level - 1) * 12}px`,
                            }}
                        >
                            <button
                                onClick={() => scrollToHeading(heading.id)}
                                className={cn(
                                    'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                                    effectiveActiveId === heading.id
                                        ? 'text-foreground font-medium'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <span className="block truncate">
                                    {heading.text}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        )
    }

    return (
        <div className="mb-8">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="border-border hover:bg-muted/50 flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors"
            >
                <div className="flex items-center gap-2">
                    <List className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="font-medium">On this page</span>
                </div>
                <ChevronDown
                    className={cn(
                        'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                    )}
                />
            </button>

            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'
                )}
            >
                <ul className="border-border mt-1 space-y-0.5 overflow-y-auto rounded-md border p-1">
                    {displayHeadings.map((heading) => (
                        <li
                            key={heading.id}
                            style={{
                                paddingLeft: `${(heading.level - 1) * 12}px`,
                            }}
                        >
                            <button
                                onClick={() => {
                                    scrollToHeading(heading.id)
                                    setIsExpanded(false)
                                }}
                                className={cn(
                                    'w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
                                    effectiveActiveId === heading.id
                                        ? 'bg-muted text-foreground font-medium'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                )}
                            >
                                <span className="block truncate">
                                    {heading.text}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
