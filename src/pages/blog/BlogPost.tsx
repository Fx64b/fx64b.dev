import { Post } from '@/types/post'

import { useParams } from 'react-router-dom'

import { getPostBySlug, getPostContent } from '@/lib/posts'

import { AuthorBio } from '@/components/author-bio'
import { BackgroundGrid } from '@/components/background-grid'
import { BlogHeader } from '@/components/blog-header'
import MarkdownRenderer from '@/components/markdown-renderer'
import { RelatedPosts } from '@/components/related-posts'
import { Seo } from '@/components/seo'
import { TableOfContents } from '@/components/table-of-contents'

export default function BlogPost() {
    const { slug = '' } = useParams()
    const post: Post | null = getPostBySlug(slug)
    const content = getPostContent(slug)

    if (!post || !content) {
        return <p>Post not found.</p>
    }

    return (
        <>
            <Seo
                title={`${post.title} - by ${post.author}`}
                description={post.description}
                path={`/blog/${slug}`}
                type="article"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'BlogPosting',
                    headline: post.title,
                    description: post.description,
                    datePublished: post.date,
                    dateModified: post.date,
                    author: {
                        '@type': 'Person',
                        name: post.author || 'Fx64b',
                        url: 'https://fx64b.dev',
                    },
                    image: 'https://fx64b.dev/logo.svg',
                    mainEntityOfPage: {
                        '@type': 'WebPage',
                        '@id': `https://fx64b.dev/blog/${slug}`,
                    },
                    publisher: { '@id': 'https://fx64b.dev/#person' },
                }}
            />
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
