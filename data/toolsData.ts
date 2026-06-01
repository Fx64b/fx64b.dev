import { Tool, ToolCategory } from '@/types/tool'

const toolsData: Tool[] = [
    {
        slug: 'byte-converter',
        title: 'Byte Converter',
        description:
            'Convert between different byte units (KB, MB, GB, TB, etc.)',
        category: 'conversion',
        tags: ['bytes', 'memory', 'storage', 'data'],
        popular: true,
        keywords: ['kb', 'mb', 'gb', 'tb', 'kib', 'mib', 'gib', 'file size'],
        summary:
            'Convert between bytes, kilobytes, megabytes, gigabytes and terabytes using both decimal (KB) and binary (KiB) units.',
        faq: [
            {
                q: 'What is the difference between KB and KiB?',
                a: 'A kilobyte (KB) is 1,000 bytes (decimal/SI), while a kibibyte (KiB) is 1,024 bytes (binary). Storage vendors use KB, operating systems often report KiB.',
            },
            {
                q: 'Why does my drive show less space than advertised?',
                a: 'Manufacturers advertise capacity in decimal units (1 GB = 1,000,000,000 bytes) while your OS measures in binary units (1 GiB = 1,073,741,824 bytes), so the reported number looks smaller.',
            },
        ],
        relatedSlugs: ['hour-decimal-converter', 'color-converter'],
        useCases: [
            'Sizing files, uploads, and download limits',
            'Comparing decimal vs binary storage capacity',
            'Estimating bandwidth and memory budgets',
        ],
        addedAt: '2025-05-30',
        updatedAt: '2025-05-30',
    },
    {
        slug: 'text-case-converter',
        title: 'Text Case Converter',
        description:
            'Convert text between different cases (lowercase, uppercase, title case, etc.)',
        category: 'formatting',
        tags: ['text', 'case', 'capitalization'],
        keywords: [
            'camelcase',
            'snake_case',
            'kebab-case',
            'pascalcase',
            'title case',
            'uppercase',
            'lowercase',
        ],
        summary:
            'Transform text between lowercase, UPPERCASE, Title Case, camelCase, snake_case, kebab-case and more in one click.',
        faq: [
            {
                q: 'Which cases can I convert to?',
                a: 'Common programming and writing cases including lowercase, UPPERCASE, Title Case, Sentence case, camelCase, PascalCase, snake_case and kebab-case.',
            },
            {
                q: 'Is my text sent to a server?',
                a: 'No. All conversion happens locally in your browser — nothing is uploaded or stored.',
            },
        ],
        relatedSlugs: ['character-word-counter', 'lorem-ipsum-generator'],
        useCases: [
            'Renaming variables to a consistent code style',
            'Cleaning up headings and titles',
            'Normalising imported or pasted text',
        ],
        addedAt: '2025-05-30',
        updatedAt: '2025-05-30',
    },
    {
        slug: 'color-converter',
        title: 'Color Converter',
        description: 'Convert between different color formats (HEX, RGB, HSL)',
        category: 'conversion',
        tags: ['colors', 'design', 'hex', 'rgb'],
        keywords: ['hsl', 'rgba', 'hex code', 'color picker', 'css colors'],
        summary:
            'Convert colors between HEX, RGB and HSL formats and preview them instantly for use in CSS and design tools.',
        faq: [
            {
                q: 'Which color formats are supported?',
                a: 'HEX (#rrggbb), RGB/RGBA and HSL — the formats you most commonly need for CSS and design work.',
            },
            {
                q: 'Does it support transparency?',
                a: 'Yes, RGBA values let you express an alpha channel for partially transparent colors.',
            },
        ],
        relatedSlugs: ['byte-converter', 'hour-decimal-converter'],
        useCases: [
            'Translating a designer’s HEX into CSS HSL',
            'Building consistent color palettes',
            'Tweaking lightness/saturation via HSL',
        ],
        addedAt: '2025-05-30',
        updatedAt: '2025-05-30',
    },
    {
        slug: 'hour-decimal-converter',
        title: 'Hour to Decimal Converter',
        description: 'Convert hours and minutes to decimal time format',
        category: 'conversion',
        tags: ['time', 'decimal', 'hours', 'minutes'],
        keywords: ['timesheet', 'payroll', 'time tracking', 'hh:mm'],
        summary:
            'Convert hours and minutes (HH:MM) to decimal hours and back — ideal for timesheets, invoicing and payroll.',
        faq: [
            {
                q: 'How do I convert 1:30 to decimal?',
                a: 'Divide the minutes by 60: 30 / 60 = 0.5, so 1:30 becomes 1.5 decimal hours.',
            },
            {
                q: 'Why use decimal hours?',
                a: 'Payroll and billing systems usually multiply an hourly rate by decimal hours, which avoids manual minute-to-fraction conversions.',
            },
        ],
        relatedSlugs: ['byte-converter', 'color-converter'],
        useCases: [
            'Filling in timesheets and invoices',
            'Calculating billable hours',
            'Aggregating tracked time for payroll',
        ],
        addedAt: '2025-05-30',
        updatedAt: '2025-05-30',
    },
    {
        slug: 'character-word-counter',
        title: 'Character & Word Counter',
        description:
            'Count characters, words, sentences and calculate reading time',
        category: 'utilities',
        tags: ['text', 'count', 'words', 'characters', 'content'],
        popular: true,
        keywords: [
            'word count',
            'character count',
            'reading time',
            'seo',
            'twitter limit',
        ],
        summary:
            'Count characters, words and sentences and estimate reading time — useful for SEO, social posts and content limits.',
        faq: [
            {
                q: 'How is reading time calculated?',
                a: 'It estimates based on an average adult reading speed of roughly 200–230 words per minute.',
            },
            {
                q: 'Does it count spaces?',
                a: 'Yes, it reports both character counts with and without spaces so you can match different platform limits.',
            },
        ],
        relatedSlugs: ['text-case-converter', 'lorem-ipsum-generator'],
        useCases: [
            'Staying within tweet or meta-description limits',
            'Estimating article reading time',
            'Checking essay or content length',
        ],
        addedAt: '2025-05-30',
        updatedAt: '2025-05-30',
    },
    {
        slug: 'base64-encoder-decoder',
        title: 'Base64 Encoder / Decoder',
        description:
            'Encode text to Base64 or decode Base64 strings back to plaintext',
        category: 'encoding',
        tags: ['base64', 'encode', 'decode', 'security', 'jwt', 'ctf'],
        popular: true,
        keywords: ['b64', 'data uri', 'atob', 'btoa', 'mime'],
        summary:
            'Encode text to Base64 or decode Base64 back to plaintext — handy for JWTs, data URIs and CTF challenges.',
        faq: [
            {
                q: 'Is Base64 encryption?',
                a: 'No. Base64 is reversible encoding, not encryption. Anyone can decode it instantly, so never use it to protect secrets.',
            },
            {
                q: 'Why does Base64 make data larger?',
                a: 'It represents every 3 bytes as 4 ASCII characters, increasing size by roughly 33%.',
            },
        ],
        relatedSlugs: ['url-encoder-decoder', 'hash-generator'],
        useCases: [
            'Inspecting JWT headers and payloads',
            'Embedding images as data URIs',
            'Decoding CTF and security challenge payloads',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'hash-generator',
        title: 'Hash Generator',
        description:
            'Generate MD5, SHA-1, SHA-256 and SHA-512 hashes from any text',
        category: 'encoding',
        tags: ['hash', 'md5', 'sha256', 'sha512', 'checksum', 'security'],
        popular: true,
        keywords: ['sha1', 'digest', 'fingerprint', 'integrity'],
        summary:
            'Generate MD5, SHA-1, SHA-256 and SHA-512 hashes from any text directly in your browser.',
        faq: [
            {
                q: 'Which hash should I use?',
                a: 'Prefer SHA-256 or SHA-512 for integrity checks. MD5 and SHA-1 are broken for security purposes and should only be used for non-security checksums.',
            },
            {
                q: 'Can I reverse a hash back to the original text?',
                a: 'No. Hashes are one-way functions. The only way to “reverse” one is to guess inputs and compare hashes.',
            },
        ],
        relatedSlugs: ['base64-encoder-decoder', 'url-encoder-decoder'],
        useCases: [
            'Verifying file or download integrity',
            'Comparing checksums',
            'Learning how hashing works',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'url-encoder-decoder',
        title: 'URL Encoder / Decoder',
        description:
            'Percent-encode URLs or decode encoded strings for web and security use',
        category: 'encoding',
        tags: [
            'url',
            'encode',
            'decode',
            'percent-encoding',
            'security',
            'web',
        ],
        keywords: ['urlencode', 'urldecode', 'query string', 'uri', 'escape'],
        summary:
            'Percent-encode or decode URLs and query strings so special characters travel safely over the web.',
        faq: [
            {
                q: 'When do I need URL encoding?',
                a: 'Whenever a value placed in a URL contains spaces or reserved characters such as &, ?, # or /. Encoding turns them into %xx escapes.',
            },
            {
                q: 'What is the difference between encodeURI and encodeURIComponent?',
                a: 'encodeURI keeps URL structure characters intact, while encodeURIComponent escapes them too — use the latter for individual query-string values.',
            },
        ],
        relatedSlugs: ['base64-encoder-decoder', 'hash-generator'],
        useCases: [
            'Building safe query strings',
            'Debugging encoded links',
            'Decoding captured web requests',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'ip-subnet-calculator',
        title: 'IP Subnet Calculator',
        description:
            'Calculate network address, broadcast, host range, and subnet mask from CIDR notation',
        category: 'utilities',
        tags: ['ip', 'subnet', 'cidr', 'network', 'security', 'pentest'],
        popular: true,
        keywords: ['netmask', 'ipv4', 'broadcast', 'host range', 'networking'],
        summary:
            'Calculate network and broadcast addresses, usable host range and subnet mask from any IPv4 CIDR block.',
        faq: [
            {
                q: 'What does /24 mean in CIDR?',
                a: 'It means the first 24 bits are the network portion, leaving 8 bits (256 addresses, 254 usable hosts) for the network.',
            },
            {
                q: 'How many usable hosts are in a subnet?',
                a: 'Generally 2^(host bits) − 2, subtracting the network and broadcast addresses.',
            },
        ],
        relatedSlugs: ['reverse-shell-generator', 'base64-encoder-decoder'],
        useCases: [
            'Planning network subnets',
            'Scoping IP ranges during pentests',
            'Understanding CIDR notation',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'reverse-shell-generator',
        title: 'Reverse Shell Generator',
        description:
            'Generate reverse shell one-liners for Bash, Python, PHP, PowerShell and more',
        category: 'security',
        tags: ['reverse-shell', 'pentest', 'ctf', 'security', 'red-team'],
        keywords: ['netcat', 'nc', 'bind shell', 'payload', 'oscp'],
        summary:
            'Generate reverse shell one-liners for Bash, Python, PHP, PowerShell, Netcat and more from your IP and port.',
        faq: [
            {
                q: 'What is a reverse shell?',
                a: 'A reverse shell makes the target machine connect back to your listener, giving you an interactive shell — commonly used in authorized pentests and CTFs.',
            },
            {
                q: 'How do I catch the connection?',
                a: 'Start a listener such as `nc -lvnp <port>` on your machine, then run the matching one-liner on the target.',
            },
        ],
        relatedSlugs: ['ip-subnet-calculator', 'base64-encoder-decoder'],
        useCases: [
            'Authorized penetration testing engagements',
            'CTF and security training labs',
            'Learning how reverse shells work',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'lorem-ipsum-generator',
        title: 'Lorem Ipsum Generator',
        description:
            'Generate placeholder Lorem Ipsum text by paragraph, sentence, or word count',
        category: 'generators',
        tags: ['lorem', 'ipsum', 'placeholder', 'text', 'design'],
        keywords: ['dummy text', 'filler text', 'mockup', 'placeholder copy'],
        summary:
            'Generate placeholder Lorem Ipsum text by paragraphs, sentences or words for mockups and layouts.',
        faq: [
            {
                q: 'What is Lorem Ipsum?',
                a: 'It is scrambled Latin-like placeholder text used to fill layouts so designers can focus on visual structure rather than content.',
            },
            {
                q: 'Can I control how much text is generated?',
                a: 'Yes, you can generate by number of paragraphs, sentences or words.',
            },
        ],
        relatedSlugs: ['character-word-counter', 'text-case-converter'],
        useCases: [
            'Filling design mockups and prototypes',
            'Testing typography and spacing',
            'Placeholder copy for templates',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'jwt-decoder',
        title: 'JWT Decoder',
        description:
            'Decode JSON Web Token headers and payloads and inspect their claims',
        category: 'security',
        tags: ['jwt', 'token', 'decode', 'security', 'auth'],
        popular: true,
        keywords: ['json web token', 'bearer', 'claims', 'jws', 'oauth'],
        summary:
            'Decode a JWT to inspect its header, payload and claims (exp, iat, nbf) without sending it anywhere.',
        faq: [
            {
                q: 'Does this verify the JWT signature?',
                a: 'No. It only decodes the header and payload. Signature verification requires the secret or public key and should be done server-side.',
            },
            {
                q: 'Is my token sent to a server?',
                a: 'No. Decoding happens entirely in your browser — the token never leaves your machine.',
            },
            {
                q: 'Why are JWT parts unreadable?',
                a: 'Each part is Base64URL-encoded JSON. This tool decodes them back into readable JSON.',
            },
        ],
        relatedSlugs: ['base64-encoder-decoder', 'timestamp-converter'],
        useCases: [
            'Debugging authentication and OAuth flows',
            'Checking token expiry and claims',
            'Inspecting tokens during security testing',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'uuid-generator',
        title: 'UUID Generator',
        description: 'Generate random version 4 UUIDs in bulk',
        category: 'generators',
        tags: ['uuid', 'guid', 'random', 'id', 'identifier'],
        popular: true,
        keywords: ['uuid4', 'v4', 'unique id', 'guid generator'],
        summary:
            'Generate cryptographically random version 4 UUIDs in bulk, with optional uppercase and hyphen-free formats.',
        faq: [
            {
                q: 'What is a version 4 UUID?',
                a: 'A 128-bit identifier whose bits are almost entirely random, making collisions practically impossible.',
            },
            {
                q: 'Are these UUIDs secure/random?',
                a: 'Yes. They use the browser’s crypto API (crypto.randomUUID / getRandomValues), not Math.random.',
            },
        ],
        relatedSlugs: ['hash-generator'],
        useCases: [
            'Generating database primary keys',
            'Creating unique identifiers for tests and seeds',
            'Correlation IDs for logging and tracing',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'json-formatter',
        title: 'JSON Formatter & Validator',
        description: 'Format, beautify, minify and validate JSON',
        category: 'formatting',
        tags: ['json', 'format', 'beautify', 'minify', 'validate'],
        popular: true,
        keywords: ['pretty print', 'prettify', 'lint', 'json validator'],
        summary:
            'Beautify, minify and validate JSON with clear error messages — all locally in your browser.',
        faq: [
            {
                q: 'What does the validator check?',
                a: 'It parses your input with the standard JSON parser and reports the exact syntax error if parsing fails.',
            },
            {
                q: 'Can it minify JSON too?',
                a: 'Yes. The Minify option strips all whitespace to produce the smallest valid JSON.',
            },
        ],
        relatedSlugs: ['base64-encoder-decoder', 'text-case-converter'],
        useCases: [
            'Cleaning up API responses for readability',
            'Validating config and payloads',
            'Minifying JSON before transport',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'timestamp-converter',
        title: 'Unix Timestamp Converter',
        description: 'Convert between Unix timestamps and human-readable dates',
        category: 'conversion',
        tags: ['timestamp', 'unix', 'epoch', 'date', 'time'],
        popular: true,
        keywords: ['epoch', 'unix time', 'iso 8601', 'utc', 'milliseconds'],
        summary:
            'Convert Unix timestamps (seconds or milliseconds) to UTC, local and ISO 8601 dates, and back again.',
        faq: [
            {
                q: 'What is a Unix timestamp?',
                a: 'The number of seconds elapsed since 00:00:00 UTC on 1 January 1970, known as the Unix epoch.',
            },
            {
                q: 'Does it handle milliseconds?',
                a: 'Yes. Values with 13 or more digits are treated as milliseconds, shorter values as seconds.',
            },
        ],
        relatedSlugs: ['hour-decimal-converter', 'jwt-decoder'],
        useCases: [
            'Reading timestamps from logs and databases',
            'Debugging token expiry times',
            'Converting between epoch and ISO dates',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'number-base-converter',
        title: 'Number Base Converter',
        description:
            'Convert numbers between binary, octal, decimal and hexadecimal',
        category: 'conversion',
        tags: ['binary', 'hex', 'decimal', 'octal', 'base'],
        keywords: ['radix', 'hexadecimal', 'bin2dec', 'dec2hex', 'base16'],
        summary:
            'Convert integers between binary, octal, decimal and hexadecimal — edit any field and the rest update instantly.',
        faq: [
            {
                q: 'Which bases are supported?',
                a: 'Binary (base 2), octal (base 8), decimal (base 10) and hexadecimal (base 16).',
            },
            {
                q: 'How large a number can it convert?',
                a: 'Up to JavaScript’s safe integer limit (2^53 − 1). Larger values are rejected to avoid precision loss.',
            },
        ],
        relatedSlugs: ['byte-converter', 'color-converter'],
        useCases: [
            'Reading hex values from memory dumps',
            'Working with bitmasks and flags',
            'Converting color or byte values between bases',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'regex-tester',
        title: 'Regex Tester',
        description:
            'Test regular expressions against sample text and inspect matches',
        category: 'utilities',
        tags: ['regex', 'regexp', 'pattern', 'match', 'test'],
        popular: true,
        keywords: [
            'regular expression',
            'regex match',
            'capture groups',
            'flags',
        ],
        summary:
            'Test JavaScript regular expressions live against sample text, with flags, match positions and capture groups.',
        faq: [
            {
                q: 'Which regex flavor is used?',
                a: 'JavaScript’s native RegExp engine, including flags g, i, m, s and u.',
            },
            {
                q: 'Does it show capture groups?',
                a: 'Yes. Each match lists its index and any captured groups.',
            },
        ],
        relatedSlugs: ['json-formatter', 'character-word-counter'],
        useCases: [
            'Building and debugging regex patterns',
            'Validating input formats',
            'Extracting data from text',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
    {
        slug: 'qr-code-generator',
        title: 'QR Code Generator',
        description: 'Generate downloadable QR codes from text or URLs',
        category: 'generators',
        tags: ['qr', 'qr-code', 'barcode', 'generator', 'url'],
        keywords: ['qrcode', 'scan', 'svg qr', 'qr generator'],
        summary:
            'Generate scannable QR codes from any text or URL with adjustable error correction, and download them as SVG.',
        faq: [
            {
                q: 'What is error correction level?',
                a: 'It controls how much of the code can be damaged while still scanning. Higher levels add redundancy at the cost of density.',
            },
            {
                q: 'In what format can I download the QR code?',
                a: 'As a scalable SVG, so it stays crisp at any size.',
            },
        ],
        relatedSlugs: ['url-encoder-decoder', 'uuid-generator'],
        useCases: [
            'Linking to URLs from print or slides',
            'Sharing Wi-Fi or contact details',
            'Embedding scannable codes in designs',
        ],
        addedAt: '2025-06-01',
        updatedAt: '2025-06-01',
    },
]

export default toolsData

export function getAllTools(): Tool[] {
    return toolsData
}

export function getToolBySlug(slug: string): Tool | undefined {
    return toolsData.find((tool) => tool.slug === slug)
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
    return toolsData.filter((tool) => tool.category === category)
}

export function getPopularTools(): Tool[] {
    return toolsData.filter((tool) => tool.popular)
}

/** Every unique tag across the catalog, sorted alphabetically. */
export function getAllTags(): string[] {
    const tags = new Set<string>()
    for (const tool of toolsData) {
        for (const tag of tool.tags) tags.add(tag)
    }
    return Array.from(tags).sort()
}

/** Resolve a tool's related tools, falling back to others in the same category. */
export function getRelatedTools(slug: string, limit = 3): Tool[] {
    const tool = getToolBySlug(slug)
    if (!tool) return []

    const related: Tool[] = []
    const seen = new Set<string>([slug])

    for (const relatedSlug of tool.relatedSlugs ?? []) {
        const match = getToolBySlug(relatedSlug)
        if (match && !seen.has(match.slug)) {
            related.push(match)
            seen.add(match.slug)
        }
    }

    if (related.length < limit) {
        for (const candidate of getToolsByCategory(tool.category)) {
            if (related.length >= limit) break
            if (!seen.has(candidate.slug)) {
                related.push(candidate)
                seen.add(candidate.slug)
            }
        }
    }

    return related.slice(0, limit)
}

/**
 * Weighted, dependency-free search over the tool catalog.
 * Returns matching tools ordered by relevance (title > tags/keywords > summary/description).
 */
export function searchTools(query: string): Tool[] {
    const scored = scoreTools(query)
    return scored.map((entry) => entry.tool)
}

export interface ScoredTool {
    tool: Tool
    score: number
}

export function scoreTools(query: string): ScoredTool[] {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return toolsData.map((tool) => ({ tool, score: 0 }))

    const terms = trimmed.split(/\s+/).filter(Boolean)

    const results: ScoredTool[] = []
    for (const tool of toolsData) {
        const title = tool.title.toLowerCase()
        const description = tool.description.toLowerCase()
        const summary = (tool.summary ?? '').toLowerCase()
        const tags = tool.tags.map((t) => t.toLowerCase())
        const keywords = (tool.keywords ?? []).map((k) => k.toLowerCase())

        let score = 0
        let matchedEveryTerm = true

        for (const term of terms) {
            let termScore = 0
            if (title === term) termScore += 100
            else if (title.startsWith(term)) termScore += 60
            else if (title.includes(term)) termScore += 40

            if (tags.some((t) => t === term)) termScore += 30
            else if (tags.some((t) => t.includes(term))) termScore += 18

            if (keywords.some((k) => k === term)) termScore += 24
            else if (keywords.some((k) => k.includes(term))) termScore += 14

            if (summary.includes(term)) termScore += 8
            if (description.includes(term)) termScore += 6

            if (termScore === 0) matchedEveryTerm = false
            score += termScore
        }

        if (matchedEveryTerm && score > 0) {
            if (tool.popular) score += 5
            results.push({ tool, score })
        }
    }

    return results.sort((a, b) => b.score - a.score)
}
