import { Post } from '@/types/post'
import posts from 'virtual:content/posts'

function toPost(item: (typeof posts)[number]): Post {
    return {
        ...(item.data as Omit<Post, 'slug' | 'content'>),
        slug: item.slug,
        content: item.content,
    }
}

export function getPostSlugs(): string[] {
    return posts.map((post) => `${post.slug}.md`)
}

export function getPostBySlug(slug: string): Post | null {
    const realSlug = slug.replace(/\.md$/, '')
    const item = posts.find((post) => post.slug === realSlug)
    return item ? toPost(item) : null
}

export function getAllPosts(): Post[] {
    return posts.map(toPost).sort((a, b) => (a.date > b.date ? -1 : 1))
}

export function getPostContent(slug: string): string | null {
    const realSlug = slug.replace(/\.md$/, '')
    const item = posts.find((post) => post.slug === realSlug)
    return item ? item.content : null
}
