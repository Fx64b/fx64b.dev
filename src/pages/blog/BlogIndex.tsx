import { formatMonthYear } from '@/lib/format'
import { getAllPosts } from '@/lib/posts'

import { ListRow, ListRows } from '@/components/list-row'
import { Page, PageHeader } from '@/components/page'
import { Reveal } from '@/components/reveal'
import { Seo } from '@/components/seo'

const description =
    'Thoughts on software development, technology trends, and lessons learned from building applications.'

export default function BlogIndex() {
    const posts = getAllPosts()

    return (
        <>
            <Seo
                title="Blog - Fx64b.dev"
                description={description}
                path="/blog"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'Blog',
                    '@id': 'https://fx64b.dev/blog',
                    name: 'Fx64b Blog',
                    description: description,
                    author: { '@id': 'https://fx64b.dev/#person' },
                    blogPost: posts.map((post) => ({
                        '@type': 'BlogPosting',
                        headline: post.title,
                        description: post.description,
                        datePublished: post.date,
                        url: `https://fx64b.dev/blog/${post.slug}`,
                    })),
                }}
            />

            <Page>
                <PageHeader title="Writing">{description}</PageHeader>

                {posts.length > 0 ? (
                    <Reveal>
                        <ListRows>
                            {posts.map((post) => (
                                <ListRow
                                    key={post.slug}
                                    href={`/blog/${post.slug}`}
                                    title={post.title}
                                    description={post.description}
                                    meta={formatMonthYear(post.date)}
                                />
                            ))}
                        </ListRows>
                    </Reveal>
                ) : (
                    <p className="text-muted-foreground text-[15px]">
                        No blog posts yet. Check back soon for updates!
                    </p>
                )}
            </Page>
        </>
    )
}
