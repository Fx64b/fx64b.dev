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
        | 'games'
    tags: string[]
    popular?: boolean
    /** Use a wider page, e.g. for editors with a side-by-side preview. */
    wide?: boolean
}
