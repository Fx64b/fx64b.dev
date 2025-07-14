import projectData from '@/data/projectData'
import { ArrowLeft, ExternalLink, Github, Tag } from 'lucide-react'

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BackgroundGrid } from '@/components/background-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Props {
    params: Promise<{
        slug: string
    }>
}

// Helper function to convert project title to slug
function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-')
}

// Helper function to find project by slug
function getProjectBySlug(slug: string) {
    return projectData.find(
        (project) => titleToSlug(project.title) === slug && project.featured
    )
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params
    const { slug } = params
    const project = getProjectBySlug(slug)

    if (!project) {
        return {
            title: 'Project not found',
            description: 'The requested project could not be found.',
        }
    }

    return {
        title: `${project.title} - Fx64b Projects`,
        description: project.description,
        openGraph: {
            title: project.title,
            description: project.description,
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
            description: project.description,
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
            <div className="relative mx-auto max-w-4xl px-4 py-8">
                {/* Back button */}
                <div className="mb-8">
                    <Button variant="ghost" asChild className="group">
                        <Link href="/projects">
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back to Projects
                        </Link>
                    </Button>
                </div>

                {/* Project header */}
                <div className="mb-12">
                    <div className="mb-6 flex items-start gap-6">
                        <div className="relative">
                            <img
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
                        <div className="flex-1">
                            <h1 className="mb-3 text-4xl font-bold tracking-tight">
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
                            </div>
                            <div className="flex gap-3">
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

                {/* Project content */}
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
                        </CardContent>
                    </Card>

                    {/* Tech Stack */}
                    {project.tags && project.tags.length > 0 && (
                        <Card className="mb-8">
                            <CardContent className="p-6">
                                <h2 className="mb-4 flex items-center text-2xl font-semibold">
                                    <Tag className="mr-2 h-5 w-5" />
                                    Tech Stack
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {project.tags.map((tag) => (
                                        <Badge key={tag} variant="outline">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Project-specific content based on title */}
                    {project.title === 'Flashcard App' && (
                        <div className="space-y-8">
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="mb-4 text-2xl font-semibold">
                                        Features
                                    </h2>
                                    <ul className="text-foreground/80 space-y-2">
                                        <li>
                                            • Spaced Repetition System (SRS) for
                                            optimal learning
                                        </li>
                                        <li>
                                            • Email authentication and user
                                            management
                                        </li>
                                        <li>
                                            • Study time tracking and progress
                                            analytics
                                        </li>
                                        <li>
                                            • Bulk card import functionality
                                        </li>
                                        <li>• Modern, responsive design</li>
                                        <li>• Real-time progress tracking</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="mb-4 text-2xl font-semibold">
                                        Development Status
                                    </h2>
                                    <p className="text-foreground/80 mb-4">
                                        This project is currently in early
                                        development. The core SRS algorithm is
                                        implemented, and I'm working on user
                                        authentication and the card management
                                        interface.
                                    </p>
                                    <div className="text-foreground/70 space-y-2 text-sm">
                                        <div>✅ Core SRS algorithm</div>
                                        <div>✅ Database schema design</div>
                                        <div>
                                            🔄 User authentication (in progress)
                                        </div>
                                        <div>
                                            🔄 Card management UI (in progress)
                                        </div>
                                        <div>
                                            ⏳ Analytics dashboard (planned)
                                        </div>
                                        <div>⏳ Mobile app (planned)</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {project.title === 'video-archiver' && (
                        <div className="space-y-8">
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="mb-4 text-2xl font-semibold">
                                        Features
                                    </h2>
                                    <ul className="text-foreground/80 space-y-2">
                                        <li>
                                            • YouTube video downloading and
                                            archiving
                                        </li>
                                        <li>
                                            • Video categorization and
                                            management
                                        </li>
                                        <li>• Format conversion tools</li>
                                        <li>• Streaming capabilities</li>
                                        <li>• Batch processing support</li>
                                        <li>
                                            • Metadata extraction and storage
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="mb-4 text-2xl font-semibold">
                                        Current Status
                                    </h2>
                                    <p className="text-foreground/80">
                                        This project is currently on hold while
                                        I focus on other priorities. The basic
                                        video downloading functionality is
                                        implemented, but the management and
                                        streaming features are still in
                                        development.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {project.title === 'skool-loom-dl' && (
                        <div className="space-y-8">
                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="mb-4 text-2xl font-semibold">
                                        Features
                                    </h2>
                                    <ul className="text-foreground/80 space-y-2">
                                        <li>
                                            • Automatic Loom video scraping from
                                            Skool.com
                                        </li>
                                        <li>
                                            • Cookie-based and email/password
                                            authentication
                                        </li>
                                        <li>
                                            • Support for JSON and Netscape
                                            cookie formats
                                        </li>
                                        <li>
                                            • Docker support for easy deployment
                                        </li>
                                        <li>• Lightweight Go implementation</li>
                                        <li>• Batch processing capabilities</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <h2 className="mb-4 text-2xl font-semibold">
                                        Use Cases
                                    </h2>
                                    <p className="text-foreground/80 mb-4">
                                        This tool is perfect for educators and
                                        students who want to archive educational
                                        content from Skool.com classrooms for
                                        offline viewing or backup purposes.
                                    </p>
                                    <div className="bg-muted/50 rounded-lg p-4">
                                        <p className="text-foreground/70 text-sm">
                                            <strong>Note:</strong> This tool is
                                            for personal use and educational
                                            purposes. Please respect content
                                            creators' rights and terms of
                                            service.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Links */}
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="mb-4 text-2xl font-semibold">
                                Links
                            </h2>
                            <div className="flex flex-wrap gap-4">
                                <Button asChild>
                                    <Link
                                        href={project.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Live Project
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link
                                        href={project.githubLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Github className="mr-2 h-4 w-4" />
                                        GitHub Repository
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
        </>
    )
}
