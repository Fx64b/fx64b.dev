import { ChevronRight, Compass, RotateCcw, Search as SearchIcon } from 'lucide-react'
import { ClientOnly } from 'vite-react-ssg'

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { entryPointNodes, getNode, outgoingEdges } from '@/data/oscp'

import { cn } from '@/lib/utils'
import {
    type OscpFilters,
    decodePath,
    emptyFilters,
    encodePath,
    filterNodes,
    neighborhood,
    pathSubgraph,
} from '@/lib/oscp-graph'

import { FilterBar } from '@/components/oscp/FilterBar'
import { NodeDetail } from '@/components/oscp/NodeDetail'
import { ResultList } from '@/components/oscp/ResultList'
import { PhaseBadge } from '@/components/oscp/badges'
import { Seo } from '@/components/seo'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

// Loaded lazily so React Flow (@xyflow/react) never enters the SSR/SSG bundle.
const GraphCanvas = lazy(() => import('@/components/oscp/GraphCanvas'))

type Mode = 'explore' | 'guided'

const description =
    'An interactive OSCP cheat sheet: search what you found, then follow the graph from finding to technique to the next step. Enumeration through Active Directory - 94 nodes, fully offline in your browser.'

function GraphSkeleton() {
    return (
        <div className="text-muted-foreground flex h-full items-center justify-center text-[13px]">
            Loading graph...
        </div>
    )
}

export default function OscpCheatsheet() {
    const [params, setParams] = useSearchParams()

    const [mode, setMode] = useState<Mode>(
        params.get('path') ? 'guided' : 'explore'
    )
    const [filters, setFilters] = useState<OscpFilters>(emptyFilters())
    const [selectedId, setSelectedId] = useState<string | null>(
        params.get('node')
    )
    const [path, setPath] = useState<string[]>(decodePath(params.get('path')))

    // Keep the URL in sync so a specific node or chain is shareable.
    useEffect(() => {
        const next = new URLSearchParams()
        if (mode === 'guided') {
            if (path.length) {next.set('path', encodePath(path))}
        } else if (selectedId) {
            next.set('node', selectedId)
        }
        setParams(next, { replace: true })
         
    }, [mode, selectedId, path])

    const results = useMemo(() => filterNodes(filters), [filters])

    const guidedCurrent = path[path.length - 1] ?? null
    const detailId = mode === 'guided' ? guidedCurrent : selectedId

    // Which nodes the graph shows.
    const visible = useMemo(() => {
        if (mode === 'guided') {
            return path.length ? pathSubgraph(path) : new Set<string>()
        }
        if (selectedId) {return neighborhood(selectedId)}
        return new Set(results.map((n) => n.id))
    }, [mode, path, selectedId, results])

    const pathSet = useMemo(() => new Set(path), [path])

    const startGuided = useCallback((id: string) => {
        setMode('guided')
        setPath([id])
    }, [])

    const step = useCallback((id: string) => {
        setPath((p) => (p.includes(id) ? p.slice(0, p.indexOf(id) + 1) : [...p, id]))
    }, [])

    const onGraphSelect = useCallback(
        (id: string) => {
            if (mode === 'guided') {step(id)}
            else {setSelectedId(id)}
        },
        [mode, step]
    )

    return (
        <>
            <Seo
                title="Interactive OSCP Cheat Sheet - Fx64b.dev"
                description={description}
                path="/cheatsheet"
            />

            <main className="mx-auto w-full max-w-[1400px] px-4 pt-10 pb-20 sm:px-6">
                <header className="mb-6">
                    <h1 className="text-[28px] font-extrabold tracking-[-0.02em] sm:text-[34px]">
                        Interactive OSCP Cheat Sheet
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-[640px] text-[14.5px] leading-[1.7]">
                        Start from what you found on the box, then follow the
                        graph to the next thing to try. Every node carries the
                        commands. Nothing is sent anywhere - it all runs in your
                        browser.
                    </p>
                </header>

                <div className="mb-5 flex flex-wrap items-center gap-2">
                    <div className="border-border inline-flex rounded-md border p-0.5">
                        <ModeButton
                            active={mode === 'explore'}
                            onClick={() => setMode('explore')}
                            icon={<SearchIcon className="size-3.5" />}
                            label="Explore"
                        />
                        <ModeButton
                            active={mode === 'guided'}
                            onClick={() => setMode('guided')}
                            icon={<Compass className="size-3.5" />}
                            label="Guided"
                        />
                    </div>
                    {mode === 'guided' && path.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPath([])}
                        >
                            <RotateCcw /> Start over
                        </Button>
                    )}
                </div>

                <div className="grid min-w-0 gap-5 lg:grid-cols-[340px_1fr]">
                    {/* Left rail */}
                    <div className="border-border bg-card/40 flex min-w-0 max-h-[50vh] flex-col rounded-lg border p-3 sm:max-h-[420px] lg:max-h-[620px]">
                        {mode === 'explore' ? (
                            <>
                                <FilterBar
                                    filters={filters}
                                    onChange={setFilters}
                                    resultCount={results.length}
                                />
                                <div className="bg-border my-3 h-px" />
                                <ScrollArea className="min-h-0 flex-1 pr-3">
                                    <ResultList
                                        nodes={results}
                                        selectedId={selectedId}
                                        onSelect={setSelectedId}
                                    />
                                </ScrollArea>
                            </>
                        ) : (
                            <GuidedRail
                                path={path}
                                onJump={(i) => setPath(path.slice(0, i + 1))}
                                filters={filters}
                                setFilters={setFilters}
                                results={results}
                                onStart={startGuided}
                            />
                        )}
                    </div>

                    {/* Graph */}
                    <div className="border-border bg-card/40 relative h-[60vh] min-h-[320px] min-w-0 overflow-hidden rounded-lg border sm:h-[460px] lg:h-[620px]">
                        {visible.size > 0 ? (
                            <ClientOnly fallback={<GraphSkeleton />}>
                                {() => (
                                    <Suspense fallback={<GraphSkeleton />}>
                                        <GraphCanvas
                                            visible={visible}
                                            selectedId={detailId}
                                            pathIds={pathSet}
                                            onSelect={onGraphSelect}
                                        />
                                    </Suspense>
                                )}
                            </ClientOnly>
                        ) : (
                            <div className="text-muted-foreground flex h-full items-center justify-center px-6 text-center text-[13.5px]">
                                Pick a starting point on the left to begin the
                                guided walk.
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail */}
                {detailId && (
                    <div className="border-border bg-card/40 mt-5 rounded-lg border p-5 sm:p-6">
                        <NodeDetail
                            nodeId={detailId}
                            onSelect={
                                mode === 'guided' ? step : setSelectedId
                            }
                            onStep={mode === 'guided' ? step : undefined}
                        />
                        {mode === 'explore' && (
                            <div className="border-border mt-6 border-t pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => startGuided(detailId)}
                                >
                                    <Compass /> Walk from here (guided)
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
    )
}

function ModeButton({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-medium transition-colors',
                active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
            )}
        >
            {icon}
            {label}
        </button>
    )
}

function GuidedRail({
    path,
    onJump,
    filters,
    setFilters,
    results,
    onStart,
}: {
    path: string[]
    onJump: (i: number) => void
    filters: OscpFilters
    setFilters: (f: OscpFilters) => void
    results: import('@/types/oscp').OscpNode[]
    onStart: (id: string) => void
}) {
    if (path.length === 0) {
        const suggested = entryPointNodes()
        return (
            <div className="flex min-h-0 flex-1 flex-col">
                <p className="text-muted-foreground mb-3 text-[13px] leading-[1.6]">
                    Pick where you are. Search for what you found, or start from
                    a common entry point below.
                </p>
                <FilterBar
                    filters={filters}
                    onChange={setFilters}
                    resultCount={results.length}
                />
                <div className="bg-border my-3 h-px" />
                <ScrollArea className="min-h-0 flex-1 pr-3">
                    {filters.query || filters.phases.size || filters.os.size || filters.types.size ? (
                        <ResultList
                            nodes={results}
                            selectedId={null}
                            onSelect={onStart}
                        />
                    ) : (
                        <div className="space-y-1">
                            <p className="text-muted-foreground mb-1 px-1 text-[11px] font-semibold uppercase">
                                Entry points
                            </p>
                            <ResultList
                                nodes={suggested}
                                selectedId={null}
                                onSelect={onStart}
                            />
                        </div>
                    )}
                </ScrollArea>
            </div>
        )
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <p className="text-muted-foreground mb-2 px-1 text-[11px] font-semibold uppercase">
                Your path
            </p>
            <ScrollArea className="min-h-0 flex-1 pr-3">
                <ol className="flex w-px min-w-full flex-col gap-1">
                    {path.map((id, i) => {
                        const node = getNode(id)
                        if (!node) {return null}
                        const isLast = i === path.length - 1
                        return (
                            <li key={id}>
                                <button
                                    onClick={() => onJump(i)}
                                    className={cn(
                                        'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                                        isLast
                                            ? 'bg-muted'
                                            : 'hover:bg-muted/60'
                                    )}
                                >
                                    <span className="text-muted-foreground mt-0.5 w-4 shrink-0 text-[11px] tabular-nums">
                                        {i + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[13px] font-medium">
                                            {node.title}
                                        </span>
                                        <PhaseBadge
                                            phase={node.phase}
                                            className="mt-1"
                                        />
                                    </span>
                                    {!isLast && (
                                        <ChevronRight className="text-muted-foreground mt-1 size-3.5 shrink-0" />
                                    )}
                                </button>
                            </li>
                        )
                    })}
                </ol>
                {getNode(path[path.length - 1]) &&
                    outgoingEdges(path[path.length - 1]).length === 0 && (
                        <p className="text-muted-foreground mt-3 px-2 text-[12px] italic">
                            End of the line - this is a terminal state. Jump back
                            up the path to explore another branch.
                        </p>
                    )}
            </ScrollArea>
        </div>
    )
}
