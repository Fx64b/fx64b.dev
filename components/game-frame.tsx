import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react'

import { type ReactNode, useEffect, useRef, useState } from 'react'

import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

interface GameFrameProps {
    /** The game page in /public, e.g. '/games/thornwick.html'. */
    src: string
    /** Accessible title of the iframe. */
    title: string
    /**
     * If set, the site theme goes to the game: first as ?theme= in the URL,
     * then as a postMessage of this type on every change, so a theme toggle
     * does not reload the game.
     */
    themeMessage?: string
    /** Short text under the game. */
    children?: ReactNode
}

// A game is a self-contained page in /public. It runs in an iframe so its
// full-screen layout, global styles and keyboard handling stay isolated from
// the site.
export function GameFrame({
    src,
    title,
    themeMessage,
    children,
}: GameFrameProps) {
    const { resolvedTheme } = useTheme()
    const frameRef = useRef<HTMLIFrameElement>(null)
    const wrapRef = useRef<HTMLDivElement>(null)
    const [fullscreen, setFullscreen] = useState(false)
    // Tools load on the client only, so `document` is there. iPhone Safari
    // has no element full screen; the new-tab link covers that case.
    const [canFullscreen] = useState(
        () => typeof document !== 'undefined' && document.fullscreenEnabled
    )
    // Only the first theme goes into the URL.
    const [initialTheme] = useState(resolvedTheme)
    const frameSrc = themeMessage ? `${src}?theme=${initialTheme}` : src

    const sendTheme = () => {
        if (themeMessage) {
            frameRef.current?.contentWindow?.postMessage(
                { type: themeMessage, theme: resolvedTheme },
                window.location.origin
            )
        }
    }

    useEffect(() => {
        const onChange = () =>
            setFullscreen(document.fullscreenElement === wrapRef.current)
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    useEffect(sendTheme, [resolvedTheme])

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen()
        } else {
            void wrapRef.current?.requestFullscreen()
        }
    }

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                {canFullscreen && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleFullscreen}
                    >
                        {fullscreen ? <Minimize2 /> : <Maximize2 />}
                        {fullscreen ? 'Exit full screen' : 'Full screen'}
                    </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                    <a href={src} target="_blank" rel="noopener">
                        <ExternalLink />
                        Open in new tab
                    </a>
                </Button>
            </div>

            <div
                ref={wrapRef}
                className="border-border bg-muted overflow-hidden rounded-lg border"
            >
                <iframe
                    ref={frameRef}
                    src={frameSrc}
                    title={title}
                    className={
                        fullscreen
                            ? 'block h-screen w-full'
                            : 'block h-[75vh] max-h-[820px] min-h-[520px] w-full'
                    }
                    allow="fullscreen; autoplay"
                    onLoad={sendTheme}
                />
            </div>

            {children && (
                <p className="text-muted-foreground mt-3 text-[13.5px] leading-[1.7]">
                    {children}
                </p>
            )}
        </div>
    )
}
