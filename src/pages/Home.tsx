import projects from '@/data/projectData'
import { ArrowRight, Calendar } from 'lucide-react'

import { getAllPosts } from '@/lib/posts'

import { HeroSection } from '@/components/hero-section'
import Link from '@/components/link'
import { ProjectCard } from '@/components/project-card'
import { Section } from '@/components/section'
import { Seo } from '@/components/seo'
import { TechStackSection } from '@/components/tech-stack-section'
import { Button } from '@/components/ui/button'

const description =
    'Personal website of Fx64b where you can find information about my latest projects and blog posts.'

export default function Home() {
    const latestPosts = getAllPosts().slice(0, 3)

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

                {latestPosts.length > 0 && (
                    <Section className="bg-muted/30">
                        <div className="mb-12 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight">
                                    Latest Writing
                                </h2>
                                <p className="text-muted-foreground mt-2 max-w-xl">
                                    Notes on software development, security, and
                                    things I&#39;m learning.
                                </p>
                            </div>
                            <Button variant="outline" asChild>
                                <Link href="/blog">
                                    View All Posts
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>

                        <div className="divide-border mx-auto max-w-3xl divide-y">
                            {latestPosts.map((post) => (
                                <Link
                                    key={post.slug}
                                    href={`/blog/${post.slug}`}
                                    className="group flex items-center justify-between gap-6 py-6 first:pt-0 last:pb-0"
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
                                        <h3 className="group-hover:text-primary truncate text-lg font-semibold transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                                            {post.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="text-muted-foreground group-hover:text-primary h-5 w-5 flex-shrink-0 transition-all group-hover:translate-x-1" />
                                </Link>
                            ))}
                        </div>
                    </Section>
                )}

                <Section>
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold tracking-tight">
                            Featured Projects
                        </h2>
                        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
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
                            <Link href="/projects">
                                View All Projects <ArrowRight />
                            </Link>
                        </Button>
                    </div>
                </Section>

                <TechStackSection className="bg-muted/30" />

                <Section>
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
                                <Link href="/blog">Read My Blog</Link>
                            </Button>
                        </div>
                    </div>
                </Section>
            </main>
        </>
    )
}
