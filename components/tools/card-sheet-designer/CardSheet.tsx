import { useLayoutEffect, useRef, useState } from 'react'

import { backgroundFor, textFor } from './design'
import { cardPosition, cutLines } from './layout'
import type {
    Background,
    CardData,
    Design,
    GridLayout,
    TextStyle,
} from './types'

const JUSTIFY = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
} as const

function hexToRgba(hex: string, alpha: number) {
    let h = hex.replace('#', '')
    if (h.length === 3 || h.length === 4) {
        h = h
            .split('')
            .map((c) => c + c)
            .join('')
    }
    const n = parseInt(h.slice(0, 6), 16)
    if (Number.isNaN(n)) {
        return `rgba(0,0,0,${alpha})`
    }
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

function CardImage({ bg }: { bg: Background }) {
    const [failed, setFailed] = useState<string | null>(null)
    if (!bg.image || failed === bg.image) {
        return null
    }
    const origin = `${bg.posX}% ${bg.posY}%`
    return (
        <img
            src={bg.image}
            alt=""
            draggable={false}
            onError={() => setFailed(bg.image ?? null)}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: origin,
                transform: bg.zoom > 1 ? `scale(${bg.zoom})` : undefined,
                transformOrigin: origin,
                display: 'block',
            }}
        />
    )
}

/**
 * Shrinks the card text until it fits the card. It mutates the font size
 * directly so the preview and the print copy each fit themselves without a
 * render loop.
 */
function useAutoFit(
    boxRef: React.RefObject<HTMLDivElement | null>,
    textRef: React.RefObject<HTMLDivElement | null>,
    fontSize: number,
    enabled: boolean,
    deps: unknown[]
) {
    useLayoutEffect(() => {
        const box = boxRef.current
        const text = textRef.current
        if (!box || !text) {
            return
        }
        const fit = () => {
            let scale = 1
            text.style.fontSize = `${fontSize}pt`
            if (!enabled) {
                return
            }
            const overflows = () =>
                text.scrollHeight > box.clientHeight + 0.5 ||
                text.scrollWidth > box.clientWidth + 0.5
            // Layout is unavailable (e.g. tests): leave the size alone.
            if (box.clientHeight === 0) {
                return
            }
            while (scale > 0.3 && overflows()) {
                scale -= 0.04
                text.style.fontSize = `${fontSize * scale}pt`
            }
        }
        fit()
        // Web fonts change the metrics once they arrive.
        let cancelled = false
        document.fonts?.ready.then(() => {
            if (!cancelled) {
                fit()
            }
        })
        return () => {
            cancelled = true
        }
    }, [fontSize, enabled, ...deps])
}

interface CardFaceProps {
    card: CardData
    /** Position on the page (0-based). */
    slot: number
    /** Card number across all pages (0-based). */
    index: number
    background: Background
    style: TextStyle
    layout: Design['layout']
    grid: GridLayout
    interactive: boolean
    selected: boolean
    onSelect?: () => void
}

function CardFace({
    card,
    slot,
    index,
    background,
    style,
    layout,
    grid,
    interactive,
    selected,
    onSelect,
}: CardFaceProps) {
    const s: TextStyle = { ...style, ...card.style }
    const boxRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLDivElement>(null)
    useAutoFit(boxRef, textRef, s.fontSize, s.autoFit, [
        card.text,
        card.reference,
        s.fontFamily,
        s.refSize,
        s.lineHeight,
        s.bold,
        s.italic,
        s.padding,
        s.panel,
        grid.cardWidth,
        grid.cardHeight,
    ])

    const pos = cardPosition(grid, slot)
    const hasText = Boolean(card.text || card.reference)
    const shadow = s.shadow ? '0 0.3mm 1.2mm rgba(0,0,0,0.55)' : undefined

    return (
        <div
            data-card-index={index}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? `Edit card ${index + 1}` : undefined}
            aria-pressed={interactive ? selected : undefined}
            onClick={interactive ? () => onSelect?.() : undefined}
            onKeyDown={
                interactive
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onSelect?.()
                          }
                      }
                    : undefined
            }
            className={interactive ? 'csd-card cursor-pointer' : 'csd-card'}
            style={{
                position: 'absolute',
                left: `${pos.x}mm`,
                top: `${pos.y}mm`,
                width: `${grid.cardWidth}mm`,
                height: `${grid.cardHeight}mm`,
                overflow: 'hidden',
                backgroundColor: background.color,
            }}
        >
            <CardImage bg={background} />
            {background.overlayOpacity > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: background.overlayColor,
                        opacity: background.overlayOpacity,
                    }}
                />
            )}
            {layout.frame && (
                <div
                    style={{
                        position: 'absolute',
                        inset: `${layout.frameInset}mm`,
                        border: `${layout.frameWidth}mm ${layout.frameStyle} ${layout.frameColor}`,
                        borderRadius: `${layout.frameRadius}mm`,
                    }}
                />
            )}
            <div
                ref={boxRef}
                style={{
                    position: 'absolute',
                    inset: `${s.padding}mm`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: JUSTIFY[s.vAlign],
                    overflow: 'hidden',
                }}
            >
                <div
                    ref={textRef}
                    style={{
                        fontFamily: s.fontFamily,
                        fontSize: `${s.fontSize}pt`,
                        lineHeight: s.lineHeight,
                        color: s.color,
                        textAlign: s.align,
                        fontWeight: s.bold ? 700 : 400,
                        fontStyle: s.italic ? 'italic' : 'normal',
                        textShadow: shadow,
                        overflowWrap: 'break-word',
                        ...(s.panel && hasText
                            ? {
                                  background: hexToRgba(
                                      s.panelColor,
                                      s.panelOpacity
                                  ),
                                  padding: '1.6mm 2.4mm',
                                  borderRadius: '1mm',
                                  alignSelf:
                                      s.align === 'left'
                                          ? 'flex-start'
                                          : s.align === 'right'
                                            ? 'flex-end'
                                            : 'center',
                              }
                            : {}),
                    }}
                >
                    {card.text && (
                        <div style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                            {card.text}
                        </div>
                    )}
                    {card.reference && (
                        <div
                            style={{
                                fontSize: `${s.refSize / s.fontSize}em`,
                                fontStyle: s.refItalic ? 'italic' : 'normal',
                                fontWeight: 400,
                                marginTop: card.text ? '0.55em' : 0,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {card.reference}
                        </div>
                    )}
                </div>
            </div>
            {interactive && !hasText && (
                <div className="csd-screen-only pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-[1mm] bg-white/85 px-[2.5mm] py-[1mm] font-sans text-[10pt] text-neutral-500">
                        Card {index + 1} · add text
                    </span>
                </div>
            )}
            {interactive && selected && (
                <div className="csd-screen-only pointer-events-none absolute inset-0 ring-[1.2mm] ring-sky-500 ring-inset" />
            )}
        </div>
    )
}

function GuideLines({
    grid,
    layout,
}: {
    grid: GridLayout
    layout: Design['layout']
}) {
    if (!layout.outline && !layout.cropMarks) {
        return null
    }
    const { xs, ys } = cutLines(grid)
    const markGap = 1.5
    const markLen = 5
    const marks: { x1: number; y1: number; x2: number; y2: number }[] = []
    if (layout.cropMarks) {
        const top = grid.marginY - markGap
        const bottom = grid.pageHeight - grid.marginY + markGap
        const left = grid.marginX - markGap
        const right = grid.pageWidth - grid.marginX + markGap
        if (top > 1) {
            for (const x of xs) {
                marks.push({
                    x1: x,
                    y1: Math.max(0.5, top - markLen),
                    x2: x,
                    y2: top,
                })
                marks.push({
                    x1: x,
                    y1: bottom,
                    x2: x,
                    y2: Math.min(grid.pageHeight - 0.5, bottom + markLen),
                })
            }
        }
        if (left > 1) {
            for (const y of ys) {
                marks.push({
                    x1: Math.max(0.5, left - markLen),
                    y1: y,
                    x2: left,
                    y2: y,
                })
                marks.push({
                    x1: right,
                    y1: y,
                    x2: Math.min(grid.pageWidth - 0.5, right + markLen),
                    y2: y,
                })
            }
        }
    }
    const cards = Array.from({ length: grid.perPage }, (_, i) =>
        cardPosition(grid, i)
    )
    return (
        <svg
            width={`${grid.pageWidth}mm`}
            height={`${grid.pageHeight}mm`}
            viewBox={`0 0 ${grid.pageWidth} ${grid.pageHeight}`}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            aria-hidden="true"
        >
            {layout.outline &&
                cards.map((p, i) => (
                    <rect
                        key={i}
                        x={p.x}
                        y={p.y}
                        width={grid.cardWidth}
                        height={grid.cardHeight}
                        fill="none"
                        stroke={layout.outlineColor}
                        strokeWidth={layout.outlineWidth}
                    />
                ))}
            {marks.map((m, i) => (
                <line key={`m${i}`} {...m} stroke="#000" strokeWidth={0.15} />
            ))}
        </svg>
    )
}

interface CardSheetProps {
    design: Design
    grid: GridLayout
    interactive?: boolean
    selectedIndex?: number
    onSelect?: (index: number) => void
    /** Only render this page (0-based); renders all pages when omitted. */
    page?: number
}

export default function CardSheet({
    design,
    grid,
    interactive = false,
    selectedIndex = -1,
    onSelect,
    page,
}: CardSheetProps) {
    const pages =
        page === undefined
            ? Array.from({ length: design.pages }, (_, i) => i)
            : [page]
    return (
        <>
            {pages.map((p) => (
                <div
                    key={p}
                    className="csd-page"
                    data-page={p + 1}
                    style={{
                        position: 'relative',
                        width: `${grid.pageWidth}mm`,
                        height: `${grid.pageHeight}mm`,
                        overflow: 'hidden',
                        background: '#ffffff',
                        color: '#000000',
                    }}
                >
                    {Array.from({ length: grid.perPage }, (_, i) => {
                        const index = p * grid.perPage + i
                        const card = design.cards[index]
                        if (!card) {
                            return null
                        }
                        return (
                            <CardFace
                                key={card.id}
                                card={{ ...card, ...textFor(design, card) }}
                                slot={i}
                                index={index}
                                background={backgroundFor(design, card)}
                                style={design.textStyle}
                                layout={design.layout}
                                grid={grid}
                                interactive={interactive}
                                selected={index === selectedIndex}
                                onSelect={() => onSelect?.(index)}
                            />
                        )
                    })}
                    <GuideLines grid={grid} layout={design.layout} />
                </div>
            ))}
        </>
    )
}
