import projects from '@/data/projectData'
import { ArrowRight, Calendar } from 'lucide-react'

import { getAllPosts } from '@/lib/posts'
import { statusColors } from '@/lib/project-status'

import { HeroSection } from '@/components/hero-section'
import Image from '@/components/image'
import Link from '@/components/link'
import { ProjectCard } from '@/components/project-card'
import { Section } from '@/components/section'
import { Seo } from '@/components/seo'
import { TechStackSection } from '@/components/tech-stack-section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const description =
    'Personal website of Fx64b where you can find information about my latest projects and blog posts.'

function projectSlug(title: string) {
    return title.toLowerCase().replace(/\s+/g, '-')
}

export default function Home() {
    const latestPosts = getAllPosts().slice(0, 2)
    const featuredProjects = projects.filter((project) => project.featured)
    const [pinnedProject, ...otherFeaturedProjects] = featuredProjects

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
            <main>
                <HeroSection />

                <Section>
                    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <span className="text-muted-foreground font-mono text-sm">
                                01
                            </span>
                            <h2 className="text-3xl font-bold tracking-tight">
                                Featured Projects
                            </h2>
                        </div>
                    </div>

                    {pinnedProject && (
                        <Link
                            href={`/projects/${projectSlug(pinnedProject.title)}`}
                            className="group mb-6 block"
                        >
                            <Card className="overflow-hidden">
                                <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:p-8">
                                    <Image
                                        src={
                                            pinnedProject.logo ||
                                            '/placeholder.svg?height=64&width=64'
                                        }
                                        alt={`${pinnedProject.title} logo`}
                                        width={64}
                                        height={64}
                                        className="border-border shrink-0 rounded-lg border"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-3 flex flex-wrap items-center gap-3">
                                            <h3 className="group-hover:text-primary text-2xl font-semibold transition-colors">
                                                {pinnedProject.title}
                                            </h3>
                                            <Badge
                                                className={
                                                    statusColors[
                                                        pinnedProject.status
                                                    ]
                                                }
                                            >
                                                {pinnedProject.status}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground mb-4 max-w-2xl leading-relaxed">
                                            {pinnedProject.description}
                                        </p>
                                        {pinnedProject.tags &&
                                            pinnedProject.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {pinnedProject.tags.map(
                                                        (tag) => (
                                                            <Badge
                                                                key={tag}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {otherFeaturedProjects.length > 0 && (
                        <>
                            <Separator className="mb-6" />
                            <div className="grid gap-6 md:grid-cols-2">
                                {otherFeaturedProjects.map((project) => (
                                    <Link
                                        key={project.title}
                                        href={`/projects/${projectSlug(project.title)}`}
                                        className="group block"
                                    >
                                        <ProjectCard project={project} />
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="mt-8 flex justify-end">
                        <Link
                            href="/projects"
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
                        >
                            View All Projects
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </Section>

                {latestPosts.length > 0 && (
                    <Section className="bg-muted/30 py-12 md:py-16">
                        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                            <h2 className="text-xl font-semibold tracking-tight">
                                Latest Writing
                            </h2>
                            <Link
                                href="/blog"
                                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
                            >
                                View All Posts
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="divide-border mx-auto max-w-3xl divide-y">
                            {latestPosts.map((post) => (
                                <Link
                                    key={post.slug}
                                    href={`/blog/${post.slug}`}
                                    className="group flex items-center justify-between gap-6 py-4 first:pt-0 last:pb-0"
                                >
                                    <div className="min-w-0">
                                        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{post.date}</span>
                                            {post.read && (
                                                <>
                                                    <span>&middot;</span>
                                                    <span>{post.read}</span>
                                                </>
                                            )}
                                        </div>
                                        <h3 className="group-hover:text-primary truncate text-base font-semibold transition-colors">
                                            {post.title}
                                        </h3>
                                    </div>
                                    <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 flex-shrink-0 transition-all group-hover:translate-x-1" />
                                </Link>
                            ))}
                        </div>
                    </Section>
                )}

                <TechStackSection />

                <Section className="bg-muted/30">
                    <div className="text-center">
                        <h2 className="mb-4 text-3xl font-bold tracking-tight">
                            Let&#39;s Work Together
                        </h2>
                        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
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
                                <Link href="/projects">View My Work</Link>
                            </Button>
                        </div>
                    </div>
                </Section>
            </main>
        </>
    )
}
