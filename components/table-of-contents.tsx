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
        // Extract headings from markdown content
        const headingRegex = /^(#{1,3})\s+(.+)$/gm
        const extractedHeadings: TOCItem[] = []
        let match

        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length
            const text = match[2]
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

    // Desktop variant - sticky sidebar
    if (variant === 'desktop') {
        return (
            <nav className="sticky top-24">
                <h4 className="mb-4 text-sm font-semibold">On this page</h4>
                <ul className="space-y-2 text-sm">
                    {headings.map((heading) => (
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
                                    activeId === heading.id
                                        ? 'text-primary font-medium'
                                        : 'text-muted-foreground'
                                )}
                            >
                                {heading.text}
                            </button>
                        </li>
                    ))}
                </ul>
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
                <ul className="space-y-2 text-sm">
                    {headings.map((heading) => (
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
                                    activeId === heading.id
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
