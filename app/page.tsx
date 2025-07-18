import projects from '@/data/projectData'
import { ArrowRight } from 'lucide-react'

import type { Metadata } from 'next'
import Link from 'next/link'

import { BackgroundGrid } from '@/components/background-grid'
import { HeroSection } from '@/components/hero-section'
import { ProjectCard } from '@/components/project-card'
import { Section } from '@/components/section'
import { TechStackSection } from '@/components/tech-stack-section'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

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
        <>
            <BackgroundGrid />
            <main className="relative">
                <HeroSection />

                <Separator className="my-8" />

                <Section>
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold tracking-tight">
                            Featured Projects
                        </h2>
                        <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                            A selection of projects I&#39;ve worked on, ranging
                            from full-stack web applications to browser
                            extensions and CLI tools.
                        </p>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                        {projects
                            .filter((project) => project.featured)
                            .map((project) => (
                                <Link
                                    key={project.title}
                                    href={`/projects/${project.title.toLowerCase().replace(/\s+/g, '-')}`}
                                    className="group block"
                                >
                                    <ProjectCard
                                        key={project.title}
                                        project={project}
                                    />
                                </Link>
                            ))}
                    </div>
                    <div className="mt-8 text-center">
                        <Button asChild>
                            <Link href="/projects" className="text-primary">
                                View All Projects <ArrowRight />
                            </Link>
                        </Button>
                    </div>
                </Section>

                <Separator className="my-16" />

                <TechStackSection />

                <Separator className="my-8" />

                <Section>
                    <div className="text-center">
                        <h2 className="mb-4 text-3xl font-bold tracking-tight">
                            Let&#39;s Work Together
                        </h2>
                        <p className="text-foreground/70 mx-auto mb-8 max-w-2xl text-lg">
                            I&#39;m always interested in new opportunities and
                            collaborations. Feel free to reach out if you&#39;d
                            like to discuss a project, give me feedback or just
                            say hello.
                        </p>
                        <div className="flex flex-col justify-center gap-4 sm:flex-row">
                            <a
                                href="mailto:contact@fx64b.dev"
                                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors"
                            >
                                Get In Touch
                            </a>
                            <Link
                                href="/blog"
                                className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium transition-colors"
                            >
                                Read My Blog
                            </Link>
                        </div>
                    </div>
                </Section>
            </main>
        </>
    )
}
