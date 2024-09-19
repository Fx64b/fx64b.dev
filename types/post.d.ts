export interface PostMeta {
    title: string
    date: string
    description: string
    slug: string
    read: string
}

export interface Post extends PostMeta {
    content: string
}
