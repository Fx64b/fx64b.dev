import { Head } from 'vite-react-ssg'

interface SeoProps {
    title: string
    description: string
    /** Path beginning with `/`, e.g. `/blog/hello-world`. */
    path?: string
    image?: string
    type?: 'website' | 'article'
    twitterCard?: 'summary' | 'summary_large_image'
    /** Optional JSON-LD structured data object(s) for rich/AI results. */
    jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const SITE_URL = 'https://fx64b.dev'

export function Seo({
    title,
    description,
    path = '/',
    image = `${SITE_URL}/logo.svg`,
    type = 'website',
    twitterCard = 'summary',
    jsonLd,
}: SeoProps) {
    const url = `${SITE_URL}${path}`

    return (
        <Head>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            <meta property="og:type" content={type} />
            <meta property="og:site_name" content="Fx64b.dev" />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:locale" content="en_US" />

            <meta name="twitter:card" content={twitterCard} />
            <meta name="twitter:site" content="@f_x64b" />
            <meta name="twitter:creator" content="@f_x64b" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {jsonLd && (
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            )}
        </Head>
    )
}
