'use client'

import {
    AlignLeft,
    BookOpen,
    Clock,
    Eye,
    FileText,
    List,
    Mic,
    Type,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

interface StatCardProps {
    title: string
    value: string
    icon: LucideIcon
}

function StatCard({ title, value, icon: Icon }: StatCardProps) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center p-4 text-center">
                <Icon className="text-muted-foreground mb-2 h-4 w-4" />
                <p className="text-muted-foreground mb-1 text-xs">{title}</p>
                <p className="font-mono text-lg font-medium">{value}</p>
            </CardContent>
        </Card>
    )
}

export default function CharacterWordCounter() {
    const [text, setText] = useState<string>('')
    const [stats, setStats] = useState({
        characters: 0,
        charactersNoSpaces: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
        lines: 0,
        readingTime: '0 seconds',
        speakingTime: '0 seconds',
    })
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [])

    useEffect(() => {
        calculateStats(text)
    }, [text])

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value)
    }

    const calculateStats = (text: string) => {
        const characters = text.length
        const charactersNoSpaces = text.replace(/\s/g, '').length
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
        const sentences =
            text === ''
                ? 0
                : text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
        const paragraphs =
            text === ''
                ? 0
                : text.split(/\n+/).filter((p) => p.trim().length > 0).length
        const lines = text === '' ? 0 : text.split('\n').length

        const readingTimeMinutes = words / 225
        const readingTime =
            readingTimeMinutes < 1
                ? Math.ceil(readingTimeMinutes * 60) + ' seconds'
                : Math.ceil(readingTimeMinutes) + ' minutes'

        const speakingTimeMinutes = words / 150
        const speakingTime =
            speakingTimeMinutes < 1
                ? Math.ceil(speakingTimeMinutes * 60) + ' seconds'
                : Math.ceil(speakingTimeMinutes) + ' minutes'

        setStats({
            characters,
            charactersNoSpaces,
            words,
            sentences,
            paragraphs,
            lines,
            readingTime,
            speakingTime,
        })
    }

    const clearText = () => {
        setText('')
        if (textareaRef.current) {
            textareaRef.current.focus()
        }
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-4">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                        <Textarea
                            ref={textareaRef}
                            placeholder="Type or paste your text here..."
                            className="min-h-[200px] resize-y text-base"
                            value={text}
                            onChange={handleTextChange}
                        />

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <CopyButton
                                value={text}
                                label="Copy text to clipboard"
                                testId="copy-button"
                            />

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearText}
                                disabled={!text}
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                    title="Characters"
                    value={stats.characters.toString()}
                    icon={Type}
                />
                <StatCard
                    title="Characters (no spaces)"
                    value={stats.charactersNoSpaces.toString()}
                    icon={AlignLeft}
                />
                <StatCard
                    title="Words"
                    value={stats.words.toString()}
                    icon={BookOpen}
                />
                <StatCard
                    title="Sentences"
                    value={stats.sentences.toString()}
                    icon={List}
                />
                <StatCard
                    title="Paragraphs"
                    value={stats.paragraphs.toString()}
                    icon={FileText}
                />
                <StatCard
                    title="Lines"
                    value={stats.lines.toString()}
                    icon={AlignLeft}
                />
                <StatCard
                    title="Reading Time"
                    value={stats.readingTime}
                    icon={Eye}
                />
                <StatCard
                    title="Speaking Time"
                    value={stats.speakingTime}
                    icon={Mic}
                />
            </div>

            <div className="mt-8 mb-4">
                <h2 className="mb-4 text-xl font-semibold">
                    About the Counter
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                How Words Are Counted
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Words are counted by splitting the text at
                                spaces, tabs, and line breaks. Multiple spaces
                                between words are treated as a single separator.
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Example: &#34;Hello world!&#34; contains 2
                                words.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Reading &amp; Speaking Times
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Reading time is calculated based on an average
                                reading speed of 225 words per minute. Speaking
                                time uses 150 words per minute.
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                                These are averages and actual times may vary
                                based on complexity and individual
                                reading/speaking rates.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">Use Cases</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Content Creation
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Track word counts for articles, blog posts, and
                                social media content to meet platform
                                requirements.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                SEO Optimization
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Monitor content length for SEO best practices
                                and ensure meta descriptions fit within
                                character limits.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Academic Writing
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Check if essays and papers meet the required
                                word count for assignments and publications.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
