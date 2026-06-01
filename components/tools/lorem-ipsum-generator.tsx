'use client'

import { Check, Copy, RefreshCw } from 'lucide-react'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

type OutputType = 'paragraphs' | 'sentences' | 'words'
type LoremMode = 'classic' | 'dev' | 'cyber'

type Block =
    | { kind: 'h1'; text: string }
    | { kind: 'h2'; text: string }
    | { kind: 'p'; text: string }
    | { kind: 'ul'; items: string[] }
    | { kind: 'ol'; items: string[] }
    | { kind: 'table'; headers: string[]; rows: string[][] }
    | { kind: 'code'; lang: string; text: string }

const WORD_POOLS: Record<LoremMode, string[]> = {
    classic: [
        'lorem',
        'ipsum',
        'dolor',
        'sit',
        'amet',
        'consectetur',
        'adipiscing',
        'elit',
        'sed',
        'do',
        'eiusmod',
        'tempor',
        'incididunt',
        'ut',
        'labore',
        'et',
        'dolore',
        'magna',
        'aliqua',
        'enim',
        'ad',
        'minim',
        'veniam',
        'quis',
        'nostrud',
        'exercitation',
        'ullamco',
        'laboris',
        'nisi',
        'aliquip',
        'ex',
        'ea',
        'commodo',
        'consequat',
        'duis',
        'aute',
        'irure',
        'in',
        'reprehenderit',
        'voluptate',
        'velit',
        'esse',
        'cillum',
        'fugiat',
        'nulla',
        'pariatur',
        'excepteur',
        'sint',
        'occaecat',
        'cupidatat',
        'non',
        'proident',
        'sunt',
        'culpa',
        'qui',
        'officia',
        'deserunt',
        'mollit',
        'anim',
        'id',
        'est',
        'laborum',
        'perspiciatis',
        'unde',
        'omnis',
        'iste',
        'natus',
        'error',
        'voluptatem',
        'accusantium',
        'doloremque',
        'laudantium',
        'totam',
        'rem',
        'aperiam',
        'eaque',
        'ipsa',
        'quae',
        'ab',
        'illo',
        'inventore',
        'veritatis',
        'quasi',
        'architecto',
        'beatae',
        'vitae',
        'dicta',
        'explicabo',
        'nemo',
        'ipsam',
        'quia',
        'voluptas',
        'aspernatur',
        'odit',
        'fugit',
        'consequuntur',
        'magni',
        'dolores',
        'ratione',
        'sequi',
        'nesciunt',
        'neque',
        'porro',
        'quisquam',
        'corporis',
        'suscipit',
        'laboriosam',
        'expedita',
        'distinctio',
    ],
    dev: [
        'agile',
        'sprint',
        'scrum',
        'kanban',
        'backlog',
        'velocity',
        'iteration',
        'deployment',
        'pipeline',
        'artifact',
        'container',
        'kubernetes',
        'docker',
        'microservice',
        'monolith',
        'serverless',
        'refactor',
        'legacy',
        'greenfield',
        'endpoint',
        'middleware',
        'abstraction',
        'dependency',
        'interface',
        'closure',
        'recursion',
        'idempotent',
        'caching',
        'sharding',
        'replication',
        'throughput',
        'latency',
        'scalability',
        'observability',
        'telemetry',
        'tracing',
        'debugging',
        'coverage',
        'regression',
        'linting',
        'bundling',
        'transpiling',
        'minification',
        'hydration',
        'serialization',
        'pagination',
        'throttling',
        'webhook',
        'authentication',
        'authorization',
        'encryption',
        'repository',
        'commit',
        'branch',
        'merge',
        'rebase',
        'scaffolding',
        'boilerplate',
        'prototype',
        'singleton',
        'factory',
        'decorator',
        'framework',
        'runtime',
        'compilation',
        'parsing',
        'tokenization',
        'heap',
        'concurrency',
        'parallelism',
        'asynchronous',
        'callback',
        'promise',
        'event-loop',
        'immutability',
        'idempotency',
        'entropy',
        'dependency-injection',
        'polymorphism',
        'type-safety',
        'linter',
        'formatter',
        'test-coverage',
        'mutation-testing',
        'feature-flag',
        'canary-release',
        'blue-green',
        'rollback',
        'on-call',
        'postmortem',
        'runbook',
        'SLO',
        'SLA',
        'error-budget',
        'tech-debt',
        'circuit-breaker',
        'rate-limiting',
        'load-balancing',
        'health-check',
        'service-discovery',
        'api-gateway',
        'reverse-proxy',
        'CDN',
        'edge-computing',
        'distributed-tracing',
        'service-mesh',
        'eventual-consistency',
        'CQRS',
        'event-sourcing',
        'saga-pattern',
        'DDD',
        'hexagonal-architecture',
        'SOLID',
        'zero-downtime',
        'graceful-shutdown',
        'readiness-probe',
        'liveness-probe',
        'semantic-versioning',
        'hotfix',
        'release-train',
        'monorepo',
        'trunk-based',
        'TDD',
        'BDD',
        'DRY',
        'YAGNI',
        'KISS',
        'twelve-factor',
        'cloud-native',
        'immutable-infrastructure',
        'GitOps',
        'pair-programming',
        'mob-programming',
    ],
    cyber: [
        'reconnaissance',
        'enumeration',
        'fingerprinting',
        'exploitation',
        'persistence',
        'exfiltration',
        'escalation',
        'pivoting',
        'beaconing',
        'obfuscation',
        'ransomware',
        'phishing',
        'malware',
        'rootkit',
        'keylogger',
        'backdoor',
        'payload',
        'shellcode',
        'vulnerability',
        'misconfiguration',
        'exposure',
        'adversary',
        'campaign',
        'playbook',
        'indicator',
        'telemetry',
        'hunting',
        'detection',
        'correlation',
        'triage',
        'remediation',
        'hardening',
        'patching',
        'segmentation',
        'sandboxing',
        'allowlisting',
        'credential',
        'authentication',
        'impersonation',
        'injection',
        'traversal',
        'deserialization',
        'spoofing',
        'forensics',
        'artifact',
        'timestamp',
        'signature',
        'certificate',
        'encryption',
        'firewall',
        'proxy',
        'revocation',
        'pinning',
        'SIEM',
        'EDR',
        'XDR',
        'SOAR',
        'pentest',
        'red-team',
        'blue-team',
        'purple-team',
        'threat-actor',
        'APT',
        'kill-chain',
        'TTPs',
        'zero-day',
        'CVE',
        'CVSS',
        'lateral-movement',
        'privilege-escalation',
        'command-and-control',
        'LOLBin',
        'supply-chain',
        'threat-intelligence',
        'attack-surface',
        'threat-hunting',
        'memory-forensics',
        'static-analysis',
        'dynamic-analysis',
        'reverse-engineering',
        'zero-trust',
        'ZTNA',
        'MFA',
        'SSO',
        'microsegmentation',
        'DMZ',
        'threat-modeling',
        'risk-assessment',
        'SOC2',
        'ISO27001',
        'vulnerability-scan',
        'DAST',
        'SAST',
        'bug-bounty',
        'UEBA',
        'anomaly-detection',
        'behavioral-analysis',
        'incident-response',
        'tabletop',
        'log-aggregation',
        'honeypot',
        'deception',
        'canary-token',
        'sinkhole',
        'DLP',
        'CASB',
        'WAF',
        'IDS',
        'IPS',
        'NDR',
        'MDR',
        'MSSP',
        'spearphishing',
        'watering-hole',
        'credential-stuffing',
        'brute-force',
        'password-spray',
        'Kerberoasting',
        'pass-the-hash',
        'token-theft',
        'living-off-the-land',
        'fileless-malware',
        'stageless-payload',
        'dropper',
    ],
}

const MODE_OPENINGS: Record<LoremMode, string> = {
    classic:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    dev: 'Agile sprint velocity backlog, kubernetes microservice deployment pipeline, refactor legacy codebase idempotent endpoint middleware.',
    cyber: 'Threat-actor reconnaissance enumeration, lateral-movement privilege-escalation persistence, command-and-control beaconing exfiltration adversary.',
}

const WORD_RANGE: Record<LoremMode, [number, number]> = {
    classic: [6, 14],
    dev: [8, 20],
    cyber: [8, 18],
}

const DEV_TITLES = [
    'Architecture Review',
    'System Design Specification',
    'Technical Overview',
    'API Documentation',
    'Infrastructure Blueprint',
    'Deployment Strategy',
    'Observability Framework',
    'Service Mesh Architecture',
    'CI/CD Pipeline Design',
    'Database Optimization Report',
    'Scalability Assessment',
    'Migration Runbook',
]

const CYBER_TITLES = [
    'Threat Intelligence Report',
    'Incident Response Summary',
    'Vulnerability Assessment',
    'Red Team Exercise Report',
    'Threat Actor Attribution',
    'Security Posture Review',
    'Adversary Simulation Results',
    'ATT&CK Coverage Analysis',
    'Detection Engineering Report',
    'Purple Team Assessment',
    'Compromise Assessment',
    'Threat Hunting Report',
]

const DEV_SECTIONS: {
    heading: string
    extra: 'api-table' | 'yaml-code' | 'metrics-table' | 'ol' | 'ul' | null
}[] = [
    { heading: 'Overview', extra: null },
    { heading: 'API Reference', extra: 'api-table' },
    { heading: 'Configuration', extra: 'yaml-code' },
    { heading: 'Deployment', extra: 'ol' },
    { heading: 'Dependencies', extra: 'ul' },
    { heading: 'Observability & Metrics', extra: 'metrics-table' },
    { heading: 'Error Handling', extra: 'ul' },
    { heading: 'Testing Strategy', extra: 'ol' },
]

const CYBER_SECTIONS: {
    heading: string
    content: 'p' | 'p+ul' | 'ioc-table' | 'p+ol' | 'p+shell' | 'attack-table'
}[] = [
    { heading: 'Executive Summary', content: 'p' },
    { heading: 'Tactics, Techniques & Procedures', content: 'p+ul' },
    { heading: 'Indicators of Compromise', content: 'ioc-table' },
    { heading: 'Affected Systems', content: 'p+ul' },
    { heading: 'Recommended Actions', content: 'p+ol' },
    { heading: 'Technical Analysis', content: 'p+shell' },
    { heading: 'MITRE ATT&CK Mapping', content: 'attack-table' },
    { heading: 'Timeline of Events', content: 'p+ul' },
]

let seed = Date.now()
function seededRandom() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0x100000000
}

function cap(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

function randomWord(pool: string[]): string {
    return pool[Math.floor(seededRandom() * pool.length)]
}

function generateSentence(pool: string[], minWords = 6, maxWords = 14): string {
    const count =
        Math.floor(seededRandom() * (maxWords - minWords + 1)) + minWords
    const words: string[] = []
    for (let i = 0; i < count; i++) words.push(randomWord(pool))
    words[0] = cap(words[0])
    return words.join(' ') + '.'
}

function generateParagraph(
    pool: string[],
    minSentences = 3,
    maxSentences = 6,
    wMin = 6,
    wMax = 14
): string {
    const count =
        Math.floor(seededRandom() * (maxSentences - minSentences + 1)) +
        minSentences
    const sentences: string[] = []
    for (let i = 0; i < count; i++)
        sentences.push(generateSentence(pool, wMin, wMax))
    return sentences.join(' ')
}

function generateWords(pool: string[], count: number): string {
    const words: string[] = []
    for (let i = 0; i < count; i++) words.push(randomWord(pool))
    return words.join(' ')
}

function genApiTable(pool: string[]): Block {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    const count = 3 + Math.floor(seededRandom() * 4)
    const rows: string[][] = []
    for (let i = 0; i < count; i++) {
        rows.push([
            `/${randomWord(pool)}/${randomWord(pool)}`,
            methods[Math.floor(seededRandom() * methods.length)],
            generateSentence(pool, 4, 8),
            seededRandom() > 0.5 ? 'Bearer' : 'API Key',
        ])
    }
    return {
        kind: 'table',
        headers: ['Endpoint', 'Method', 'Description', 'Auth'],
        rows,
    }
}

function genYamlCode(pool: string[]): Block {
    const svc = randomWord(pool)
    const replicas = 1 + Math.floor(seededRandom() * 4)
    const port = [3000, 8080, 8443, 9090, 4000][Math.floor(seededRandom() * 5)]
    const major = Math.floor(seededRandom() * 10)
    const minor = Math.floor(seededRandom() * 10)
    const patch = Math.floor(seededRandom() * 20)
    const ttl = 30 + Math.floor(seededRandom() * 270)
    return {
        kind: 'code',
        lang: 'yaml',
        text: `${svc}:\n  image: ${svc}:${major}.${minor}.${patch}\n  replicas: ${replicas}\n  ports:\n    - "${port}:${port}"\n  env:\n    NODE_ENV: production\n    LOG_LEVEL: info\n    CACHE_TTL: ${ttl}s`,
    }
}

function genMetricsTable(): Block {
    const lat = 50 + Math.floor(seededRandom() * 150)
    const err = (seededRandom() * 0.08).toFixed(3)
    const rps = 900 + Math.floor(seededRandom() * 500)
    const up = (99.5 + seededRandom() * 0.5).toFixed(2)
    const cache = 80 + Math.floor(seededRandom() * 18)
    return {
        kind: 'table',
        headers: ['Metric', 'SLO Target', 'Current'],
        rows: [
            ['p99 Latency', '< 200ms', `${lat}ms`],
            ['Error Rate', '< 0.1%', `${err}%`],
            ['Throughput', '> 1000 rps', `${rps} rps`],
            ['Uptime', '99.9%', `${up}%`],
            ['Cache Hit Rate', '> 80%', `${cache}%`],
        ],
    }
}

function genIocTable(): Block {
    const types = ['IP', 'Domain', 'SHA256', 'URL', 'Registry Key']
    const confs = ['High', 'Medium', 'Low']
    const statuses = ['Active', 'Remediated', 'Under Investigation']
    const count = 4 + Math.floor(seededRandom() * 5)
    const rows: string[][] = []
    const alpha = 'abcdefghijklmnopqrstuvwxyz'
    for (let i = 0; i < count; i++) {
        const type = types[Math.floor(seededRandom() * types.length)]
        let indicator: string
        if (type === 'IP') {
            indicator = `${10 + Math.floor(seededRandom() * 200)}.${Math.floor(seededRandom() * 255)}.${Math.floor(seededRandom() * 255)}.${Math.floor(seededRandom() * 255)}`
        } else if (type === 'SHA256') {
            indicator =
                Array.from({ length: 16 }, () =>
                    Math.floor(seededRandom() * 16).toString(16)
                ).join('') + '...'
        } else if (type === 'Domain') {
            indicator =
                Array.from(
                    { length: 8 },
                    () => alpha[Math.floor(seededRandom() * 26)]
                ).join('') + '.com'
        } else if (type === 'URL') {
            indicator =
                'https://' +
                Array.from(
                    { length: 8 },
                    () => alpha[Math.floor(seededRandom() * 26)]
                ).join('') +
                '.net/payload'
        } else {
            indicator =
                'HKLM\\Software\\' +
                Array.from({ length: 8 }, () =>
                    alpha[Math.floor(seededRandom() * 26)].toUpperCase()
                ).join('')
        }
        rows.push([
            type,
            indicator,
            confs[Math.floor(seededRandom() * confs.length)],
            statuses[Math.floor(seededRandom() * statuses.length)],
        ])
    }
    return {
        kind: 'table',
        headers: ['Type', 'Indicator', 'Confidence', 'Status'],
        rows,
    }
}

function genAttackTable(): Block {
    const tactics = [
        'Initial Access',
        'Execution',
        'Persistence',
        'Privilege Escalation',
        'Defense Evasion',
        'Credential Access',
        'Discovery',
        'Lateral Movement',
        'Exfiltration',
    ]
    const techniques = [
        'Phishing',
        'LOLBin Abuse',
        'Scheduled Task',
        'WMI Execution',
        'Registry Modification',
        'Token Impersonation',
        'Pass-the-Hash',
        'Remote Services',
        'Data Staging',
        'C2 Protocol',
    ]
    const count = 4 + Math.floor(seededRandom() * 4)
    const rows: string[][] = []
    for (let i = 0; i < count; i++) {
        const techId = `T${1078 + Math.floor(seededRandom() * 500)}.${String(Math.floor(seededRandom() * 9) + 1).padStart(3, '0')}`
        rows.push([
            tactics[Math.floor(seededRandom() * tactics.length)],
            techId,
            techniques[Math.floor(seededRandom() * techniques.length)],
            seededRandom() > 0.4 ? 'Yes' : 'No',
        ])
    }
    return {
        kind: 'table',
        headers: ['Tactic', 'Tech ID', 'Technique', 'Detected'],
        rows,
    }
}

function genShellCode(): Block {
    const idx = Math.floor(seededRandom() * 3)
    const variants = [
        '# Process enumeration\nps aux | grep -E "(cmd|powershell|wscript|mshta)"\n\n# Check scheduled tasks\ncrontab -l 2>/dev/null || schtasks /query /fo LIST 2>/dev/null',
        '# Network sweep\nnmap -sV --script=default -p 22,80,443,8080,8443 <target>\n\n# Enumerate shares\nsmbclient -L //<target> -N 2>/dev/null',
        '# Memory artifact collection\nvolatility3 -f memory.dmp windows.pslist.PsList\nvolatility3 -f memory.dmp windows.cmdline.CmdLine\nvolatility3 -f memory.dmp windows.netstat.NetStat',
    ]
    return { kind: 'code', lang: 'bash', text: variants[idx] }
}

function generateStructuredDoc(mode: LoremMode, sectionCount: number): Block[] {
    const pool = WORD_POOLS[mode]
    const [wMin, wMax] = WORD_RANGE[mode]
    const blocks: Block[] = []

    if (mode === 'classic') {
        blocks.push({ kind: 'h1', text: cap(generateWords(pool, 4)) })
        blocks.push({
            kind: 'p',
            text: MODE_OPENINGS.classic + ' ' + generateParagraph(pool, 1, 3),
        })
        for (let i = 0; i < sectionCount; i++) {
            blocks.push({ kind: 'h2', text: cap(generateWords(pool, 3)) })
            blocks.push({ kind: 'p', text: generateParagraph(pool, 3, 6) })
            if (seededRandom() > 0.4) {
                const itemCount = 3 + Math.floor(seededRandom() * 4)
                blocks.push({
                    kind: 'ul',
                    items: Array.from({ length: itemCount }, () =>
                        generateSentence(pool, 5, 10)
                    ),
                })
            }
        }
    } else if (mode === 'dev') {
        const titleBase =
            DEV_TITLES[Math.floor(seededRandom() * DEV_TITLES.length)]
        blocks.push({
            kind: 'h1',
            text: `${titleBase}: ${cap(generateWords(pool, 2))}`,
        })
        blocks.push({
            kind: 'p',
            text:
                MODE_OPENINGS.dev +
                ' ' +
                generateParagraph(pool, 1, 2, wMin, wMax),
        })
        for (let i = 0; i < sectionCount; i++) {
            const section = DEV_SECTIONS[i % DEV_SECTIONS.length]
            blocks.push({ kind: 'h2', text: section.heading })
            blocks.push({
                kind: 'p',
                text: generateParagraph(pool, 2, 4, wMin, wMax),
            })
            if (section.extra === 'api-table') {
                blocks.push(genApiTable(pool))
            } else if (section.extra === 'yaml-code') {
                blocks.push(genYamlCode(pool))
            } else if (section.extra === 'metrics-table') {
                blocks.push(genMetricsTable())
            } else if (section.extra === 'ol') {
                blocks.push({
                    kind: 'ol',
                    items: Array.from(
                        { length: 3 + Math.floor(seededRandom() * 4) },
                        () => generateSentence(pool, 6, 12)
                    ),
                })
            } else if (section.extra === 'ul') {
                blocks.push({
                    kind: 'ul',
                    items: Array.from(
                        { length: 3 + Math.floor(seededRandom() * 4) },
                        () => generateSentence(pool, 4, 8)
                    ),
                })
            }
        }
    } else {
        const titleBase =
            CYBER_TITLES[Math.floor(seededRandom() * CYBER_TITLES.length)]
        blocks.push({
            kind: 'h1',
            text: `${titleBase}: ${cap(generateWords(pool, 2))}`,
        })
        blocks.push({
            kind: 'p',
            text:
                MODE_OPENINGS.cyber +
                ' ' +
                generateParagraph(pool, 1, 2, wMin, wMax),
        })
        for (let i = 0; i < sectionCount; i++) {
            const section = CYBER_SECTIONS[i % CYBER_SECTIONS.length]
            blocks.push({ kind: 'h2', text: section.heading })
            if (section.content === 'p') {
                blocks.push({
                    kind: 'p',
                    text: generateParagraph(pool, 2, 5, wMin, wMax),
                })
            } else if (section.content === 'p+ul') {
                blocks.push({
                    kind: 'p',
                    text: generateParagraph(pool, 1, 3, wMin, wMax),
                })
                blocks.push({
                    kind: 'ul',
                    items: Array.from(
                        { length: 3 + Math.floor(seededRandom() * 5) },
                        () => generateSentence(pool, wMin, wMax)
                    ),
                })
            } else if (section.content === 'ioc-table') {
                blocks.push(genIocTable())
            } else if (section.content === 'p+ol') {
                blocks.push({
                    kind: 'p',
                    text: generateParagraph(pool, 1, 2, wMin, wMax),
                })
                blocks.push({
                    kind: 'ol',
                    items: Array.from(
                        { length: 4 + Math.floor(seededRandom() * 4) },
                        () => generateSentence(pool, 6, 14)
                    ),
                })
            } else if (section.content === 'p+shell') {
                blocks.push({
                    kind: 'p',
                    text: generateParagraph(pool, 1, 3, wMin, wMax),
                })
                blocks.push(genShellCode())
            } else if (section.content === 'attack-table') {
                blocks.push(genAttackTable())
            }
        }
    }

    return blocks
}

function blocksToMarkdown(blocks: Block[]): string {
    return blocks
        .map((b) => {
            if (b.kind === 'h1') return `# ${b.text}`
            if (b.kind === 'h2') return `## ${b.text}`
            if (b.kind === 'p') return b.text
            if (b.kind === 'ul') return b.items.map((i) => `- ${i}`).join('\n')
            if (b.kind === 'ol')
                return b.items.map((i, idx) => `${idx + 1}. ${i}`).join('\n')
            if (b.kind === 'code') return `\`\`\`${b.lang}\n${b.text}\n\`\`\``
            if (b.kind === 'table') {
                const header = `| ${b.headers.join(' | ')} |`
                const sep = `| ${b.headers.map(() => '---').join(' | ')} |`
                const rows = b.rows.map((r) => `| ${r.join(' | ')} |`)
                return [header, sep, ...rows].join('\n')
            }
            return ''
        })
        .join('\n\n')
}

function blocksToPlain(blocks: Block[]): string {
    return blocks
        .map((b) => {
            if (b.kind === 'h1')
                return `${b.text}\n${'='.repeat(b.text.length)}`
            if (b.kind === 'h2')
                return `${b.text}\n${'-'.repeat(b.text.length)}`
            if (b.kind === 'p') return b.text
            if (b.kind === 'ul') return b.items.map((i) => `• ${i}`).join('\n')
            if (b.kind === 'ol')
                return b.items.map((i, idx) => `${idx + 1}. ${i}`).join('\n')
            if (b.kind === 'code') return b.text
            if (b.kind === 'table') {
                const colW = b.headers.map((h, i) =>
                    Math.max(
                        h.length,
                        ...b.rows.map((r) => (r[i] ?? '').length)
                    )
                )
                const pad = (s: string, w: number) => s.padEnd(w)
                return [
                    b.headers.map((h, i) => pad(h, colW[i])).join('  '),
                    colW.map((w) => '-'.repeat(w)).join('  '),
                    ...b.rows.map((r) =>
                        r.map((c, i) => pad(c, colW[i])).join('  ')
                    ),
                ].join('\n')
            }
            return ''
        })
        .join('\n\n')
}

function renderBlocks(blocks: Block[]) {
    return blocks.map((block, i) => {
        if (block.kind === 'h1')
            return (
                <h1 key={i} className="text-2xl font-bold">
                    {block.text}
                </h1>
            )
        if (block.kind === 'h2')
            return (
                <h2
                    key={i}
                    className="mt-4 border-b pb-1 text-base font-semibold"
                >
                    {block.text}
                </h2>
            )
        if (block.kind === 'p')
            return (
                <p key={i} className="leading-relaxed">
                    {block.text}
                </p>
            )
        if (block.kind === 'ul')
            return (
                <ul key={i} className="list-disc space-y-0.5 pl-5">
                    {block.items.map((item, j) => (
                        <li key={j}>{item}</li>
                    ))}
                </ul>
            )
        if (block.kind === 'ol')
            return (
                <ol key={i} className="list-decimal space-y-0.5 pl-5">
                    {block.items.map((item, j) => (
                        <li key={j}>{item}</li>
                    ))}
                </ol>
            )
        if (block.kind === 'code')
            return (
                <pre
                    key={i}
                    className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs"
                >
                    <code>{block.text}</code>
                </pre>
            )
        if (block.kind === 'table')
            return (
                <div key={i} className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr className="border-b">
                                {block.headers.map((h, j) => (
                                    <th
                                        key={j}
                                        className="px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row, j) => (
                                <tr
                                    key={j}
                                    className="border-border/40 border-b"
                                >
                                    {row.map((cell, k) => (
                                        <td
                                            key={k}
                                            className="px-2 py-1.5 font-mono break-all"
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        return null
    })
}

const MODE_LABELS: Record<LoremMode, string> = {
    classic: 'Lorem Ipsum',
    dev: 'Dev Ipsum',
    cyber: 'Cyber Ipsum',
}

export default function LoremIpsumGenerator() {
    const [count, setCount] = useState('3')
    const [type, setType] = useState<OutputType>('paragraphs')
    const [mode, setMode] = useState<LoremMode>('classic')
    const [startWithOpening, setStartWithOpening] = useState(true)
    const [structured, setStructured] = useState(false)
    const [markdown, setMarkdown] = useState(true)
    const [output, setOutput] = useState('')
    const [blocks, setBlocks] = useState<Block[] | null>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (copied) {
            const t = setTimeout(() => setCopied(false), 2000)
            return () => clearTimeout(t)
        }
    }, [copied])

    useEffect(() => {
        generate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count, type, mode, startWithOpening, structured, markdown])

    const generate = () => {
        seed = Date.now() ^ (Math.random() * 0x100000000)
        const n = Math.max(1, Math.min(100, parseInt(count) || 1))

        if (structured) {
            const docBlocks = generateStructuredDoc(mode, n)
            setBlocks(docBlocks)
            setOutput(
                markdown
                    ? blocksToMarkdown(docBlocks)
                    : blocksToPlain(docBlocks)
            )
            return
        }

        setBlocks(null)
        const pool = WORD_POOLS[mode]
        const opening = MODE_OPENINGS[mode]
        const [wMin, wMax] = WORD_RANGE[mode]

        if (type === 'words') {
            let text = generateWords(pool, n)
            if (startWithOpening) {
                text =
                    opening.split(' ')[0] +
                    ' ' +
                    text.split(' ').slice(1).join(' ')
            }
            setOutput(text)
        } else if (type === 'sentences') {
            const sentences: string[] = []
            for (let i = 0; i < n; i++)
                sentences.push(generateSentence(pool, wMin, wMax))
            if (startWithOpening && sentences.length > 0) sentences[0] = opening
            setOutput(sentences.join(' '))
        } else {
            const paragraphs: string[] = []
            for (let i = 0; i < n; i++)
                paragraphs.push(generateParagraph(pool, 3, 6, wMin, wMax))
            if (startWithOpening && paragraphs.length > 0) {
                const rest = paragraphs[0].split(' ').slice(12).join(' ')
                paragraphs[0] = opening + (rest ? ' ' + rest : '')
            }
            setOutput(paragraphs.join('\n\n'))
        }
    }

    const copyOutput = () => {
        if (output) {
            navigator.clipboard.writeText(output)
            setCopied(true)
        }
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-6">
                <CardContent className="space-y-3 pt-6">
                    <div className="flex gap-2">
                        {(Object.keys(MODE_LABELS) as LoremMode[]).map((m) => (
                            <Button
                                key={m}
                                variant={mode === m ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setMode(m)}
                                aria-pressed={mode === m}
                            >
                                {MODE_LABELS[m]}
                            </Button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Input
                                value={count}
                                onChange={(e) =>
                                    setCount(e.target.value.replace(/\D/g, ''))
                                }
                                className="w-20 text-center font-mono"
                                aria-label="Count"
                                min={1}
                                max={100}
                            />
                            <span className="text-muted-foreground text-sm">
                                {structured ? 'sections' : 'of'}
                            </span>
                        </div>

                        {!structured && (
                            <div className="flex gap-2">
                                {(
                                    [
                                        'paragraphs',
                                        'sentences',
                                        'words',
                                    ] as OutputType[]
                                ).map((t) => (
                                    <Button
                                        key={t}
                                        variant={
                                            type === t ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        onClick={() => setType(t)}
                                    >
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {!structured && (
                            <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
                                <input
                                    type="checkbox"
                                    checked={startWithOpening}
                                    onChange={(e) =>
                                        setStartWithOpening(e.target.checked)
                                    }
                                    className="accent-primary h-4 w-4"
                                />
                                Start with opening sentence
                            </label>
                        )}

                        <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
                            <input
                                type="checkbox"
                                checked={structured}
                                onChange={(e) =>
                                    setStructured(e.target.checked)
                                }
                                className="accent-primary h-4 w-4"
                            />
                            Structured
                        </label>

                        {structured && (
                            <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
                                <input
                                    type="checkbox"
                                    checked={markdown}
                                    onChange={(e) =>
                                        setMarkdown(e.target.checked)
                                    }
                                    className="accent-primary h-4 w-4"
                                />
                                Markdown
                            </label>
                        )}

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={generate}
                                        aria-label="Regenerate"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Regenerate</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                            {output.split(/\s+/).filter(Boolean).length} words ·{' '}
                            {output.length} characters
                        </span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={copyOutput}
                                        disabled={!output}
                                        data-testid="copy-button"
                                    >
                                        {copied ? (
                                            <Check
                                                className="h-3.5 w-3.5"
                                                data-testid="check-icon"
                                            />
                                        ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                        )}
                                        <span className="sr-only">Copy</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {copied ? 'Copied!' : 'Copy'}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div
                        className="min-h-[200px] text-sm leading-relaxed"
                        data-testid="output"
                    >
                        {blocks ? (
                            <div className="space-y-3">
                                {renderBlocks(blocks)}
                            </div>
                        ) : output ? (
                            <div className="space-y-4">
                                {output.split('\n\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">About the Modes</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Lorem Ipsum</h3>
                            <p className="text-muted-foreground text-sm">
                                The classic placeholder text derived from
                                Cicero&apos;s <em>de Finibus</em> (45 BC),
                                scrambled to remove meaning and prevent reader
                                distraction during layout work.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Dev Ipsum</h3>
                            <p className="text-muted-foreground text-sm">
                                Placeholder text built from real software
                                engineering vocabulary — sprints, pipelines,
                                observability, idempotency. Great for mocking
                                technical dashboards and docs.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Cyber Ipsum</h3>
                            <p className="text-muted-foreground text-sm">
                                Placeholder text drawn from real security
                                operations vocabulary — TTPs, lateral movement,
                                exfiltration, threat hunting. Useful for mocking
                                security tools and reports.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
