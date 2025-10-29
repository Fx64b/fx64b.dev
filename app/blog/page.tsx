import { ArrowRight, Calendar, Clock } from 'lucide-react'

import Link from 'next/link'

import { getAllPosts } from '@/app/lib/posts'

import { BackgroundGrid } from '@/components/background-grid'
import { Section } from '@/components/section'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function Blog() {
    const posts = getAllPosts()

    return (
        <>
            <BackgroundGrid />

            <main className="relative">
                <Section className="pt-24">
                    <div className="mb-16 text-center">
                        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
                            Blog
                        </h1>
                        <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                            Thoughts on software development, technology trends,
                            and lessons learned from building applications.
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {posts.map((post, index) => (
                            <Link
                                key={index}
                                href={`/blog/${post.slug}`}
                                className="group block"
                            >
                                <Card className="border-border/50 bg-card/50 hover:border-border hover:bg-card/80 h-full backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
                                    <CardHeader className="pb-4">
                                        <div className="text-foreground/60 mb-3 flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4" />
                                            <span>{post.date}</span>
                                            {post.read && (
                                                <>
                                                    <Clock className="ml-auto h-4 w-4" />
                                                    <span>{post.read}</span>
                                                </>
                                            )}
                                        </div>
                                        <h2 className="group-hover:text-foreground/90 line-clamp-2 text-xl font-semibold transition-colors">
                                            {post.title}
                                        </h2>
                                    </CardHeader>
                                    <CardContent
                                        className={'flex h-full flex-col'}
                                    >
                                        <p className="text-foreground/70 mb-4 line-clamp-3 text-sm leading-relaxed">
                                            {post.description}
                                        </p>
                                        <div className="mt-auto flex items-center justify-between">
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                By {post.author}
                                            </Badge>
                                            <ArrowRight className="text-foreground/40 group-hover:text-foreground/70 h-4 w-4 transition-all group-hover:translate-x-1" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {posts.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-foreground/60 text-lg">
                                No blog posts yet. Check back soon for updates!
                            </p>
                        </div>
                    )}
                </Section>
            </main>
        </>
    )
}
