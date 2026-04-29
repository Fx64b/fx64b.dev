'use client'

import { useEffect, useRef, useCallback } from 'react'

import { wrapText } from './utils/text'
import { ROOMS, CASTLE, CORRIDORS, STORAGE_KEY, type StoredRoomAssets, type Room } from './utils/mapData'
import { ASSETS } from './utils/assets'
import PLACED_ASSETS from './utils/placedAssets'

// ── Constants ──────────────────────────────────────────────────────────────────

const MAP_W = 1000
const MAP_H = 500

const DEBUG = true
const ROOM_BORDER_COLOR = 'rgb(68, 68, 68)'
const ROOM_FILL_COLOR = 'rgba(10, 10, 10, 0.5)'
const ROOM_BORDER_WIDTH = 2
const GRID_WIDTH = 1
const GRID_SCALE = 25
const GRID_COLOR = 'rgba(255, 255, 255, 0.1)'
const CASTLE_BORDER_COLOR = 'rgb(255, 255, 255)'
const CASTLE_BORDER_WIDTH = 4

const ASSET_SCALE = 0.68
const ASSET_INK = 'rgba(238, 223, 160, 0.88)'
const ASSET_FILL = 'rgba(238, 223, 160, 0.07)'

// Builder preview constants — must mirror RoomBuilder.tsx so scales match
const BUILDER_AVAIL_W = 325
const BUILDER_AVAIL_H = 250

// Room screen-width (px) at which zoom-based focus triggers
const ZOOM_FOCUS_PX = 250

// Pre-build lookup for O(1) asset draw dispatch
const ASSET_MAP: Record<string, (typeof ASSETS)[number]> = Object.fromEntries(ASSETS.map(a => [a.id, a]))

interface Camera { x: number; y: number; scale: number }

// ── Focus helpers ──────────────────────────────────────────────────────────────

function isRoomFocused(room: Room, cam: Camera, clickedId: string | null): boolean {
    return room.id === clickedId || room.width * cam.scale >= ZOOM_FOCUS_PX
}

// ── Module-level draw functions ────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, cam: Camera) {
    const { x: camX, y: camY, scale } = cam
    const canvas = ctx.canvas
    const wx0 = Math.floor((-camX / scale) / GRID_SCALE) * GRID_SCALE
    const wy0 = Math.floor((-camY / scale) / GRID_SCALE) * GRID_SCALE
    const wx1 = Math.ceil((canvas.width - camX) / scale / GRID_SCALE) * GRID_SCALE
    const wy1 = Math.ceil((canvas.height - camY) / scale / GRID_SCALE) * GRID_SCALE

    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = GRID_WIDTH / scale
    for (let x = wx0; x <= wx1; x += GRID_SCALE) {
        ctx.beginPath(); ctx.moveTo(x, wy0); ctx.lineTo(x, wy1); ctx.stroke()
    }
    for (let y = wy0; y <= wy1; y += GRID_SCALE) {
        ctx.beginPath(); ctx.moveTo(wx0, y); ctx.lineTo(wx1, y); ctx.stroke()
    }
}

function drawCastleOutline(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.strokeStyle = CASTLE_BORDER_COLOR
    ctx.lineWidth = CASTLE_BORDER_WIDTH
    CASTLE.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
    })
    ctx.closePath()
    ctx.stroke()
}

function drawRooms(
    ctx: CanvasRenderingContext2D,
    cam: Camera,
    clickedId: string | null,
    stored: StoredRoomAssets,
) {
    ctx.lineWidth = ROOM_BORDER_WIDTH

    ROOMS.forEach((room) => {
        const focused = isRoomFocused(room, cam, clickedId)

        // Room background + border (always)
        ctx.fillStyle = ROOM_FILL_COLOR
        ctx.fillRect(room.x, room.y, room.width, room.height)
        ctx.strokeStyle = ROOM_BORDER_COLOR
        ctx.strokeRect(room.x, room.y, room.width, room.height)

        if (focused) {
            // Draw placed assets instead of the label
            const items = stored[room.id] ?? []
            if (items.length) {
                const previewScale = Math.min(BUILDER_AVAIL_W / room.width, BUILDER_AVAIL_H / room.height)
                const drawScale = ASSET_SCALE / previewScale
                for (const { assetId, wx, wy } of items) {
                    const def = ASSET_MAP[assetId]
                    if (def) def.draw(ctx, wx, wy, drawScale, ASSET_INK, ASSET_FILL)
                }
            }
        } else {
            // Show room name only when not focused
            ctx.fillStyle = 'white'
            ctx.font = '15px Arial'
            ctx.textAlign = 'center'
            wrapText(
                ctx,
                room.displayName,
                room.x + room.width / 2,
                room.y + room.height / 2,
                room.width - 10,
                20,
            )
        }
    })
}

function drawCorridors(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = ROOM_FILL_COLOR
    ctx.strokeStyle = ROOM_BORDER_COLOR
    ctx.lineWidth = ROOM_BORDER_WIDTH
    CORRIDORS.forEach((corridor) => {
        const angle = Math.atan2(corridor.to.y - corridor.from.y, corridor.to.x - corridor.from.x)
        const length = Math.sqrt(
            (corridor.to.x - corridor.from.x) ** 2 + (corridor.to.y - corridor.from.y) ** 2
        )
        ctx.save()
        ctx.translate(corridor.from.x, corridor.from.y)
        ctx.rotate(angle)
        ctx.fillRect(0, -corridor.width / 2, length, corridor.width)
        ctx.strokeRect(0, -corridor.width / 2, length, corridor.width)
        ctx.restore()
    })
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Map() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const requestRef = useRef<number | undefined>(undefined)
    const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: 1 })
    const dragRef = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null)
    const storedRef = useRef<StoredRoomAssets>({})
    const clickedRoomIdRef = useRef<string | null>(null)

    const animate = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const cam = cameraRef.current

        ctx.fillStyle = '#080503'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.save()
        ctx.translate(cam.x, cam.y)
        ctx.scale(cam.scale, cam.scale)

        if (DEBUG) drawGrid(ctx, cam)
        drawRooms(ctx, cam, clickedRoomIdRef.current, storedRef.current)
        drawCorridors(ctx)
        drawCastleOutline(ctx)

        ctx.restore()

        requestRef.current = requestAnimationFrame(animate)
    }, [])

    // Resize canvas to fill window + set initial camera
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const setInitialCamera = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            const scale = Math.min(window.innerWidth / MAP_W, window.innerHeight / MAP_H) * 0.88
            cameraRef.current = {
                x: (window.innerWidth - MAP_W * scale) / 2,
                y: (window.innerHeight - MAP_H * scale) / 2,
                scale,
            }
        }

        const onResize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        setInitialCamera()
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    // Pan, zoom, and click-to-focus
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const rect = canvas.getBoundingClientRect()
            const mouseX = e.clientX - rect.left
            const mouseY = e.clientY - rect.top
            const cam = cameraRef.current
            const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY
            const factor = delta < 0 ? 1.1 : 1 / 1.1
            const newScale = Math.min(12, Math.max(0.05, cam.scale * factor))
            cameraRef.current = {
                x: mouseX - (mouseX - cam.x) * (newScale / cam.scale),
                y: mouseY - (mouseY - cam.y) * (newScale / cam.scale),
                scale: newScale,
            }
        }

        const onMouseDown = (e: MouseEvent) => {
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                camX: cameraRef.current.x,
                camY: cameraRef.current.y,
            }
            canvas.style.cursor = 'grabbing'
        }

        const onMouseMove = (e: MouseEvent) => {
            if (!dragRef.current) return
            cameraRef.current = {
                ...cameraRef.current,
                x: dragRef.current.camX + e.clientX - dragRef.current.startX,
                y: dragRef.current.camY + e.clientY - dragRef.current.startY,
            }
        }

        const onMouseUp = (e: MouseEvent) => {
            if (dragRef.current) {
                const dx = e.clientX - dragRef.current.startX
                const dy = e.clientY - dragRef.current.startY
                // Treat as a click if the mouse barely moved (not a pan)
                if (Math.hypot(dx, dy) < 5) {
                    const rect = canvas.getBoundingClientRect()
                    const cam = cameraRef.current
                    const wx = (e.clientX - rect.left - cam.x) / cam.scale
                    const wy = (e.clientY - rect.top  - cam.y) / cam.scale
                    const hit = ROOMS.find(
                        r => wx >= r.x && wx <= r.x + r.width && wy >= r.y && wy <= r.y + r.height
                    )
                    if (hit) {
                        // Toggle: clicking the same room again deselects it
                        clickedRoomIdRef.current = clickedRoomIdRef.current === hit.id ? null : hit.id
                    } else {
                        clickedRoomIdRef.current = null
                    }
                }
            }
            dragRef.current = null
            canvas.style.cursor = 'grab'
        }

        canvas.addEventListener('wheel', onWheel, { passive: false })
        canvas.addEventListener('mousedown', onMouseDown)
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)

        return () => {
            canvas.removeEventListener('wheel', onWheel)
            canvas.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [])

    // Load placed assets — static file as base, localStorage overrides per room
    useEffect(() => {
        const load = () => {
            try {
                const local: StoredRoomAssets = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
                storedRef.current = { ...PLACED_ASSETS, ...local }
            } catch {
                storedRef.current = { ...PLACED_ASSETS }
            }
        }
        load()
        window.addEventListener('storage', load)
        return () => window.removeEventListener('storage', load)
    }, [])

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(requestRef.current!)
    }, [animate])

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#080503' }}>
            <canvas ref={canvasRef} style={{ cursor: 'grab', display: 'block' }} />
        </div>
    )
}
