import { MetadataRoute } from 'next'

const BASE_URL = 'https://fx64b.dev'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    }
}
