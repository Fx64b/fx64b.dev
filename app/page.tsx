import projectData from '@/data/projectData'

import { Image } from '@nextui-org/image'
import { Spacer } from '@nextui-org/spacer'

import ProjectCard from '@/components/ProjectCard'

export default function Home() {
    return (
        <div className="flex w-screen justify-center pb-10">
            <div className="mt-10 flex flex-col items-center gap-y-3 px-6 text-center">
                <Image
                    className={'w-48 rounded-full border-2 border-white'}
                    src="/logo.svg"
                    alt={
                        'Fx64b profile picture displaying the letter F in a serif font'
                    }
                />
                <h1 className={'text-2xl font-bold'}>Fx64b</h1>
                <p>
                    Hey! I&apos;m Fabio aka Fx64b, a software engineer from Switzerland.
                </p>
                <p>
                    I like working with React / Next.js, TypeScript, Tailwind, Java and Angular.
                </p>
                <p>
                    I&apos;m currently learning Go and Cybersecurity fundamentals.
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
