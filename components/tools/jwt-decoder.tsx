'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

function base64UrlDecode(segment: string): string {
    const padded = segment
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(segment.length / 4) * 4, '=')
    return decodeURIComponent(escape(atob(padded)))
}

function prettyJson(raw: string): string {
    return JSON.stringify(JSON.parse(raw), null, 2)
}

const TIME_CLAIMS: Record<string, string> = {
    exp: 'Expires',
    iat: 'Issued at',
    nbf: 'Not before',
}

interface DecodedJwt {
    header: string
    payload: string
    claims: { key: string; label: string; value: string }[]
    expired: boolean | null
}

export default function JwtDecoder() {
    const [token, setToken] = useState('')
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
    }, [])

    const decoded = useMemo<DecodedJwt | null>(() => {
        setError('')
        const trimmed = token.trim()
        if (!trimmed) return null

        const parts = trimmed.split('.')
        if (parts.length < 2) {
            setError('A JWT must have at least a header and a payload segment.')
            return null
        }

        try {
            const headerJson = base64UrlDecode(parts[0])
            const payloadJson = base64UrlDecode(parts[1])
            const payloadObj = JSON.parse(payloadJson) as Record<
                string,
                unknown
            >

            const claims: DecodedJwt['claims'] = []
            for (const [key, label] of Object.entries(TIME_CLAIMS)) {
                const value = payloadObj[key]
                if (typeof value === 'number') {
                    claims.push({
                        key,
                        label,
                        value: new Date(value * 1000).toUTCString(),
                    })
                }
            }

            let expired: boolean | null = null
            if (typeof payloadObj.exp === 'number') {
                expired = payloadObj.exp * 1000 < Date.now()
            }

            return {
                header: prettyJson(headerJson),
                payload: prettyJson(payloadJson),
                claims,
                expired,
            }
        } catch {
            setError('Could not decode this token. Is it a valid JWT?')
            return null
        }
    }, [token])

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-4">
                <CardContent className="pt-6">
                    <Textarea
                        ref={inputRef}
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Paste a JWT (eyJhbGci...)"
                        className="min-h-[100px] font-mono text-sm break-all"
                        aria-label="JWT input"
                    />
                    {error && (
                        <p className="text-destructive mt-2 text-sm">{error}</p>
                    )}
                </CardContent>
            </Card>

            {decoded && (
                <div className="space-y-4">
                    {decoded.expired !== null && (
                        <div
                            className={
                                decoded.expired
                                    ? 'text-destructive text-sm font-medium'
                                    : 'text-sm font-medium text-emerald-500'
                            }
                            role="status"
                        >
                            {decoded.expired
                                ? 'This token has expired.'
                                : 'This token is still valid (not expired).'}
                        </div>
                    )}

                    <Segment title="Header" value={decoded.header} />
                    <Segment title="Payload" value={decoded.payload} />

                    {decoded.claims.length > 0 && (
                        <Card>
                            <CardContent className="pt-6">
                                <span className="mb-2 block text-sm font-medium">
                                    Timestamps
                                </span>
                                <ul className="text-muted-foreground space-y-1 text-sm">
                                    {decoded.claims.map((claim) => (
                                        <li key={claim.key}>
                                            <span className="text-foreground font-medium">
                                                {claim.label} ({claim.key}):
                                            </span>{' '}
                                            {claim.value}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    <p className="text-muted-foreground text-xs">
                        Decoding does not verify the signature. Never trust an
                        unverified token for authorization.
                    </p>
                </div>
            )}
        </div>
    )
}

function Segment({ title, value }: { title: string; value: string }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{title}</span>
                    <CopyButton value={value} label={`Copy ${title}`} />
                </div>
                <pre className="bg-secondary/20 overflow-x-auto rounded-md p-3 font-mono text-sm">
                    {value}
                </pre>
            </CardContent>
        </Card>
    )
}
