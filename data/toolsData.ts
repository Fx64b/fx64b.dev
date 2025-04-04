import { Tool } from '@/types/tool'

const toolsData: Tool[] = [
    {
        slug: 'byte-converter',
        title: 'Byte Converter',
        description:
            'Convert between different byte units (KB, MB, GB, TB, etc.)',
        category: 'conversion',
        tags: ['bytes', 'memory', 'storage', 'data'],
        popular: true,
    },
    {
        slug: 'text-case-converter',
        title: 'Text Case Converter',
        description:
            'Convert text between different cases (lowercase, uppercase, title case, etc.)',
        category: 'formatting',
        tags: ['text', 'case', 'capitalization'],
    },
    {
        slug: 'color-converter',
        title: 'Color Converter',
        description: 'Convert between different color formats (HEX, RGB, HSL)',
        category: 'conversion',
        tags: ['colors', 'design', 'hex', 'rgb'],
    },
    {
        slug: 'hour-decimal-converter',
        title: 'Hour to Decimal Converter',
        description: 'Convert hours and minutes to decimal time format',
        category: 'conversion',
        tags: ['time', 'decimal', 'hours', 'minutes'],
    },
    {
        slug: 'character-word-counter',
        title: 'Character & Word Counter',
        description: 'Count characters, words, sentences and calculate reading time',
        category: 'utilities',
        tags: ['text', 'count', 'words', 'characters', 'content'],
        popular: true,
    }
]

export default toolsData

export function getAllTools(): Tool[] {
    return toolsData
}

export function getToolBySlug(slug: string): Tool | undefined {
    return toolsData.find((tool) => tool.slug === slug)
}

export function getToolsByCategory(category: Tool['category']): Tool[] {
    return toolsData.filter((tool) => tool.category === category)
}

export function getPopularTools(): Tool[] {
    return toolsData.filter((tool) => tool.popular)
}

export function searchTools(query: string): Tool[] {
    const lowerQuery = query.toLowerCase()
    return toolsData.filter(
        (tool) =>
            tool.title.toLowerCase().includes(lowerQuery) ||
            tool.description.toLowerCase().includes(lowerQuery) ||
            tool.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    )
}