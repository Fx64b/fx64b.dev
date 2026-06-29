import { ProjectDoc } from '@/types/project'
import projectDocs from 'virtual:content/projects'

function toProjectDoc(item: (typeof projectDocs)[number]): ProjectDoc {
    return {
        ...(item.data as Omit<ProjectDoc, 'slug' | 'content'>),
        slug: item.slug,
        content: item.content,
    }
}

export function getProjectDocSlugs(): string[] {
    return projectDocs.map((doc) => `${doc.slug}.md`)
}

export function getProjectDocBySlug(slug: string): ProjectDoc | null {
    const realSlug = slug.replace(/\.md$/, '')
    const item = projectDocs.find((doc) => doc.slug === realSlug)
    return item ? toProjectDoc(item) : null
}

export function getAllProjectDocs(): ProjectDoc[] {
    return projectDocs
        .map(toProjectDoc)
        .sort((a, b) => (a.lastUpdated > b.lastUpdated ? -1 : 1))
}

export function getProjectDocContent(slug: string): string | null {
    const projectDoc = getProjectDocBySlug(slug)
    return projectDoc?.content || null
}
