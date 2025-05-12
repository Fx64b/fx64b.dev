import Link from 'next/link'

import { getAllPosts } from '@/app/lib/posts'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default async function Blog() {
    const posts = getAllPosts()

    return (
        <div className="w-full">
            <div className="md:mx-auto md:max-w-[1024px]">
                <h1>Blog</h1>
                <div className="space-y-6">
                    {posts.map((post, index) => (
                        <div key={index} className="my-6">
                            <Link
                                href={'/blog/' + post.slug}
                                className="block transition-colors hover:no-underline"
                            >
                                <Card className="hover:bg-muted/50 overflow-hidden">
                                    <CardHeader className="rounded-t-lg border-b">
                                        <p className="text-xl font-semibold">
                                            {post.title}
                                        </p>
                                    </CardHeader>
                                    <CardContent className="flex flex-col space-y-2">
                                        <div className="text-muted-foreground text-sm">
                                            <p>
                                                By {post.author}, &nbsp;{' '}
                                                {post.read} read, &nbsp;{' '}
                                                {post.date}
                                            </p>
                                        </div>
                                        <p>{post.description}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
