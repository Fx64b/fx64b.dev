'use client'

import { ArrowDown, Check, Copy } from 'lucide-react'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

type CaseType =
    | 'lowercase'
    | 'uppercase'
    | 'titlecase'
    | 'sentencecase'
    | 'camelcase'
    | 'pascalcase'
    | 'snakecase'
    | 'kebabcase'
    | 'constantcase'
    | 'dotcase'
    | 'pathcase'

const CASE_TYPES: { value: CaseType; label: string }[] = [
    { value: 'lowercase', label: 'lowercase' },
    { value: 'uppercase', label: 'UPPERCASE' },
    { value: 'titlecase', label: 'Title Case' },
    { value: 'sentencecase', label: 'Sentence case' },
    { value: 'camelcase', label: 'camelCase' },
    { value: 'pascalcase', label: 'PascalCase' },
    { value: 'snakecase', label: 'snake_case' },
    { value: 'kebabcase', label: 'kebab-case' },
    { value: 'constantcase', label: 'CONSTANT_CASE' },
    { value: 'dotcase', label: 'dot.case' },
    { value: 'pathcase', label: 'path/case' },
]

export default function TextCaseConverter() {
    const [inputText, setInputText] = useState<string>('')
    const [caseType, setCaseType] = useState<CaseType>('titlecase')
    const [outputText, setOutputText] = useState<string>('')
    const [copied, setCopied] = useState<boolean>(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Focus input on component mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    // Convert whenever inputs change
    useEffect(() => {
        convertText(inputText, caseType)
    }, [inputText, caseType])

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value)
    }

    const convertText = (text: string, type: CaseType) => {
        if (!text.trim()) {
            setOutputText('')
            return
        }

        let result = ''

        switch (type) {
            case 'lowercase':
                result = text.toLowerCase()
                break
            case 'uppercase':
                result = text.toUpperCase()
                break
            case 'titlecase':
                result = text
                    .toLowerCase()
                    .split(' ')
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
                break
            case 'sentencecase':
                result = text
                    .toLowerCase()
                    .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase())
                break
            case 'camelcase':
                result = text
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
                    .replace(/^[^a-zA-Z0-9]*(.)/g, (_, c) => c.toLowerCase())
                break
            case 'pascalcase':
                result = text
                    .toLowerCase()
                    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) =>
                        word.toUpperCase()
                    )
                    .replace(/\s+/g, '')
                    .replace(/[^a-zA-Z0-9]/g, '')
                break
            case 'snakecase':
                result = text
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zA-Z0-9_]/g, '')
                break
            case 'kebabcase':
                result = text
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-zA-Z0-9-]/g, '')
                break
            case 'constantcase':
                result = text
                    .toUpperCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-zA-Z0-9_]/g, '')
                break
            case 'dotcase':
                result = text
                    .toLowerCase()
                    .replace(/\s+/g, '.')
                    .replace(/[^a-zA-Z0-9.]/g, '')
                break
            case 'pathcase':
                result = text
                    .toLowerCase()
                    .replace(/\s+/g, '/')
                    .replace(/[^a-zA-Z0-9/]/g, '')
                break
            default:
                result = text
        }

        setOutputText(result)
    }

    const handleCopy = () => {
        if (outputText) {
            navigator.clipboard.writeText(outputText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="mx-auto max-w-3xl">
            <h1 className="mb-4 text-center text-2xl font-bold">
                Text Case Converter
            </h1>

            <Card className="mb-4">
                <CardContent className="pt-6">
                    <Textarea
                        ref={inputRef}
                        placeholder="Enter text to convert..."
                        className="min-h-[120px] resize-none text-base"
                        value={inputText}
                        onChange={handleInputChange}
                    />

                    <div className="mt-4 flex items-end gap-4">
                        <div className="flex-grow">
                            <Select
                                value={caseType}
                                onValueChange={(val) =>
                                    setCaseType(val as CaseType)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select case type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CASE_TYPES.map((type) => (
                                        <SelectItem
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mb-4 flex justify-center">
                <ArrowDown className="text-muted-foreground" />
            </div>

            <Card className="mb-8">
                <CardContent className="relative pt-6">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    data-testid="copy-button"
                                    size="icon"
                                    onClick={handleCopy}
                                    disabled={!outputText}
                                    className="absolute top-4 right-4 h-8 w-8"
                                >
                                    {copied ? (
                                        <Check
                                            data-testid="check-icon"
                                            className="h-4 w-4"
                                        />
                                    ) : (
                                        <Copy
                                            data-testid="copy-icon"
                                            className="h-4 w-4"
                                        />
                                    )}
                                    <span className="sr-only">
                                        Copy to clipboard
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {copied ? 'Copied!' : 'Copy to clipboard'}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <div className="bg-secondary/30 min-h-[120px] rounded-md p-4 font-mono whitespace-pre-wrap">
                        {outputText || (
                            <span className="text-muted-foreground">
                                Converted text will appear here
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 mb-4">
                <h2 className="mb-4 text-xl font-semibold">
                    Case Types Explained
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Title Case</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Capitalizes the first letter of each word. Used
                                for titles, headings, and proper nouns.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                The Quick Brown Fox
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">camelCase</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                First word lowercase, subsequent words
                                capitalized. Common in JavaScript variables.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                theQuickBrownFox
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">PascalCase</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                All words capitalized without spaces. Used for
                                class names in many languages.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                TheQuickBrownFox
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">snake_case</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Lowercase with underscores. Popular in Python,
                                Ruby, and SQL.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                the_quick_brown_fox
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">kebab-case</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Lowercase with hyphens. Common in URLs, HTML
                                attributes, and CSS properties.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                the-quick-brown-fox
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">CONSTANT_CASE</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                All uppercase with underscores. Used for
                                constants and environment variables.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                THE_QUICK_BROWN_FOX
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
