import type { OscpNode, OscpNodeType, OscpOS, OscpPhase } from '@/types/oscp'

import {
    PHASES,
    edges,
    incomingEdges,
    nodeById,
    nodes,
    outgoingEdges,
} from '@/data/oscp'

export interface OscpFilters {
    phases: Set<OscpPhase>
    os: Set<OscpOS>
    types: Set<OscpNodeType>
    query: string
}

export function emptyFilters(): OscpFilters {
    return { phases: new Set(), os: new Set(), types: new Set(), query: '' }
}

function matchesText(node: OscpNode, q: string): boolean {
    if (!q) {return true}
    const hay = (
        node.title +
        ' ' +
        node.description +
        ' ' +
        node.id +
        ' ' +
        (node.tags?.join(' ') ?? '')
    ).toLowerCase()
    // Every whitespace-separated term must appear somewhere (AND search).
    return q
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => hay.includes(term))
}

/** Apply the active search + facet filters to the full node list. */
export function filterNodes(f: OscpFilters): OscpNode[] {
    return nodes.filter((n) => {
        if (f.phases.size && !f.phases.has(n.phase)) {return false}
        if (f.os.size && !f.os.has(n.os)) {return false}
        if (f.types.size && !f.types.has(n.type)) {return false}
        return matchesText(n, f.query)
    })
}

/** The selected node plus its direct predecessors and successors. */
export function neighborhood(id: string): Set<string> {
    const set = new Set<string>([id])
    for (const e of outgoingEdges(id)) {set.add(e.to)}
    for (const e of incomingEdges(id)) {set.add(e.from)}
    return set
}

/** Nodes to draw for a guided path: the path itself plus the next options. */
export function pathSubgraph(path: string[]): Set<string> {
    const set = new Set<string>(path)
    const last = path[path.length - 1]
    if (last) {for (const e of outgoingEdges(last)) {set.add(e.to)}}
    return set
}

const COL_W = 300
const ROW_H = 118
const ROW_GAP = 26

export interface Positioned {
    id: string
    x: number
    y: number
}

/**
 * Lay the given node ids out as left-to-right columns ordered by phase, so the
 * graph reads as the kill chain. Columns are compacted to only the phases that
 * are actually present, and nodes stack vertically within their column.
 */
export function layoutByPhase(ids: Set<string>): Positioned[] {
    const present = PHASES.filter((p) =>
        [...ids].some((id) => nodeById.get(id)?.phase === p.id)
    )
    const colIndex = new Map(present.map((p, i) => [p.id, i]))
    const perCol = new Map<number, number>()
    const out: Positioned[] = []

    // Deterministic order: phase order, then original node declaration order.
    const ordered = nodes.filter((n) => ids.has(n.id))
    for (const node of ordered) {
        const col = colIndex.get(node.phase) ?? 0
        const row = perCol.get(col) ?? 0
        perCol.set(col, row + 1)
        out.push({
            id: node.id,
            x: col * COL_W,
            y: row * (ROW_H + ROW_GAP),
        })
    }
    return out
}

export interface FlowEdge {
    id: string
    source: string
    target: string
    label?: string
}

/** React-Flow edges limited to those whose endpoints are both visible. */
export function visibleEdges(ids: Set<string>): FlowEdge[] {
    return edges
        .filter((e) => ids.has(e.from) && ids.has(e.to))
        .map((e) => ({
            id: `${e.from}->${e.to}`,
            source: e.from,
            target: e.to,
            label: e.label,
        }))
}

const SEP = ','

/** Encode a guided path for a shareable `?path=` deep link. */
export function encodePath(path: string[]): string {
    return path.join(SEP)
}

/** Decode a `?path=` value, dropping any ids that no longer exist. */
export function decodePath(raw: string | null): string[] {
    if (!raw) {return []}
    return raw
        .split(SEP)
        .map((s) => s.trim())
        .filter((s) => nodeById.has(s))
}
