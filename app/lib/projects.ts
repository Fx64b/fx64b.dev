import { ProjectDoc } from '@/types/project'
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

const projectDocsDirectory = path.join(process.cwd(), 'content', 'projects')

export function getProjectDocSlugs(): string[] {
    if (!fs.existsSync(projectDocsDirectory)) {
        return []
    }
    return fs
        .readdirSync(projectDocsDirectory)
        .filter((file) => file.endsWith('.md'))
}

export function getProjectDocBySlug(slug: string): ProjectDoc | null {
    const realSlug = slug.replace(/\.md$/, '')
    const fullPath = path.join(projectDocsDirectory, `${realSlug}.md`)

    if (!fs.existsSync(fullPath)) {
        return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
        ...(data as Omit<ProjectDoc, 'slug' | 'content'>),
        slug: realSlug,
        content,
    }
}

export function getAllProjectDocs(): ProjectDoc[] {
    const slugs = getProjectDocSlugs()
    return slugs
        .map((slug) => getProjectDocBySlug(slug))
        .filter((doc): doc is ProjectDoc => doc !== null)
        .sort((a, b) => (a.lastUpdated > b.lastUpdated ? -1 : 1))
}

export function getProjectDocContent(slug: string): string | null {
    const projectDoc = getProjectDocBySlug(slug)
    return projectDoc?.content || null
}
