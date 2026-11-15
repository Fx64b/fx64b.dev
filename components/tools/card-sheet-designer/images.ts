import type { ImageCredit } from './types'

/** A pickable image: a small preview plus the full-size source to print. */
export interface ImageResult {
    id: string
    thumb: string
    full: string
    credit: ImageCredit
}

export interface SearchPage {
    results: ImageResult[]
    hasMore: boolean
}

const OPENVERSE = 'https://api.openverse.org/v1/images/'

interface OpenverseImage {
    id: string
    title?: string
    url: string
    thumbnail?: string
    creator?: string
    license?: string
    license_version?: string
    foreign_landing_url?: string
}

/**
 * Searches Openverse (openly licensed photos from Flickr, Wikimedia and
 * others). Works anonymously from the browser; no API key needed.
 */
export async function searchOpenverse(
    query: string,
    page = 1,
    signal?: AbortSignal
): Promise<SearchPage> {
    const params = new URLSearchParams({
        q: query,
        page: String(page),
        // Anonymous requests are capped at 20 results per page.
        page_size: '20',
        mature: 'false',
    })
    const res = await fetch(`${OPENVERSE}?${params}`, { signal })
    if (res.status === 429) {
        throw new Error(
            'Too many searches - Openverse allows about 20 per minute. Try again shortly.'
        )
    }
    if (!res.ok) {
        const detail = await res
            .json()
            .then((d: { detail?: unknown }) =>
                typeof d?.detail === 'string' ? `: ${d.detail}` : ''
            )
            .catch(() => '')
        throw new Error(`Image search failed (${res.status})${detail}.`)
    }
    const data = (await res.json()) as {
        results?: OpenverseImage[]
        page_count?: number
    }
    const results = (data.results ?? [])
        .filter((r) => typeof r.url === 'string' && /^https?:\/\//.test(r.url))
        .map((r) => ({
            id: `ov-${r.id}`,
            thumb: r.thumbnail || r.url,
            full: r.url,
            credit: {
                provider: 'openverse' as const,
                title: r.title,
                creator: r.creator,
                license: r.license
                    ? `CC ${r.license.toUpperCase()} ${r.license_version ?? ''}`.trim()
                    : undefined,
                sourceUrl: r.foreign_landing_url,
            },
        }))
    return { results, hasMore: page < (data.page_count ?? 0) }
}

const PICSUM = 'https://picsum.photos'

interface PicsumImage {
    id: string
    author: string
    url: string
}

/** Picsum URL for a specific photo, cropped to the given pixel size. */
export function picsumUrl(id: string, width: number, height: number) {
    return `${PICSUM}/id/${encodeURIComponent(id)}/${width}/${height}`
}

/** A random-but-stable Picsum photo for the given seed. */
export function picsumSeedUrl(seed: string, width: number, height: number) {
    return `${PICSUM}/seed/${encodeURIComponent(seed)}/${width}/${height}`
}

/** Browses Lorem Picsum's catalogue (it has no keyword search). */
export async function listPicsum(
    page: number,
    size: { width: number; height: number },
    signal?: AbortSignal
): Promise<SearchPage> {
    const res = await fetch(`${PICSUM}/v2/list?page=${page}&limit=24`, {
        signal,
    })
    if (!res.ok) {
        throw new Error(`Lorem Picsum is not responding (${res.status}).`)
    }
    const data = (await res.json()) as PicsumImage[]
    const thumbH = Math.round((240 * size.height) / size.width)
    return {
        results: data.map((p) => ({
            id: `ps-${p.id}`,
            thumb: picsumUrl(p.id, 240, thumbH),
            full: picsumUrl(p.id, size.width, size.height),
            credit: {
                provider: 'picsum' as const,
                creator: p.author,
                license: 'Unsplash License',
                sourceUrl: p.url,
            },
        })),
        hasMore: data.length === 24,
    }
}

/**
 * Reads an image file and shrinks it so it stays sharp at 300 dpi on a
 * card but small enough to keep in the browser's storage.
 */
export async function fileToDataUrl(
    file: File,
    maxSide = 1600
): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw new Error('Please choose an image file.')
    }
    const bitmapUrl = URL.createObjectURL(file)
    try {
        const img = await loadImage(bitmapUrl)
        const scale = Math.min(
            1,
            maxSide / Math.max(img.naturalWidth, img.naturalHeight)
        )
        const w = Math.max(1, Math.round(img.naturalWidth * scale))
        const h = Math.max(1, Math.round(img.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            throw new Error('Could not read the image.')
        }
        ctx.drawImage(img, 0, 0, w, h)
        const keepAlpha =
            file.type === 'image/png' || file.type === 'image/webp'
        return keepAlpha
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.88)
    } finally {
        URL.revokeObjectURL(bitmapUrl)
    }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Could not read the image.'))
        img.src = src
    })
}

/** Accepts http(s) image links typed or pasted by the user. */
export function parseImageUrl(input: string): string | null {
    const value = input.trim()
    try {
        const url = new URL(value)
        return url.protocol === 'http:' || url.protocol === 'https:'
            ? url.href
            : null
    } catch {
        return null
    }
}
