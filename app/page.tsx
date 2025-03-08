import projectData from '@/data/projectData'

import { Image } from "@heroui/image"
import { Spacer } from "@heroui/spacer"
import { Metadata } from 'next'

import ProjectCard from '@/components/ProjectCard'

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Fx64b.dev',
        description:
            'Personal website of Fx64b where you can find information about my latest projects and blog posts.',
        openGraph: {
            title: 'Fx64b.dev',
            description:
                'Personal website of Fx64b where you can find information about my latest projects and blog posts.',
            url: 'https://fx64b.dev',
            images: [
                {
                    url: 'https://fx64b.dev/logo.svg',
                    width: 200,
                    height: 200,
                    alt: 'Fx64b.dev Logo',
                },
            ],
        },
        twitter: {
            card: 'summary',
            title: 'Fx64b.dev',
            description:
                'Personal website of Fx64b where you can find information about my latest projects and blog posts.',
            images: [
                {
                    url: 'https://fx64b.dev/logo.svg',
                    alt: 'Fx64b.dev Logo',
                },
            ],
        },
    }
}

export default function Home() {
    return (
        <div className="flex h-fit min-h-screen w-screen justify-center pb-10">
            <div className="mt-10 flex max-w-(--breakpoint-lg) flex-col items-center gap-y-3 px-6 text-center">
                <Image
                    className={'w-48 rounded-full border-2 border-white'}
                    src="/logo.svg"
                    alt={
                        'Fx64b profile picture displaying the letter F in a serif font'
                    }
                />
                <h1 className={'text-2xl font-bold'}>Fx64b</h1>
                <Spacer y={4} />
                <h2 className={'text-xl font-semibold'}>About Me</h2>
                <p>
                    Hey! I&apos;m Fabio aka Fx64b, a software engineer from
                    Switzerland.
                </p>
                <p>
                    I like working with React / Next.js, TypeScript, Tailwind,
                    Java and Angular.
                </p>
                <p>
                    I&apos;m currently learning Go and Cybersecurity
                    fundamentals.
                </p>
                <Spacer y={2} />

                <h2 className={'self-start text-xl'}>Projects</h2>
                <div className={'flex w-full flex-col gap-y-6'}>
                    {projectData.map((project, index) => (
                        <ProjectCard key={index} project={project} />
                    ))}
                </div>
            </div>
        </div>
    )
}
