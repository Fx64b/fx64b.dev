import {
    Background,
    BackgroundVariant,
    Controls,
    type Edge,
    Handle,
    type Node,
    type NodeProps,
    Position,
    ReactFlow,
    useNodesState,
} from '@xyflow/react'

import { useEffect, useMemo, useState } from 'react'

import type { OscpNode } from '@/types/oscp'

import { PHASE_MAP, getNode } from '@/data/oscp'

import { cn } from '@/lib/utils'
import { layoutByPhase, visibleEdges } from '@/lib/oscp-graph'

import '@xyflow/react/dist/style.css'

interface NodeData extends Record<string, unknown> {
    node: OscpNode
    selected: boolean
    onPath: boolean
}

/** Compact card rendered for each graph node. */
function OscpFlowNode({ data }: NodeProps<Node<NodeData>>) {
    const { node, selected, onPath } = data
    const color = PHASE_MAP[node.phase].color
    return (
        <div
            className={cn(
                'bg-card w-[240px] rounded-md border px-3 py-2 shadow-sm transition-shadow',
                selected
                    ? 'ring-ring ring-2'
                    : onPath
                      ? 'ring-1 ring-emerald-400/60'
                      : 'hover:shadow-md'
            )}
            style={{
                borderLeftColor: color,
                borderLeftWidth: 3,
            }}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!bg-muted-foreground/40 !border-0"
            />
            <div className="mb-0.5 flex items-center gap-1.5">
                <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
                    {node.type}
                </span>
            </div>
            <p className="text-[13px] leading-snug font-semibold">
                {node.title}
            </p>
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-muted-foreground/40 !border-0"
            />
        </div>
    )
}

const nodeTypes = { oscp: OscpFlowNode }

const EMERALD = '#10b981'

/**
 * Inner flow. Keyed by the visible-set signature from the parent so it remounts
 * (and re-seeds its draggable node state + refits) whenever the set of shown
 * nodes changes, while drags persist within a given view.
 */
function FlowInner({
    initialNodes,
    edges,
    dark,
    onSelect,
}: {
    initialNodes: Node<NodeData>[]
    edges: Edge[]
    dark: boolean
    onSelect: (id: string) => void
}) {
    const [nodes, , onNodesChange] = useNodesState(initialNodes)

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            colorMode={dark ? 'dark' : 'light'}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
            minZoom={0.2}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            elementsSelectable={false}
            onNodeClick={(_, n) => onSelect(n.id)}
        >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls showInteractive={false} />
        </ReactFlow>
    )
}

interface GraphCanvasProps {
    /** Node ids to render. */
    visible: Set<string>
    selectedId: string | null
    /** Ids that are part of the current guided path (highlighted). */
    pathIds?: Set<string>
    onSelect: (id: string) => void
}

export default function GraphCanvas({
    visible,
    selectedId,
    pathIds,
    onSelect,
}: GraphCanvasProps) {
    // Track the site theme reactively so React Flow re-themes on a manual
    // light/dark toggle, not just on mount.
    const [dark, setDark] = useState(
        () =>
            typeof document !== 'undefined' &&
            document.documentElement.classList.contains('dark')
    )
    useEffect(() => {
        const el = document.documentElement
        const update = () => setDark(el.classList.contains('dark'))
        update()
        const obs = new MutationObserver(update)
        obs.observe(el, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])

    const initialNodes = useMemo<Node<NodeData>[]>(() => {
        return layoutByPhase(visible).map((p) => ({
            id: p.id,
            type: 'oscp',
            position: { x: p.x, y: p.y },
            data: {
                node: getNode(p.id)!,
                selected: p.id === selectedId,
                onPath: pathIds?.has(p.id) ?? false,
            },
        }))
    }, [visible, selectedId, pathIds])

    const edges = useMemo<Edge[]>(() => {
        return visibleEdges(visible).map((e) => {
            const onPath = Boolean(
                pathIds?.has(e.source) && pathIds?.has(e.target)
            )
            return {
                ...e,
                labelBgPadding: [4, 2] as [number, number],
                animated: onPath,
                style: onPath
                    ? { stroke: EMERALD, strokeWidth: 2 }
                    : { strokeWidth: 1.5 },
            }
        })
    }, [visible, pathIds])

    // Remount the flow when the visible set changes (re-seed + refit); drags
    // within one view are preserved because the key is stable there.
    const sig = useMemo(() => [...visible].sort().join(','), [visible])

    return (
        <FlowInner
            key={sig}
            initialNodes={initialNodes}
            edges={edges}
            dark={dark}
            onSelect={onSelect}
        />
    )
}
