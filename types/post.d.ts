export interface PostMeta {
    title: string;
    date: string;
    description: string;
    slug: string;
}

export interface Post extends PostMeta {
    content: string;
}
