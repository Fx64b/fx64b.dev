import projectData from '@/data/projectData'
import { PostMeta } from '@/types/post'

import { Image } from '@nextui-org/image'
import { Link } from '@nextui-org/link'
import { Spacer } from '@nextui-org/spacer'

import { getAllPosts } from '@/app/lib/posts'

import ProjectCard from '@/components/ProjectCard'

export default function Home() {
    const posts = getAllPosts()

    return (
        <div className="flex w-screen justify-center pb-10">
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
                    Hey! I&apos;m F_x64b, a software engineer from Switzerland.
                </p>
                <Spacer y={2} />

                <h2 className={'self-start text-xl'}>Projects</h2>
                <div className={'flex w-full flex-col gap-y-6'}>
                    {projectData.map((project, index) => (
                        <ProjectCard key={index} project={project} />
                    ))}
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
