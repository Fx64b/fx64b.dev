'use client'

import { scoreTools } from '@/data/toolsData'
import { cn } from '@/lib/utils'
import type { Tool, ToolCategory } from '@/types/tool'
import {
    ArrowLeftRight,
    ArrowRight,
    Lock,
    Search,
    Shield,
    Sparkles,
    Text,
    Wrench,
    X,
    Zap,
} from 'lucide-react'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const CATEGORY_META: Record<
    ToolCategory,
    { label: string; icon: typeof Wrench }
> = {
    conversion: { label: 'Conversion', icon: ArrowLeftRight },
    encoding: { label: 'Encoding & Hashing', icon: Lock },
    formatting: { label: 'Formatting', icon: Text },
    generators: { label: 'Generators', icon: Zap },
    utilities: { label: 'Utilities', icon: Wrench },
    security: { label: 'Security & CTF', icon: Shield },
}

const CATEGORY_ORDER: ToolCategory[] = [
    'conversion',
    'encoding',
    'formatting',
    'generators',
    'utilities',
    'security',
]

interface ToolsExplorerProps {
    tools: Tool[]
    popularTools: Tool[]
    allTags: string[]
    initialQuery?: string
    initialTags?: string[]
    initialCategory?: ToolCategory | 'all'
}

export default function ToolsExplorer({
    tools,
    popularTools,
    allTags,
    initialQuery = '',
    initialTags = [],
    initialCategory = 'all',
}: ToolsExplorerProps) {
    const router = useRouter()
    const pathname = usePathname()

    const [query, setQuery] = useState(initialQuery)
    const [selectedTags, setSelectedTags] = useState<string[]>(initialTags)
    const [category, setCategory] = useState<ToolCategory | 'all'>(
        initialCategory
    )

    const hasFilters =
        query.trim() !== '' || selectedTags.length > 0 || category !== 'all'

    // Keep the URL in sync so searches are shareable and individually indexable.
    useEffect(() => {
        const params = new URLSearchParams()
        if (query.trim()) params.set('q', query.trim())
        if (selectedTags.length) params.set('tags', selectedTags.join(','))
        if (category !== 'all') params.set('category', category)
        const qs = params.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, [query, selectedTags, category, pathname, router])

    const toggleTag = useCallback((tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        )
    }, [])

    const clearFilters = useCallback(() => {
        setQuery('')
        setSelectedTags([])
        setCategory('all')
    }, [])

    const filtered = useMemo(() => {
        let result = query.trim() ? scoreTools(query).map((s) => s.tool) : tools

        if (category !== 'all') {
            result = result.filter((t) => t.category === category)
        }
        if (selectedTags.length) {
            result = result.filter((t) =>
                selectedTags.every((tag) => t.tags.includes(tag))
            )
        }
        return result
    }, [query, category, selectedTags, tools])

    const groupedByCategory = useMemo(() => {
        return CATEGORY_ORDER.map((key) => ({
            key,
            tools: filtered.filter((t) => t.category === key),
        })).filter((group) => group.tools.length > 0)
    }, [filtered])

    return (
        <div>
            {/* Search + filter controls */}
            <div className="mb-8 space-y-4">
                <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search tools by name, tag, or keyword…"
                        aria-label="Search tools"
                        className="h-11 pl-9"
                    />
                </div>

                {/* Category filter */}
                <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Filter by category"
                >
                    <FilterChip
                        active={category === 'all'}
                        onClick={() => setCategory('all')}
                        label="All"
                    />
                    {CATEGORY_ORDER.map((key) => (
                        <FilterChip
                            key={key}
                            active={category === key}
                            onClick={() =>
                                setCategory((c) => (c === key ? 'all' : key))
                            }
                            label={CATEGORY_META[key].label}
                        />
                    ))}
                </div>

                {/* Tag filter */}
                <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Filter by tag"
                >
                    {allTags.map((tag) => {
                        const active = selectedTags.includes(tag)
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                aria-pressed={active}
                                className={cn(
                                    'rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
                                    active
                                        ? 'bg-primary text-primary-foreground border-transparent'
                                        : 'text-muted-foreground hover:text-foreground border-border'
                                )}
                            >
                                {tag}
                            </button>
                        )
                    })}
                </div>

                {hasFilters && (
                    <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                            {filtered.length}{' '}
                            {filtered.length === 1 ? 'result' : 'results'}
                        </span>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Popular section — only when browsing without filters */}
            {!hasFilters && popularTools.length > 0 && (
                <div className="mb-12">
                    <div className="mb-5 flex items-center gap-2.5">
                        <Sparkles className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="text-muted-foreground shrink-0 text-xs font-medium tracking-wider uppercase">
                            Popular
                        </span>
                        <div className="bg-border h-px flex-1" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {popularTools.map((tool) => (
                            <ToolCard
                                key={tool.slug}
                                tool={tool}
                                onTagClick={toggleTag}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <p className="text-muted-foreground text-sm">
                        No tools match your search.
                    </p>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="text-primary mt-2 text-sm hover:underline"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <div className="space-y-12">
                    {groupedByCategory.map((group) => {
                        const { label, icon: Icon } = CATEGORY_META[group.key]
                        return (
                            <div key={group.key}>
                                <div className="mb-5 flex items-center gap-2.5">
                                    <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                    <span className="text-muted-foreground shrink-0 text-xs font-medium tracking-wider uppercase">
                                        {label}
                                    </span>
                                    <div className="bg-border h-px flex-1" />
                                    <Badge
                                        variant="secondary"
                                        className="shrink-0 text-xs"
                                    >
                                        {group.tools.length}
                                    </Badge>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                    {group.tools.map((tool) => (
                                        <ToolCard
                                            key={tool.slug}
                                            tool={tool}
                                            onTagClick={toggleTag}
                                            activeTags={selectedTags}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function FilterChip({
    active,
    onClick,
    label,
}: {
    active: boolean
    onClick: () => void
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                    ? 'bg-foreground text-background border-transparent'
                    : 'text-muted-foreground hover:text-foreground border-border'
            )}
        >
            {label}
        </button>
    )
}

function ToolCard({
    tool,
    onTagClick,
    activeTags = [],
}: {
    tool: Tool
    onTagClick?: (tag: string) => void
    activeTags?: string[]
}) {
    return (
        <Card className="hover:bg-card group h-full transition-colors">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                    <Link
                        href={`/tools/${tool.slug}`}
                        className="font-medium hover:underline"
                    >
                        {tool.title}
                    </Link>
                    <ArrowRight className="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
            </CardHeader>
            <CardContent>
                <Link href={`/tools/${tool.slug}`} className="block">
                    <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                        {tool.description}
                    </p>
                </Link>
                <div className="flex flex-wrap gap-1.5">
                    {tool.tags.map((tag) => {
                        const active = activeTags.includes(tag)
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => onTagClick?.(tag)}
                                aria-label={`Filter by ${tag}`}
                                className={cn(
                                    'rounded-md border px-2 py-0.5 text-xs transition-colors',
                                    active
                                        ? 'bg-primary text-primary-foreground border-transparent'
                                        : 'text-muted-foreground hover:text-foreground border-border'
                                )}
                            >
                                {tag}
                            </button>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
