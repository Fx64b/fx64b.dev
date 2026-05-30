'use client'

import { ArrowDown, Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

type Mode = 'encode' | 'decode'

export default function UrlEncoderDecoder() {
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('')
    const [mode, setMode] = useState<Mode>('encode')
    const [error, setError] = useState('')
    const [copied, setCopied] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
    }, [])

    useEffect(() => {
        if (copied) {
            const t = setTimeout(() => setCopied(false), 2000)
            return () => clearTimeout(t)
        }
    }, [copied])

    useEffect(() => {
        convert(input, mode)
    }, [input, mode])

    const convert = (text: string, m: Mode) => {
        setError('')
        if (!text.trim()) {
            setOutput('')
            return
        }
        try {
            if (m === 'encode') {
                setOutput(encodeURIComponent(text))
            } else {
                setOutput(decodeURIComponent(text.trim()))
            }
        } catch {
            setError('Invalid input for decoding')
            setOutput('')
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
            <div className="mb-4 flex gap-2">
                <Button
                    variant={mode === 'encode' ? 'default' : 'outline'}
                    onClick={() => setMode('encode')}
                >
                    Encode
                </Button>
                <Button
                    variant={mode === 'decode' ? 'default' : 'outline'}
                    onClick={() => setMode('decode')}
                >
                    Decode
                </Button>
            </div>

            <Card className="mb-4">
                <CardContent className="pt-6">
                    <Textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            mode === 'encode'
                                ? 'Enter URL or text to encode...'
                                : 'Enter percent-encoded string to decode...'
                        }
                        className="min-h-[100px] font-mono text-sm"
                        aria-label="Input"
                    />
                    {error && (
                        <p className="text-destructive mt-2 text-sm">{error}</p>
                    )}
                    <div className="mt-4 flex justify-center">
                        <ArrowDown className="my-2" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">
                            {mode === 'encode'
                                ? 'Encoded Output'
                                : 'Decoded Output'}
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
                    <div className="bg-secondary/20 min-h-[100px] break-all rounded-md p-3 font-mono text-sm">
                        {output || (
                            <span className="text-muted-foreground">
                                Output will appear here...
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Separator className="my-8" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">
                    About URL Encoding
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                What is Percent-Encoding?
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                URL encoding (percent-encoding) replaces unsafe
                                characters with a <code>%</code> followed by
                                two hexadecimal digits representing the
                                character&apos;s byte value. For example, a
                                space becomes <code>%20</code>.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Common Encodings
                            </h3>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-xs">
                                <p>space → %20</p>
                                <p>/ → %2F</p>
                                <p>? → %3F</p>
                                <p>& → %26</p>
                                <p># → %23</p>
                                <p>= → %3D</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Security Relevance
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                URL encoding is often used in web attacks such
                                as bypassing WAF rules, path traversal
                                (<code>%2F..%2F</code>), and injecting
                                characters that would otherwise be filtered.
                                Double-encoding (<code>%2520</code>) can bypass
                                some decoders.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Safe Characters</h3>
                            <p className="text-muted-foreground text-sm">
                                Characters that do{' '}
                                <strong>not</strong> need encoding: A–Z, a–z,
                                0–9 and <code>- _ . ~</code>. All others are
                                percent-encoded.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
