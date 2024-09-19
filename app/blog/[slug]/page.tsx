import { Post } from '@/types/post'
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

import { BlogHeader } from '@/components/BlogHeader'
import MarkdownRenderer from '@/components/MarkdownRenderer'

import { getPostBySlug, getPostSlugs } from '../../lib/posts'

interface Props {
    params: {
        slug: string
    }
}

export async function generateStaticParams() {
    const slugs = getPostSlugs().map((slug) => slug.replace(/\.md$/, ''))
    return slugs.map((slug) => ({
        slug,
    }))
}

export default async function PostPage({ params }: Props) {
    const { slug } = params
    const post: Post | null = getPostBySlug(slug)

    if (!post) {
        return <p>Post not found.</p>
    }

    const fullPath = path.join(process.cwd(), 'content', `${slug}.md`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { content } = matter(fileContents)

    return (
        <article className="prose mx-auto">
            <BlogHeader
                author={'F_x64b'}
                readtime={post.read}
                date={post.date}
                title={post.title}
            />
            <MarkdownRenderer content={content} />
        </article>
    )
}
