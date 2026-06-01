import { getAllTools } from '@/data/toolsData'

const BASE_URL = 'https://fx64b.dev'

// Serves /llms.txt — a plain-text catalog for AI crawlers and assistants.
// Format follows the emerging llms.txt convention (https://llmstxt.org).
export function GET() {
    const tools = getAllTools()

    const toolLines = tools
        .map(
            (tool) =>
                `- [${tool.title}](${BASE_URL}/tools/${tool.slug}): ${
                    tool.summary ?? tool.description
                }`
        )
        .join('\n')

    const body = `# Fx64b.dev

> Free, privacy-friendly, browser-based tools for developers and everyday tasks. No ads, no tracking — everything runs locally in the browser.

## Tools

${toolLines}

## More

- [All tools](${BASE_URL}/tools)
- [Blog](${BASE_URL}/blog)
- [Projects](${BASE_URL}/projects)
`

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    })
}
