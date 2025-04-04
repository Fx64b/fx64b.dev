'use client'

import { ArrowDown, Check, Copy } from 'lucide-react'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

export default function HourToDecimalConverter() {
    const [hours, setHours] = useState<string>('8')
    const [minutes, setMinutes] = useState<string>('12')
    const [result, setResult] = useState<string>('8.2')
    const [copied, setCopied] = useState<boolean>(false)
    const hoursRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (hoursRef.current) {
            hoursRef.current.focus()
        }
    }, [])

    useEffect(() => {
        calculateDecimal()
    }, [hours, minutes])

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => {
                setCopied(false)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [copied])

    const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '')
        setHours(value)
    }

    const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '')
        if (value === '' || parseInt(value) <= 59) {
            setMinutes(value)
        }
    }

    const calculateDecimal = () => {
        const hoursNum = hours === '' ? 0 : parseInt(hours)
        const minutesNum = minutes === '' ? 0 : parseInt(minutes)

        const decimalHours = hoursNum + minutesNum / 60

        const formatted = decimalHours.toFixed(decimalHours % 1 === 0 ? 0 : 1)

        setResult(formatted)
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result)
        setCopied(true)
    }

    return (
        <div className="mx-auto max-w-3xl">
            <h1 className="mb-4 text-center text-2xl font-bold">
                Hour to Decimal Converter
            </h1>

            <Card className="mb-4">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="hours"
                                    className="mb-1 block text-sm font-medium"
                                >
                                    Hours
                                </label>
                                <Input
                                    id="hours"
                                    ref={hoursRef}
                                    type="text"
                                    value={hours}
                                    onChange={handleHoursChange}
                                    placeholder="Enter hours"
                                    className="text-lg"
                                    aria-label="Hours"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="minutes"
                                    className="mb-1 block text-sm font-medium"
                                >
                                    Minutes (0-59)
                                </label>
                                <Input
                                    id="minutes"
                                    type="text"
                                    value={minutes}
                                    onChange={handleMinutesChange}
                                    placeholder="Enter minutes"
                                    className="text-lg"
                                    aria-label="Minutes"
                                    max={59}
                                />
                            </div>
                        </div>

                        <div className="mt-2 flex w-full items-center justify-center">
                            <ArrowDown className="my-2" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mb-8">
                <CardContent className="relative p-6">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    data-testid="copy-button"
                                    onClick={copyToClipboard}
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

                    <h3 className="mb-2 text-lg font-medium">
                        Decimal Time Result
                    </h3>
                    <div className="bg-secondary/30 rounded-md p-4 font-mono text-2xl">
                        {result}
                    </div>

                    <div className="text-muted-foreground mt-4 text-sm">
                        {hours || minutes ? (
                            <>
                                <span className="font-semibold">
                                    {hours || '0'} hours
                                </span>{' '}
                                and{' '}
                                <span className="font-semibold">
                                    {minutes || '0'} minutes
                                </span>{' '}
                                equals{' '}
                                <span className="font-semibold">
                                    {result} decimal hours
                                </span>
                            </>
                        ) : (
                            'Enter hours and minutes to see the conversion'
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 mb-4">
                <h2 className="mb-4 text-xl font-semibold">
                    Common Hour to Decimal Conversions
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">15 Minutes</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                One quarter of an hour.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                15 min = 0.25 hours
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">30 Minutes</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Half an hour.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                30 min = 0.5 hours
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">45 Minutes</h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Three quarters of an hour.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                45 min = 0.75 hours
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                1 Hour 30 Minutes
                            </h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                An hour and a half.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                1h 30min = 1.5 hours
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                2 Hours 15 Minutes
                            </h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Two and a quarter hours.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                2h 15min = 2.25 hours
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                8 Hours 30 Minutes
                            </h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                A typical workday with a lunch break.
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-sm">
                                8h 30min = 8.5 hours
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">Usage Examples</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Time Tracking & Billing
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                Decimal time is commonly used for:
                            </p>
                            <ul className="text-muted-foreground mt-2 list-disc pl-5 text-sm">
                                <li>Timesheet calculation for hourly work</li>
                                <li>
                                    Billing clients when charging by the hour
                                </li>
                                <li>Project management time estimation</li>
                                <li>
                                    Payroll calculations for hourly employees
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                How to Convert Manually
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                The formula to convert hours and minutes to
                                decimal time is:
                            </p>
                            <div className="bg-secondary/20 mt-2 rounded p-3 font-mono text-sm">
                                hours + (minutes ÷ 60)
                            </div>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Example: 2 hours and 45 minutes = 2 + (45 ÷ 60)
                                = 2 + 0.75 = 2.75
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
