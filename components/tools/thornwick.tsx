import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react'

import { useEffect, useRef, useState } from 'react'

import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

// The game is a self-contained page in /public. It runs in an iframe so its
// full-screen layout, global styles and keyboard handling stay isolated from
// the site.
const GAME_PATH = '/games/thornwick.html'

export default function Thornwick() {
    const { resolvedTheme } = useTheme()
    const frameRef = useRef<HTMLIFrameElement>(null)
    const wrapRef = useRef<HTMLDivElement>(null)
    const [fullscreen, setFullscreen] = useState(false)
    // Tools load on the client only, so `document` is there. iPhone Safari
    // has no element full screen; the new-tab link covers that case.
    const [canFullscreen] = useState(
        () => typeof document !== 'undefined' && document.fullscreenEnabled
    )
    // Only the first theme goes into the URL. Later changes are sent with
    // postMessage, so a theme toggle does not reload the game.
    const [initialTheme] = useState(resolvedTheme)

    useEffect(() => {
        const onChange = () =>
            setFullscreen(document.fullscreenElement === wrapRef.current)
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    useEffect(() => {
        frameRef.current?.contentWindow?.postMessage(
            { type: 'thornwick:theme', theme: resolvedTheme },
            window.location.origin
        )
    }, [resolvedTheme])

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
                    <a href={GAME_PATH} target="_blank" rel="noopener">
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
                    src={`${GAME_PATH}?theme=${initialTheme}`}
                    title="Thornwick: castle and village builder"
                    className={
                        fullscreen
                            ? 'block h-screen w-full'
                            : 'block h-[75vh] max-h-[820px] min-h-[520px] w-full'
                    }
                    allow="fullscreen"
                    onLoad={() =>
                        frameRef.current?.contentWindow?.postMessage(
                            { type: 'thornwick:theme', theme: resolvedTheme },
                            window.location.origin
                        )
                    }
                />
            </div>

            <p className="text-muted-foreground mt-3 text-[13.5px] leading-[1.7]">
                Press <strong>How to play</strong> in the game for a short
                guide. Tap any building to see what it does and how well it
                works. The game keeps no saves: each visit starts a new realm.
            </p>
        </div>
    )
}
