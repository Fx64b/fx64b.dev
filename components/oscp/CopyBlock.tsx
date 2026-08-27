import { Check, Copy } from 'lucide-react'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'

interface CopyBlockProps {
    code: string
    label?: string
    note?: string
    className?: string
}

/** A labelled, monospace command block with a one-click copy button. */
export function CopyBlock({ code, label, note, className }: CopyBlockProps) {
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!copied) {return}
        const t = setTimeout(() => setCopied(false), 1500)
        return () => clearTimeout(t)
    }, [copied])

    const copy = () => {
        navigator.clipboard?.writeText(code).then(
            () => setCopied(true),
            () => setCopied(false)
        )
    }

    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <p className="text-muted-foreground text-[12px] font-medium">
                    {label}
                </p>
            )}
            <div className="group relative">
                <pre className="border-border bg-muted/50 overflow-x-auto rounded-md border px-3 py-2.5 pr-11 font-mono text-[12.5px] leading-[1.65]">
                    <code>{code}</code>
                </pre>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={copy}
                    aria-label={copied ? 'Copied' : 'Copy command'}
                    className="absolute top-1.5 right-1.5 opacity-70 hover:opacity-100"
                >
                    {copied ? (
                        <Check className="text-emerald-500" />
                    ) : (
                        <Copy />
                    )}
                </Button>
            </div>
            {note && (
                <p className="text-muted-foreground text-[12px] leading-[1.6] italic">
                    {note}
                </p>
            )}
        </div>
    )
}
