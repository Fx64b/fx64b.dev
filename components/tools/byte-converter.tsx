'use client'

import { ArrowDown, Check, Copy } from 'lucide-react'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

type ByteUnit = 'Bytes' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB'

const UNITS: ByteUnit[] = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

export default function ByteConverter() {
    const [value, setValue] = useState<string>('1')
    const [fromUnit, setFromUnit] = useState<ByteUnit>('MB')
    const [results, setResults] = useState<Record<ByteUnit, string>>(
        {} as Record<ByteUnit, string>
    )
    const [copiedUnit, setCopiedUnit] = useState<ByteUnit | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    useEffect(() => {
        calculateAllConversions()
    }, [value, fromUnit])

    useEffect(() => {
        if (copiedUnit) {
            const timer = setTimeout(() => {
                setCopiedUnit(null)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [copiedUnit])

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const currentIndex = UNITS.indexOf(fromUnit)
            let newIndex = currentIndex

            if (e.key === 'ArrowUp') {
                newIndex =
                    currentIndex > 0 ? currentIndex - 1 : UNITS.length - 1
            } else {
                newIndex =
                    currentIndex < UNITS.length - 1 ? currentIndex + 1 : 0
            }

            setFromUnit(UNITS[newIndex])
        }
    }

    const calculateAllConversions = () => {
        const numValue = Number.parseFloat(value)

        if (isNaN(numValue) || !value.trim()) {
            setResults({} as Record<ByteUnit, string>)
            return
        }

        const fromIndex = UNITS.indexOf(fromUnit)
        const newResults = {} as Record<ByteUnit, string>

        UNITS.forEach((unit) => {
            const toIndex = UNITS.indexOf(unit)
            const powerDiff = fromIndex - toIndex
            const resultValue = numValue * Math.pow(1024, powerDiff)

            newResults[unit] = formatNumber(resultValue)
        })

        setResults(newResults)
    }

    const formatNumber = (num: number): string => {
        if (Math.abs(num) < 0.0001 && num !== 0) {
            return num.toExponential(4)
        } else if (Number.isInteger(num)) {
            return num.toLocaleString()
        } else {
            const fixed = num.toFixed(6).replace(/\.?0+$/, '')
            return Number.parseFloat(fixed).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
            })
        }
    }

    const copyToClipboard = (unit: ByteUnit) => {
        if (results[unit]) {
            navigator.clipboard.writeText(results[unit])
            setCopiedUnit(unit)
        }
    }

    return (
        <div className="mx-auto max-w-3xl">
            <h1 className="mb-4 text-center text-2xl font-bold">
                Byte Converter
            </h1>

            <Card className="mb-4">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-end gap-4 md:flex-row">
                        <div className="w-full md:flex-1">
                            <Input
                                ref={inputRef}
                                type="text"
                                value={value}
                                onChange={handleValueChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter value"
                                className="text-lg"
                                aria-label="Value to convert"
                            />
                        </div>

                        <div className="w-full md:w-auto">
                            <Select
                                value={fromUnit}
                                onValueChange={(val) =>
                                    setFromUnit(val as ByteUnit)
                                }
                            >
                                <SelectTrigger className="w-full md:w-[120px]">
                                    <SelectValue placeholder="From" />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNITS.map((unit) => (
                                        <SelectItem key={unit} value={unit}>
                                            {unit}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="mt-4 flex w-full items-center justify-center">
                        <ArrowDown className="my-2" />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {UNITS.map((unit) => (
                    <Card
                        key={unit}
                        className={`${unit === fromUnit ? 'border-primary' : ''}`}
                    >
                        <CardContent className="relative h-[100px] p-4">
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-sm font-medium">
                                    {unit}
                                </span>
                                {unit === fromUnit ? (
                                    <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                                        Source
                                    </span>
                                ) : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6"
                                                    onClick={() =>
                                                        copyToClipboard(unit)
                                                    }
                                                    disabled={!results[unit]}
                                                >
                                                    {copiedUnit === unit ? (
                                                        <Check className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                    <span className="sr-only">
                                                        Copy value
                                                    </span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>
                                                    {copiedUnit === unit
                                                        ? 'Copied!'
                                                        : 'Copy'}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <div
                                className="mt-2 truncate font-mono text-lg"
                                title={results[unit]}
                            >
                                {results[unit] || '-'}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="text-muted-foreground mt-4 text-center text-xs">
                <kbd className="rounded border px-1.5 py-0.5 text-xs">Tab</kbd>{' '}
                to navigate •
                <kbd className="ml-1 rounded border px-1.5 py-0.5 text-xs">
                    ↑
                </kbd>
                /<kbd className="rounded border px-1.5 py-0.5 text-xs">↓</kbd>{' '}
                to change units
            </div>
            <div className="mt-8 mb-4">
                <h2 className="mb-4 text-xl font-semibold">
                    Common Byte Conversions
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Storage Devices
                            </h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Hard drives and SSDs are typically measured in
                                GB or TB.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                1 TB = 1,024 GB = 1,048,576 MB
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">RAM Memory</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Computer memory is commonly measured in GB or
                                MB.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                16 GB RAM = 16,384 MB
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">File Sizes</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Documents are often KB or MB, while media files
                                can be GB.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                5 MB = 5,120 KB = 5,242,880 Bytes
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Internet Speed</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Internet speeds are measured in Mbps (megabits),
                                not MB (megabytes).
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                100 Mbps = 12.5 MB/s
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Cloud Storage</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Cloud storage plans typically offer GB or TB of
                                space.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                2 TB = 2,048 GB = 2,097,152 MB
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Database Size</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Database sizes can range from MB to TB depending
                                on the data.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                500 MB = 0.49 GB = 512,000 KB
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">About Byte Units</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Binary vs Decimal
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                This converter uses the <strong>binary</strong>{' '}
                                definition where 1 KB = 1024 Bytes, which is the
                                standard in computing.
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Note that some storage manufacturers use the{' '}
                                <strong>decimal</strong> system (1 KB = 1000
                                Bytes), which is why a &#34;1 TB&#34; hard drive
                                shows less space in your operating system.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Unit Relationships
                            </h3>
                            <div className="space-y-1 text-sm">
                                <p>1 KB (Kilobyte) = 1,024 Bytes</p>
                                <p>1 MB (Megabyte) = 1,024 KB</p>
                                <p>1 GB (Gigabyte) = 1,024 MB</p>
                                <p>1 TB (Terabyte) = 1,024 GB</p>
                                <p>1 PB (Petabyte) = 1,024 TB</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
