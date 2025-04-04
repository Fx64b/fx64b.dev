export interface Tool {
    slug: string
    title: string
    description: string
    category:
        | 'conversion'
        | 'encoding'
        | 'formatting'
        | 'generators'
        | 'utilities'
    tags: string[]
    popular?: boolean
}
