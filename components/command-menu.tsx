import projectData from '@/data/projectData'
import { getAllTools } from '@/data/toolsData'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { formatMonthYear } from '@/lib/format'
import { getAllPosts } from '@/lib/posts'
import { cn } from '@/lib/utils'

type CommandItem = {
    id: string
    title: string
    /** Muted text shown on the right of the row. */
    hint?: string
    /** Extra text matched against the query but never displayed. */
    keywords?: string
    group: string
    href: string
    external?: boolean
}

interface CommandMenuProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

function projectSlug(title: string) {
    return title.toLowerCase().replace(/\s+/g, '-')
}

function buildItems(): CommandItem[] {
    const navigation: CommandItem[] = [
        { id: 'nav-home', title: 'Home', group: 'Navigation', href: '/' },
        {
            id: 'nav-projects',
            title: 'Projects',
            group: 'Navigation',
            href: '/projects',
        },
        { id: 'nav-blog', title: 'Blog', group: 'Navigation', href: '/blog' },
        {
            id: 'nav-tools',
            title: 'Tools',
            group: 'Navigation',
            href: '/tools',
        },
        {
            id: 'nav-contact',
            title: 'Contact',
            group: 'Navigation',
            href: '/#contact',
        },
    ]

    const projects: CommandItem[] = projectData.map((project) => ({
        id: `project-${projectSlug(project.title)}`,
        title: project.title,
        hint: project.status,
        keywords: project.tags.join(' '),
        group: 'Projects',
        href: project.featured
            ? `/projects/${projectSlug(project.title)}`
            : project.link,
        external: !project.featured,
    }))

    const posts: CommandItem[] = getAllPosts().map((post) => ({
        id: `post-${post.slug}`,
        title: post.title,
        hint: formatMonthYear(post.date),
        keywords: post.description,
        group: 'Writing',
        href: `/blog/${post.slug}`,
    }))

    const tools: CommandItem[] = getAllTools().map((tool) => ({
        id: `tool-${tool.slug}`,
        title: tool.title,
        keywords: `${tool.description} ${tool.tags.join(' ')}`,
        group: 'Tools',
        href: `/tools/${tool.slug}`,
    }))

    return [...navigation, ...projects, ...posts, ...tools]
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const items = useMemo(buildItems, [])

    const results = useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (!needle) {
            return items
        }
        return items.filter((item) =>
            `${item.title} ${item.hint ?? ''} ${item.keywords ?? ''} ${item.group}`
                .toLowerCase()
                .includes(needle)
        )
    }, [items, query])

    useEffect(() => {
        setActiveIndex(0)
    }, [query])

    useEffect(() => {
        if (!open) {
            setQuery('')
            setActiveIndex(0)
            return
        }
        inputRef.current?.focus()
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [open])

    useEffect(() => {
        listRef.current
            ?.querySelector('[data-active="true"]')
            ?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex, results])

    const select = useCallback(
        (item: CommandItem) => {
            onOpenChange(false)
            if (item.external) {
                window.open(item.href, '_blank', 'noopener,noreferrer')
                return
            }
            navigate(item.href)
        },
        [navigate, onOpenChange]
    )

    if (!open) {
        return null
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((index) =>
                results.length ? (index + 1) % results.length : 0
            )
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((index) =>
                results.length
                    ? (index - 1 + results.length) % results.length
                    : 0
            )
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            const item = results[activeIndex]
            if (item) {
                select(item)
            }
        }
    }

    let renderedGroup = ''

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[15vh] sm:pt-[120px]"
            onClick={() => onOpenChange(false)}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Search"
                className="border-border bg-popover w-full max-w-[440px] overflow-hidden rounded-lg border shadow-[0_12px_32px_rgba(0,0,0,.25)]"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={onKeyDown}
            >
                <div className="border-border border-b px-4 py-3.5">
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Type a command or search…"
                        aria-label="Search the site"
                        className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-[13.5px] outline-none"
                    />
                </div>

                <div
                    ref={listRef}
                    role="listbox"
                    aria-label="Results"
                    className="max-h-[min(60vh,360px)] overflow-y-auto p-2"
                >
                    {results.length === 0 && (
                        <p className="text-muted-foreground px-3 py-6 text-center text-[13.5px]">
                            No results found.
                        </p>
                    )}

                    {results.map((item, index) => {
                        const showGroup = item.group !== renderedGroup
                        renderedGroup = item.group
                        const isActive = index === activeIndex

                        return (
                            <div key={item.id}>
                                {showGroup && (
                                    <div
                                        className={cn(
                                            'text-muted-foreground px-3 pb-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase',
                                            index === 0 ? 'pt-1' : 'pt-4'
                                        )}
                                    >
                                        {item.group}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    data-active={isActive}
                                    onMouseMove={() => setActiveIndex(index)}
                                    onClick={() => select(item)}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center justify-between gap-4 rounded-sm px-3 py-2.5 text-left text-[13.5px] transition-colors duration-150 ease-out',
                                        isActive
                                            ? 'bg-muted text-foreground'
                                            : 'text-foreground'
                                    )}
                                >
                                    <span className="truncate">
                                        {item.title}
                                    </span>
                                    {item.hint && (
                                        <span className="text-muted-foreground shrink-0 truncate text-[12px]">
                                            {item.hint}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
