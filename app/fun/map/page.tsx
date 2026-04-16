'use client'

// TODO: make this a server rendered page and inject the map as a client component
import { useEffect, useRef } from 'react'
import { wrapText } from './utils/text'

interface Room {
    id: string
    displayName: string
    x: number
    y: number
    width: number
    height: number
}

interface CastleOutiline {
    x: number
    y: number
    rotation?: number
}

export default function Map() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const requestRef = useRef<number | undefined>(undefined)

    const CASTLE: CastleOutiline[] = [
        { x: 25, y: 50 },
        { x: 125, y: 50 },
        { x: 125, y: 75 },
        { x: 350, y: 75 },
        { x: 350, y: 100 },
        { x: 450, y: 100 },
        { x: 450, y: 25 },
        { x: 800, y: 25 },
        { x: 800, y: 50 },
        { x: 975, y: 50 },
        { x: 975, y: 150 },
        { x: 925, y: 150 },
        { x: 925, y: 300 },
        { x: 975, y: 300 },
        { x: 975, y: 400 },
        { x: 900, y: 400 },
        { x: 900, y: 475 },
        { x: 450, y: 475 },
        { x: 450, y: 400 },
        { x: 150, y: 400 },
        { x: 150, y: 475 },
        { x: 25, y: 475 },
        { x: 25, y: 350 },
        { x: 75, y: 350 },
        { x: 75, y: 150 },
        { x: 25, y: 150 },
        { x: 25, y: 150 },
        { x: 25, y: 50 },
    ]

    const ROOMS: Room[] = [
        {
            id: '1',
            displayName: 'Great Hall',
            x: 150,
            y: 175,
            width: 200,
            height: 150,
        },
        {
            id: '2',
            displayName: 'Gryffindor Common Room',
            x: 850,
            y: 50,
            width: 125,
            height: 100,
        },
        {
            id: '3',
            displayName: 'Slytherin Common Room',
            x: 450,
            y: 400,
            width: 125,
            height: 75,
        },
        {
            id: '4',
            displayName: 'Potions Classroom',
            x: 550,
            y: 225,
            width: 100,
            height: 50,
        },
    ]

    const DEBUG = true

    const ROOM_BORDER_COLOR = 'rgb(68, 68, 68)'
    const ROOM_FILL_COLOR = 'rgba(10, 10, 10, 0.5)'
    const ROOM_BORDER_WIDTH = 2

    const GRID_WIDTH = 2
    const GRID_SCALE = 25
    const GRID_COLOR = 'rgba(255, 255, 255, 0.1)'

    const CASTLE_BORDER_COLOR = 'rgb(255, 255, 255)'
    const CASTLE_BORDER_WIDTH = 4

    const drawGrid = (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = GRID_COLOR
        ctx.lineWidth = GRID_WIDTH
        for (let x = 0; x < ctx.canvas.width; x += GRID_SCALE) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, ctx.canvas.height)
            ctx.stroke()
        }
        for (let y = 0; y < ctx.canvas.height; y += GRID_SCALE) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(ctx.canvas.width, y)
            ctx.stroke()
        }
    }

    const drawCastleOutline = (ctx: CanvasRenderingContext2D) => {
        ctx.beginPath()
        ctx.strokeStyle = CASTLE_BORDER_COLOR
        ctx.lineWidth = CASTLE_BORDER_WIDTH

        CASTLE.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y)
            } else {
                ctx.lineTo(point.x, point.y)
            }
        })

        ctx.closePath()
        ctx.stroke()
    }

    const drawRooms = (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = ROOM_BORDER_COLOR
        ctx.lineWidth = ROOM_BORDER_WIDTH

        ROOMS.forEach((room: Room) => {
            ctx.fillStyle = ROOM_FILL_COLOR
            ctx.fillRect(room.x, room.y, room.width, room.height)
            ctx.strokeRect(room.x, room.y, room.width, room.height)
            // TODO: find better solution for text
            ctx.fillStyle = 'white'
            ctx.font = '16px Arial'
            ctx.textAlign = 'center'
            wrapText(
                ctx,
                room.displayName,
                room.x + room.width / 2,
                room.y + room.height / 2,
                room.width - 10,
                20,
            )
        })
    }

    const animate = (time: number) => {
        const canvas = canvasRef.current
        if (!canvas) {
            console.error('Failed to get canvas element')
            return
        }

        const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (DEBUG) {
            drawGrid(ctx)
        }

        // TODO: Fill rooms and corridors
        drawRooms(ctx)


        drawCastleOutline(ctx)

        requestRef.current = requestAnimationFrame(animate)
    }

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate)

        return () => cancelAnimationFrame(requestRef.current!)
    }, [])

    return (
        <div className="flex h-screen flex-col items-center justify-center">
            <canvas
                ref={canvasRef}
                className="my-4 border border-gray-300"
                width={1000}
                height={500}
            />
        </div>
    )
}
