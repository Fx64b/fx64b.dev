'use client'

import { Check, Copy } from 'lucide-react'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface CopyButtonProps {
    value: string
    label?: string
    disabled?: boolean
}

/** Small reusable "copy to clipboard" icon button with a transient checkmark. */
export function CopyButton({
    value,
    label = 'Copy',
    disabled,
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!copied) return
        const t = setTimeout(() => setCopied(false), 2000)
        return () => clearTimeout(t)
    }, [copied])

    const copy = () => {
        if (!value) return
        navigator.clipboard.writeText(value)
        setCopied(true)
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={copy}
                        disabled={disabled ?? !value}
                        aria-label={label}
                    >
                        {copied ? (
                            <Check className="h-3.5 w-3.5" />
                        ) : (
                            <Copy className="h-3.5 w-3.5" />
                        )}
                        <span className="sr-only">{label}</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{copied ? 'Copied!' : label}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
