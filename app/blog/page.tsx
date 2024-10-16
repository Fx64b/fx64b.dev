import { Card, CardBody, CardHeader, Link } from '@nextui-org/react'

import { getAllPosts } from '@/app/lib/posts'
import { Spacer } from '@nextui-org/spacer'

export default async function Blog() {
    const posts = getAllPosts()

    return (
        <>
            <h1>Blog</h1>
            <Spacer y={6} />
            {posts.map((post, index) => (
                <>
                <Link
                    href={'/blog/' + post.slug}
                    key={index}
                    className="block transition-shadow duration-300 ease-in-out hover:shadow-lg"
                >
                    <Card className="overflow-hidden transition-transform duration-300 ease-in-out transform hover:scale-105">
                        <CardHeader className="rounded-t-lg border-b p-4">
                            <p className="text-xl font-semibold text-gray-100">
                                {post.title}
                            </p>
                        </CardHeader>
                        <CardBody className="flex flex-col space-y-2 p-4">
                            <div className="text-sm text-gray-500">
                                <p>By {post.author}, &nbsp; {post.read} read, &nbsp; {post.date}</p>
                            </div>
                            <p className="mt-2 text-gray-300">{post.description}</p>
                        </CardBody>
                    </Card>
                </Link>
                <Spacer y={6} />
                </>
            ))}
        </>
    )
}
