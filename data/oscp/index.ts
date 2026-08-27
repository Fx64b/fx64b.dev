import type {
    OscpEdge,
    OscpNode,
    OscpNodeType,
    OscpPhase,
} from '@/types/oscp'

import adAttacks from './ad-attacks'
import adEnum from './ad-enum'
import adLateral from './ad-lateral'
import enumeration from './enumeration'
import linuxPrivesc from './linux-privesc'
import passwords from './passwords'
import pivoting from './pivoting'
import serviceEnum from './service-enum'
import shells from './shells'
import web from './web'
import windowsPrivesc from './windows-privesc'

/** Phase metadata: display order, label and an accent colour for the graph. */
export interface PhaseMeta {
    id: OscpPhase
    label: string
    /** Column order in the left-to-right kill chain. */
    order: number
    /** Accent used for node borders / phase chips (works in both themes). */
    color: string
}

export const PHASES: PhaseMeta[] = [
    { id: 'enumeration', label: 'Enumeration', order: 0, color: '#64748b' },
    { id: 'service-enum', label: 'Service Enum', order: 1, color: '#0ea5e9' },
    { id: 'web', label: 'Web', order: 2, color: '#8b5cf6' },
    { id: 'passwords', label: 'Passwords', order: 3, color: '#f59e0b' },
    { id: 'shells', label: 'Shells', order: 4, color: '#10b981' },
    { id: 'linux-privesc', label: 'Linux PrivEsc', order: 5, color: '#f97316' },
    { id: 'windows-privesc', label: 'Windows PrivEsc', order: 6, color: '#3b82f6' },
    { id: 'pivoting', label: 'Pivoting', order: 7, color: '#14b8a6' },
    { id: 'ad-enum', label: 'AD Enum', order: 8, color: '#ec4899' },
    { id: 'ad-attacks', label: 'AD Attacks', order: 9, color: '#ef4444' },
    { id: 'ad-lateral', label: 'AD Lateral', order: 10, color: '#a855f7' },
]

export const PHASE_MAP: Record<OscpPhase, PhaseMeta> = Object.fromEntries(
    PHASES.map((p) => [p.id, p])
) as Record<OscpPhase, PhaseMeta>

export const OS_LABELS: Record<string, string> = {
    linux: 'Linux',
    windows: 'Windows',
    ad: 'Active Directory',
    agnostic: 'Any',
}

export const TYPE_LABELS: Record<OscpNodeType, string> = {
    finding: 'Finding',
    technique: 'Technique',
    state: 'State',
}

const CONTENT = [
    enumeration,
    serviceEnum,
    web,
    passwords,
    shells,
    linuxPrivesc,
    windowsPrivesc,
    pivoting,
    adEnum,
    adAttacks,
    adLateral,
]

export const nodes: OscpNode[] = CONTENT.flatMap((c) => c.nodes)
export const edges: OscpEdge[] = CONTENT.flatMap((c) => c.edges)

export const nodeById: Map<string, OscpNode> = new Map(
    nodes.map((n) => [n.id, n])
)

/** Adjacency: outgoing and incoming edges keyed by node id. */
export const outgoing: Map<string, OscpEdge[]> = new Map()
export const incoming: Map<string, OscpEdge[]> = new Map()
for (const edge of edges) {
    if (!outgoing.has(edge.from)) {outgoing.set(edge.from, [])}
    if (!incoming.has(edge.to)) {incoming.set(edge.to, [])}
    outgoing.get(edge.from)!.push(edge)
    incoming.get(edge.to)!.push(edge)
}

export function getNode(id: string): OscpNode | undefined {
    return nodeById.get(id)
}

export function outgoingEdges(id: string): OscpEdge[] {
    return outgoing.get(id) ?? []
}

export function incomingEdges(id: string): OscpEdge[] {
    return incoming.get(id) ?? []
}

/** Entry points for guided mode: nodes with no incoming edges (roots). */
export function rootNodes(): OscpNode[] {
    return nodes.filter((n) => !incoming.has(n.id))
}

/**
 * Curated "here's what I found" starting points for guided mode, in rough
 * engagement order. The graph roots alone are a poor entry list (they include
 * late-game techniques), so this is hand-picked from the common findings.
 */
export const ENTRY_POINTS: string[] = [
    'target-acquired',
    'web-port-open',
    'smb-port-open',
    'smb-anon-access',
    'login-form-found',
    'lfi',
    'sqli',
    'snmp-enum',
    'creds-found',
    'foothold-linux',
    'foothold-windows',
    'ad-foothold',
]

export function entryPointNodes(): OscpNode[] {
    return ENTRY_POINTS.map((id) => nodeById.get(id)).filter(
        (n): n is OscpNode => Boolean(n)
    )
}

/**
 * Dev-only integrity check: duplicate ids and edges pointing at nodes that do
 * not exist. Surfaces content mistakes early without shipping to production.
 */
export function validateContent(): string[] {
    const problems: string[] = []
    const seen = new Set<string>()
    for (const n of nodes) {
        if (seen.has(n.id)) {problems.push(`duplicate node id: ${n.id}`)}
        seen.add(n.id)
    }
    for (const e of edges) {
        if (!nodeById.has(e.from)) {
            problems.push(`edge from missing node: ${e.from} -> ${e.to}`)
        }
        if (!nodeById.has(e.to)) {
            problems.push(`edge to missing node: ${e.from} -> ${e.to}`)
        }
    }
    return problems
}

if (import.meta.env?.DEV) {
    const problems = validateContent()
    if (problems.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('[oscp] content issues:\n' + problems.join('\n'))
    }
}
