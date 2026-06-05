import {
    getAllTags,
    getAllTools,
    getPopularTools,
    getRelatedTools,
    getToolBySlug,
    getToolsByCategory,
    scoreTools,
    searchTools,
} from '@/data/toolsData'
import { describe, expect, it } from 'vitest'

describe('toolsData helpers', () => {
    describe('getAllTags', () => {
        it('returns a sorted, de-duplicated list of tags', () => {
            const tags = getAllTags()
            const sorted = [...tags].sort()
            expect(tags).toEqual(sorted)
            expect(new Set(tags).size).toBe(tags.length)
        })

        it('includes tags that appear on multiple tools only once', () => {
            const tags = getAllTags()
            expect(tags.filter((t) => t === 'security')).toHaveLength(1)
        })
    })

    describe('getRelatedTools', () => {
        it('resolves explicit relatedSlugs and excludes the tool itself', () => {
            const related = getRelatedTools('base64-encoder-decoder')
            const slugs = related.map((t) => t.slug)
            expect(slugs).not.toContain('base64-encoder-decoder')
            expect(slugs).toContain('url-encoder-decoder')
        })

        it('respects the limit', () => {
            expect(getRelatedTools('base64-encoder-decoder', 2)).toHaveLength(2)
        })

        it('returns an empty array for an unknown slug', () => {
            expect(getRelatedTools('does-not-exist')).toEqual([])
        })
    })

    describe('searchTools / scoreTools', () => {
        it('returns every tool for an empty query', () => {
            expect(searchTools('')).toHaveLength(getAllTools().length)
        })

        it('matches by title', () => {
            const results = searchTools('byte converter')
            expect(results[0].slug).toBe('byte-converter')
        })

        it('matches by tag', () => {
            const results = searchTools('cidr')
            expect(results.map((t) => t.slug)).toContain('ip-subnet-calculator')
        })

        it('matches by keyword alias not present in title/description', () => {
            const results = searchTools('b64')
            expect(results.map((t) => t.slug)).toContain(
                'base64-encoder-decoder'
            )
        })

        it('ranks an exact title match above a description-only match', () => {
            const scored = scoreTools('hash')
            expect(scored[0].tool.slug).toBe('hash-generator')
        })

        it('requires every term to match (AND semantics)', () => {
            const results = searchTools('base64 zzzznotapresentterm')
            expect(results).toHaveLength(0)
        })

        it('returns no results for nonsense', () => {
            expect(searchTools('qwertyuiopzxcv')).toHaveLength(0)
        })
    })

    describe('category integrity', () => {
        it('places the reverse shell generator in the security category', () => {
            expect(getToolBySlug('reverse-shell-generator')?.category).toBe(
                'security'
            )
            expect(getToolsByCategory('security').map((t) => t.slug)).toContain(
                'reverse-shell-generator'
            )
        })

        it('exposes popular tools', () => {
            const popular = getPopularTools()
            expect(popular.length).toBeGreaterThan(0)
            expect(popular.every((t) => t.popular)).toBe(true)
        })
    })
})
