'use client'

import { cn } from '@/lib/utils'

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

        // Remove code blocks first to avoid matching comments inside them
        const contentWithoutCodeBlocks = content
            .replace(/```[\s\S]*?```/g, '') // Remove fenced code blocks
            .replace(/`[^`\n]*`/g, '') // Remove inline code

        // Extract headings from the cleaned content
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
                .replace(/\*\*/g, '')

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
            {
                rootMargin: '-100px 0px -70% 0px',
                threshold: 0,
            }
        )

        // Observe all heading elements
        headings.forEach(({ id }) => {
            const element = document.getElementById(id)
            if (element) {
                observer.observe(element)
            }
        })

        return () => {
            headings.forEach(({ id }) => {
                const element = document.getElementById(id)
                if (element) {
                    observer.unobserve(element)
                }
            })
        }
    }, [headings])

    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id)
        if (element) {
            const offset = 100
            const bodyRect = document.body.getBoundingClientRect().top
            const elementRect = element.getBoundingClientRect().top
            const elementPosition = elementRect - bodyRect
            const offsetPosition = elementPosition - offset

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth',
            })
        }
    }

    if (!content || headings.length === 0) {
        return null
    }

    // Filter headings if there are too many
    const displayHeadings =
        headings.length >= 10
            ? headings.filter((heading) => heading.level <= 2) // Only show H1 and H2 for large TOCs
            : headings

    const getEffectiveActiveId = () => {
        if (displayHeadings.find((h) => h.id === activeId)) {
            return activeId
        }

        const activeIndex = headings.findIndex((h) => h.id === activeId)
        if (activeIndex === -1) {
            return ''
        }

        for (let i = activeIndex; i >= 0; i--) {
            const heading = headings[i]
            if (displayHeadings.find((h) => h.id === heading.id)) {
                return heading.id
            }
        }

        for (let i = activeIndex + 1; i < headings.length; i++) {
            const heading = headings[i]
            if (displayHeadings.find((h) => h.id === heading.id)) {
                return heading.id
            }
        }

        return ''
    }

    const effectiveActiveId = getEffectiveActiveId()

    // Desktop variant - sticky sidebar
    if (variant === 'desktop') {
        return (
            <nav className="sticky top-24">
                <h4 className="text-foreground mb-4 text-sm font-semibold">
                    On this page
                </h4>
                <div className="relative">
                    <div className="border-border/50 bg-muted/20 relative max-h-[calc(100vh-200px)] overflow-hidden rounded-md border">
                        <ul className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent max-h-[calc(100vh-240px)] space-y-1 overflow-y-auto p-3 text-sm">
                            {displayHeadings.map((heading) => (
                                <li
                                    key={heading.id}
                                    style={{
                                        paddingLeft: `${(heading.level - 1) * 12}px`,
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            scrollToHeading(heading.id)
                                        }
                                        className={cn(
                                            'hover:text-primary hover:bg-muted/50 w-full rounded-sm px-2 py-1.5 text-left transition-all duration-200',
                                            effectiveActiveId === heading.id
                                                ? 'text-primary bg-primary/10 border-primary border-l-2 font-medium'
                                                : 'text-muted-foreground'
                                        )}
                                    >
                                        <span className="block truncate">
                                            {heading.text}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="from-muted/20 pointer-events-none absolute top-0 right-0 left-0 h-6 bg-gradient-to-b to-transparent" />
                        <div className="from-muted/20 pointer-events-none absolute right-0 bottom-0 left-0 h-6 bg-gradient-to-t to-transparent" />
                    </div>
                </div>
            </nav>
        )
    }

    // Mobile variant - simple list
    return (
        <div className="mb-8">
            {/* Collapsible header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="border-border bg-muted/30 hover:bg-muted/50 flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors"
            >
                <div className="flex items-center gap-2">
                    <svg
                        className="text-muted-foreground h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                    <span className="text-sm font-medium">
                        Table of Contents
                    </span>
                    <span className="text-muted-foreground text-xs">
                        ({displayHeadings.length} sections)
                    </span>
                </div>
                <svg
                    className={cn(
                        'text-muted-foreground h-4 w-4 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {/* Expandable content */}
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded
                        ? 'max-h-[70vh] opacity-100'
                        : 'max-h-0 opacity-0'
                )}
            >
                <div className="border-border bg-muted/10 mt-2 rounded-r-lg border-l-2 px-4 py-3">
                    <ul className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent max-h-[60vh] space-y-2 overflow-y-auto pr-2 text-sm">
                        {displayHeadings.map((heading, index) => (
                            <li
                                key={heading.id}
                                className="relative"
                                style={{
                                    paddingLeft: `${(heading.level - 1) * 12}px`,
                                }}
                            >
                                {/* Active indicator */}
                                <button
                                    onClick={() => {
                                        scrollToHeading(heading.id)
                                        setIsExpanded(false) // Auto-collapse after selection
                                    }}
                                    className={cn(
                                        'hover:text-primary hover:bg-muted/50 w-full rounded-md px-2 py-1 text-left transition-all duration-200',
                                        effectiveActiveId === heading.id
                                            ? 'text-primary bg-primary/10 font-medium'
                                            : 'text-muted-foreground'
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
        </div>
    )
}
