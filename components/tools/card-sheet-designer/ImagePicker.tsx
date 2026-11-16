import {
    ImageIcon,
    Link2,
    Loader2,
    Search,
    Shuffle,
    Upload,
} from 'lucide-react'

import { useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
    type ImageResult,
    fileToDataUrl,
    listPicsum,
    parseImageUrl,
    searchOpenverse,
} from './images'
import type { ImageCredit } from './types'

type Source = 'search' | 'picsum' | 'upload' | 'link'

const SOURCES: { id: Source; label: string; icon: typeof Search }[] = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'picsum', label: 'Lorem Picsum', icon: ImageIcon },
    { id: 'upload', label: 'Your photo', icon: Upload },
    { id: 'link', label: 'Link', icon: Link2 },
]

const SUGGESTIONS = [
    'christmas',
    'snow',
    'stars',
    'candle',
    'flowers',
    'mountains',
    'sunrise',
    'cross',
]

export interface ImagePickerProps {
    /** Who the picked image goes to, e.g. "all cards" or "card 3". */
    targetLabel: string
    /** Pixel size to request from Lorem Picsum. */
    pixelSize: { width: number; height: number }
    onPick: (image: string, credit: ImageCredit) => void
    /** Spreads results over the cards; only offered in individual mode. */
    onFillMany?: (images: ImageResult[]) => void
    /** Gives every card a different random Picsum photo. */
    onRandomEach?: () => void
}

export default function ImagePicker({
    targetLabel,
    pixelSize,
    onPick,
    onFillMany,
    onRandomEach,
}: ImagePickerProps) {
    const [source, setSource] = useState<Source>('search')
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ImageResult[]>([])
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [link, setLink] = useState('')
    const abortRef = useRef<AbortController | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const load = async (
        kind: 'search' | 'picsum',
        nextPage: number,
        q = query
    ) => {
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl
        setLoading(true)
        setError(null)
        try {
            const res =
                kind === 'search'
                    ? await searchOpenverse(q, nextPage, ctrl.signal)
                    : await listPicsum(nextPage, pixelSize, ctrl.signal)
            setResults((prev) =>
                nextPage === 1 ? res.results : [...prev, ...res.results]
            )
            setPage(nextPage)
            setHasMore(res.hasMore)
            if (res.results.length === 0 && nextPage === 1) {
                setError('No images found. Try another word.')
            }
        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                setError(
                    e instanceof TypeError
                        ? 'Could not reach the image service. Check your connection.'
                        : (e as Error).message
                )
            }
        } finally {
            if (abortRef.current === ctrl) {
                setLoading(false)
            }
        }
    }

    const switchSource = (s: Source) => {
        abortRef.current?.abort()
        setSource(s)
        setResults([])
        setError(null)
        setHasMore(false)
        setLoading(false)
        if (s === 'picsum') {
            void load('picsum', 1)
        }
    }

    const runSearch = (q: string) => {
        const trimmed = q.trim()
        if (!trimmed) {
            return
        }
        setQuery(trimmed)
        void load('search', 1, trimmed)
    }

    const onFile = async (file: File | undefined) => {
        if (!file) {
            return
        }
        setError(null)
        setLoading(true)
        try {
            const dataUrl = await fileToDataUrl(file)
            onPick(dataUrl, { provider: 'upload', title: file.name })
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setLoading(false)
            if (fileRef.current) {
                fileRef.current.value = ''
            }
        }
    }

    const applyLink = () => {
        const url = parseImageUrl(link)
        if (!url) {
            setError('Please enter a full image link starting with https://')
            return
        }
        setError(null)
        onPick(url, { provider: 'url', sourceUrl: url })
        setLink('')
    }

    return (
        <div className="space-y-3">
            <div
                className="flex flex-wrap gap-1.5"
                role="tablist"
                aria-label="Image source"
            >
                {SOURCES.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={source === id}
                        onClick={() => switchSource(id)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] transition-colors',
                            source === id
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className="size-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {source === 'search' && (
                <div className="space-y-2">
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault()
                            runSearch(query)
                        }}
                    >
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search free photos, e.g. snow, stars, candle"
                            aria-label="Search free photos"
                        />
                        <Button
                            type="submit"
                            disabled={loading || !query.trim()}
                        >
                            Search
                        </Button>
                    </form>
                    <div className="flex flex-wrap gap-1">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => runSearch(s)}
                                className="text-muted-foreground hover:text-foreground rounded-full border px-2 py-0.5 text-[12px]"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <p className="text-muted-foreground text-[12px]">
                        Openly licensed photos via Openverse. Your search words
                        are sent to Openverse; card texts never leave your
                        browser. Check the licence before printing cards for
                        sale.
                    </p>
                </div>
            )}

            {source === 'picsum' && (
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-muted-foreground text-[12px]">
                        Free photos from Lorem Picsum (Unsplash licence).
                    </p>
                    {onRandomEach && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={onRandomEach}
                        >
                            <Shuffle className="size-3.5" />
                            Random photo on every card
                        </Button>
                    )}
                </div>
            )}

            {source === 'upload' && (
                <div className="space-y-2">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        aria-label="Upload image"
                        className="hidden"
                        onChange={(e) => void onFile(e.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileRef.current?.click()}
                        disabled={loading}
                    >
                        <Upload className="size-4" />
                        Choose a photo from your device
                    </Button>
                    <p className="text-muted-foreground text-[12px]">
                        The image stays in your browser. Large photos are scaled
                        down to 1600&nbsp;px, plenty for 300&nbsp;dpi cards.
                    </p>
                </div>
            )}

            {source === 'link' && (
                <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault()
                        applyLink()
                    }}
                >
                    <Input
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        aria-label="Image link"
                    />
                    <Button type="submit" disabled={!link.trim()}>
                        Use
                    </Button>
                </form>
            )}

            {error && (
                <p role="alert" className="text-destructive text-[13px]">
                    {error}
                </p>
            )}

            {(source === 'search' || source === 'picsum') &&
                results.length > 0 && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-muted-foreground text-[12px]">
                                Click a photo to use it for {targetLabel}.
                            </p>
                            {onFillMany && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onFillMany(results)}
                                >
                                    Different photo on every card
                                </Button>
                            )}
                        </div>
                        <div className="grid max-h-[340px] grid-cols-3 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-4">
                            {results.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => onPick(r.full, r.credit)}
                                    title={[
                                        r.credit.title,
                                        r.credit.creator &&
                                            `by ${r.credit.creator}`,
                                        r.credit.license,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    className="group bg-muted relative aspect-[3/2] overflow-hidden rounded-md focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
                                >
                                    <img
                                        src={r.thumb}
                                        alt={r.credit.title || 'Photo'}
                                        loading="lazy"
                                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                    />
                                </button>
                            ))}
                        </div>
                        {hasMore && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                onClick={() =>
                                    void load(
                                        source === 'search'
                                            ? 'search'
                                            : 'picsum',
                                        page + 1
                                    )
                                }
                            >
                                Load more
                            </Button>
                        )}
                    </>
                )}

            {loading && (
                <p className="text-muted-foreground flex items-center gap-2 text-[13px]">
                    <Loader2 className="size-4 animate-spin" /> Loading...
                </p>
            )}
        </div>
    )
}
