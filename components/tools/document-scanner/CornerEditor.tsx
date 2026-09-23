import { useEffect, useId, useMemo, useRef, useState } from 'react'

import type { Quad } from './types'

interface CornerEditorProps {
    blob: Blob
    corners: Quad
    /** Called once a drag ends, so the page isn't reprocessed mid-drag. */
    onCommit: (corners: Quad) => void
}

const LOUPE = 110
const ZOOM = 2.5
const LABELS = ['top-left', 'top-right', 'bottom-right', 'bottom-left']

/** Shows the original photo with four draggable crop corners. */
export default function CornerEditor({
    blob,
    corners,
    onCommit,
}: CornerEditorProps) {
    const url = useMemo(() => URL.createObjectURL(blob), [blob])
    useEffect(() => () => URL.revokeObjectURL(url), [url])

    const maskId = useId()
    const boxRef = useRef<HTMLDivElement>(null)
    // While a corner is dragged its quad lives here; otherwise the
    // committed corners are shown.
    const [drag, setDrag] = useState<{ index: number; quad: Quad } | null>(null)
    const [boxSize, setBoxSize] = useState({ w: 0, h: 0 })
    const draft = drag?.quad ?? corners
    const dragging = drag?.index ?? null

    const pointFromEvent = (e: React.PointerEvent) => {
        const rect = boxRef.current!.getBoundingClientRect()
        return {
            x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
        }
    }

    const onPointerDown = (i: number) => (e: React.PointerEvent) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        const rect = boxRef.current!.getBoundingClientRect()
        setBoxSize({ w: rect.width, h: rect.height })
        setDrag({ index: i, quad: corners })
    }

    const onPointerMove = (i: number) => (e: React.PointerEvent) => {
        if (dragging !== i) {
            return
        }
        const p = pointFromEvent(e)
        setDrag({
            index: i,
            quad: draft.map((c, j) => (j === i ? p : c)) as Quad,
        })
    }

    const onPointerUp = () => {
        if (!drag) {
            return
        }
        setDrag(null)
        onCommit(drag.quad)
    }

    const onKeyDown = (i: number) => (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 0.02 : 0.005
        const delta: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
        }
        const d = delta[e.key]
        if (!d) {
            return
        }
        e.preventDefault()
        const next = draft.map((c, j) =>
            j === i
                ? {
                      x: Math.min(1, Math.max(0, c.x + d[0])),
                      y: Math.min(1, Math.max(0, c.y + d[1])),
                  }
                : c
        ) as Quad
        onCommit(next)
    }

    const active = dragging !== null ? draft[dragging] : null

    return (
        <div className="flex justify-center">
            <div
                ref={boxRef}
                className="relative inline-block touch-none select-none"
            >
                <img
                    src={url}
                    alt="Original photo"
                    className="block max-h-[60vh] w-auto max-w-full"
                    draggable={false}
                />
                <svg
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    viewBox="0 0 1 1"
                    preserveAspectRatio="none"
                >
                    <defs>
                        <mask id={maskId}>
                            <rect width="1" height="1" fill="white" />
                            <polygon
                                points={draft
                                    .map((p) => `${p.x},${p.y}`)
                                    .join(' ')}
                                fill="black"
                            />
                        </mask>
                    </defs>
                    <rect
                        width="1"
                        height="1"
                        fill="rgba(0,0,0,0.45)"
                        mask={`url(#${maskId})`}
                    />
                    <polygon
                        points={draft.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="rgb(34,197,94)"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
                {draft.map((p, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Move ${LABELS[i]} corner`}
                        className="focus-visible:ring-ring absolute size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-green-500/80 shadow-md focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
                        style={{
                            left: `${p.x * 100}%`,
                            top: `${p.y * 100}%`,
                        }}
                        onPointerDown={onPointerDown(i)}
                        onPointerMove={onPointerMove(i)}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onKeyDown={onKeyDown(i)}
                    />
                ))}
                {active && (
                    <div
                        className="pointer-events-none absolute overflow-hidden rounded-full border-2 border-white shadow-lg"
                        style={{
                            width: LOUPE,
                            height: LOUPE,
                            left: `calc(${active.x * 100}% - ${LOUPE / 2}px)`,
                            // Sit above the finger; flip below near the top.
                            top:
                                active.y > 0.25
                                    ? `calc(${active.y * 100}% - ${LOUPE + 40}px)`
                                    : `calc(${active.y * 100}% + 40px)`,
                            backgroundImage: `url(${url})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: `${boxSize.w * ZOOM}px ${boxSize.h * ZOOM}px`,
                            backgroundPosition: `${LOUPE / 2 - active.x * boxSize.w * ZOOM}px ${LOUPE / 2 - active.y * boxSize.h * ZOOM}px`,
                        }}
                    >
                        <div className="absolute top-1/2 left-0 h-px w-full bg-green-500" />
                        <div className="absolute top-0 left-1/2 h-full w-px bg-green-500" />
                    </div>
                )}
            </div>
        </div>
    )
}
