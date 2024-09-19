import { Post } from '@/types/post'
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

const postsDirectory = path.join(process.cwd(), 'content')

export function getPostSlugs(): string[] {
    return fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.md'))
}

export function getPostBySlug(slug: string): Post | null {
    const realSlug = slug.replace(/\.md$/, '')
    const fullPath = path.join(postsDirectory, `${realSlug}.md`)

    if (!fs.existsSync(fullPath)) {
        return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data } = matter(fileContents)

    return {
        ...(data as Post),
        slug: realSlug,
    }
}

export function getAllPosts(): Post[] {
    const slugs = getPostSlugs()
    return slugs
        .map((slug) => getPostBySlug(slug))
        .filter((post): post is Post => post !== null)
        .sort((a, b) => (a.date > b.date ? -1 : 1))
}
