import { Post } from '@/types/post'

import { Metadata } from 'next'

import { getPostBySlug, getPostContent, getPostSlugs } from '@/app/lib/posts'

import { AuthorBio } from '@/components/author-bio'
import { BackgroundGrid } from '@/components/background-grid'
import { BlogHeader } from '@/components/blog-header'
import MarkdownRenderer from '@/components/markdown-renderer'
import { RelatedPosts } from '@/components/related-posts'
import { TableOfContents } from '@/components/table-of-contents'

interface Props {
    params: Promise<{
        slug: string
    }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params
    const slug: string = params.slug
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

export default async function PostPage(props: Props) {
    const params = await props.params
    const { slug } = params
    const post: Post | null = getPostBySlug(slug)
    const content = getPostContent(slug)

    if (!post || !content) {
        return <p>Post not found.</p>
    }

    return (
        <>
            <BackgroundGrid />
            <div className="relative mx-auto max-w-7xl px-4 py-8">
                <div className="flex justify-center">
                    <aside className="hidden xl:block xl:w-64 xl:flex-shrink-0">
                        <div className="fixed top-24 w-64 pr-8">
                            <TableOfContents
                                content={content}
                                variant="desktop"
                            />
                        </div>
                    </aside>

                    <article className="prose prose-invert w-full max-w-3xl">
                        <BlogHeader
                            author={post.author || 'Fx64b'}
                            readtime={post.read}
                            date={post.date}
                            title={post.title}
                        />

                        <div className="xl:hidden">
                            <TableOfContents
                                content={content}
                                variant="mobile"
                            />
                        </div>

                        <MarkdownRenderer content={content} />

                        <div className="mt-16 space-y-8">
                            <AuthorBio author={post.author} />
                            <RelatedPosts currentSlug={slug} />
                        </div>
                    </article>

                    <div className="hidden xl:block xl:w-64 xl:flex-shrink-0" />
                </div>
            </div>
        </>
    )
}
