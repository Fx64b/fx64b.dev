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

const LOREM_WORDS = [
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
]

let seed = Date.now()
function seededRandom() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return ((seed >>> 0) / 0x100000000)
}

function randomWord(): string {
    return LOREM_WORDS[Math.floor(seededRandom() * LOREM_WORDS.length)]
}

function generateSentence(minWords = 6, maxWords = 14): string {
    const count = Math.floor(seededRandom() * (maxWords - minWords + 1)) + minWords
    const words: string[] = []
    for (let i = 0; i < count; i++) words.push(randomWord())
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
    return words.join(' ') + '.'
}

function generateParagraph(minSentences = 3, maxSentences = 6): string {
    const count =
        Math.floor(seededRandom() * (maxSentences - minSentences + 1)) +
        minSentences
    const sentences: string[] = []
    for (let i = 0; i < count; i++) sentences.push(generateSentence())
    return sentences.join(' ')
}

function generateWords(count: number): string {
    const words: string[] = []
    for (let i = 0; i < count; i++) words.push(randomWord())
    return words.join(' ')
}

const CLASSIC_OPENING =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'

export default function LoremIpsumGenerator() {
    const [count, setCount] = useState('3')
    const [type, setType] = useState<OutputType>('paragraphs')
    const [startWithLorem, setStartWithLorem] = useState(true)
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
    }, [count, type, startWithLorem])

    const generate = () => {
        seed = Date.now() ^ (Math.random() * 0x100000000)
        const n = Math.max(1, Math.min(100, parseInt(count) || 1))

        if (type === 'words') {
            let text = generateWords(n)
            if (startWithLorem) {
                const firstWord = 'Lorem'
                text = firstWord + text.slice(firstWord.length > text.length ? text.length : firstWord.length - 1)
                text = 'Lorem ' + text.split(' ').slice(1).join(' ')
            }
            setOutput(text)
        } else if (type === 'sentences') {
            const sentences: string[] = []
            for (let i = 0; i < n; i++) sentences.push(generateSentence())
            if (startWithLorem && sentences.length > 0) {
                sentences[0] = CLASSIC_OPENING
            }
            setOutput(sentences.join(' '))
        } else {
            const paragraphs: string[] = []
            for (let i = 0; i < n; i++) paragraphs.push(generateParagraph())
            if (startWithLorem && paragraphs.length > 0) {
                const rest = paragraphs[0].split(' ').slice(12).join(' ')
                paragraphs[0] = CLASSIC_OPENING + (rest ? ' ' + rest : '')
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
        const val = e.target.value.replace(/\D/g, '')
        setCount(val)
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-6">
                <CardContent className="pt-6">
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
                            {(['paragraphs', 'sentences', 'words'] as OutputType[]).map(
                                (t) => (
                                    <Button
                                        key={t}
                                        variant={type === t ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setType(t)}
                                    >
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Button>
                                )
                            )}
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
                            <input
                                type="checkbox"
                                checked={startWithLorem}
                                onChange={(e) =>
                                    setStartWithLorem(e.target.checked)
                                }
                                className="accent-primary h-4 w-4"
                            />
                            Start with &ldquo;Lorem ipsum&rdquo;
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
                                    >
                                        {copied ? (
                                            <Check className="h-3.5 w-3.5" />
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
                    <div className="min-h-[200px] space-y-4 text-sm leading-relaxed">
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
                    About Lorem Ipsum
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">The Origin</h3>
                            <p className="text-muted-foreground text-sm">
                                Lorem ipsum comes from Cicero&apos;s{' '}
                                <em>de Finibus Bonorum et Malorum</em> (45 BC),
                                scrambled so it looks like Latin but has no
                                meaning — intentionally preventing readers from
                                being distracted by content.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Why Use It?</h3>
                            <p className="text-muted-foreground text-sm">
                                Placeholder text lets designers and developers
                                focus on layout, typography, and spacing without
                                real content influencing visual decisions. It
                                has been the standard since the 1500s printing
                                industry.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
