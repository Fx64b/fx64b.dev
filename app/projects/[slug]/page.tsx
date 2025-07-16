import projectData from '@/data/projectData'
import {
    AlertCircleIcon,
    ArrowLeft,
    Calendar,
    Clock,
    ExternalLink,
    FileText,
    GitBranch,
    Github,
    User,
} from 'lucide-react'

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getProjectDocBySlug } from '@/app/lib/projects'

import { BackgroundGrid } from '@/components/background-grid'
import MarkdownRenderer from '@/components/markdown-renderer'
import { TableOfContents } from '@/components/table-of-contents'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Props {
    params: Promise<{
        slug: string
    }>
}

function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-')
}

function getProjectBySlug(slug: string) {
    return projectData.find(
        (project) => titleToSlug(project.title) === slug && project.featured
    )
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params
    const { slug } = params
    const project = getProjectBySlug(slug)
    const projectDoc = getProjectDocBySlug(slug)

    if (!project) {
        return {
            title: 'Project not found',
            description: 'The requested project could not be found.',
        }
    }

    const description = projectDoc?.description || project.description

    return {
        title: `${project.title} - Fx64b Projects`,
        metadataBase: new URL('https://fx64b.dev'),
        description: description,
        openGraph: {
            title: project.title,
            description: description,
            images: [
                {
                    url: project.logo || 'https://fx64b.dev/logo.svg',
                    alt: project.title,
                },
            ],
            type: 'article',
        },
        twitter: {
            card: 'summary',
            title: project.title,
            description: description,
            images: [project.logo || 'https://fx64b.dev/logo.svg'],
        },
    }
}

export async function generateStaticParams() {
    const featuredProjects = projectData.filter((project) => project.featured)
    return featuredProjects.map((project) => ({
        slug: titleToSlug(project.title),
    }))
}

export default async function ProjectPage(props: Props) {
    const params = await props.params
    const { slug } = params
    const project = getProjectBySlug(slug)
    const projectDoc = getProjectDocBySlug(slug)

    if (!project) {
        notFound()
    }

    const statusColors = {
        Finished: 'bg-green-500/10 text-green-500 border-green-500/20',
        'In Progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        Planned: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        Abandoned: 'bg-red-500/10 text-red-500 border-red-500/20',
        'On Hold': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    }

    return (
        <>
            <BackgroundGrid />
            <div className="relative mx-auto max-w-7xl px-4 py-8">
                <div className="mb-8">
                    <Button variant="ghost" asChild className="group">
                        <Link href="/projects">
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back to Projects
                        </Link>
                    </Button>
                </div>

                <div className="flex justify-center">
                    <aside className="hidden xl:block xl:w-64 xl:flex-shrink-0">
                        {projectDoc?.content && (
                            <div className="fixed top-36 w-64 pr-8">
                                <TableOfContents
                                    content={projectDoc.content}
                                    variant="desktop"
                                />
                            </div>
                        )}
                    </aside>

                    <div className="w-full max-w-4xl">
                        <div className="mb-12">
                            <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start">
                                <div className="relative flex-shrink-0">
                                    <Image
                                        src={
                                            project.logo ||
                                            '/placeholder.svg?height=80&width=80'
                                        }
                                        alt={`${project.title} logo`}
                                        width={80}
                                        height={80}
                                        className="border-border/50 rounded-xl border-2"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
                                        {project.title}
                                    </h1>
                                    <div className="mb-4 flex flex-wrap items-center gap-3">
                                        <Badge
                                            className={`${statusColors[project.status]} border`}
                                        >
                                            {project.status}
                                        </Badge>
                                        <Badge variant="secondary">
                                            Featured Project
                                        </Badge>
                                        {projectDoc && (
                                            <Badge
                                                variant="outline"
                                                className="gap-1"
                                            >
                                                <FileText className="h-3 w-3" />
                                                Documentation
                                            </Badge>
                                        )}
                                    </div>

                                    {projectDoc && (
                                        <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-4 text-sm">
                                            {projectDoc.lastUpdated && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        Updated{' '}
                                                        {projectDoc.lastUpdated}
                                                    </span>
                                                </div>
                                            )}
                                            {projectDoc.author && (
                                                <div className="flex items-center gap-1">
                                                    <User className="h-4 w-4" />
                                                    <span>
                                                        By {projectDoc.author}
                                                    </span>
                                                </div>
                                            )}
                                            {projectDoc.version && (
                                                <div className="flex items-center gap-1">
                                                    <GitBranch className="h-4 w-4" />
                                                    <span>
                                                        Version:{' '}
                                                        {projectDoc.version}
                                                    </span>
                                                </div>
                                            )}
                                            {projectDoc.readTime && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    <span>
                                                        {projectDoc.readTime}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex flex-wrap gap-3">
                                        <Button asChild>
                                            <Link
                                                href={project.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View Project
                                            </Link>
                                        </Button>
                                        <Button variant="outline" asChild>
                                            <Link
                                                href={project.githubLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Github className="mr-2 h-4 w-4" />
                                                Source Code
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {projectDoc?.content && (
                            <div className="mb-8 xl:hidden">
                                <TableOfContents
                                    content={projectDoc.content}
                                    variant="mobile"
                                />
                            </div>
                        )}

                        {projectDoc ? (
                            <div className="prose prose-invert max-w-none">
                                <MarkdownRenderer
                                    content={projectDoc.content}
                                />
                            </div>
                        ) : (
                            /* Fallback content if no documentation */
                            <div className="prose prose-invert max-w-none">
                                {/* Overview */}
                                <Card className="mb-8">
                                    <CardContent className="p-6">
                                        <h2 className="mb-4 text-2xl font-semibold">
                                            Overview
                                        </h2>
                                        <p className="text-foreground/80 leading-relaxed">
                                            {project.description}
                                        </p>

                                        <Alert
                                            variant="destructive"
                                            className="mt-8"
                                        >
                                            <AlertCircleIcon className="h-8 w-8" />
                                            <AlertTitle>
                                                This page is still work in
                                                progress!
                                            </AlertTitle>
                                            <AlertDescription>
                                                <p>
                                                    If you see this page, it is
                                                    because of one of the
                                                    following two reasons:
                                                </p>
                                                <ul className="list-inside list-disc text-sm">
                                                    <li>
                                                        The documentation for
                                                        this project is still
                                                        being written and not
                                                        ready to be published
                                                        yet
                                                    </li>
                                                    <li>
                                                        I simply forgot to write
                                                        any documentation and
                                                        accidentally published
                                                        this
                                                    </li>
                                                </ul>
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Separator className="my-12" />

                        {/* Related projects */}
                        <div className="text-center">
                            <h2 className="mb-4 text-2xl font-bold">
                                Explore More Projects
                            </h2>
                            <Button asChild>
                                <Link href="/projects">View All Projects</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Right spacer for desktop TOC */}
                    <div className="hidden xl:block xl:w-64 xl:flex-shrink-0" />
                </div>
            </div>
        </>
    )
}
