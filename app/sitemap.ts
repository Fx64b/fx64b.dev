import { MetadataRoute } from 'next'

import { getPostBySlug, getPostSlugs } from '@/app/lib/posts'

export async function generateSitemaps() {
    const slugs = getPostSlugs()
    const postsPerSitemap = 50000 // Google's limit is 50,000 URLs per sitemap
    const totalSitemaps = Math.ceil(slugs.length / postsPerSitemap)

    return Array.from({ length: totalSitemaps }, (_, i) => ({ id: i }))
}

export default async function sitemap({
    id,
}: {
    id: number
}): Promise<MetadataRoute.Sitemap> {
    const BASE_URL = 'https://fx64b.dev'
    const slugs = getPostSlugs()
    const postsPerSitemap = 50000

    const start = id * postsPerSitemap
    const end = start + postsPerSitemap
    const slugsForSitemap = slugs.slice(start, end)

    return slugsForSitemap.map((slug: string) => {
        const post = getPostBySlug(slug.replace(/\.md$/, ''))
        return {
            url: `${BASE_URL}/blog/${slug.replace(/\.md$/, '')}`,
            lastModified: post?.date || new Date().toISOString(),
        }
    })
}
