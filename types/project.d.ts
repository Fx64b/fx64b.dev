export interface Project {
    title: string
    description: string
    /** One-line version of the description, used in list rows. */
    summary?: string
    logo: string
    /** Optional 16:9 screenshot or demo GIF shown on the project page. */
    screenshot?: string
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
