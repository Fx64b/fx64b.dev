'use client'

import { useState } from 'react'

import { NumberInput } from '@/components/tools/number-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type Mode = 'coin' | 'dice' | '8ball' | 'picker'

const MODES: { key: Mode; label: string }[] = [
    { key: 'coin', label: 'Coin Flip' },
    { key: 'dice', label: 'Dice Roller' },
    { key: '8ball', label: 'Magic 8-Ball' },
    { key: 'picker', label: 'Random Picker' },
]

const EIGHT_BALL = [
    'It is certain.',
    'Without a doubt.',
    'Yes, definitely.',
    'Most likely.',
    'Ask again later.',
    'Cannot predict now.',
    "Don't count on it.",
    'My reply is no.',
    'Very doubtful.',
    'Signs point to yes.',
]

function randomInt(max: number): number {
    return Math.floor(Math.random() * max)
}

export default function DecisionMaker() {
    const [mode, setMode] = useState<Mode>('coin')
    const [result, setResult] = useState('')

    const [diceCount, setDiceCount] = useState(2)
    const [diceSides, setDiceSides] = useState(6)
    const [options, setOptions] = useState('')

    const flipCoin = () => setResult(Math.random() < 0.5 ? 'Heads' : 'Tails')

    const rollDice = () => {
        const n = Math.min(Math.max(diceCount, 1), 100)
        const sides = Math.min(Math.max(diceSides, 2), 1000)
        const rolls = Array.from({ length: n }, () => randomInt(sides) + 1)
        const total = rolls.reduce((a, b) => a + b, 0)
        setResult(`${rolls.join(' + ')} = ${total}`)
    }

    const ask8Ball = () => setResult(EIGHT_BALL[randomInt(EIGHT_BALL.length)])

    const pick = () => {
        const list = options
            .split('\n')
            .map((o) => o.trim())
            .filter(Boolean)
        if (list.length === 0) {
            setResult('Add some options first.')
            return
        }
        setResult(list[randomInt(list.length)])
    }

    const switchMode = (next: Mode) => {
        setMode(next)
        setResult('')
    }

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-2">
                {MODES.map((m) => (
                    <Button
                        key={m.key}
                        variant={mode === m.key ? 'default' : 'outline'}
                        onClick={() => switchMode(m.key)}
                    >
                        {m.label}
                    </Button>
                ))}
            </div>

            <Card>
                <CardContent className="space-y-4 pt-6">
                    {mode === 'coin' && (
                        <Button onClick={flipCoin}>Flip the coin</Button>
                    )}

                    {mode === 'dice' && (
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label
                                    htmlFor="dice-count"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    How many dice
                                </label>
                                <NumberInput
                                    id="dice-count"
                                    min={1}
                                    max={100}
                                    value={diceCount}
                                    onValueChange={setDiceCount}
                                    aria-label="How many dice"
                                    className="w-24"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="dice-sides"
                                    className="mb-1.5 block text-sm font-medium"
                                >
                                    Sides
                                </label>
                                <NumberInput
                                    id="dice-sides"
                                    min={2}
                                    max={1000}
                                    value={diceSides}
                                    onValueChange={setDiceSides}
                                    aria-label="Sides"
                                    className="w-24"
                                />
                            </div>
                            <Button onClick={rollDice}>Roll</Button>
                        </div>
                    )}

                    {mode === '8ball' && (
                        <Button onClick={ask8Ball}>Ask the 8-ball</Button>
                    )}

                    {mode === 'picker' && (
                        <div className="space-y-3">
                            <Textarea
                                value={options}
                                onChange={(e) => setOptions(e.target.value)}
                                placeholder={'One option per line…'}
                                className="min-h-[120px] text-sm"
                                aria-label="Options"
                            />
                            <Button onClick={pick}>Pick one</Button>
                        </div>
                    )}

                    <div
                        className="bg-secondary/20 flex min-h-[64px] items-center justify-center rounded-md p-4 text-center text-xl font-semibold"
                        role="status"
                        aria-live="polite"
                        data-testid="decision-result"
                    >
                        {result || (
                            <span className="text-muted-foreground text-sm font-normal">
                                Make a choice above…
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
