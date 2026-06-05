'use client'

import { useMemo, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const FLAGS = [
    { flag: 'g', label: 'global (g)' },
    { flag: 'i', label: 'ignore case (i)' },
    { flag: 'm', label: 'multiline (m)' },
    { flag: 's', label: 'dotall (s)' },
    { flag: 'u', label: 'unicode (u)' },
]

interface MatchInfo {
    match: string
    index: number
    groups: string[]
}

export default function RegexTester() {
    const [pattern, setPattern] = useState('')
    const [flags, setFlags] = useState<string[]>(['g'])
    const [testString, setTestString] = useState('')

    const toggleFlag = (flag: string) => {
        setFlags((prev) =>
            prev.includes(flag)
                ? prev.filter((f) => f !== flag)
                : [...prev, flag]
        )
    }

    const { matches, error } = useMemo(() => {
        if (!pattern) return { matches: [] as MatchInfo[], error: '' }
        // Always include 'g' internally so we can enumerate every match.
        const effectiveFlags = flags.includes('g')
            ? flags.join('')
            : [...flags, 'g'].join('')
        let regex: RegExp
        try {
            regex = new RegExp(pattern, effectiveFlags)
        } catch (e) {
            return {
                matches: [] as MatchInfo[],
                error: e instanceof Error ? e.message : 'Invalid regex',
            }
        }

        const result: MatchInfo[] = []
        let m: RegExpExecArray | null
        let guard = 0
        while ((m = regex.exec(testString)) !== null && guard < 10000) {
            result.push({
                match: m[0],
                index: m.index,
                groups: m.slice(1).map((g) => g ?? ''),
            })
            if (m[0] === '') regex.lastIndex++
            guard++
        }
        return { matches: result, error: '' }
    }, [pattern, flags, testString])

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div>
                        <label
                            htmlFor="regex-pattern"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Pattern
                        </label>
                        <Input
                            id="regex-pattern"
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            placeholder="\d{3}-\d{4}"
                            className="font-mono"
                            aria-label="Regex pattern"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {FLAGS.map(({ flag, label }) => (
                            <label
                                key={flag}
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={flags.includes(flag)}
                                    onChange={() => toggleFlag(flag)}
                                    aria-label={label}
                                />
                                {label}
                            </label>
                        ))}
                    </div>

                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <label
                        htmlFor="regex-test"
                        className="mb-1.5 block text-sm font-medium"
                    >
                        Test string
                    </label>
                    <Textarea
                        id="regex-test"
                        value={testString}
                        onChange={(e) => setTestString(e.target.value)}
                        placeholder="Text to search…"
                        className="min-h-[120px] font-mono text-sm"
                        aria-label="Test string"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <p className="mb-3 text-sm font-medium" role="status">
                        {pattern && !error
                            ? `${matches.length} ${
                                  matches.length === 1 ? 'match' : 'matches'
                              }`
                            : 'Matches'}
                    </p>
                    {matches.length > 0 ? (
                        <ul className="space-y-2">
                            {matches.map((m, i) => (
                                <li
                                    key={`${m.index}-${i}`}
                                    className="bg-secondary/20 rounded-md p-2 font-mono text-sm"
                                >
                                    <span className="text-foreground">
                                        {m.match || '(empty match)'}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {' '}
                                        @ index {m.index}
                                    </span>
                                    {m.groups.length > 0 && (
                                        <span className="text-muted-foreground block text-xs">
                                            groups: {m.groups.join(', ')}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            No matches yet.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
