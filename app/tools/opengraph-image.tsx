import { getAllTools } from '@/data/toolsData'

import { ImageResponse } from 'next/og'

export const alt = 'Free online developer tools — Fx64b.dev'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
    const count = getAllTools().length

    return new ImageResponse(
        <div
            style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#0a0a0a',
                backgroundImage:
                    'radial-gradient(circle at 25px 25px, #1a1a1a 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a1a1a 2%, transparent 0%)',
                backgroundSize: '100px 100px',
                padding: '80px',
                color: '#fafafa',
                fontFamily: 'sans-serif',
            }}
        >
            <div
                style={{
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                }}
            >
                Fx64b.dev
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                    style={{
                        fontSize: 84,
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        marginBottom: 24,
                    }}
                >
                    Developer Tools
                </div>
                <div style={{ fontSize: 34, color: '#a1a1aa', maxWidth: 920 }}>
                    {`${count}+ free, browser-based tools. No ads, no tracking — everything runs locally.`}
                </div>
            </div>

            <div style={{ display: 'flex', fontSize: 24, color: '#71717a' }}>
                fx64b.dev/tools
            </div>
        </div>,
        { ...size }
    )
}
