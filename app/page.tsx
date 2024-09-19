import { PostMeta } from '@/types/post'

import { Card, CardBody, CardFooter, CardHeader } from '@nextui-org/card'
import { Divider } from '@nextui-org/divider'
import { Image } from '@nextui-org/image'
import { Link } from '@nextui-org/link'
import { Spacer } from '@nextui-org/spacer'

import { getAllPosts } from '@/app/lib/posts'

export default function Home() {
    const posts = getAllPosts()

    return (
        <div className="flex h-screen w-screen justify-center">
            <div className="mt-10 flex flex-col items-center gap-y-4 px-6 text-center">
                <Image
                    className={'w-48 rounded-full border-2 border-white'}
                    src="/logo.svg"
                    alt={
                        'Fx64b profile picture displaying the letter F in a serif font'
                    }
                />
                <h1 className={'text-2xl font-bold'}>Fx64b</h1>
                <p>
                    Hey! I&apos;m F_x64b, a software developer from Switzerland.
                </p>
                <Spacer y={2} />

                <h2 className={'self-start text-xl'}>Projects</h2>
                <div className={'flex w-full flex-col gap-y-6'}>
                    <Link href={'https://github.com/Fx64b'} isExternal>
                        <Card>
                            <CardHeader className={'flex gap-4'}>
                                <Image
                                    src={'/logo.svg'}
                                    alt={'Project logo'}
                                    width={40}
                                    height={40}
                                />

                                <p className={'text-md'}>Project title</p>
                            </CardHeader>
                            <Divider />
                            <CardBody className={'flex gap-4'}>
                                <p>
                                    Lorem ipsum odor amet, consectetuer
                                    adipiscing elit. Habitasse quam venenatis
                                    tempus hendrerit lorem. Lorem ipsum odor
                                    amet, consectetuer adipiscing elit.
                                    Habitasse quam venenatis tempus hendrerit
                                    lorem.
                                </p>
                            </CardBody>
                            <CardFooter>
                                <Link
                                    isExternal
                                    showAnchorIcon
                                    href="https://github.com/nextui-org/nextui"
                                >
                                    Visit source code on GitHub.
                                </Link>
                            </CardFooter>
                        </Card>
                    </Link>
                    <Link href={'https://github.com/Fx64b'} isExternal>
                        <Card>
                            <CardHeader className={'flex gap-4'}>
                                <Image
                                    src={'/logo.svg'}
                                    alt={'Project logo'}
                                    width={40}
                                    height={40}
                                />

                                <p className={'text-md'}>Project title</p>
                            </CardHeader>
                            <Divider />
                            <CardBody className={'flex gap-4'}>
                                <p>
                                    Lorem ipsum odor amet, consectetuer
                                    adipiscing elit. Habitasse quam venenatis
                                    tempus hendrerit lorem. Lorem ipsum odor
                                    amet, consectetuer adipiscing elit.
                                    Habitasse quam venenatis tempus hendrerit
                                    lorem.
                                </p>
                            </CardBody>
                            <CardFooter>
                                <Link
                                    isExternal
                                    showAnchorIcon
                                    href="https://github.com/nextui-org/nextui"
                                >
                                    Visit source code on GitHub.
                                </Link>
                            </CardFooter>
                        </Card>
                    </Link>
                </div>

                <Spacer y={2} />

                <h2 className={'self-start text-xl'}>Blog</h2>
                <ul>
                    {posts.map((post: PostMeta) => (
                        <li key={post.slug}>
                            <Link href={`/blog/${post.slug}`}>
                                {post.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
