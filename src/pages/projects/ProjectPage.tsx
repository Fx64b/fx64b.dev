import projectData from '@/data/projectData'
import { ExternalLink, Github } from 'lucide-react'

import { useParams } from 'react-router-dom'

import { getProjectDocBySlug } from '@/lib/projects'

import { ActionLink } from '@/components/action-link'
import { BackLink } from '@/components/back-link'
import Image from '@/components/image'
import Link from '@/components/link'
import MarkdownRenderer from '@/components/markdown-renderer'
import { Pill } from '@/components/pill'
import { Seo } from '@/components/seo'
import { TableOfContents } from '@/components/table-of-contents'

import NotFound from '../NotFound'

function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-')
}

function getProjectBySlug(slug: string) {
    return projectData.find(
        (project) => titleToSlug(project.title) === slug && project.featured
    )
}

export default function ProjectPage() {
    const { slug = '' } = useParams()
    const project = getProjectBySlug(slug)
    const projectDoc = getProjectDocBySlug(slug)

    if (!project) {
        return <NotFound />
    }

    const description = projectDoc?.description || project.description

    return (
        <>
            <Seo
                title={`${project.title} - Fx64b Projects`}
                description={description}
                path={`/projects/${slug}`}
                image={project.logo || 'https://fx64b.dev/logo.svg'}
                type="article"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'SoftwareSourceCode',
                    name: project.title,
                    description: description,
                    codeRepository: project.githubLink,
                    url: `https://fx64b.dev/projects/${slug}`,
                    author: { '@id': 'https://fx64b.dev/#person' },
                    ...(projectDoc?.version && {
                        version: projectDoc.version,
                    }),
                    ...(projectDoc?.lastUpdated && {
                        dateModified: projectDoc.lastUpdated,
                    }),
                }}
            />

            <div className="mx-auto flex w-full max-w-[1240px] justify-center gap-8 px-5 pt-12 pb-24 sm:px-6 sm:pt-16">
                <aside className="hidden w-52 shrink-0 xl:block">
                    {projectDoc?.content && (
                        <TableOfContents
                            content={projectDoc.content}
                            variant="desktop"
                        />
                    )}
                </aside>

                <main className="w-full max-w-[720px] min-w-0">
                    <BackLink href="/projects">Back to projects</BackLink>

                    <div className="mt-6 mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h1 className="text-[30px] font-extrabold tracking-[-0.02em] sm:text-[36px]">
                            {project.title}
                        </h1>
                        <span className="text-muted-foreground text-[13px]">
                            {project.status}
                        </span>
                    </div>

                    {project.tags.length > 0 && (
                        <div className="mb-8 flex flex-wrap gap-1.5">
                            {project.tags.map((tag) => (
                                <Pill key={tag} size="sm">
                                    {tag}
                                </Pill>
                            ))}
                        </div>
                    )}

                    {project.screenshot ? (
                        <div className="border-border mb-8 aspect-video w-full overflow-hidden rounded-lg border">
                            <Image
                                src={project.screenshot}
                                alt={`${project.title} screenshot`}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="border-border bg-muted/40 mb-8 flex h-40 w-full items-center justify-center rounded-lg border">
                            <Image
                                src={project.logo || '/logo.svg'}
                                alt={`${project.title} logo`}
                                width={72}
                                height={72}
                                className="max-h-[72px] w-auto"
                            />
                        </div>
                    )}

                    <div className="mb-10 flex flex-wrap gap-2.5">
                        <ActionLink href={project.link} external>
                            <ExternalLink className="size-4" />
                            View live
                        </ActionLink>
                        <ActionLink
                            href={project.githubLink}
                            variant="secondary"
                            external
                        >
                            <Github className="size-4" />
                            Source code
                        </ActionLink>
                    </div>

                    {projectDoc?.content && (
                        <div className="xl:hidden">
                            <TableOfContents
                                content={projectDoc.content}
                                variant="mobile"
                            />
                        </div>
                    )}

                    {projectDoc ? (
                        <MarkdownRenderer content={projectDoc.content} />
                    ) : (
                        <div className="markdown">
                            <p>{project.description}</p>
                            <p className="border-border text-muted-foreground rounded-lg border border-dashed p-4 text-[13.5px] leading-[1.7]">
                                Documentation for this project is still being
                                written - check back later, or read the source
                                on GitHub in the meantime.
                            </p>
                        </div>
                    )}

                    <div className="border-border mt-16 border-t pt-8">
                        <Link
                            href="/projects"
                            className="text-muted-foreground hover:text-foreground text-[13.5px] transition-colors duration-150 ease-out"
                        >
                            All projects →
                        </Link>
                    </div>
                </main>

                <div className="hidden w-52 shrink-0 xl:block" />
            </div>
        </>
    )
}
