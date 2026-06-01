'use client'

import { useEffect, useRef, useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type Indent = '2' | '4' | 'tab'

function indentValue(indent: Indent): string | number {
    if (indent === 'tab') return '\t'
    return Number(indent)
}

export default function JsonFormatter() {
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('')
    const [error, setError] = useState('')
    const [indent, setIndent] = useState<Indent>('2')
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
    }, [])

    const run = (mode: 'format' | 'minify') => {
        setError('')
        if (!input.trim()) {
            setOutput('')
            return
        }
        try {
            const parsed = JSON.parse(input)
            setOutput(
                mode === 'format'
                    ? JSON.stringify(parsed, null, indentValue(indent))
                    : JSON.stringify(parsed)
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Invalid JSON')
            setOutput('')
        }
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-4">
                <CardContent className="pt-6">
                    <Textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder='{"hello":"world"}'
                        className="min-h-[140px] font-mono text-sm"
                        aria-label="JSON input"
                    />
                    {error && (
                        <p className="text-destructive mt-2 text-sm">{error}</p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button onClick={() => run('format')}>Format</Button>
                        <Button variant="outline" onClick={() => run('minify')}>
                            Minify
                        </Button>
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="json-indent"
                                className="text-muted-foreground text-sm"
                            >
                                Indent
                            </label>
                            <select
                                id="json-indent"
                                value={indent}
                                onChange={(e) =>
                                    setIndent(e.target.value as Indent)
                                }
                                aria-label="Indent"
                                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                            >
                                <option value="2">2 spaces</option>
                                <option value="4">4 spaces</option>
                                <option value="tab">Tab</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">Output</span>
                        <CopyButton value={output} />
                    </div>
                    <pre className="bg-secondary/20 min-h-[140px] overflow-x-auto rounded-md p-3 font-mono text-sm">
                        {output || (
                            <span className="text-muted-foreground">
                                Formatted JSON will appear here…
                            </span>
                        )}
                    </pre>
                </CardContent>
            </Card>
        </div>
    )
}
