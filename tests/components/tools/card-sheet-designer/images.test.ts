import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    listPicsum,
    parseImageUrl,
    picsumSeedUrl,
    picsumUrl,
    searchOpenverse,
} from '@/components/tools/card-sheet-designer/images'

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

afterEach(() => {
    vi.restoreAllMocks()
})

describe('searchOpenverse', () => {
    it('queries anonymously within the 20-per-page limit and maps results', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            json({
                page_count: 3,
                results: [
                    {
                        id: 'abc',
                        title: 'Snow',
                        url: 'https://live.staticflickr.com/a.jpg',
                        thumbnail:
                            'https://api.openverse.org/v1/images/abc/thumb/',
                        creator: 'Ann',
                        license: 'by-sa',
                        license_version: '2.0',
                        foreign_landing_url: 'https://flickr.com/x',
                    },
                    { id: 'bad', url: 'javascript:alert(1)' },
                ],
            })
        )
        const page = await searchOpenverse('snow hills', 2)
        const url = new URL(String(fetchMock.mock.calls[0][0]))
        expect(url.origin + url.pathname).toBe(
            'https://api.openverse.org/v1/images/'
        )
        expect(url.searchParams.get('q')).toBe('snow hills')
        expect(url.searchParams.get('page')).toBe('2')
        expect(Number(url.searchParams.get('page_size'))).toBeLessThanOrEqual(
            20
        )
        expect(page.hasMore).toBe(true)
        expect(page.results).toEqual([
            {
                id: 'ov-abc',
                thumb: 'https://api.openverse.org/v1/images/abc/thumb/',
                full: 'https://live.staticflickr.com/a.jpg',
                credit: {
                    provider: 'openverse',
                    title: 'Snow',
                    creator: 'Ann',
                    license: 'CC BY-SA 2.0',
                    sourceUrl: 'https://flickr.com/x',
                },
            },
        ])
    })

    it('explains rate limits and API errors', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({}, 429))
        await expect(searchOpenverse('a')).rejects.toThrow(/20 per minute/)
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            json({ detail: 'nope' }, 401)
        )
        await expect(searchOpenverse('a')).rejects.toThrow(
            'Image search failed (401): nope.'
        )
    })
})

describe('Lorem Picsum', () => {
    it('builds sized URLs', () => {
        expect(picsumUrl('10', 1004, 650)).toBe(
            'https://picsum.photos/id/10/1004/650'
        )
        expect(picsumSeedUrl('a b', 10, 20)).toBe(
            'https://picsum.photos/seed/a%20b/10/20'
        )
    })

    it('lists photos at the card aspect ratio', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            json([
                {
                    id: '7',
                    author: 'Alex',
                    url: 'https://unsplash.com/photos/x',
                },
            ])
        )
        const page = await listPicsum(1, { width: 1004, height: 650 })
        expect(page.hasMore).toBe(false)
        expect(page.results[0]).toMatchObject({
            id: 'ps-7',
            thumb: 'https://picsum.photos/id/7/240/155',
            full: 'https://picsum.photos/id/7/1004/650',
            credit: { provider: 'picsum', creator: 'Alex' },
        })
    })

    it('reports when the service is down', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('error', { status: 522 })
        )
        await expect(listPicsum(1, { width: 10, height: 10 })).rejects.toThrow(
            /522/
        )
    })
})

describe('parseImageUrl', () => {
    it('accepts only http(s) links', () => {
        expect(parseImageUrl('  https://example.com/a.png ')).toBe(
            'https://example.com/a.png'
        )
        expect(parseImageUrl('javascript:alert(1)')).toBeNull()
        expect(parseImageUrl('not a url')).toBeNull()
    })
})
