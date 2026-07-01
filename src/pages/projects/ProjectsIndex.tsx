import projectData from '@/data/projectData'

import Link from '@/components/link'
import { ProjectCard } from '@/components/project-card'
import { Section } from '@/components/section'
import { Seo } from '@/components/seo'

export default function ProjectsIndex() {
    const featuredProjects = projectData.filter((project) => project.featured)
    const otherProjects = projectData.filter((project) => !project.featured)

    return (
        <>
            <Seo
                title="Projects - Fx64b.dev"
                description="A collection of projects I've worked on, ranging from web applications to browser extensions and CLI tools. Featured projects include detailed documentation."
                path="/projects"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    '@id': 'https://fx64b.dev/projects',
                    name: 'Projects',
                    description:
                        "A collection of projects I've worked on, ranging from web applications to browser extensions and CLI tools.",
                    hasPart: projectData.map((project) => ({
                        '@type': 'SoftwareSourceCode',
                        name: project.title,
                        description: project.description,
                        codeRepository: project.githubLink,
                        url: project.link,
                    })),
                }}
            />

            <main className="relative">
                <Section className="pt-24">
                    <div className="mb-16 text-center">
                        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
                            Projects
                        </h1>
                        <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                            A collection of projects I&#39;ve worked on, ranging
                            from web applications to browser extensions and CLI
                            tools. Featured projects include detailed
                            documentation.
                        </p>
                    </div>

                    {featuredProjects.length > 0 && (
                        <div className="mb-16">
                            <div className="mb-8">
                                <h2 className="mb-2 text-2xl font-bold tracking-tight">
                                    Featured Projects
                                </h2>
                                <p className="text-foreground/60 text-sm">
                                    Projects with detailed documentation and
                                    case studies
                                </p>
                            </div>
                            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                                {featuredProjects.map((project) => (
                                    <Link
                                        key={project.title}
                                        href={`/projects/${project.title.toLowerCase().replace(/\s+/g, '-')}`}
                                        className="group block"
                                    >
                                        <ProjectCard project={project} />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {otherProjects.length > 0 && (
                        <div>
                            <div className="mb-8">
                                <h2 className="mb-2 text-2xl font-bold tracking-tight">
                                    Other Projects
                                </h2>
                                <p className="text-foreground/60 text-sm">
                                    Additional projects and experiments
                                </p>
                            </div>
                            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                                {otherProjects.map((project) => (
                                    <ProjectCard
                                        key={project.title}
                                        project={project}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {projectData.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-foreground/60 text-lg">
                                No projects here right now. Check back soon for
                                updates!
                            </p>
                        </div>
                    )}
                </Section>
            </main>
        </>
    )
}
