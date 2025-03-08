import { Card, CardBody, CardHeader, Link } from "@heroui/react"
import { Spacer } from "@heroui/spacer"

import { getAllPosts } from '@/app/lib/posts'

export default async function Blog() {
    const posts = getAllPosts()

    return (
        <div className={'w-full'}>
            <div className={'md:mx-auto md:max-w-(--breakpoint-lg)'}>
                <h1>Blog</h1>
                <Spacer y={6} />
                {posts.map((post, index) => (
                    <>
                        <Link
                            href={'/blog/' + post.slug}
                            key={index}
                            className="block"
                        >
                            <Card className="overflow-hidden">
                                <CardHeader className="rounded-t-lg border-b p-4">
                                    <p className="text-xl font-semibold text-gray-100">
                                        {post.title}
                                    </p>
                                </CardHeader>
                                <CardBody className="flex flex-col space-y-2 p-4">
                                    <div className="text-sm text-gray-500">
                                        <p>
                                            By {post.author}, &nbsp; {post.read}{' '}
                                            read, &nbsp; {post.date}
                                        </p>
                                    </div>
                                    <p className="mt-2 text-gray-300">
                                        {post.description}
                                    </p>
                                </CardBody>
                            </Card>
                        </Link>
                        <Spacer y={6} />
                    </>
                ))}
            </div>
        </div>
    )
}
