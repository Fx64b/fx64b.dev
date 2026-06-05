import { getAllTools, getToolBySlug } from '@/data/toolsData'

import { ImageResponse } from 'next/og'

export const alt = 'Fx64b.dev developer tool'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
    return getAllTools().map((tool) => ({ slug: tool.slug }))
}

export default async function Image({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    const tool = getToolBySlug(slug)

    const title = tool?.title ?? 'Developer Tools'
    const description =
        tool?.summary ??
        tool?.description ??
        'Free, browser-based tools for developers.'
    const category = tool?.category ?? 'tools'

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
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                    style={{
                        fontSize: 28,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                    }}
                >
                    Fx64b.dev
                </div>
                <div
                    style={{
                        marginLeft: 20,
                        padding: '6px 16px',
                        border: '1px solid #333',
                        borderRadius: 9999,
                        fontSize: 22,
                        color: '#a1a1aa',
                        textTransform: 'capitalize',
                    }}
                >
                    {category}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.05,
                        marginBottom: 24,
                    }}
                >
                    {title}
                </div>
                <div
                    style={{
                        fontSize: 32,
                        color: '#a1a1aa',
                        lineHeight: 1.3,
                        maxWidth: 900,
                    }}
                >
                    {description}
                </div>
            </div>

            <div style={{ display: 'flex', fontSize: 24, color: '#71717a' }}>
                fx64b.dev/tools
            </div>
        </div>,
        { ...size }
    )
}
