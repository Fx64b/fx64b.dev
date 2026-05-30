import projectData from '@/data/projectData'
import type { Project } from '@/types/project'
import { Globe, Layers, Star } from 'lucide-react'

import Link from 'next/link'

import { BackgroundGrid } from '@/components/background-grid'
import { ProjectCard } from '@/components/project-card'
import { Section } from '@/components/section'
import { Badge } from '@/components/ui/badge'

function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-')
}

const externalProjects: Project[] = [
    {
        title: 'PentestGPT',
        description:
            'Advanced AI-powered penetration testing platform that provides integrated tools to help security teams conduct comprehensive penetration tests. Scan, exploit, and analyze web applications, networks, and cloud environments with ease and precision, without needing expert skills.',
        logo: '/pentestgpt-logo.png',
        link: 'https://pentestgpt.ai/',
        githubLink: 'https://github.com/hackerai-tech/PentestGPT',
        status: 'Finished',
        tags: [
            'AI',
            'Penetration Testing',
            'Next.js',
            'TypeScript',
            'Cybersecurity',
        ],
        featured: false,
    },
]

const CATEGORY_META = [
    { key: 'featured', label: 'Featured', icon: Star },
    { key: 'other', label: 'Other', icon: Layers },
    { key: 'external', label: 'External', icon: Globe },
] as const

export default function Projects() {
    const featuredProjects = projectData.filter((p) => p.featured)
    const otherProjects = projectData.filter((p) => !p.featured)

    const categories = [
        { key: 'featured' as const, projects: featuredProjects },
        { key: 'other' as const, projects: otherProjects },
        { key: 'external' as const, projects: externalProjects },
    ].filter((c) => c.projects.length > 0)

    return (
        <>
            <BackgroundGrid />

            <main className="relative">
                <Section className="pt-24">
                    <div className="mb-12">
                        <h1 className="mb-2 text-3xl font-bold tracking-tight">
                            Projects
                        </h1>
                        <p className="text-muted-foreground">
                            A collection of projects I&#39;ve worked on, ranging
                            from web applications to browser extensions and CLI
                            tools.
                        </p>
                    </div>

                    <div className="space-y-12">
                        {categories.map((category) => {
                            const { label, icon: Icon } = CATEGORY_META.find(
                                (m) => m.key === category.key
                            )!
                            return (
                                <div key={category.key}>
                                    <div className="mb-5 flex items-center gap-2.5">
                                        <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                        <span className="text-muted-foreground shrink-0 text-xs font-medium uppercase tracking-wider">
                                            {label}
                                        </span>
                                        <div className="bg-border h-px flex-1" />
                                        <Badge
                                            variant="secondary"
                                            className="shrink-0 text-xs"
                                        >
                                            {category.projects.length}
                                        </Badge>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                        {category.projects.map((project) =>
                                            category.key === 'featured' ? (
                                                <Link
                                                    key={project.title}
                                                    href={`/projects/${titleToSlug(project.title)}`}
                                                    className="group block"
                                                >
                                                    <ProjectCard
                                                        project={project}
                                                    />
                                                </Link>
                                            ) : (
                                                <ProjectCard
                                                    key={project.title}
                                                    project={project}
                                                    showLinks
                                                />
                                            )
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {projectData.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-muted-foreground text-sm">
                                No projects here yet.
                            </p>
                        </div>
                    )}
                </Section>
            </main>
        </>
    )
}
