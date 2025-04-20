import { getAllTools } from '@/data/toolsData'

import { MetadataRoute } from 'next'

import { getPostBySlug, getPostSlugs } from '@/app/lib/posts'

export async function generateSitemaps() {
    const slugs = getPostSlugs()
    const tools = getAllTools()
    const totalItems = slugs.length + tools.length
    const itemsPerSitemap = 50000 // Google's limit is 50,000 URLs per sitemap
    const totalSitemaps = Math.ceil(totalItems / itemsPerSitemap)

    return Array.from({ length: totalSitemaps }, (_, i) => ({ id: i }))
}

export default async function sitemap({
    id,
}: {
    id: number
}): Promise<MetadataRoute.Sitemap> {
    const BASE_URL = 'https://fx64b.dev'
    const slugs = getPostSlugs()
    const tools = getAllTools()
    const itemsPerSitemap = 50000

    // Combine both blog posts and tools
    const allItems = [
        ...slugs.map((slug) => ({
            type: 'blog',
            slug: slug.replace(/\.md$/, ''),
        })),
        ...tools.map((tool) => ({
            type: 'tool',
            slug: tool.slug,
            lastModified: new Date().toISOString(),
        })),
    ]

    const start = id * itemsPerSitemap
    const end = start + itemsPerSitemap
    const itemsForSitemap = allItems.slice(start, end)

    return itemsForSitemap.map((item) => {
        if (item.type === 'blog') {
            const post = getPostBySlug(item.slug)
            return {
                url: `${BASE_URL}/blog/${item.slug}`,
                lastModified: post?.date || new Date().toISOString(),
            }
        } else {
            return {
                url: `${BASE_URL}/tools/${item.slug}`,
                lastModified: new Date().toISOString(),
                changeFrequency: 'monthly' as const,
            }
        }
    })
}
