import { ChevronDown } from 'lucide-react'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

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

    // Desktop variant - sticky rail next to the content column
    if (variant === 'desktop') {
        return (
            <nav className="sticky top-24">
                <h2 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.06em] uppercase">
                    On this page
                </h2>
                <ul className="border-border max-h-[calc(100vh-200px)] scrollbar-thin space-y-0.5 overflow-y-auto border-l text-[13px]">
                    {displayHeadings.map((heading) => (
                        <li
                            key={heading.id}
                            style={{
                                paddingLeft: `${(heading.level - 1) * 10}px`,
                            }}
                        >
                            <button
                                onClick={() => scrollToHeading(heading.id)}
                                className={cn(
                                    'hover:text-foreground -ml-px w-full cursor-pointer border-l py-1 pl-3 text-left transition-colors duration-150 ease-out',
                                    effectiveActiveId === heading.id
                                        ? 'border-foreground text-foreground'
                                        : 'text-muted-foreground border-transparent'
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

    // Mobile variant - collapsible list
    return (
        <div className="mb-10">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="border-border hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-sm border px-3 py-2.5 text-left text-[13px] transition-colors duration-150 ease-out"
            >
                <span className="text-muted-foreground">
                    On this page
                    <span className="ml-2 text-[12px]">
                        ({displayHeadings.length})
                    </span>
                </span>
                <ChevronDown
                    className={cn(
                        'text-muted-foreground size-4 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                    )}
                />
            </button>

            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-out',
                    isExpanded
                        ? 'max-h-[60vh] opacity-100'
                        : 'max-h-0 opacity-0'
                )}
            >
                <ul className="border-border mt-2 max-h-[55vh] scrollbar-thin space-y-0.5 overflow-y-auto border-l text-[13px]">
                    {displayHeadings.map((heading) => (
                        <li
                            key={heading.id}
                            style={{
                                paddingLeft: `${(heading.level - 1) * 10}px`,
                            }}
                        >
                            <button
                                onClick={() => {
                                    scrollToHeading(heading.id)
                                    setIsExpanded(false)
                                }}
                                className={cn(
                                    'hover:text-foreground -ml-px w-full cursor-pointer border-l py-1 pl-3 text-left transition-colors duration-150 ease-out',
                                    effectiveActiveId === heading.id
                                        ? 'border-foreground text-foreground'
                                        : 'text-muted-foreground border-transparent'
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
