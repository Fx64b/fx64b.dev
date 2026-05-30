'use client'

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

// Pure-JS MD5 (RFC 1321)
function md5(input: string): string {
    function safeAdd(x: number, y: number) {
        const lsw = (x & 0xffff) + (y & 0xffff)
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
        return (msw << 16) | (lsw & 0xffff)
    }
    function bitRotateLeft(num: number, cnt: number) {
        return (num << cnt) | (num >>> (32 - cnt))
    }
    function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
        return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
    }
    function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return md5cmn((b & c) | (~b & d), a, b, x, s, t)
    }
    function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
    }
    function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return md5cmn(b ^ c ^ d, a, b, x, s, t)
    }
    function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return md5cmn(c ^ (b | ~d), a, b, x, s, t)
    }

    function md5blks(s: string): number[] {
        const nblk = ((s.length + 8) >> 6) + 1
        const blks: number[] = new Array(nblk * 16).fill(0)
        for (let i = 0; i < s.length; i++) {
            blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8)
        }
        blks[s.length >> 2] |= 0x80 << ((s.length % 4) * 8)
        blks[nblk * 16 - 2] = s.length * 8
        return blks
    }

    function hex(x: number[]): string {
        const hexTab = '0123456789abcdef'
        let out = ''
        for (let i = 0; i < x.length * 4; i++) {
            out +=
                hexTab.charAt((x[i >> 2] >> ((i % 4) * 8 + 4)) & 0x0f) +
                hexTab.charAt((x[i >> 2] >> ((i % 4) * 8)) & 0x0f)
        }
        return out
    }

    // Encode input as latin1
    const encoded = unescape(encodeURIComponent(input))
    const x = md5blks(encoded)
    let a = 1732584193,
        b = -271733879,
        c = -1732584194,
        d = 271733878

    for (let i = 0; i < x.length; i += 16) {
        const olda = a, oldb = b, oldc = c, oldd = d
        a = md5ff(a, b, c, d, x[i], 7, -680876936)
        d = md5ff(d, a, b, c, x[i + 1], 12, -389564586)
        c = md5ff(c, d, a, b, x[i + 2], 17, 606105819)
        b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330)
        a = md5ff(a, b, c, d, x[i + 4], 7, -176418897)
        d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426)
        c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341)
        b = md5ff(b, c, d, a, x[i + 7], 22, -45705983)
        a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416)
        d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417)
        c = md5ff(c, d, a, b, x[i + 10], 17, -42063)
        b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162)
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682)
        d = md5ff(d, a, b, c, x[i + 13], 12, -40341101)
        c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290)
        b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329)
        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510)
        d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632)
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713)
        b = md5gg(b, c, d, a, x[i], 20, -373897302)
        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691)
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083)
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335)
        b = md5gg(b, c, d, a, x[i + 4], 20, -405537848)
        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438)
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690)
        c = md5gg(c, d, a, b, x[i + 3], 14, -187363961)
        b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501)
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467)
        d = md5gg(d, a, b, c, x[i + 2], 9, -51403784)
        c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473)
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734)
        a = md5hh(a, b, c, d, x[i + 5], 4, -378558)
        d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463)
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562)
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556)
        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060)
        d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353)
        c = md5hh(c, d, a, b, x[i + 7], 16, -155497632)
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640)
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174)
        d = md5hh(d, a, b, c, x[i], 11, -358537222)
        c = md5hh(c, d, a, b, x[i + 3], 16, -722521979)
        b = md5hh(b, c, d, a, x[i + 6], 23, 76029189)
        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487)
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835)
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520)
        b = md5hh(b, c, d, a, x[i + 2], 23, -995338651)
        a = md5ii(a, b, c, d, x[i], 6, -198630844)
        d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415)
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905)
        b = md5ii(b, c, d, a, x[i + 5], 21, -57434055)
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571)
        d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606)
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523)
        b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799)
        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359)
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744)
        c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380)
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649)
        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070)
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379)
        c = md5ii(c, d, a, b, x[i + 2], 15, 718787259)
        b = md5ii(b, c, d, a, x[i + 9], 21, -343485551)
        a = safeAdd(a, olda)
        b = safeAdd(b, oldb)
        c = safeAdd(c, oldc)
        d = safeAdd(d, oldd)
    }
    return hex([a, b, c, d])
}

async function sha(algorithm: string, input: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest(algorithm, data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

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
                            <div className="bg-secondary/20 truncate rounded p-2 font-mono text-xs">
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
