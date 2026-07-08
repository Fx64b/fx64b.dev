import projectData from '@/data/projectData'
import { ExternalLink } from 'lucide-react'

import Link from '@/components/link'
import { ProjectCard } from '@/components/project-card'
import { Section } from '@/components/section'
import { Seo } from '@/components/seo'
import { Badge } from '@/components/ui/badge'

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
                        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
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
                                <p className="text-muted-foreground text-sm">
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
                                <p className="text-muted-foreground text-sm">
                                    Additional projects and experiments
                                </p>
                            </div>
                            <div className="divide-border mx-auto max-w-3xl divide-y">
                                {otherProjects.map((project) => (
                                    <a
                                        key={project.title}
                                        href={project.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-between gap-4 py-4 first:pt-0"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <h3 className="group-hover:text-primary truncate font-semibold transition-colors">
                                                {project.title}
                                            </h3>
                                            <p className="text-muted-foreground truncate text-sm">
                                                {project.description}
                                            </p>
                                        </div>
                                        {project.tags &&
                                            project.tags.length > 0 && (
                                                <div className="hidden flex-shrink-0 gap-2 sm:flex">
                                                    {project.tags
                                                        .slice(0, 2)
                                                        .map((tag) => (
                                                            <Badge
                                                                key={tag}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                </div>
                                            )}
                                        <ExternalLink className="text-muted-foreground group-hover:text-primary h-4 w-4 flex-shrink-0 transition-colors" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {projectData.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-muted-foreground text-lg">
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
