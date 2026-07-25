import { getToolsByCategory } from '@/data/toolsData'
import type { Tool } from '@/types/tool'

import { ListRow, ListRows } from '@/components/list-row'
import { Page, PageHeader } from '@/components/page'
import { Reveal } from '@/components/reveal'
import { Eyebrow } from '@/components/section'
import { Seo } from '@/components/seo'

const description =
    'Free online tools for developers and everyday tasks. No ads, no tracking, just tools that work.'

const categories: { name: string; tools: Tool[] }[] = [
    { name: 'Conversion', tools: getToolsByCategory('conversion') },
    { name: 'Formatting', tools: getToolsByCategory('formatting') },
    { name: 'Generators', tools: getToolsByCategory('generators') },
    { name: 'Utilities', tools: getToolsByCategory('utilities') },
]

export default function ToolsIndex() {
    const activeCategories = categories.filter(
        (category) => category.tools.length > 0
    )

    return (
        <>
            <Seo
                title="Developer Tools - Fx64b.dev"
                description={description}
                path="/tools"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    '@id': 'https://fx64b.dev/tools',
                    name: 'Developer Tools',
                    description: description,
                    hasPart: activeCategories.flatMap((category) =>
                        category.tools.map((tool) => ({
                            '@type': 'WebApplication',
                            name: tool.title,
                            description: tool.description,
                            url: `https://fx64b.dev/tools/${tool.slug}`,
                            applicationCategory: 'DeveloperApplication',
                            operatingSystem: 'Any',
                            offers: {
                                '@type': 'Offer',
                                price: '0',
                                priceCurrency: 'USD',
                            },
                        }))
                    ),
                }}
            />

            <Page>
                <PageHeader title="Tools">{description}</PageHeader>

                {activeCategories.map((category) => (
                    <Reveal key={category.name} className="mb-12">
                        <Eyebrow>{category.name}</Eyebrow>
                        <ListRows>
                            {category.tools.map((tool) => (
                                <ListRow
                                    key={tool.slug}
                                    href={`/tools/${tool.slug}`}
                                    title={tool.title}
                                    description={tool.description}
                                    meta={tool.popular ? 'Popular' : undefined}
                                />
                            ))}
                        </ListRows>
                    </Reveal>
                ))}

                {activeCategories.length === 0 && (
                    <p className="text-muted-foreground text-[15px]">
                        Tools are coming soon. Check back later!
                    </p>
                )}
            </Page>
        </>
    )
}
