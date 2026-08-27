import fs from 'node:fs'
import path from 'node:path'

import projectData from './data/projectData.ts'
import toolsData from './data/toolsData.ts'
import { type CollectionItem, loadCollection } from './vite-plugin-content.ts'

const BASE_URL = 'https://fx64b.dev'

function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-')
}

interface SitemapEntry {
    url: string
    /**
     * Real content-change date (W3C / ISO). Omitted when we have no reliable
     * signal - Google only trusts `lastmod` when it is accurate, and a value
     * that changes on every deploy (e.g. build time) trains it to ignore the
     * field, so an absent date is better than a fabricated one. Google ignores
     * `<priority>` and `<changefreq>` entirely, so we don't emit them.
     */
    lastModified?: string
}

/** Newest ISO/`YYYY-MM-DD` date from a list; undefined if none are present. */
function newestDate(dates: Array<unknown>): string | undefined {
    const valid = dates
        .filter((d) => d !== null && d !== undefined && d !== '')
        .map(String)
        .sort()
    return valid.length > 0 ? valid[valid.length - 1] : undefined
}

/**
 * Generates sitemap.xml. Only canonical, indexable URLs are listed. `lastmod`
 * is derived from real content dates (blog frontmatter `date`, project
 * `lastUpdated`) and left off for pages that have no dependable change date.
 */
export function generateSeoFiles(outDir: string): void {
    const posts = loadCollection('blog')
    const projectDocs = loadCollection('projects')
    const featuredProjects = projectData.filter((project) => project.featured)

    const findDoc = (slug: string): CollectionItem | undefined =>
        projectDocs.find(
            (doc) =>
                titleToSlug(String(doc.data.title ?? doc.slug)) === slug ||
                doc.slug === slug
        )

    const postDates = posts.map((post) => post.data.date)
    const projectUpdatedDates = featuredProjects.map((project) => {
        const doc = findDoc(titleToSlug(project.title))
        return doc?.data.lastUpdated
    })

    const entries: SitemapEntry[] = [
        {
            url: `${BASE_URL}`,
            lastModified: newestDate([...postDates, ...projectUpdatedDates]),
        },
        {
            url: `${BASE_URL}/blog`,
            lastModified: newestDate(postDates),
        },
        {
            url: `${BASE_URL}/projects`,
            lastModified: newestDate(projectUpdatedDates),
        },
        {
            // No per-tool change dates tracked, so no reliable index date.
            url: `${BASE_URL}/tools`,
        },
        {
            // Content lives in data/oscp/*; no change date is tracked for it.
            url: `${BASE_URL}/cheatsheet`,
        },
        ...posts.map((post) => ({
            url: `${BASE_URL}/blog/${post.slug}`,
            lastModified: post.data.date ? String(post.data.date) : undefined,
        })),
        ...toolsData.map((tool) => ({
            url: `${BASE_URL}/tools/${tool.slug}`,
        })),
        ...featuredProjects.map((project) => {
            const slug = titleToSlug(project.title)
            const doc = findDoc(slug)
            return {
                url: `${BASE_URL}/projects/${slug}`,
                lastModified: doc?.data.lastUpdated
                    ? String(doc.data.lastUpdated)
                    : undefined,
            }
        }),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
    .map((entry) => {
        const lastmod = entry.lastModified
            ? `\n    <lastmod>${entry.lastModified}</lastmod>`
            : ''
        return `  <url>
    <loc>${entry.url}</loc>${lastmod}
  </url>`
    })
    .join('\n')}
</urlset>
`

    fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8')
}
