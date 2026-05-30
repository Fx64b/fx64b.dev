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

const WORD_POOLS: Record<LoremMode, string[]> = {
    classic: [
        'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
        'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
        'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam',
        'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip',
        'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in',
        'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla',
        'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident',
        'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id',
        'est', 'laborum', 'perspiciatis', 'unde', 'omnis', 'iste', 'natus', 'error',
        'voluptatem', 'accusantium', 'doloremque', 'laudantium', 'totam', 'rem',
        'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo', 'inventore', 'veritatis',
        'quasi', 'architecto', 'beatae', 'vitae', 'dicta', 'explicabo', 'nemo',
        'ipsam', 'quia', 'voluptas', 'aspernatur', 'odit', 'fugit', 'consequuntur',
        'magni', 'dolores', 'ratione', 'sequi', 'nesciunt', 'neque', 'porro',
        'quisquam', 'corporis', 'suscipit', 'laboriosam', 'expedita', 'distinctio',
    ],
    dev: [
        'agile', 'sprint', 'scrum', 'kanban', 'backlog', 'velocity', 'iteration',
        'deployment', 'pipeline', 'artifact', 'container', 'kubernetes', 'docker',
        'microservice', 'monolith', 'serverless', 'refactor', 'legacy', 'greenfield',
        'endpoint', 'middleware', 'abstraction', 'dependency', 'interface', 'closure',
        'recursion', 'idempotent', 'caching', 'sharding', 'replication', 'throughput',
        'latency', 'scalability', 'observability', 'telemetry', 'tracing', 'debugging',
        'coverage', 'regression', 'linting', 'bundling', 'transpiling', 'minification',
        'hydration', 'serialization', 'pagination', 'throttling', 'webhook', 'authentication',
        'authorization', 'encryption', 'repository', 'commit', 'branch', 'merge', 'rebase',
        'scaffolding', 'boilerplate', 'prototype', 'singleton', 'factory', 'decorator',
        'framework', 'runtime', 'compilation', 'parsing', 'tokenization', 'heap',
        'concurrency', 'parallelism', 'asynchronous', 'callback', 'promise', 'event-loop',
        'immutability', 'idempotency', 'entropy', 'dependency-injection', 'polymorphism',
        'type-safety', 'linter', 'formatter', 'test-coverage', 'mutation-testing',
        'feature-flag', 'canary-release', 'blue-green', 'rollback', 'observability',
        'on-call', 'postmortem', 'runbook', 'SLO', 'SLA', 'error-budget', 'tech-debt',
    ],
    cyber: [
        'reconnaissance', 'enumeration', 'fingerprinting', 'exploitation', 'persistence',
        'exfiltration', 'escalation', 'pivoting', 'beaconing', 'obfuscation',
        'ransomware', 'phishing', 'malware', 'rootkit', 'keylogger', 'backdoor',
        'payload', 'shellcode', 'vulnerability', 'misconfiguration', 'exposure',
        'adversary', 'campaign', 'playbook', 'indicator', 'telemetry', 'hunting',
        'detection', 'correlation', 'triage', 'remediation', 'hardening', 'patching',
        'segmentation', 'sandboxing', 'allowlisting', 'credential', 'authentication',
        'impersonation', 'injection', 'traversal', 'deserialization', 'spoofing',
        'forensics', 'artifact', 'timestamp', 'signature', 'certificate', 'encryption',
        'firewall', 'proxy', 'telemetry', 'certificate', 'revocation', 'pinning',
        'SIEM', 'EDR', 'XDR', 'SOAR', 'pentest', 'red-team', 'blue-team', 'purple-team',
        'threat-actor', 'APT', 'kill-chain', 'TTPs', 'zero-day', 'CVE', 'CVSS',
        'lateral-movement', 'privilege-escalation', 'command-and-control', 'LOLBin',
        'supply-chain', 'threat-intelligence', 'attack-surface', 'threat-hunting',
        'memory-forensics', 'static-analysis', 'dynamic-analysis', 'reverse-engineering',
    ],
}

const MODE_OPENINGS: Record<LoremMode, string> = {
    classic:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    dev:
        'Agile sprint velocity backlog, kubernetes microservice deployment pipeline, refactor legacy codebase idempotent endpoint middleware.',
    cyber:
        'Threat-actor reconnaissance enumeration, lateral-movement privilege-escalation persistence, command-and-control beaconing exfiltration adversary.',
}

let seed = Date.now()
function seededRandom() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 0x100000000
}

function randomWord(pool: string[]): string {
    return pool[Math.floor(seededRandom() * pool.length)]
}

function generateSentence(pool: string[], minWords = 6, maxWords = 14): string {
    const count =
        Math.floor(seededRandom() * (maxWords - minWords + 1)) + minWords
    const words: string[] = []
    for (let i = 0; i < count; i++) words.push(randomWord(pool))
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
    return words.join(' ') + '.'
}

function generateParagraph(
    pool: string[],
    minSentences = 3,
    maxSentences = 6
): string {
    const count =
        Math.floor(seededRandom() * (maxSentences - minSentences + 1)) +
        minSentences
    const sentences: string[] = []
    for (let i = 0; i < count; i++) sentences.push(generateSentence(pool))
    return sentences.join(' ')
}

function generateWords(pool: string[], count: number): string {
    const words: string[] = []
    for (let i = 0; i < count; i++) words.push(randomWord(pool))
    return words.join(' ')
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
    const [output, setOutput] = useState('')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (copied) {
            const t = setTimeout(() => setCopied(false), 2000)
            return () => clearTimeout(t)
        }
    }, [copied])

    useEffect(() => {
        generate()
    }, [count, type, mode, startWithOpening])

    const generate = () => {
        seed = Date.now() ^ (Math.random() * 0x100000000)
        const n = Math.max(1, Math.min(100, parseInt(count) || 1))
        const pool = WORD_POOLS[mode]
        const opening = MODE_OPENINGS[mode]

        if (type === 'words') {
            let text = generateWords(pool, n)
            if (startWithOpening) {
                text = opening.split(' ')[0] + ' ' + text.split(' ').slice(1).join(' ')
            }
            setOutput(text)
        } else if (type === 'sentences') {
            const sentences: string[] = []
            for (let i = 0; i < n; i++) sentences.push(generateSentence(pool))
            if (startWithOpening && sentences.length > 0) {
                sentences[0] = opening
            }
            setOutput(sentences.join(' '))
        } else {
            const paragraphs: string[] = []
            for (let i = 0; i < n; i++) paragraphs.push(generateParagraph(pool))
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

    const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCount(e.target.value.replace(/\D/g, ''))
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-6">
                <CardContent className="pt-6 space-y-3">
                    {/* Mode selector */}
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

                    {/* Count + output type + options */}
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <Input
                                value={count}
                                onChange={handleCountChange}
                                className="w-20 font-mono text-center"
                                aria-label="Count"
                                min={1}
                                max={100}
                            />
                            <span className="text-muted-foreground text-sm">
                                of
                            </span>
                        </div>
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
                                    variant={type === t ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setType(t)}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Button>
                            ))}
                        </div>
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
                            {output.split(/\s+/).filter(Boolean).length} words
                            · {output.length} characters
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
                        className="min-h-[200px] space-y-4 text-sm leading-relaxed"
                        data-testid="output"
                    >
                        {output
                            ? output.split('\n\n').map((para, i) => (
                                  <p key={i}>{para}</p>
                              ))
                            : null}
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">
                    About the Modes
                </h2>
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
                                exfiltration, threat hunting. Useful for
                                mocking security tools and reports.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
