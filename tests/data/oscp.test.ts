import { describe, expect, it } from 'vitest'

import {
    ENTRY_POINTS,
    edges,
    getNode,
    nodeById,
    nodes,
    outgoingEdges,
    validateContent,
} from '@/data/oscp'

import { decodePath, encodePath } from '@/lib/oscp-graph'

/** Forward BFS over the DAG from a starting node id. */
function reachableFrom(start: string): Set<string> {
    const seen = new Set<string>([start])
    const queue = [start]
    while (queue.length) {
        const id = queue.shift()!
        for (const e of outgoingEdges(id)) {
            if (!seen.has(e.to)) {
                seen.add(e.to)
                queue.push(e.to)
            }
        }
    }
    return seen
}

describe('oscp content graph', () => {
    it('has no duplicate ids and no dangling edges', () => {
        expect(validateContent()).toEqual([])
    })

    it('every edge endpoint resolves to a real node', () => {
        for (const e of edges) {
            expect(nodeById.has(e.from)).toBe(true)
            expect(nodeById.has(e.to)).toBe(true)
        }
    })

    it('has no orphan nodes (every node is on at least one edge)', () => {
        const onEdge = new Set<string>()
        for (const e of edges) {
            onEdge.add(e.from)
            onEdge.add(e.to)
        }
        const orphans = nodes.filter((n) => !onEdge.has(n.id)).map((n) => n.id)
        expect(orphans).toEqual([])
    })

    it('every curated entry point exists', () => {
        for (const id of ENTRY_POINTS) {
            expect(getNode(id)).toBeDefined()
        }
    })

    it('chains from a fresh target through to Domain Admin', () => {
        const reached = reachableFrom('target-acquired')
        for (const goal of [
            'creds-found',
            'foothold-linux',
            'foothold-windows',
            'root-linux',
            'system-windows',
            'domain-admin',
        ]) {
            expect(reached.has(goal)).toBe(true)
        }
    })
})

describe('path encoding', () => {
    it('round-trips a valid path', () => {
        const path = ['target-acquired', 'nmap-full', 'open-ports']
        expect(decodePath(encodePath(path))).toEqual(path)
    })

    it('drops ids that no longer exist', () => {
        expect(decodePath('target-acquired,not-a-real-node,nmap-full')).toEqual(
            ['target-acquired', 'nmap-full']
        )
    })

    it('returns an empty path for null / empty input', () => {
        expect(decodePath(null)).toEqual([])
        expect(decodePath('')).toEqual([])
    })
})
