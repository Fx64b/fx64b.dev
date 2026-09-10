import { Post } from '@/types/post'

import { useParams } from 'react-router-dom'

import { getPostBySlug, getPostContent } from '@/lib/posts'

import { AuthorBio } from '@/components/author-bio'
import { BackLink } from '@/components/back-link'
import { BlogHeader } from '@/components/blog-header'
import MarkdownRenderer from '@/components/markdown-renderer'
import { RelatedPosts } from '@/components/related-posts'
import { Seo } from '@/components/seo'
import { TableOfContents } from '@/components/table-of-contents'

import NotFound from '../NotFound'

export default function BlogPost() {
    const { slug = '' } = useParams()
    const post: Post | null = getPostBySlug(slug)
    const content = getPostContent(slug)

    if (!post || !content) {
        return <NotFound />
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
                    image: 'https://fx64b.dev/og/default.png',
                    mainEntityOfPage: {
                        '@type': 'WebPage',
                        '@id': `https://fx64b.dev/blog/${slug}`,
                    },
                    publisher: { '@id': 'https://fx64b.dev/#person' },
                }}
            />

            <div className="mx-auto flex w-full max-w-[1160px] justify-center gap-8 px-5 pt-12 pb-24 sm:px-6 sm:pt-16">
                <aside className="hidden w-52 shrink-0 xl:block">
                    <TableOfContents content={content} variant="desktop" />
                </aside>

                <article className="w-full max-w-[640px] min-w-0">
                    <div className="mb-6">
                        <BackLink href="/blog">Back to writing</BackLink>
                    </div>

                    <BlogHeader
                        author={post.author || 'Fx64b'}
                        readtime={post.read}
                        date={post.date}
                        title={post.title}
                    />

                    <div className="xl:hidden">
                        <TableOfContents content={content} variant="mobile" />
                    </div>

                    <MarkdownRenderer content={content} />

                    <div className="mt-16 space-y-10">
                        <AuthorBio author={post.author} />
                        <RelatedPosts currentSlug={slug} />
                    </div>
                </article>

                <div className="hidden w-52 shrink-0 xl:block" />
            </div>
        </>
    )
}
