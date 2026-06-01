'use client'

import { Download } from 'lucide-react'
import QRCode from 'qrcode'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type Level = 'L' | 'M' | 'Q' | 'H'

const LEVELS: { value: Level; label: string }[] = [
    { value: 'L', label: 'Low (7%)' },
    { value: 'M', label: 'Medium (15%)' },
    { value: 'Q', label: 'Quartile (25%)' },
    { value: 'H', label: 'High (30%)' },
]

export default function QrCodeGenerator() {
    const [text, setText] = useState('')
    const [level, setLevel] = useState<Level>('M')
    const [svg, setSvg] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false
        if (!text.trim()) {
            setSvg('')
            setError('')
            return
        }
        QRCode.toString(text, {
            type: 'svg',
            errorCorrectionLevel: level,
            margin: 2,
        })
            .then((result) => {
                if (!cancelled) {
                    setSvg(result)
                    setError('')
                }
            })
            .catch((e: unknown) => {
                if (!cancelled) {
                    setSvg('')
                    setError(
                        e instanceof Error
                            ? e.message
                            : 'Could not generate QR code'
                    )
                }
            })
        return () => {
            cancelled = true
        }
    }, [text, level])

    const download = () => {
        if (!svg) return
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'qrcode.svg'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div>
                        <label
                            htmlFor="qr-text"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Content
                        </label>
                        <Textarea
                            id="qr-text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="URL or text to encode…"
                            className="min-h-[100px] text-sm"
                            aria-label="QR content"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="qr-level"
                            className="text-muted-foreground text-sm"
                        >
                            Error correction
                        </label>
                        <select
                            id="qr-level"
                            value={level}
                            onChange={(e) => setLevel(e.target.value as Level)}
                            aria-label="Error correction"
                            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                        >
                            {LEVELS.map((l) => (
                                <option key={l.value} value={l.value}>
                                    {l.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                </CardContent>
            </Card>

            {svg && (
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 pt-6">
                        <div
                            className="h-64 w-64 rounded-md bg-white p-2"
                            data-testid="qr-output"
                            // qrcode emits a trusted, self-generated SVG string.
                            dangerouslySetInnerHTML={{ __html: svg }}
                        />
                        <Button
                            variant="outline"
                            onClick={download}
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Download SVG
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
