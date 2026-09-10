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

/**
 * Sitewide fallback social preview image. It is a raster PNG (1200x630) on
 * purpose - Twitter/X, Facebook, LinkedIn, Slack and Discord all ignore
 * `og:image`/`twitter:image` when it points at an SVG, so `/logo.svg` never
 * rendered as a link preview. Pages can pass a more specific `image` (e.g.
 * `/og/cheatsheet.png`); anything that doesn't set one falls back to this.
 */
const DEFAULT_OG_IMAGE = `${SITE_URL}/og/default.png`

/**
 * Page-specific images that follow the same 1200x630 OG card convention as
 * the fallback, so their dimensions can be advertised too. Images with other
 * aspect ratios (e.g. a project's own logo) are left without width/height.
 */
const OG_CARD_IMAGES = new Set([
    DEFAULT_OG_IMAGE,
    `${SITE_URL}/og/cheatsheet.png`,
])

export function Seo({
    title,
    description,
    path = '/',
    image = DEFAULT_OG_IMAGE,
    type = 'website',
    twitterCard = 'summary_large_image',
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
            {OG_CARD_IMAGES.has(image) && (
                <>
                    <meta property="og:image:width" content="1200" />
                    <meta property="og:image:height" content="630" />
                </>
            )}
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
