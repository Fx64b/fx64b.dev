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

export default function Base64EncoderDecoder() {
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
                setOutput(btoa(unescape(encodeURIComponent(text))))
            } else {
                setOutput(decodeURIComponent(escape(atob(text.trim()))))
            }
        } catch {
            setError(
                m === 'decode' ? 'Invalid Base64 input' : 'Encoding error'
            )
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
                                ? 'Enter text to encode...'
                                : 'Enter Base64 string to decode...'
                        }
                        className="min-h-[120px] font-mono text-sm"
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
                            {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
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
                    <div className="bg-secondary/20 min-h-[120px] break-all rounded-md p-3 font-mono text-sm">
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
                <h2 className="mb-4 text-xl font-semibold">About Base64</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">What is Base64?</h3>
                            <p className="text-muted-foreground text-sm">
                                Base64 encodes binary data as printable ASCII
                                text using 64 characters (A–Z, a–z, 0–9, +, /).
                                Every 3 bytes of input become 4 characters of
                                output, increasing size by ~33%.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Common Uses</h3>
                            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                                <li>JWT tokens (header and payload)</li>
                                <li>Embedding images as data URIs</li>
                                <li>Email attachments (MIME encoding)</li>
                                <li>Encoding payloads to bypass filters</li>
                            </ul>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Security Note
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Base64 is{' '}
                                <strong>encoding, not encryption</strong>.
                                Anyone can decode it instantly — never use it
                                to protect sensitive data.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Variants</h3>
                            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                                <li>
                                    <strong>Standard:</strong> uses + and /
                                </li>
                                <li>
                                    <strong>URL-safe:</strong> uses - and _
                                </li>
                                <li>
                                    <strong>No padding:</strong> omits trailing =
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
