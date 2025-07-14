import projectData from '@/data/projectData'
import { getAllTools } from '@/data/toolsData'

import { MetadataRoute } from 'next'

import { getPostBySlug, getPostSlugs } from '@/app/lib/posts'
import { getAllProjectDocs } from '@/app/lib/projects'

function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-')
}

export async function generateSitemaps() {
    const slugs = getPostSlugs()
    const tools = getAllTools()
    const featuredProjects = projectData.filter((project) => project.featured)

    const totalItems = slugs.length + tools.length + featuredProjects.length + 1 // +1 for main projects page
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
    const featuredProjects = projectData.filter((project) => project.featured)
    const projectDocs = getAllProjectDocs()
    const itemsPerSitemap = 50000

    const allItems = [
        ...slugs.map((slug) => ({
            type: 'blog' as const,
            slug: slug.replace(/\.md$/, ''),
        })),
        ...tools.map((tool) => ({
            type: 'tool' as const,
            slug: tool.slug,
            lastModified: new Date().toISOString(),
        })),
        {
            type: 'projects' as const,
            slug: '',
            lastModified: new Date().toISOString(),
        },
        ...featuredProjects.map((project) => ({
            type: 'project' as const,
            slug: titleToSlug(project.title),
            lastModified: new Date().toISOString(),
        })),
    ]

    const start = id * itemsPerSitemap
    const end = start + itemsPerSitemap
    const itemsForSitemap = allItems.slice(start, end)

    return itemsForSitemap.map((item) => {
        switch (item.type) {
            case 'blog': {
                const post = getPostBySlug(item.slug)
                return {
                    url: `${BASE_URL}/blog/${item.slug}`,
                    lastModified: post?.date || new Date().toISOString(),
                    changeFrequency: 'monthly' as const,
                    priority: 0.7,
                }
            }
            case 'tool': {
                return {
                    url: `${BASE_URL}/tools/${item.slug}`,
                    lastModified: new Date().toISOString(),
                    changeFrequency: 'monthly' as const,
                    priority: 0.6,
                }
            }
            case 'projects': {
                return {
                    url: `${BASE_URL}/projects`,
                    lastModified: new Date().toISOString(),
                    changeFrequency: 'weekly' as const,
                    priority: 0.8,
                }
            }
            case 'project': {
                // Try to get lastModified from project documentation if available
                const projectDoc = projectDocs.find(
                    (doc) =>
                        titleToSlug(doc.title) === item.slug ||
                        doc.slug === item.slug
                )

                return {
                    url: `${BASE_URL}/projects/${item.slug}`,
                    lastModified: projectDoc?.lastUpdated || item.lastModified,
                    changeFrequency: 'monthly' as const,
                    priority: 0.8,
                }
            }
            default: {
                // Fallback - should never reach here
                return {
                    url: `${BASE_URL}`,
                    lastModified: new Date().toISOString(),
                    changeFrequency: 'yearly' as const,
                    priority: 0.5,
                }
            }
        }
    })
}
