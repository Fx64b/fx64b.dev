import { Post } from '@/types/post'
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

import { Metadata } from 'next'

import { BlogHeader } from '@/components/BlogHeader'
import MarkdownRenderer from '@/components/MarkdownRenderer'

import { getPostBySlug, getPostSlugs } from '../../lib/posts'

interface Props {
    params: {
        slug: string
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const slug: string = params.slug[0]
    const post = getPostBySlug(slug)

    if (!post) {
        return {
            title: 'Post not found',
            description: 'The requested Post could not be found.',
        }
    }

    return {
        title: `${post.title} - by ${post.author}`,
        description: post.description,
        openGraph: {
            title: post.title,
            description: post.description,
            images: [
                {
                    url: 'https://fx64b.dev/logo.svg',
                    alt: post.title,
                },
            ],
            type: 'article',
        },
        twitter: {
            card: 'summary',
            title: post.title,
            description: post.description,
            images: ['https://fx64b.dev/logo.svg'],
        },
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
        <article className="prose mx-auto md:max-w-screen-lg">
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
