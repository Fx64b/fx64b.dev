import fs from 'node:fs'
import path from 'node:path'

import projectData from './data/projectData'
import toolsData from './data/toolsData'
import { type CollectionItem, loadCollection } from './vite-plugin-content'

const BASE_URL = 'https://fx64b.dev'

function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-')
}

interface SitemapEntry {
    url: string
    lastModified: string
    changeFrequency: string
    priority: number
}

/**
 * Generates sitemap.xml mirroring (and extending) the previous Next.js
 * `app/sitemap.ts` output, plus the static index routes for fuller coverage.
 */
export function generateSeoFiles(outDir: string): void {
    const posts = loadCollection('blog')
    const projectDocs = loadCollection('projects')
    const featuredProjects = projectData.filter((project) => project.featured)
    const now = new Date().toISOString()

    const findDoc = (slug: string): CollectionItem | undefined =>
        projectDocs.find(
            (doc) =>
                titleToSlug(String(doc.data.title ?? doc.slug)) === slug ||
                doc.slug === slug
        )

    const entries: SitemapEntry[] = [
        {
            url: `${BASE_URL}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/blog`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/projects`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/tools`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        ...posts.map((post) => ({
            url: `${BASE_URL}/blog/${post.slug}`,
            lastModified: String(post.data.date ?? now),
            changeFrequency: 'monthly',
            priority: 0.7,
        })),
        ...toolsData.map((tool) => ({
            url: `${BASE_URL}/tools/${tool.slug}`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.6,
        })),
        ...featuredProjects.map((project) => {
            const slug = titleToSlug(project.title)
            const doc = findDoc(slug)
            return {
                url: `${BASE_URL}/projects/${slug}`,
                lastModified: doc?.data.lastUpdated
                    ? String(doc.data.lastUpdated)
                    : now,
                changeFrequency: 'monthly',
                priority: 0.8,
            }
        }),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
    .map(
        (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n')}
</urlset>
`

    fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8')
}
