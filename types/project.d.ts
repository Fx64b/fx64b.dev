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
