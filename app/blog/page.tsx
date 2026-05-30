import { ArrowRight, Calendar, Clock } from 'lucide-react'

import Link from 'next/link'

import { getAllPosts } from '@/app/lib/posts'

import { BackgroundGrid } from '@/components/background-grid'
import { Section } from '@/components/section'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function Blog() {
    const posts = getAllPosts()

    return (
        <>
            <BackgroundGrid />

            <main className="relative">
                <Section className="pt-24">
                    <div className="mb-12">
                        <h1 className="mb-2 text-3xl font-bold tracking-tight">
                            Blog
                        </h1>
                        <p className="text-muted-foreground">
                            Thoughts on software development, technology trends,
                            and lessons learned from building applications.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {posts.map((post) => (
                            <Link
                                key={post.slug}
                                href={`/blog/${post.slug}`}
                                className="group block"
                            >
                                <Card className="hover:bg-card h-full transition-colors">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="line-clamp-2 font-medium">
                                                {post.title}
                                            </span>
                                            <ArrowRight className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground mb-3 line-clamp-3 text-sm leading-relaxed">
                                            {post.description}
                                        </p>
                                        <div className="text-muted-foreground flex items-center gap-3 text-xs">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                <span>{post.date}</span>
                                            </div>
                                            {post.read && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                                    <span>{post.read}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {posts.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-muted-foreground text-sm">
                                No posts yet.
                            </p>
                        </div>
                    )}
                </Section>
            </main>
        </>
    )
}
