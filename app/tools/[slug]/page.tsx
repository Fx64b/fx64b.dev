import { getAllTools, getRelatedTools, getToolBySlug } from '@/data/toolsData'
import { ArrowRight, ChevronRight } from 'lucide-react'

import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import DynamicToolLoader from '@/app/tools/components/DynamicToolLoader'

import { BackgroundGrid } from '@/components/background-grid'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const BASE_URL = 'https://fx64b.dev'

interface ToolPageProps {
    params: Promise<{
        slug: string
    }>
}

interface GenerateMetadataProps {
    params: Promise<{
        slug: string
    }>
}

export async function generateMetadata(
    props: GenerateMetadataProps
): Promise<Metadata> {
    const params = await props.params
    const slug: string = params.slug
    const tool = getToolBySlug(slug)

    if (!tool) {
        return {
            title: 'Tool Not Found - Fx64b.dev',
        }
    }

    const description = tool.summary ?? tool.description

    return {
        title: `${tool.title} - Fx64b.dev`,
        description,
        keywords: [...tool.tags, ...(tool.keywords ?? [])],
        alternates: {
            canonical: `/tools/${tool.slug}`,
        },
        openGraph: {
            title: tool.title,
            description,
            url: `${BASE_URL}/tools/${tool.slug}`,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: tool.title,
            description,
        },
    }
}

export async function generateStaticParams() {
    const tools = getAllTools()
    return tools.map((tool) => ({
        slug: tool.slug,
    }))
}

export default async function ToolPage(props: ToolPageProps) {
    const params = await props.params
    const slug: string = params.slug
    const tool = getToolBySlug(slug)

    if (!tool) {
        notFound()
    }

    const relatedTools = getRelatedTools(tool.slug)
    const description = tool.summary ?? tool.description

    const softwareJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: tool.title,
        description,
        url: `${BASE_URL}/tools/${tool.slug}`,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        ...(tool.updatedAt ? { dateModified: tool.updatedAt } : {}),
        ...(tool.addedAt ? { datePublished: tool.addedAt } : {}),
    }

    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Tools',
                item: `${BASE_URL}/tools`,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: tool.title,
                item: `${BASE_URL}/tools/${tool.slug}`,
            },
        ],
    }

    const faqJsonLd =
        tool.faq && tool.faq.length > 0
            ? {
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: tool.faq.map((item) => ({
                      '@type': 'Question',
                      name: item.q,
                      acceptedAnswer: {
                          '@type': 'Answer',
                          text: item.a,
                      },
                  })),
              }
            : null

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(softwareJsonLd),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbJsonLd),
                }}
            />
            {faqJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(faqJsonLd),
                    }}
                />
            )}
            <BackgroundGrid />
            <div className="container mx-auto max-w-(--breakpoint-lg) px-4 py-8">
                <nav
                    aria-label="Breadcrumb"
                    className="text-muted-foreground mb-6 flex items-center gap-1.5 text-sm"
                >
                    <Link
                        href="/tools"
                        className="hover:text-foreground transition-colors"
                    >
                        Tools
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-foreground truncate">
                        {tool.title}
                    </span>
                </nav>

                <div className="mb-6">
                    <div className="mb-1.5 flex items-start gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {tool.title}
                        </h1>
                        <Badge
                            variant="secondary"
                            className="mt-1 shrink-0 capitalize"
                        >
                            {tool.category}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">{description}</p>
                </div>

                <Separator className="mb-8" />

                <DynamicToolLoader slug={params.slug} />

                {tool.useCases && tool.useCases.length > 0 && (
                    <div className="mt-12">
                        <h2 className="mb-4 text-xl font-semibold">
                            When to use {tool.title}
                        </h2>
                        <ul className="text-muted-foreground list-inside list-disc space-y-1.5 text-sm">
                            {tool.useCases.map((useCase) => (
                                <li key={useCase}>{useCase}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {tool.faq && tool.faq.length > 0 && (
                    <div className="mt-12">
                        <h2 className="mb-4 text-xl font-semibold">
                            Frequently asked questions
                        </h2>
                        <div className="space-y-4">
                            {tool.faq.map((item) => (
                                <div key={item.q}>
                                    <h3 className="mb-1 font-medium">
                                        {item.q}
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {item.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {relatedTools.length > 0 && (
                    <div className="mt-12">
                        <h2 className="mb-4 text-xl font-semibold">
                            Related tools
                        </h2>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {relatedTools.map((related) => (
                                <Link
                                    key={related.slug}
                                    href={`/tools/${related.slug}`}
                                    className="group block"
                                >
                                    <Card className="hover:bg-card h-full transition-colors">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium">
                                                    {related.title}
                                                </span>
                                                <ArrowRight className="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground text-sm leading-relaxed">
                                                {related.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {tool.tags.length > 0 && (
                    <div className="mt-10 flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-xs tracking-wider uppercase">
                            Tags
                        </span>
                        {tool.tags.map((tag) => (
                            <Link key={tag} href={`/tools?tags=${tag}`}>
                                <Badge
                                    variant="outline"
                                    className="hover:bg-accent text-xs transition-colors"
                                >
                                    {tag}
                                </Badge>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
