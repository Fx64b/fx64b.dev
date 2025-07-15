'use client'

import { cn } from '@/lib/utils'

import { useEffect, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'

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

    useEffect(() => {
        // Remove code blocks first to avoid matching comments inside them
        const contentWithoutCodeBlocks = content
            .replace(/```[\s\S]*?```/g, '') // Remove fenced code blocks
            .replace(/`[^`\n]*`/g, '') // Remove inline code

        console.log('Content without code blocks:', contentWithoutCodeBlocks)

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

    if (headings.length === 0) {
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
                <h4 className="mb-4 text-sm font-semibold">On this page</h4>
                <div className="relative">
                    <ul className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent max-h-[calc(100vh-200px)] space-y-2 overflow-y-auto pr-2 text-sm">
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
                                        'hover:text-primary w-full text-left transition-colors duration-200',
                                        effectiveActiveId === heading.id
                                            ? 'text-primary font-medium'
                                            : 'text-muted-foreground'
                                    )}
                                >
                                    {heading.text}
                                </button>
                            </li>
                        ))}
                    </ul>
                    {/* Fade effect for scrollable content */}
                    {displayHeadings.length > 8 && (
                        <>
                            <div className="from-background pointer-events-none absolute top-[-2] right-0 left-0 h-4 bg-gradient-to-b to-transparent" />
                            <div className="from-background pointer-events-none absolute right-0 bottom-[-2] left-0 h-4 bg-gradient-to-t to-transparent" />
                        </>
                    )}
                </div>
            </nav>
        )
    }

    // Mobile variant - simple list
    return (
        <Card className="mb-8">
            <CardContent className="p-6">
                <h4 className="mb-4 text-sm font-semibold">
                    Table of Contents
                </h4>

                <ul className="max-h-64 space-y-2 overflow-y-auto pr-2 text-sm">
                    {displayHeadings.map((heading) => (
                        <li
                            key={heading.id}
                            style={{
                                paddingLeft: `${(heading.level - 1) * 16}px`,
                            }}
                        >
                            <button
                                onClick={() => scrollToHeading(heading.id)}
                                className={cn(
                                    'hover:text-primary w-full text-left transition-colors duration-200',
                                    effectiveActiveId === heading.id
                                        ? 'text-primary font-medium'
                                        : 'text-muted-foreground'
                                )}
                            >
                                {heading.text}
                            </button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
