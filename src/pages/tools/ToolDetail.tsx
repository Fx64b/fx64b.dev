import { getToolBySlug } from '@/data/toolsData'

import { useParams } from 'react-router-dom'

import { Section } from '@/components/section'
import { Seo } from '@/components/seo'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import NotFound from '../NotFound'
import DynamicToolLoader from './DynamicToolLoader'

export default function ToolDetail() {
    const { slug = '' } = useParams()
    const tool = getToolBySlug(slug)

    if (!tool) {
        return <NotFound />
    }

    return (
        <>
            <Seo
                title={`${tool.title} - Fx64b.dev`}
                description={tool.description}
                path={`/tools/${tool.slug}`}
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'WebApplication',
                    name: tool.title,
                    description: tool.description,
                    url: `https://fx64b.dev/tools/${tool.slug}`,
                    applicationCategory: 'DeveloperApplication',
                    operatingSystem: 'Any',
                    browserRequirements: 'Requires JavaScript',
                    offers: {
                        '@type': 'Offer',
                        price: '0',
                        priceCurrency: 'USD',
                    },
                    author: { '@id': 'https://fx64b.dev/#person' },
                }}
            />
            <Section className="pt-24">
                <div className="mx-auto max-w-(--breakpoint-lg)">
                    <h1 className="mb-2 text-2xl font-bold">{tool.title}</h1>
                    <p className="text-muted-foreground mb-6">
                        {tool.description}
                    </p>

                    <Separator className="my-6" />

                    <DynamicToolLoader slug={tool.slug} />

                    <div className="mt-12">
                        <h3 className="mb-4 text-lg font-semibold">
                            About this tool
                        </h3>
                        <p>
                            This is a free online tool that works entirely in
                            your browser.
                        </p>

                        {tool.tags.length > 0 && (
                            <div className="mt-4">
                                <h4 className="mb-2 font-medium">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {tool.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Section>
        </>
    )
}
