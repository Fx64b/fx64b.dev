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
        description:
            'Count characters, words, sentences and calculate reading time',
        category: 'utilities',
        tags: ['text', 'count', 'words', 'characters', 'content'],
        popular: true,
    },
    {
        slug: 'base64-encoder-decoder',
        title: 'Base64 Encoder / Decoder',
        description:
            'Encode text to Base64 or decode Base64 strings back to plaintext',
        category: 'encoding',
        tags: ['base64', 'encode', 'decode', 'security', 'jwt', 'ctf'],
        popular: true,
    },
    {
        slug: 'hash-generator',
        title: 'Hash Generator',
        description:
            'Generate MD5, SHA-1, SHA-256 and SHA-512 hashes from any text',
        category: 'encoding',
        tags: ['hash', 'md5', 'sha256', 'sha512', 'checksum', 'security'],
        popular: true,
    },
    {
        slug: 'url-encoder-decoder',
        title: 'URL Encoder / Decoder',
        description:
            'Percent-encode URLs or decode encoded strings for web and security use',
        category: 'encoding',
        tags: ['url', 'encode', 'decode', 'percent-encoding', 'security', 'web'],
    },
    {
        slug: 'ip-subnet-calculator',
        title: 'IP Subnet Calculator',
        description:
            'Calculate network address, broadcast, host range, and subnet mask from CIDR notation',
        category: 'utilities',
        tags: ['ip', 'subnet', 'cidr', 'network', 'security', 'pentest'],
        popular: true,
    },
    {
        slug: 'reverse-shell-generator',
        title: 'Reverse Shell Generator',
        description:
            'Generate reverse shell one-liners for Bash, Python, PHP, PowerShell and more',
        category: 'generators',
        tags: ['reverse-shell', 'pentest', 'ctf', 'security', 'red-team'],
    },
    {
        slug: 'lorem-ipsum-generator',
        title: 'Lorem Ipsum Generator',
        description:
            'Generate placeholder Lorem Ipsum text by paragraph, sentence, or word count',
        category: 'generators',
        tags: ['lorem', 'ipsum', 'placeholder', 'text', 'design'],
    },
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
