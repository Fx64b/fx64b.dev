import projects from '@/data/projectData'
import { getAllTools } from '@/data/toolsData'
import { Github, Linkedin, Mail } from 'lucide-react'

import { formatMonthYear } from '@/lib/format'
import { getAllPosts } from '@/lib/posts'

import { HeroSection } from '@/components/hero-section'
import { XIcon } from '@/components/icons/x-icon'
import Link from '@/components/link'
import { ListRow, ListRows } from '@/components/list-row'
import { Pill, PillLink } from '@/components/pill'
import { Section } from '@/components/section'
import { Seo } from '@/components/seo'

const description =
    'Personal website of Fx64b where you can find information about my latest projects and blog posts.'

const skills = [
    'TypeScript',
    'JavaScript',
    'Go',
    'React',
    'Next.js',
    'Tailwind CSS',
    'Node.js',
    'PostgreSQL',
    'SQLite',
    'Docker',
    'Vite',
    'Linux',
]

const categoryLabels: Record<string, string> = {
    conversion: 'Conversion',
    formatting: 'Formatting',
    generators: 'Generator',
    utilities: 'Utility',
}

function projectSlug(title: string) {
    return title.toLowerCase().replace(/\s+/g, '-')
}

function SectionAction({ href, children }: { href: string; children: string }) {
    return (
        <Link
            href={href}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded-xs text-[12.5px] transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none"
        >
            {children} →
        </Link>
    )
}

export default function Home() {
    const latestPosts = getAllPosts().slice(0, 3)
    const featuredProjects = projects.filter((project) => project.featured)
    const tools = getAllTools()

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

                <Section id="about" label="About" bordered>
                    <p className="text-muted-foreground mb-6 max-w-[560px] text-[15.5px] leading-[1.7]">
                        I&#39;m a software engineer from Switzerland with 4+
                        years of experience. I build web applications and small
                        developer tools, mostly with TypeScript and Go, and I
                        care about things that stay simple enough to maintain.
                        Right now I&#39;m working through cybersecurity
                        fundamentals.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => (
                            <Pill key={skill}>{skill}</Pill>
                        ))}
                    </div>
                </Section>

                <Section
                    id="work"
                    label="Selected projects"
                    action={
                        <SectionAction href="/projects">
                            All projects
                        </SectionAction>
                    }
                >
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
                </Section>

                {latestPosts.length > 0 && (
                    <Section
                        id="writing"
                        label="Writing"
                        action={
                            <SectionAction href="/blog">
                                All posts
                            </SectionAction>
                        }
                    >
                        <ListRows>
                            {latestPosts.map((post) => (
                                <ListRow
                                    key={post.slug}
                                    href={`/blog/${post.slug}`}
                                    title={post.title}
                                    meta={formatMonthYear(post.date)}
                                    variant="compact"
                                />
                            ))}
                        </ListRows>
                    </Section>
                )}

                {tools.length > 0 && (
                    <Section
                        id="tools"
                        label="Tools"
                        action={
                            <SectionAction href="/tools">
                                All tools
                            </SectionAction>
                        }
                    >
                        <ListRows>
                            {tools.slice(0, 4).map((tool) => (
                                <ListRow
                                    key={tool.slug}
                                    href={`/tools/${tool.slug}`}
                                    title={tool.title}
                                    description={tool.description}
                                    meta={categoryLabels[tool.category]}
                                />
                            ))}
                        </ListRows>
                    </Section>
                )}

                <Section
                    id="contact"
                    label="Contact"
                    bordered
                    className="pb-24"
                >
                    <p className="text-muted-foreground mb-5 max-w-[480px] text-[15px] leading-[1.7]">
                        Email is the fastest way to reach me - for project work,
                        feedback on something I built, or just to say hello.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <PillLink href="mailto:contact@fx64b.dev">
                            <Mail className="size-3.5" />
                            Email
                        </PillLink>
                        <PillLink href="https://github.com/Fx64b" external>
                            <Github className="size-3.5" />
                            GitHub
                        </PillLink>
                        <PillLink
                            href="https://www.linkedin.com/in/fabio-maffucci-23515b328/"
                            external
                        >
                            <Linkedin className="size-3.5" />
                            LinkedIn
                        </PillLink>
                        <PillLink href="https://x.com/f_x64b" external>
                            <XIcon className="size-3.5" />X
                        </PillLink>
                    </div>
                </Section>
            </main>
        </>
    )
}
