import projects from '@/data/projectData'
import { ArrowRight } from 'lucide-react'

import { HeroSection } from '@/components/hero-section'
import Link from '@/components/link'
import { ProjectCard } from '@/components/project-card'
import { Section } from '@/components/section'
import { Seo } from '@/components/seo'
import { TechStackSection } from '@/components/tech-stack-section'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const description =
    'Personal website of Fx64b where you can find information about my latest projects and blog posts.'

export default function Home() {
    return (
        <>
            <Seo
                title="Fx64b.dev"
                description={description}
                path="/"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'ProfilePage',
                    mainEntity: { '@id': 'https://fx64b.dev/#person' },
                }}
            />
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
                                    <ProjectCard project={project} />
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
                            <Button asChild>
                                <a href="mailto:contact@fx64b.dev">
                                    Get In Touch
                                </a>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/blog">Read My Blog</Link>
                            </Button>
                        </div>
                    </div>
                </Section>
            </main>
        </>
    )
}
