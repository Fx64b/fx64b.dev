import {
    AlertCircleIcon,
    Check,
    Flashlight,
    FlashlightOff,
    Loader2,
    ScanLine,
    X,
} from 'lucide-react'

import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { signatureDistance } from './cv-pipeline'
import { maxCornerDelta, nextStableSince, quadArea } from './imaging'
import { detect } from './scanner-client'
import type { Quad } from './types'

interface CameraViewProps {
    /** Called with each captured photo, in capture order. */
    onCapture: (blob: Blob) => void
    onDone: () => void
    pageCount: number
    /** Shown instead of the page counter when replacing a single page. */
    retakeLabel?: string
    scannerReady: boolean
}

type CameraError = 'insecure' | 'unsupported' | 'denied' | 'notfound' | 'other'

const DETECT_INTERVAL = 150
const DETECT_SIDE = 480
const AUTO_MIN_AREA = 0.25
const AUTO_HOLD_MS = 1000
// After an auto-capture, the next one waits until a new page is in view:
// the outline moved this much (fraction of the frame)...
const REARM_MOVE = 0.05
// ...or the page content changed this much (see signatureDistance)...
const REARM_CONTENT = 0.3
// ...or no page was seen for this many consecutive detections.
const REARM_MISSES = 3

const ERROR_TEXT: Record<CameraError, { title: string; body: string }> = {
    insecure: {
        title: 'Camera needs a secure connection',
        body: 'Browsers only allow camera access over HTTPS. Open this page via https:// to scan.',
    },
    unsupported: {
        title: 'Camera not supported',
        body: 'This browser does not support camera access. Try a recent version of Chrome, Safari or Firefox.',
    },
    denied: {
        title: 'Camera permission denied',
        body: 'Allow camera access for this site in your browser settings, then try again.',
    },
    notfound: {
        title: 'No camera found',
        body: 'No usable camera was detected on this device.',
    },
    other: {
        title: 'Could not start the camera',
        body: 'The camera may be in use by another app. Close it and try again.',
    },
}

function classifyError(err: unknown): CameraError {
    const name = (err as { name?: string })?.name
    if (name === 'NotAllowedError' || name === 'SecurityError') {
        return 'denied'
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        return 'notfound'
    }
    return 'other'
}

async function grabFrame(video: HTMLVideoElement): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Capture failed'))),
            'image/jpeg',
            0.92
        )
    )
}

export default function CameraView({
    onCapture,
    onDone,
    pageCount,
    retakeLabel,
    scannerReady,
}: CameraViewProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [error, setError] = useState<CameraError | null>(null)
    const [starting, setStarting] = useState(true)
    const [videoSize, setVideoSize] = useState<{ w: number; h: number }>()
    const [quad, setQuad] = useState<Quad | null>(null)
    const [autoCapture, setAutoCapture] = useState(false)
    const [holdProgress, setHoldProgress] = useState(0)
    const [torchSupported, setTorchSupported] = useState(false)
    const [torchOn, setTorchOn] = useState(false)
    const [flash, setFlash] = useState(false)
    const [capturing, setCapturing] = useState(false)

    // Mutable loop state, read inside the detection loop without re-renders.
    const loop = useRef({
        quad: null as Quad | null,
        stableSince: null as number | null,
        armed: true,
        capturedQuad: null as Quad | null,
        capturedSignature: null as number[] | null,
        misses: 0,
        busy: false,
    })
    const autoRef = useRef(autoCapture)
    useEffect(() => {
        autoRef.current = autoCapture
    })
    const capturingRef = useRef(false)

    // Start the camera.
    useEffect(() => {
        let cancelled = false
        async function start() {
            if (!window.isSecureContext) {
                setError('insecure')
                setStarting(false)
                return
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                setError('unsupported')
                setStarting(false)
                return
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 3840 },
                        height: { ideal: 2160 },
                    },
                })
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }
                streamRef.current = stream
                const track = stream.getVideoTracks()[0]
                const caps = (track.getCapabilities?.() ?? {}) as {
                    torch?: boolean
                }
                setTorchSupported(Boolean(caps.torch))
                const video = videoRef.current
                if (video) {
                    video.srcObject = stream
                    await video.play().catch(() => undefined)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(classifyError(err))
                }
            } finally {
                if (!cancelled) {
                    setStarting(false)
                }
            }
        }
        start()
        return () => {
            cancelled = true
            streamRef.current?.getTracks().forEach((t) => t.stop())
            streamRef.current = null
        }
    }, [])

    const capture = useCallback(async () => {
        const video = videoRef.current
        const stream = streamRef.current
        if (!video || !stream || capturingRef.current || !video.videoWidth) {
            return
        }
        capturingRef.current = true
        setCapturing(true)
        setFlash(true)
        setTimeout(() => setFlash(false), 180)
        navigator.vibrate?.(40)
        try {
            let blob: Blob | null = null
            const track = stream.getVideoTracks()[0]
            const ImageCaptureCtor = (
                window as unknown as {
                    ImageCapture?: new (t: MediaStreamTrack) => {
                        takePhoto: () => Promise<Blob>
                    }
                }
            ).ImageCapture
            // takePhoto uses the full sensor resolution where available;
            // fall back to the video frame if it is missing or slow.
            if (ImageCaptureCtor && !torchOn) {
                try {
                    blob = await Promise.race([
                        new ImageCaptureCtor(track).takePhoto(),
                        new Promise<null>((r) =>
                            setTimeout(() => r(null), 4000)
                        ),
                    ])
                } catch {
                    blob = null
                }
            }
            onCapture(blob ?? (await grabFrame(video)))
        } finally {
            capturingRef.current = false
            setCapturing(false)
        }
    }, [onCapture, torchOn])

    const captureRef = useRef(capture)
    useEffect(() => {
        captureRef.current = capture
    })

    // Live detection loop.
    useEffect(() => {
        if (!scannerReady || error) {
            return
        }
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        let stopped = false
        let timer: ReturnType<typeof setTimeout>

        const tick = async () => {
            const video = videoRef.current
            const state = loop.current
            if (
                video &&
                video.videoWidth &&
                !state.busy &&
                document.visibilityState === 'visible'
            ) {
                state.busy = true
                try {
                    const scale =
                        DETECT_SIDE /
                        Math.max(video.videoWidth, video.videoHeight)
                    canvas.width = Math.round(video.videoWidth * scale)
                    canvas.height = Math.round(video.videoHeight * scale)
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                    const bitmap = await createImageBitmap(canvas)
                    const result = await detect(bitmap, DETECT_SIDE)
                    if (stopped) {
                        return
                    }
                    const now = performance.now()
                    const next = result.quad
                    state.stableSince = nextStableSince(
                        state.quad,
                        next,
                        state.stableSince,
                        now
                    )
                    state.quad = next
                    setQuad(next)

                    // Re-arm auto-capture once a different page is in view.
                    state.misses = next ? 0 : state.misses + 1
                    if (!state.armed) {
                        const gone = state.misses >= REARM_MISSES
                        const moved =
                            next &&
                            state.capturedQuad &&
                            maxCornerDelta(next, state.capturedQuad) >
                                REARM_MOVE
                        const changed =
                            result.signature &&
                            state.capturedSignature &&
                            signatureDistance(
                                result.signature,
                                state.capturedSignature
                            ) > REARM_CONTENT
                        if (gone || moved || changed) {
                            state.armed = true
                        }
                    }

                    const eligible =
                        autoRef.current &&
                        state.armed &&
                        next &&
                        quadArea(next) >= AUTO_MIN_AREA &&
                        state.stableSince !== null
                    const held = eligible ? now - state.stableSince! : 0
                    setHoldProgress(
                        eligible ? Math.min(1, held / AUTO_HOLD_MS) : 0
                    )
                    if (eligible && held >= AUTO_HOLD_MS) {
                        state.armed = false
                        state.capturedQuad = next
                        state.capturedSignature = result.signature ?? null
                        setHoldProgress(0)
                        captureRef.current()
                    }
                } catch {
                    // A dropped frame is harmless; try again next tick.
                } finally {
                    state.busy = false
                }
            }
            if (!stopped) {
                timer = setTimeout(tick, DETECT_INTERVAL)
            }
        }
        tick()
        return () => {
            stopped = true
            clearTimeout(timer)
        }
    }, [scannerReady, error])

    const toggleTorch = async () => {
        const track = streamRef.current?.getVideoTracks()[0]
        if (!track) {
            return
        }
        try {
            await track.applyConstraints({
                advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
            })
            setTorchOn(!torchOn)
        } catch {
            setTorchSupported(false)
        }
    }

    if (error) {
        return (
            <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertCircleIcon className="h-5 w-5" />
                    <AlertTitle>{ERROR_TEXT[error].title}</AlertTitle>
                    <AlertDescription>
                        {ERROR_TEXT[error].body}
                    </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={onDone}>
                    Back
                </Button>
            </div>
        )
    }

    const aspect = videoSize ? `${videoSize.w} / ${videoSize.h}` : '3 / 4'

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="relative mx-auto max-h-[70vh] w-full max-w-full overflow-hidden rounded-lg bg-black"
                style={{
                    aspectRatio: aspect,
                    width: videoSize
                        ? `min(100%, calc(70vh * ${videoSize.w / videoSize.h}))`
                        : undefined,
                }}
            >
                <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    playsInline
                    muted
                    autoPlay
                    onLoadedMetadata={(e) =>
                        setVideoSize({
                            w: e.currentTarget.videoWidth,
                            h: e.currentTarget.videoHeight,
                        })
                    }
                    aria-label="Camera preview"
                />
                {quad && (
                    <svg
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox="0 0 1 1"
                        preserveAspectRatio="none"
                        data-testid="detected-outline"
                    >
                        <polygon
                            points={quad.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(34,197,94,0.15)"
                            stroke="rgb(34,197,94)"
                            strokeWidth={3}
                            vectorEffect="non-scaling-stroke"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
                <div
                    className={cn(
                        'pointer-events-none absolute inset-0 bg-white transition-opacity duration-150',
                        flash ? 'opacity-70' : 'opacity-0'
                    )}
                />
                {(starting || !scannerReady) && (
                    <div className="absolute inset-x-0 top-3 flex justify-center">
                        <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                            <Loader2 className="size-3 animate-spin" />
                            {starting
                                ? 'Starting camera…'
                                : 'Loading page detection…'}
                        </span>
                    </div>
                )}
                <div className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                    {retakeLabel ??
                        `${pageCount} page${pageCount === 1 ? '' : 's'}`}
                </div>
            </div>

            <div className="flex w-full max-w-md items-center justify-between gap-2">
                <div className="flex gap-2">
                    <Button
                        variant={autoCapture ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAutoCapture((v) => !v)}
                        aria-pressed={autoCapture}
                        disabled={!!retakeLabel}
                        title="Capture automatically when the page is steady"
                    >
                        <ScanLine />
                        Auto
                    </Button>
                    {torchSupported && (
                        <Button
                            variant={torchOn ? 'default' : 'outline'}
                            size="icon-sm"
                            onClick={toggleTorch}
                            aria-label={
                                torchOn ? 'Turn torch off' : 'Turn torch on'
                            }
                            aria-pressed={torchOn}
                        >
                            {torchOn ? <Flashlight /> : <FlashlightOff />}
                        </Button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={capture}
                    disabled={starting || capturing}
                    aria-label="Capture page"
                    className="border-primary bg-background relative flex size-16 shrink-0 items-center justify-center rounded-full border-4 transition-transform active:scale-95 disabled:opacity-50"
                >
                    <span className="bg-primary size-11 rounded-full" />
                    {holdProgress > 0 && (
                        <svg
                            className="absolute -inset-1 -rotate-90"
                            viewBox="0 0 36 36"
                        >
                            <circle
                                cx="18"
                                cy="18"
                                r="16.5"
                                fill="none"
                                stroke="rgb(34,197,94)"
                                strokeWidth="3"
                                strokeDasharray={`${holdProgress * 103.7} 103.7`}
                            />
                        </svg>
                    )}
                </button>

                <Button
                    size="sm"
                    variant={pageCount > 0 ? 'default' : 'outline'}
                    onClick={onDone}
                >
                    {pageCount > 0 || retakeLabel ? <Check /> : <X />}
                    {retakeLabel ? 'Cancel' : pageCount > 0 ? 'Done' : 'Close'}
                </Button>
            </div>
            <p className="text-muted-foreground text-center text-xs">
                Lay the page flat on a contrasting surface. Pages are added in
                the order you capture them.
            </p>
        </div>
    )
}
