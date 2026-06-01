export type ToolCategory =
    | 'conversion'
    | 'encoding'
    | 'formatting'
    | 'generators'
    | 'utilities'
    | 'security'

export interface ToolFaq {
    q: string
    a: string
}

export interface Tool {
    slug: string
    title: string
    description: string
    category: ToolCategory
    tags: string[]
    popular?: boolean
    /** Search-only synonyms/aliases (e.g. "b64", "epoch"). Not rendered in the UI. */
    keywords?: string[]
    /** Longer one-to-two sentence blurb used for richer meta descriptions and headers. */
    summary?: string
    /** Question/answer pairs rendered on the page and emitted as FAQPage structured data. */
    faq?: ToolFaq[]
    /** Slugs of related tools for internal linking. */
    relatedSlugs?: string[]
    /** Bullet points describing when the tool is useful. */
    useCases?: string[]
    /** ISO date the tool was first published. Drives the sitemap and the "New" badge. */
    addedAt?: string
    /** ISO date of the last meaningful change. Drives the sitemap lastModified. */
    updatedAt?: string
}
