'use client'

import { md5, sha } from '@/lib/hash-utils'
import { Check, Copy } from 'lucide-react'

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

type HashName = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'

const HASH_ALGORITHMS: HashName[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

export default function HashGenerator() {
    const [input, setInput] = useState('')
    const [hashes, setHashes] = useState<Record<HashName, string>>(
        {} as Record<HashName, string>
    )
    const [copiedHash, setCopiedHash] = useState<HashName | null>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
    }, [])

    useEffect(() => {
        if (copiedHash) {
            const t = setTimeout(() => setCopiedHash(null), 2000)
            return () => clearTimeout(t)
        }
    }, [copiedHash])

    useEffect(() => {
        generateHashes(input)
    }, [input])

    const generateHashes = async (text: string) => {
        if (!text) {
            setHashes({} as Record<HashName, string>)
            return
        }
        const [sha1, sha256, sha512] = await Promise.all([
            sha('SHA-1', text),
            sha('SHA-256', text),
            sha('SHA-512', text),
        ])
        setHashes({
            MD5: md5(text),
            'SHA-1': sha1,
            'SHA-256': sha256,
            'SHA-512': sha512,
        })
    }

    const copyHash = (name: HashName) => {
        if (hashes[name]) {
            navigator.clipboard.writeText(hashes[name])
            setCopiedHash(name)
        }
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <Textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter text to hash..."
                        className="min-h-[100px] font-mono text-sm"
                        aria-label="Input text"
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3">
                {HASH_ALGORITHMS.map((name) => (
                    <Card key={name}>
                        <CardContent className="p-4">
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-sm font-semibold">
                                    {name}
                                </span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => copyHash(name)}
                                                disabled={!hashes[name]}
                                                data-testid={`copy-${name}`}
                                            >
                                                {copiedHash === name ? (
                                                    <Check className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                                <span className="sr-only">
                                                    Copy {name} hash
                                                </span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {copiedHash === name
                                                ? 'Copied!'
                                                : 'Copy'}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <div
                                className="bg-secondary/20 truncate rounded p-2 font-mono text-xs"
                                data-testid={`hash-${name}`}
                            >
                                {hashes[name] || (
                                    <span className="text-muted-foreground">
                                        —
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Separator className="my-8" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">
                    About Hash Functions
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                What is a Hash?
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                A cryptographic hash function maps data of any
                                size to a fixed-length digest. The same input
                                always produces the same output, but even a
                                one-character change produces a completely
                                different hash.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Algorithm Comparison
                            </h3>
                            <div className="text-muted-foreground space-y-1 text-sm">
                                <p>
                                    <strong>MD5</strong> — 128-bit, broken,
                                    legacy only
                                </p>
                                <p>
                                    <strong>SHA-1</strong> — 160-bit, weak,
                                    avoid
                                </p>
                                <p>
                                    <strong>SHA-256</strong> — 256-bit, secure,
                                    widely used
                                </p>
                                <p>
                                    <strong>SHA-512</strong> — 512-bit, very
                                    strong
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Common Uses</h3>
                            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                                <li>File integrity verification</li>
                                <li>Password storage (with salting)</li>
                                <li>Digital signatures</li>
                                <li>Checksums for downloads</li>
                            </ul>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Security Note</h3>
                            <p className="text-muted-foreground text-sm">
                                MD5 and SHA-1 are{' '}
                                <strong>cryptographically broken</strong> and
                                should not be used for security-sensitive
                                purposes. Use SHA-256 or SHA-512 instead.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
