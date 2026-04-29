'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ASSETS, type AssetDef, type AssetCategory } from '../utils/assets'
import { ROOMS, type Room, STORAGE_KEY, type StoredAsset } from '../utils/mapData'

// ── Canvas / layout constants ──────────────────────────────────────────────────

const GRID = 25       // visible grid (world units)
const SNAP_GRID = 5   // snap subgrid (1/5 of GRID, invisible)
const PS = 0.68
const CW = 375
const CH = 300
const MARGIN = 25

const INK = 'rgba(238,223,160,0.88)'
const FILL = 'rgba(238,223,160,0.07)'
const AMBER = 'rgba(200,164,64,0.95)'

// ── Coordinate helpers ─────────────────────────────────────────────────────────

interface Layout {
    scale: number
    rx: number
    ry: number
    rW: number
    rH: number
}

function makeLayout(room: Room): Layout {
    const availW = CW - 2 * MARGIN
    const availH = CH - 2 * MARGIN
    const scale = Math.min(availW / room.width, availH / room.height)
    const rW = room.width * scale
    const rH = room.height * scale
    return { scale, rx: MARGIN + (availW - rW) / 2, ry: MARGIN + (availH - rH) / 2, rW, rH }
}

function toWorld(cx: number, cy: number, room: Room, L: Layout) {
    return { wx: room.x + (cx - L.rx) / L.scale, wy: room.y + (cy - L.ry) / L.scale }
}

function toCanvas(wx: number, wy: number, room: Room, L: Layout) {
    return { cx: L.rx + (wx - room.x) * L.scale, cy: L.ry + (wy - room.y) * L.scale }
}

function snap(rawX: number, rawY: number, asset: AssetDef, L: Layout) {
    const cell = SNAP_GRID * L.scale
    const snappedLeft = Math.round((rawX - asset.hw * PS - L.rx) / cell) * cell + L.rx
    const snappedTop  = Math.round((rawY - asset.hh * PS - L.ry) / cell) * cell + L.ry
    return { x: snappedLeft + asset.hw * PS, y: snappedTop + asset.hh * PS }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Placed { asset: AssetDef; wx: number; wy: number }

interface DragState {
    index: number
    startX: number
    startY: number
    currentWx: number
    currentWy: number
}

// ── Code generation ────────────────────────────────────────────────────────────

function generateCode(placed: Record<string, Placed[]>): string {
    const lines: string[] = [
        `import type { StoredRoomAssets } from './mapData'`,
        ``,
        `const PLACED_ASSETS: StoredRoomAssets = {`,
    ]

    let hasData = false
    for (const [roomId, items] of Object.entries(placed)) {
        if (!items.length) continue
        const room = ROOMS.find(r => r.id === roomId)
        if (!room) continue
        hasData = true
        lines.push(`  '${roomId}': [ // ${room.displayName}`)
        items.forEach(p => {
            lines.push(`    { assetId: '${p.asset.id}', wx: ${p.wx.toFixed(1)}, wy: ${p.wy.toFixed(1)} },`)
        })
        lines.push(`  ],`)
    }

    if (!hasData) return '// No assets placed yet.'

    lines.push(`}`, ``, `export default PLACED_ASSETS`)
    return lines.join('\n')
}

// ── Asset thumbnail card ───────────────────────────────────────────────────────

function AssetCard({ asset, selected, onSelect }: { asset: AssetDef; selected: boolean; onSelect: () => void }) {
    const ref = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const c = ref.current
        if (!c) return
        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, 110, 110)
        ctx.fillStyle = '#f6eec4'; ctx.fillRect(0, 0, 110, 110)
        asset.draw(ctx, 55, 55, 0.82, '#180c04', '#f0e4aa')
    }, [asset])

    return (
        <button
            onClick={onSelect}
            style={{
                display: 'flex', flexDirection: 'column',
                background: '#f6eec4',
                border: selected ? '2px solid #c8a440' : '1.5px solid #c8b478',
                boxShadow: selected ? '0 0 0 2px rgba(200,164,64,0.5)' : undefined,
                cursor: 'pointer', padding: 0, overflow: 'hidden',
            }}
        >
            <canvas ref={ref} width={110} height={110}
                style={{ display: 'block', width: '100%', aspectRatio: '1' }} />
            <span style={{
                background: '#eedfa0', padding: '5px 4px', fontFamily: 'serif',
                fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#2a1506', textAlign: 'center',
                borderTop: '1px solid #c8b478', display: 'block',
            }}>
                {asset.name}
            </span>
        </button>
    )
}

// ── Canvas preview ─────────────────────────────────────────────────────────────

interface CanvasPreviewProps {
    selectedRoom: Room | null
    selectedAsset: AssetDef | null
    placed: Placed[]
    snapOn: boolean
    onPlace: (wx: number, wy: number) => void
    onRemove: (index: number) => void
    onMove: (index: number, wx: number, wy: number) => void
}

function CanvasPreview({ selectedRoom, selectedAsset, placed, snapOn, onPlace, onRemove, onMove }: CanvasPreviewProps) {
    const ref = useRef<HTMLCanvasElement | null>(null)
    const mouseRef = useRef<{ x: number; y: number } | null>(null)
    const snapRef = useRef(snapOn)
    const dragRef = useRef<DragState | null>(null)

    useEffect(() => { snapRef.current = snapOn }, [snapOn])

    const layout = selectedRoom ? makeLayout(selectedRoom) : null

    const getCanvasPos = useCallback((e: React.MouseEvent | MouseEvent) => {
        const c = ref.current!
        const rect = c.getBoundingClientRect()
        return {
            x: (e.clientX - rect.left) * (CW / rect.width),
            y: (e.clientY - rect.top)  * (CH / rect.height),
        }
    }, [])

    const redraw = useCallback(() => {
        const c = ref.current
        if (!c) return
        const ctx = c.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, CW, CH)
        ctx.fillStyle = '#080503'; ctx.fillRect(0, 0, CW, CH)

        if (!selectedRoom || !layout) {
            ctx.fillStyle = 'rgba(238,223,160,0.25)'
            ctx.font = 'italic 12px serif'; ctx.textAlign = 'center'
            ctx.fillText('Select a room above to begin', CW / 2, CH / 2 - 8)
            ctx.fillText('placing assets', CW / 2, CH / 2 + 10)
            return
        }

        const { rx, ry, rW, rH, scale } = layout
        const mouse = mouseRef.current
        const drag = dragRef.current

        // Grid (visible 25-unit lines only)
        const cell = GRID * scale
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
        for (let x = rx; x <= rx + rW + 0.5; x += cell) {
            ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + rH); ctx.stroke()
        }
        for (let y = ry; y <= ry + rH + 0.5; y += cell) {
            ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx + rW, y); ctx.stroke()
        }

        // Room
        ctx.fillStyle = 'rgba(238,223,160,0.04)'; ctx.fillRect(rx, ry, rW, rH)
        ctx.strokeStyle = 'rgba(238,223,160,0.65)'; ctx.lineWidth = 2
        ctx.strokeRect(rx, ry, rW, rH)
        ctx.fillStyle = 'rgba(238,223,160,0.35)'
        ctx.font = 'italic 11px serif'; ctx.textAlign = 'center'
        ctx.fillText(selectedRoom.displayName, rx + rW / 2, ry + 15)
        ctx.fillStyle = 'rgba(238,223,160,0.2)'
        ctx.font = '9px monospace'; ctx.textAlign = 'right'
        ctx.fillText(`${selectedRoom.width}×${selectedRoom.height}`, rx + rW - 4, ry + rH - 4)

        // Placed assets — skip the one being dragged
        placed.forEach((p, i) => {
            if (drag?.index === i) return
            const { cx, cy } = toCanvas(p.wx, p.wy, selectedRoom, layout)
            p.asset.draw(ctx, cx, cy, PS, INK, FILL)
        })

        // Dragged asset at current drag position
        if (drag) {
            const p = placed[drag.index]
            if (p) {
                const { cx, cy } = toCanvas(drag.currentWx, drag.currentWy, selectedRoom, layout)
                ctx.globalAlpha = 0.78
                p.asset.draw(ctx, cx, cy, PS, INK, FILL)
                ctx.globalAlpha = 1
                if (snapRef.current) {
                    const bx = cx - p.asset.hw * PS
                    const by = cy - p.asset.hh * PS
                    ctx.strokeStyle = AMBER; ctx.lineWidth = 1.5
                    ctx.beginPath()
                    ctx.moveTo(bx + 8, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 8)
                    ctx.stroke()
                    ctx.fillStyle = AMBER
                    ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill()
                }
            }
        }

        // Ghost preview when placing (no drag active)
        if (mouse && selectedAsset && !drag) {
            const pos = snapRef.current ? snap(mouse.x, mouse.y, selectedAsset, layout) : mouse
            ctx.globalAlpha = 0.45
            selectedAsset.draw(ctx, pos.x, pos.y, PS, 'rgba(238,223,160,0.9)', 'rgba(238,223,160,0.12)')
            ctx.globalAlpha = 1
            if (snapRef.current) {
                const bx = pos.x - selectedAsset.hw * PS
                const by = pos.y - selectedAsset.hh * PS
                ctx.strokeStyle = AMBER; ctx.lineWidth = 1.5
                ctx.beginPath()
                ctx.moveTo(bx + 8, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + 8)
                ctx.stroke()
                ctx.fillStyle = AMBER
                ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill()
            }
        }
    }, [selectedRoom, selectedAsset, placed, layout])

    useEffect(() => { redraw() }, [redraw])

    // Window-level mouseup catches release outside canvas during drag
    useEffect(() => {
        const onWindowMouseUp = () => {
            const drag = dragRef.current
            if (!drag) return
            const orig = placed[drag.index]
            if (orig && (Math.abs(drag.currentWx - orig.wx) > 0.5 || Math.abs(drag.currentWy - orig.wy) > 0.5)) {
                onMove(drag.index, drag.currentWx, drag.currentWy)
            }
            dragRef.current = null
            if (ref.current) ref.current.style.cursor = selectedAsset ? 'crosshair' : 'default'
            redraw()
        }
        window.addEventListener('mouseup', onWindowMouseUp)
        return () => window.removeEventListener('mouseup', onWindowMouseUp)
    }, [placed, onMove, selectedAsset, redraw])

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0 || selectedAsset || !selectedRoom || !layout) return
        const raw = getCanvasPos(e)
        const { wx, wy } = toWorld(raw.x, raw.y, selectedRoom, layout)
        for (let i = placed.length - 1; i >= 0; i--) {
            const p = placed[i]
            if (Math.abs(wx - p.wx) <= p.asset.hw * 1.3 && Math.abs(wy - p.wy) <= p.asset.hh * 1.3) {
                dragRef.current = { index: i, startX: raw.x, startY: raw.y, currentWx: p.wx, currentWy: p.wy }
                if (ref.current) ref.current.style.cursor = 'grabbing'
                break
            }
        }
    }, [selectedAsset, selectedRoom, layout, placed, getCanvasPos])

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!selectedRoom || !layout) return
        const raw = getCanvasPos(e)
        mouseRef.current = raw
        const drag = dragRef.current

        if (drag) {
            const asset = placed[drag.index]?.asset
            if (asset) {
                const pos = snapRef.current ? snap(raw.x, raw.y, asset, layout) : raw
                const { wx, wy } = toWorld(pos.x, pos.y, selectedRoom, layout)
                drag.currentWx = wx
                drag.currentWy = wy
            }
            if (ref.current) ref.current.style.cursor = 'grabbing'
            redraw()
        } else if (!selectedAsset) {
            const { wx, wy } = toWorld(raw.x, raw.y, selectedRoom, layout)
            const over = placed.some(p =>
                Math.abs(wx - p.wx) <= p.asset.hw * 1.3 &&
                Math.abs(wy - p.wy) <= p.asset.hh * 1.3
            )
            if (ref.current) ref.current.style.cursor = over ? 'grab' : 'default'
        } else {
            redraw()
        }
    }, [selectedRoom, selectedAsset, layout, placed, getCanvasPos, redraw])

    const onMouseLeave = useCallback(() => {
        mouseRef.current = null
        dragRef.current = null
        redraw()
    }, [redraw])

    const onClick = useCallback((e: React.MouseEvent) => {
        if (!selectedAsset || !selectedRoom || !layout || dragRef.current) return
        const raw = getCanvasPos(e)
        const pos = snapRef.current ? snap(raw.x, raw.y, selectedAsset, layout) : raw
        const { wx, wy } = toWorld(pos.x, pos.y, selectedRoom, layout)
        onPlace(wx, wy)
    }, [selectedAsset, selectedRoom, layout, getCanvasPos, onPlace])

    const onRightClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        if (!selectedRoom || !layout) return
        const raw = getCanvasPos(e)
        const { wx, wy } = toWorld(raw.x, raw.y, selectedRoom, layout)
        let minD = Infinity, minI = -1
        placed.forEach((p, i) => {
            const d = Math.hypot(p.wx - wx, p.wy - wy)
            if (d < minD) { minD = d; minI = i }
        })
        if (minD < 50 && minI >= 0) onRemove(minI)
    }, [selectedRoom, layout, placed, getCanvasPos, onRemove])

    return (
        <canvas
            ref={ref}
            width={CW}
            height={CH}
            style={{
                cursor: selectedAsset && selectedRoom ? 'crosshair' : 'default',
                display: 'block', width: '100%',
                border: '1px solid rgba(238,223,160,0.18)',
                flexShrink: 0,
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
            onContextMenu={onRightClick}
        />
    )
}

// ── Category sidebar config ────────────────────────────────────────────────────

const CATS: { id: 'all' | AssetCategory; label: string }[] = [
    { id: 'all',          label: 'All Assets' },
    { id: 'walls',        label: 'Walls' },
    { id: 'furniture',    label: 'Furniture' },
    { id: 'decorations',  label: 'Decorations' },
]

const CAT_COUNTS: Record<string, number> = {
    all: ASSETS.length,
    walls:       ASSETS.filter(a => a.cat === 'walls').length,
    furniture:   ASSETS.filter(a => a.cat === 'furniture').length,
    decorations: ASSETS.filter(a => a.cat === 'decorations').length,
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = {
    root: { display: 'flex', height: '100vh', background: '#080503',
        color: 'rgba(238,223,160,0.88)', fontFamily: 'serif', overflow: 'hidden' } as React.CSSProperties,
    sidebar: { width: 150, background: '#0e0a05', borderRight: '1px solid rgba(238,223,160,0.08)',
        display: 'flex', flexDirection: 'column', padding: '18px 0', gap: 1, flexShrink: 0,
        overflowY: 'auto' } as React.CSSProperties,
    assetGrid: { flex: 1, overflowY: 'auto', padding: 18, background: '#0c0804' } as React.CSSProperties,
    rightPanel: { width: 430, background: '#0e0a05', borderLeft: '1px solid rgba(238,223,160,0.08)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' } as React.CSSProperties,
    label9: { fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: 'rgba(200,164,64,0.55)' } as React.CSSProperties,
    label8: { padding: '0 16px 8px', fontSize: 8, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: 'rgba(200,164,64,0.45)' } as React.CSSProperties,
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RoomBuilder() {
    const [cat, setCat] = useState<'all' | AssetCategory>('all')
    const [selectedAsset, setSelectedAsset] = useState<AssetDef | null>(null)
    const [selectedRoomId, setSelectedRoomId] = useState<string>('')
    const [placed, setPlaced] = useState<Record<string, Placed[]>>({})
    const [tab, setTab] = useState<'place' | 'code'>('place')
    const [snapOn, setSnapOn] = useState(true)
    const [copied, setCopied] = useState(false)

    const historyRef = useRef<Record<string, Placed[]>[]>([])
    const futureRef = useRef<Record<string, Placed[]>[]>([])

    const selectedRoom  = ROOMS.find(r => r.id === selectedRoomId) ?? null
    const placedForRoom = placed[selectedRoomId] ?? []
    const totalPlaced   = Object.values(placed).reduce((s, v) => s + v.length, 0)
    const code          = generateCode(placed)

    // ── Persistence ────────────────────────────────────────────────────────────

    useEffect(() => {
        try {
            const stored: Record<string, StoredAsset[]> = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
            const hydrated: Record<string, Placed[]> = {}
            Object.entries(stored).forEach(([roomId, items]) => {
                const loaded = items.flatMap(({ assetId, wx, wy }) => {
                    const asset = ASSETS.find(a => a.id === assetId)
                    return asset ? [{ asset, wx, wy }] : []
                })
                if (loaded.length) hydrated[roomId] = loaded
            })
            if (Object.keys(hydrated).length) setPlaced(hydrated)
        } catch { /* ignore corrupt data */ }
    }, [])

    useEffect(() => {
        const toSave: Record<string, StoredAsset[]> = {}
        Object.entries(placed).forEach(([roomId, items]) => {
            if (items.length) toSave[roomId] = items.map(p => ({ assetId: p.asset.id, wx: p.wx, wy: p.wy }))
        })
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)) } catch { /* quota */ }
    }, [placed])

    // ── History helpers ────────────────────────────────────────────────────────

    const pushHistory = useCallback((snapshot: Record<string, Placed[]>) => {
        historyRef.current = [...historyRef.current.slice(-49), snapshot]
        futureRef.current = []
    }, [])

    const undo = useCallback(() => {
        if (!historyRef.current.length) return
        const prev = historyRef.current[historyRef.current.length - 1]
        historyRef.current = historyRef.current.slice(0, -1)
        futureRef.current = [placed, ...futureRef.current.slice(0, 49)]
        setPlaced(prev)
    }, [placed])

    const redo = useCallback(() => {
        if (!futureRef.current.length) return
        const next = futureRef.current[0]
        futureRef.current = futureRef.current.slice(1)
        historyRef.current = [...historyRef.current.slice(-49), placed]
        setPlaced(next)
    }, [placed])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault(); undo()
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault(); redo()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [undo, redo])

    // ── Placement handlers ──────────────────────────────────────────────────────

    const onPlace = useCallback((wx: number, wy: number) => {
        if (!selectedAsset || !selectedRoomId) return
        pushHistory(placed)
        setPlaced(prev => ({
            ...prev,
            [selectedRoomId]: [...(prev[selectedRoomId] ?? []), { asset: selectedAsset, wx, wy }],
        }))
    }, [selectedAsset, selectedRoomId, placed, pushHistory])

    const onRemove = useCallback((index: number) => {
        if (!selectedRoomId) return
        pushHistory(placed)
        setPlaced(prev => ({
            ...prev,
            [selectedRoomId]: (prev[selectedRoomId] ?? []).filter((_, i) => i !== index),
        }))
    }, [selectedRoomId, placed, pushHistory])

    const onMove = useCallback((index: number, wx: number, wy: number) => {
        if (!selectedRoomId) return
        pushHistory(placed)
        setPlaced(prev => ({
            ...prev,
            [selectedRoomId]: (prev[selectedRoomId] ?? []).map((p, i) => i === index ? { ...p, wx, wy } : p),
        }))
    }, [selectedRoomId, placed, pushHistory])

    const clearRoom = () => {
        if (!selectedRoomId) return
        pushHistory(placed)
        setPlaced(prev => ({ ...prev, [selectedRoomId]: [] }))
    }

    const copyCode = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
        })
    }

    const visible = cat === 'all' ? ASSETS : ASSETS.filter(a => a.cat === cat)

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
        <div style={S.root}>

            {/* ── Category sidebar ── */}
            <div style={S.sidebar}>
                <div style={S.label8}>Browse</div>
                {CATS.map(c => (
                    <button key={c.id} onClick={() => setCat(c.id)} style={{
                        display: 'flex', alignItems: 'center', padding: '9px 16px',
                        background: cat === c.id ? 'rgba(238,223,160,0.07)' : 'none',
                        border: 'none',
                        borderLeft: `2px solid ${cat === c.id ? '#c8a440' : 'transparent'}`,
                        color: cat === c.id ? '#c8a440' : 'rgba(238,223,160,0.6)',
                        fontFamily: 'serif', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                        width: '100%', gap: 8,
                    }}>
                        {c.label}
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'monospace', opacity: 0.45 }}>
                            {CAT_COUNTS[c.id]}
                        </span>
                    </button>
                ))}
                <div style={{ height: 1, background: 'rgba(238,223,160,0.07)', margin: '10px 16px' }} />
                <div style={{ padding: '0 16px', fontSize: 10, opacity: 0.38, lineHeight: 1.8, fontStyle: 'italic' }}>
                    Click to select, click canvas to place.
                    <br />Right-click to remove.
                    <br />Deselect asset to drag &amp; move.
                    <br />Ctrl+Z / Ctrl+Y to undo/redo.
                </div>
                {totalPlaced > 0 && (
                    <div style={{ margin: '12px 16px 0', padding: '7px 10px', background: 'rgba(200,164,64,0.07)',
                        border: '1px solid rgba(200,164,64,0.2)', fontSize: 10, color: 'rgba(200,164,64,0.7)',
                        fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        {totalPlaced} asset{totalPlaced !== 1 ? 's' : ''} total
                    </div>
                )}
            </div>

            {/* ── Asset grid ── */}
            <div style={S.assetGrid}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 10 }}>
                    {visible.map(a => (
                        <AssetCard key={a.id} asset={a}
                            selected={selectedAsset?.id === a.id}
                            onSelect={() => setSelectedAsset(prev => prev?.id === a.id ? null : a)}
                        />
                    ))}
                </div>
            </div>

            {/* ── Right panel ── */}
            <div style={S.rightPanel}>

                {/* Room selector row */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(238,223,160,0.08)',
                    display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={S.label9}>Room</span>
                    <select
                        value={selectedRoomId}
                        onChange={e => setSelectedRoomId(e.target.value)}
                        style={{ flex: 1, background: '#0c0804', color: 'rgba(238,223,160,0.8)',
                            border: '1px solid rgba(238,223,160,0.2)', padding: '5px 8px',
                            fontFamily: 'serif', fontSize: 12, cursor: 'pointer' }}
                    >
                        <option value="">— select a room —</option>
                        {ROOMS.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.displayName}  ({r.width}×{r.height})
                                {(placed[r.id]?.length ?? 0) > 0 ? ` · ${placed[r.id].length}` : ''}
                            </option>
                        ))}
                    </select>
                    {selectedRoomId && (
                        <button onClick={clearRoom} style={{ flexShrink: 0, background: 'none',
                            border: '1px solid rgba(238,223,160,0.18)', color: 'rgba(238,223,160,0.45)',
                            fontFamily: 'serif', fontSize: 10, padding: '4px 8px', cursor: 'pointer' }}>
                            Clear
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(238,223,160,0.1)', flexShrink: 0 }}>
                    {(['place', 'code'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            flex: 1, padding: '9px 6px', background: 'none', border: 'none',
                            borderBottom: `2px solid ${tab === t ? '#c8a440' : 'transparent'}`,
                            color: tab === t ? '#c8a440' : 'rgba(238,223,160,0.38)',
                            fontFamily: 'serif', fontSize: 9, letterSpacing: '0.18em',
                            textTransform: 'uppercase', cursor: 'pointer',
                        }}>
                            {t === 'place' ? 'Place Assets' : `Export${totalPlaced ? ` (${totalPlaced})` : ''}`}
                        </button>
                    ))}
                </div>

                {/* ── Place tab ── */}
                {tab === 'place' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: 14, overflow: 'hidden' }}>
                        <CanvasPreview
                            selectedRoom={selectedRoom}
                            selectedAsset={selectedAsset}
                            placed={placedForRoom}
                            snapOn={snapOn}
                            onPlace={onPlace}
                            onRemove={onRemove}
                            onMove={onMove}
                        />
                        {/* Controls row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, fontStyle: 'italic', color: 'rgba(238,223,160,0.4)', lineHeight: 1.4, flex: 1, minWidth: 0 }}>
                                {!selectedRoom
                                    ? 'Select a room above'
                                    : selectedAsset
                                        ? <><b style={{ fontStyle: 'normal', color: 'rgba(238,223,160,0.7)' }}>{selectedAsset.name}</b>{' — click to place'}</>
                                        : `${placedForRoom.length} asset${placedForRoom.length !== 1 ? 's' : ''} — drag to move`
                                }
                            </span>
                            {/* Undo / Redo */}
                            {(['undo', 'redo'] as const).map(action => (
                                <button key={action} onClick={action === 'undo' ? undo : redo} style={{ flexShrink: 0,
                                    background: 'none', border: '1px solid rgba(238,223,160,0.18)',
                                    color: 'rgba(238,223,160,0.45)', fontFamily: 'monospace',
                                    fontSize: 13, padding: '2px 8px', cursor: 'pointer', lineHeight: 1 }}
                                    title={action === 'undo' ? 'Undo (Ctrl+Z)' : 'Redo (Ctrl+Y)'}>
                                    {action === 'undo' ? '↩' : '↪'}
                                </button>
                            ))}
                            <button onClick={() => setSnapOn(s => !s)} style={{ flexShrink: 0,
                                background: snapOn ? 'rgba(200,164,64,0.08)' : 'none',
                                border: `1px solid ${snapOn ? 'rgba(200,164,64,0.65)' : 'rgba(238,223,160,0.18)'}`,
                                color: snapOn ? 'rgba(200,164,64,0.9)' : 'rgba(238,223,160,0.45)',
                                fontFamily: 'serif', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}>
                                {snapOn ? '⊹ Snap On' : '⊹ Snap Off'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Export tab ── */}
                {tab === 'code' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={S.label9}>placedAssets.ts</span>
                            <button onClick={copyCode} style={{
                                background: copied ? 'rgba(200,164,64,0.18)' : 'rgba(200,164,64,0.08)',
                                border: '1px solid rgba(200,164,64,0.35)',
                                color: copied ? 'rgba(200,164,64,1)' : 'rgba(200,164,64,0.75)',
                                fontFamily: 'serif', fontSize: 9, letterSpacing: '0.1em',
                                textTransform: 'uppercase', padding: '4px 10px', cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}>
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                        <p style={{ fontSize: 10, fontStyle: 'italic', color: 'rgba(238,223,160,0.35)',
                            marginBottom: 12, lineHeight: 1.65 }}>
                            Paste into{' '}
                            <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 4px',
                                fontStyle: 'normal', fontSize: 9 }}>utils/placedAssets.ts</code>
                            {' '}to bake assets into the map permanently.
                            localStorage overrides the file per room while editing.
                        </p>
                        <pre style={{
                            fontFamily: 'monospace', fontSize: 10, lineHeight: 1.75,
                            color: 'rgba(200,170,100,0.82)', background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(238,223,160,0.1)', padding: 12,
                            whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
                        }}>
                            {code}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}
