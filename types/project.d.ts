export interface Project {
    title: string
    description: string
    logo: string
    link: string
    githubLink: string
    status: 'Finished' | 'In Progress' | 'Planned' | 'Abandoned' | 'On Hold'
    tags: string[]
    featured: boolean
}

export interface ProjectDocMeta {
    title: string
    description: string
    slug: string
    lastUpdated: string
    author?: string
    status?: 'draft' | 'published'
    projectSlug: string
    version?: string
    readTime?: string
}

export interface ProjectDoc extends ProjectDocMeta {
    content: string
}
