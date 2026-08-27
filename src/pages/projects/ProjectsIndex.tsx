import projectData from '@/data/projectData'

import { ListRow, ListRows } from '@/components/list-row'
import { Page, PageHeader } from '@/components/page'
import { Reveal } from '@/components/reveal'
import { Eyebrow } from '@/components/section'
import { Seo } from '@/components/seo'

const description =
    "A collection of projects I've worked on, ranging from web applications to browser extensions and CLI tools. Featured projects include detailed documentation."

function projectSlug(title: string) {
    return title.toLowerCase().replace(/\s+/g, '-')
}

export default function ProjectsIndex() {
    const featuredProjects = projectData.filter((project) => project.featured)
    const otherProjects = projectData.filter((project) => !project.featured)

    return (
        <>
            <Seo
                title="Projects - Fx64b.dev"
                description={description}
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

            <Page>
                <PageHeader title="Projects">{description}</PageHeader>

                <Reveal className="mb-12">
                    <Eyebrow>Security</Eyebrow>
                    <ListRows>
                        <ListRow
                            href="/cheatsheet"
                            title="Interactive OSCP Cheat Sheet"
                            description="A visual, interactive map of the OSCP kill chain - enumeration through to Domain Admin, with copyable commands at every step."
                            meta="Interactive"
                        />
                    </ListRows>
                </Reveal>

                {featuredProjects.length > 0 && (
                    <Reveal className="mb-12">
                        <Eyebrow>Featured</Eyebrow>
                        <ListRows>
                            {featuredProjects.map((project) => (
                                <ListRow
                                    key={project.title}
                                    href={`/projects/${projectSlug(project.title)}`}
                                    title={project.title}
                                    description={project.summary}
                                    meta={project.status}
                                />
                            ))}
                        </ListRows>
                    </Reveal>
                )}

                {otherProjects.length > 0 && (
                    <Reveal>
                        <Eyebrow>Other projects</Eyebrow>
                        <ListRows>
                            {otherProjects.map((project) => (
                                <ListRow
                                    key={project.title}
                                    href={project.link}
                                    title={project.title}
                                    description={project.summary}
                                    meta={project.status}
                                    external
                                />
                            ))}
                        </ListRows>
                    </Reveal>
                )}

                {projectData.length === 0 && (
                    <p className="text-muted-foreground text-[15px]">
                        No projects here right now. Check back soon for updates!
                    </p>
                )}
            </Page>
        </>
    )
}
