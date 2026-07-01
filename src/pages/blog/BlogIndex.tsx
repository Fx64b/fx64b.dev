import { ArrowRight, Calendar, Clock } from 'lucide-react'

import { getAllPosts } from '@/lib/posts'

import Link from '@/components/link'
import { Section } from '@/components/section'
import { Seo } from '@/components/seo'
import { Badge } from '@/components/ui/badge'

export default function BlogIndex() {
    const posts = getAllPosts()

    return (
        <>
            <Seo
                title="Blog - Fx64b.dev"
                description="Thoughts on software development, technology trends, and lessons learned from building applications."
                path="/blog"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'Blog',
                    '@id': 'https://fx64b.dev/blog',
                    name: 'Fx64b Blog',
                    description:
                        'Thoughts on software development, technology trends, and lessons learned from building applications.',
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

            <main className="relative">
                <Section className="pt-24">
                    <div className="mb-16 text-center">
                        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
                            Blog
                        </h1>
                        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
                            Thoughts on software development, technology trends,
                            and lessons learned from building applications.
                        </p>
                    </div>

                    {posts.length > 0 && (
                        <div className="divide-border mx-auto max-w-3xl divide-y">
                            {posts.map((post) => (
                                <Link
                                    key={post.slug}
                                    href={`/blog/${post.slug}`}
                                    className="group flex items-start justify-between gap-6 py-8 first:pt-0"
                                >
                                    <div className="min-w-0">
                                        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4" />
                                            <span>{post.date}</span>
                                            {post.read && (
                                                <>
                                                    <Clock className="ml-2 h-4 w-4" />
                                                    <span>{post.read}</span>
                                                </>
                                            )}
                                        </div>
                                        <h2 className="group-hover:text-primary mb-2 text-2xl font-semibold transition-colors">
                                            {post.title}
                                        </h2>
                                        <p className="text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                                            {post.description}
                                        </p>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            By {post.author}
                                        </Badge>
                                    </div>
                                    <ArrowRight className="text-muted-foreground group-hover:text-primary mt-1 h-5 w-5 flex-shrink-0 transition-all group-hover:translate-x-1" />
                                </Link>
                            ))}
                        </div>
                    )}

                    {posts.length > 0 && (
                        <p className="text-muted-foreground mx-auto mt-12 max-w-3xl text-center text-sm">
                            More posts coming soon.
                        </p>
                    )}

                    {posts.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-muted-foreground text-lg">
                                No blog posts yet. Check back soon for updates!
                            </p>
                        </div>
                    )}
                </Section>
            </main>
        </>
    )
}
