"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Check, Copy } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

interface StatCardProps {
    title: string
    value: string
    icon: string
}

function StatCard({ title, value, icon }: StatCardProps) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center p-4 text-center">
                <span className="text-2xl mb-2">{icon}</span>
                <h3 className="font-medium text-sm mb-1">{title}</h3>
                <p className="text-lg font-mono">{value}</p>
            </CardContent>
        </Card>
    )
}

export default function CharacterWordCounter() {
    const [text, setText] = useState<string>("")
    const [stats, setStats] = useState({
        characters: 0,
        charactersNoSpaces: 0,
        words: 0,
        sentences: 0,
        paragraphs: 0,
        lines: 0,
        readingTime: "0 seconds",
        speakingTime: "0 seconds"
    })
    const [copied, setCopied] = useState<boolean>(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Focus textarea on component mount
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [])

    // Update stats whenever text changes
    useEffect(() => {
        calculateStats(text)
    }, [text])

    // Reset copied state after 2 seconds
    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => {
                setCopied(false)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [copied])

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value)
    }

    const calculateStats = (text: string) => {
        // Characters (with spaces)
        const characters = text.length

        // Characters (without spaces)
        const charactersNoSpaces = text.replace(/\s/g, "").length

        // Words
        const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length

        // Sentences (split by . ! ?)
        const sentences = text === "" ? 0 : text.split(/[.!?]+/).filter(s => s.trim().length > 0).length

        // Paragraphs (split by newlines)
        const paragraphs = text === "" ? 0 : text.split(/\n+/).filter(p => p.trim().length > 0).length

        // Lines
        const lines = text === "" ? 0 : text.split("\n").length

        // Reading time (average 225 words per minute)
        const readingTimeMinutes = words / 225
        const readingTime = readingTimeMinutes < 1 ?
            Math.ceil(readingTimeMinutes * 60) + " seconds" :
            Math.ceil(readingTimeMinutes) + " minutes"

        // Speaking time (average 150 words per minute)
        const speakingTimeMinutes = words / 150
        const speakingTime = speakingTimeMinutes < 1 ?
            Math.ceil(speakingTimeMinutes * 60) + " seconds" :
            Math.ceil(speakingTimeMinutes) + " minutes"

        setStats({
            characters,
            charactersNoSpaces,
            words,
            sentences,
            paragraphs,
            lines,
            readingTime,
            speakingTime
        })
    }

    const copyText = () => {
        if (text) {
            navigator.clipboard.writeText(text)
            setCopied(true)
        }
    }

    const clearText = () => {
        setText("")
        if (textareaRef.current) {
            textareaRef.current.focus()
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-center mb-4">Character & Word Counter</h1>

            <Card className="mb-4">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                        <Textarea
                            ref={textareaRef}
                            placeholder="Type or paste your text here..."
                            className="min-h-[200px] text-base resize-y"
                            value={text}
                            onChange={handleTextChange}
                        />

                        <div className="flex flex-wrap justify-end gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={copyText}
                                            disabled={!text}
                                        >
                                            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                                            {copied ? "Copied" : "Copy"}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Copy text to clipboard</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <StatCard title="Characters" value={stats.characters.toString()} icon="📝" />
                <StatCard title="Characters (no spaces)" value={stats.charactersNoSpaces.toString()} icon="🔤" />
                <StatCard title="Words" value={stats.words.toString()} icon="📚" />
                <StatCard title="Sentences" value={stats.sentences.toString()} icon="📃" />
                <StatCard title="Paragraphs" value={stats.paragraphs.toString()} icon="📄" />
                <StatCard title="Lines" value={stats.lines.toString()} icon="📑" />
                <StatCard title="Reading Time" value={stats.readingTime} icon="👁️" />
                <StatCard title="Speaking Time" value={stats.speakingTime} icon="🗣️" />
            </div>

            <div className="mt-8 mb-4">
                <h2 className="text-xl font-semibold mb-4">About the Counter</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">How Words Are Counted</h3>
                            <p className="text-sm text-muted-foreground">
                                Words are counted by splitting the text at spaces, tabs, and line breaks.
                                Multiple spaces between words are treated as a single separator.
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Example: &#34;Hello  world!&#34; contains 2 words.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">Reading & Speaking Times</h3>
                            <p className="text-sm text-muted-foreground">
                                Reading time is calculated based on an average reading speed of 225 words per minute.
                                Speaking time uses 150 words per minute.
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                                These are averages and actual times may vary based on complexity and individual reading/speaking rates.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Use Cases</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">Content Creation</h3>
                            <p className="text-sm text-muted-foreground">
                                Track word counts for articles, blog posts, and social media content to meet platform requirements.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">SEO Optimization</h3>
                            <p className="text-sm text-muted-foreground">
                                Monitor content length for SEO best practices and ensure meta descriptions fit within character limits.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">Academic Writing</h3>
                            <p className="text-sm text-muted-foreground">
                                Check if essays and papers meet the required word count for assignments and publications.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}