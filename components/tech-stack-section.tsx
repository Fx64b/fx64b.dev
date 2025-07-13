'use client'

import Image from 'next/image'

import { Section } from '@/components/section'
import { Badge } from '@/components/ui/badge'

const techStack = [
    'typescript',
    'go',
    'quarkus',
    'react',
    'next.js',
    'tailwindcss',
    'radix-ui',
    'node.js',
    'pnpm',
    'postgresql',
    'mongodb',
    'sqlite',
    'docker',
    'vercel',
    'apachekafka',
    'fedora',
    'manjaro',
    'git',
    'goland',
    'webstorm',
    'neovim',
]

const generateBadgeUrl = (tech: string): string => {
    return `https://img.shields.io/badge/${tech.replace('-', ' ')}-%23252525.svg?style=for-the-badge&logo=${tech}&logoColor=white`
}

export function TechStackSection() {
    return (
        <Section>
            <div className="mb-8 text-center">
                <h2 className="mb-3 text-2xl font-bold tracking-tight">
                    Tech Stack
                </h2>
                <p className="text-foreground/70 mx-auto max-w-xl text-base">
                    Technologies I use to build my applications
                </p>
            </div>

            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
                {techStack.map((tech) => (
                    <Image
                        key={tech}
                        src={generateBadgeUrl(tech)}
                        alt={tech}
                        width={0}
                        height={0}
                        sizes="100vw"
                        className="h-8 w-auto rounded-sm transition-all duration-300 ease-in-out hover:invert-100 active:invert-100"
                    />
                ))}
            </div>
            <div className={'mt-5 flex w-full justify-center'}>
                <Badge variant={'outline'}>And many more...</Badge>
            </div>
        </Section>
    )
}
