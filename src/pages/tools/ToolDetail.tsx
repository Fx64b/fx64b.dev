import { getToolBySlug } from '@/data/toolsData'

import { useParams } from 'react-router-dom'

import { BackLink } from '@/components/back-link'
import { Page } from '@/components/page'
import { Pill } from '@/components/pill'
import { Seo } from '@/components/seo'

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

            <Page className="max-w-[860px]">
                <BackLink href="/tools">Back to tools</BackLink>

                <h1 className="mt-6 mb-2 text-[30px] font-extrabold tracking-[-0.02em] sm:text-[36px]">
                    {tool.title}
                </h1>
                <p className="text-muted-foreground mb-8 max-w-[560px] text-[15.5px] leading-[1.7]">
                    {tool.description}
                </p>

                <DynamicToolLoader slug={tool.slug} />

                <div className="border-border mt-16 border-t pt-8">
                    <p className="text-muted-foreground text-[13.5px] leading-[1.7]">
                        This tool runs entirely in your browser - nothing you
                        type is sent anywhere.
                    </p>
                    {tool.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {tool.tags.map((tag) => (
                                <Pill key={tag} size="sm">
                                    {tag}
                                </Pill>
                            ))}
                        </div>
                    )}
                </div>
            </Page>
        </>
    )
}
