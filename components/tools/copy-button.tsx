'use client'

import { cn } from '@/lib/utils'
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
    className?: string
    /** Forwarded to the button as `data-testid` (the check icon gets `check-icon`). */
    testId?: string
}

/** Reusable "copy to clipboard" icon button with a transient checkmark. */
export function CopyButton({
    value,
    label = 'Copy',
    disabled,
    className,
    testId,
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
                        className={cn('h-7 w-7', className)}
                        onClick={copy}
                        disabled={disabled ?? !value}
                        aria-label={label}
                        data-testid={testId}
                    >
                        {copied ? (
                            <Check
                                className="h-3.5 w-3.5"
                                data-testid="check-icon"
                            />
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
