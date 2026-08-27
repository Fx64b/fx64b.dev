/**
 * Data model for the interactive OSCP cheat sheet.
 *
 * The content is a DAG: nodes are the things you find, do, or reach on a box,
 * and edges are the conditional transitions between them ("if the share is
 * writable", "if creds are valid"). Nodes are reused across paths - a state
 * like "local admin on a Windows host" has many incoming edges rather than
 * being duplicated per path. Edges live in their own list so that reuse stays
 * clean (see `data/oscp/*`).
 */

/** The eleven top-level stages of a typical OSCP engagement. */
export type OscpPhase =
    | 'enumeration'
    | 'service-enum'
    | 'web'
    | 'passwords'
    | 'shells'
    | 'linux-privesc'
    | 'windows-privesc'
    | 'pivoting'
    | 'ad-enum'
    | 'ad-attacks'
    | 'ad-lateral'

/** Which operating-system context a node applies to. */
export type OscpOS = 'linux' | 'windows' | 'ad' | 'agnostic'

/**
 * - `finding`   - something you observed (a port, a misconfig, a credential).
 * - `technique` - an action you run to move forward.
 * - `state`     - a position you have reached (a shell, a set of creds, DA).
 */
export type OscpNodeType = 'finding' | 'technique' | 'state'

/** A single copyable command block, optionally labelled and annotated. */
export interface OscpCommand {
    /** Short label shown above the block, e.g. "Full-port scan". */
    label?: string
    /** The command(s). Rendered verbatim in a monospace, copyable block. */
    code: string
    /** Optional one-line caveat or explanation shown under the block. */
    note?: string
}

/** An external link for deeper reading. */
export interface OscpReference {
    label: string
    url: string
}

export interface OscpNode {
    /** Stable slug, e.g. `smb-anon-access`. Referenced by edges. */
    id: string
    /** Short human label, e.g. "Anonymous SMB access". */
    title: string
    type: OscpNodeType
    phase: OscpPhase
    os: OscpOS
    /** What this is, or what you just did / reached. Plain prose. */
    description: string
    /** Optional command blocks. */
    commands?: OscpCommand[]
    /** Optional external references. */
    references?: OscpReference[]
    /** Free-text tags matched by search but not used for hard filtering. */
    tags?: string[]
}

export interface OscpEdge {
    /** Source node id. */
    from: string
    /** Target node id. */
    to: string
    /** The condition/action that makes this transition true. */
    label?: string
}

/** A phase content module exports its nodes and the edges it introduces. */
export interface OscpContent {
    nodes: OscpNode[]
    edges: OscpEdge[]
}
