import { Head } from 'vite-react-ssg'

import { useEffect, useState } from 'react'

import '../globals.css'

const MISSION_START = new Date(2026, 0, 12, 7, 0, 0)
const MISSION_END = new Date(2026, 9, 30, 19, 0, 0)

const MS_SECOND = 1000
const MS_MINUTE = 60 * MS_SECOND
const MS_HOUR = 60 * MS_MINUTE
const MS_DAY = 24 * MS_HOUR
const MS_WEEK = 7 * MS_DAY

/** Adds calendar months, clamping to the last day of shorter months. */
function addMonths(date: Date, months: number): Date {
    const result = new Date(date)
    const day = result.getDate()
    result.setMonth(result.getMonth() + months)
    if (result.getDate() !== day) {
        result.setDate(0)
    }
    return result
}

function calendarMonthsBetween(from: Date, to: Date): number {
    if (to <= from) {
        return 0
    }
    let months =
        (to.getFullYear() - from.getFullYear()) * 12 +
        (to.getMonth() - from.getMonth())
    while (months > 0 && addMonths(from, months) > to) {
        months--
    }
    return months
}

interface TimeParts {
    months: number
    weeks: number
    days: number
    hours: number
    minutes: number
    seconds: number
    millis: number
}

/** Remaining time as months + weeks + days + hours + minutes + seconds + ms. */
function breakdownBetween(from: Date, to: Date): TimeParts {
    if (to <= from) {
        return {
            months: 0,
            weeks: 0,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            millis: 0,
        }
    }
    const months = calendarMonthsBetween(from, to)
    let rest = to.getTime() - addMonths(from, months).getTime()
    const weeks = Math.floor(rest / MS_WEEK)
    rest -= weeks * MS_WEEK
    const days = Math.floor(rest / MS_DAY)
    rest -= days * MS_DAY
    const hours = Math.floor(rest / MS_HOUR)
    rest -= hours * MS_HOUR
    const minutes = Math.floor(rest / MS_MINUTE)
    rest -= minutes * MS_MINUTE
    const seconds = Math.floor(rest / MS_SECOND)
    rest -= seconds * MS_SECOND
    return { months, weeks, days, hours, minutes, seconds, millis: rest }
}

/** Elapsed time expressed as independent totals per unit. */
function totalsBetween(from: Date, to: Date): TimeParts {
    const ms = Math.max(0, to.getTime() - from.getTime())
    return {
        months: calendarMonthsBetween(from, to),
        weeks: Math.floor(ms / MS_WEEK),
        days: Math.floor(ms / MS_DAY),
        hours: Math.floor(ms / MS_HOUR),
        minutes: Math.floor(ms / MS_MINUTE),
        seconds: Math.floor(ms / MS_SECOND),
        millis: ms,
    }
}

const COUNTDOWN_UNITS: { key: keyof TimeParts; label: string }[] = [
    { key: 'months', label: 'MONTHS' },
    { key: 'weeks', label: 'WEEKS' },
    { key: 'days', label: 'DAYS' },
    { key: 'hours', label: 'HOURS' },
    { key: 'minutes', label: 'MINUTES' },
    { key: 'seconds', label: 'SECONDS' },
    { key: 'millis', label: 'MILLIS' },
]

function pad(value: number, digits = 2): string {
    return String(value).padStart(digits, '0')
}

function group(value: number): string {
    return value.toLocaleString('de-CH')
}

export default function Military() {
    const [now, setNow] = useState<Date | null>(null)

    useEffect(() => {
        setNow(new Date())
        const timer = setInterval(() => setNow(new Date()), 50)
        return () => clearInterval(timer)
    }, [])

    const remaining = now ? breakdownBetween(now, MISSION_END) : null
    const elapsed = now ? totalsBetween(MISSION_START, now) : null
    const complete = now !== null && now >= MISSION_END

    const progress = now
        ? Math.min(
              100,
              Math.max(
                  0,
                  ((now.getTime() - MISSION_START.getTime()) /
                      (MISSION_END.getTime() - MISSION_START.getTime())) *
                      100
              )
          )
        : 0

    return (
        <div className="fixed inset-0 flex h-dvh w-full flex-col overflow-hidden bg-[#050705] font-mono text-[#c9f5ce] selection:bg-[#4ade80] selection:text-[#050705]">
            <Head>
                <title>T-MINUS // CLASSIFIED</title>
                <meta name="robots" content="noindex, nofollow" />
                <meta name="theme-color" content="#050705" />
            </Head>

            {/* Grid + scanline overlays */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(74,222,128,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(74,222,128,0.05)_1px,transparent_1px)] bg-[size:44px_44px]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.18)_0px,rgba(0,0,0,0.18)_1px,transparent_1px,transparent_3px)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]"
            />

            {/* Corner brackets */}
            <div
                aria-hidden
                className="pointer-events-none absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 border-[#4ade80]/60"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 border-[#4ade80]/60"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[#4ade80]/60"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute right-3 bottom-3 h-6 w-6 border-r-2 border-b-2 border-[#4ade80]/60"
            />

            <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between px-6 py-6 sm:px-10 sm:py-8">
                {/* Top bar */}
                <header className="flex items-center justify-between text-[10px] tracking-[0.25em] text-[#4ade80]/70 sm:text-xs">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ade80]" />
                        </span>
                        <span>
                            {complete ? 'SERVICE COMPLETE' : 'IN SERVICE'}
                        </span>
                    </div>
                    <div className="tabular-nums">
                        {now
                            ? now.toLocaleTimeString('de-CH', { hour12: false })
                            : '--:--:--'}
                    </div>
                </header>

                {/* Countdown */}
                <main className="flex flex-col items-center gap-4 sm:gap-6">
                    <div className="text-center">
                        <div className="text-[10px] tracking-[0.4em] text-[#4ade80]/60 sm:text-xs">
                            {complete
                                ? 'MILITARY SERVICE IS DONE'
                                : 'UNTIL MILITARY SERVICE IS DONE'}
                        </div>
                        <div className="mt-1 text-sm tracking-[0.2em] text-[#c9f5ce]/90 sm:text-base">
                            30.10.2026 - 19:00
                        </div>
                    </div>

                    <div className="grid w-full max-w-5xl grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-7">
                        {COUNTDOWN_UNITS.map(({ key, label }) => (
                            <div
                                key={key}
                                className="flex flex-col items-center rounded-sm border border-[#4ade80]/20 bg-[#0a120a]/80 px-1 py-3 shadow-[inset_0_0_20px_rgba(74,222,128,0.06)] sm:py-4"
                            >
                                <span className="text-2xl font-bold text-[#e4ffe7] tabular-nums [text-shadow:0_0_14px_rgba(74,222,128,0.45)] sm:text-4xl lg:text-5xl">
                                    {remaining
                                        ? pad(
                                              remaining[key],
                                              key === 'millis' ? 3 : 2
                                          )
                                        : '--'}
                                </span>
                                <span className="mt-1 text-[9px] tracking-[0.3em] text-[#4ade80]/70 sm:text-[10px]">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Progress */}
                    <div className="w-full max-w-5xl">
                        <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.25em] text-[#4ade80]/60 sm:text-[10px]">
                            <span>SERVICE PROGRESS</span>
                            <span className="tabular-nums">
                                {now ? `${progress.toFixed(6)}%` : '--.------%'}
                            </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full border border-[#4ade80]/20 bg-[#0a120a]">
                            <div
                                className="h-full bg-gradient-to-r from-[#166534] to-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.7)] transition-[width] duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </main>

                {/* Elapsed stats */}
                <footer className="w-full">
                    <div className="mb-2 text-center text-[9px] tracking-[0.35em] text-[#fbbf24]/70 sm:text-[10px]">
                        TIME IN SERVICE - SINCE 12.01.2026 07:00
                    </div>
                    <div className="mx-auto grid max-w-5xl grid-cols-3 gap-x-2 gap-y-2 lg:grid-cols-7">
                        {COUNTDOWN_UNITS.map(({ key, label }) => (
                            <div
                                key={key}
                                className={`text-center ${
                                    key === 'millis'
                                        ? 'col-span-3 lg:col-span-1'
                                        : ''
                                }`}
                            >
                                <div className="text-sm font-semibold text-[#fbbf24] tabular-nums sm:text-lg">
                                    {elapsed ? group(elapsed[key]) : '--'}
                                </div>
                                <div className="text-[8px] tracking-[0.25em] text-[#fbbf24]/50 sm:text-[9px]">
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>
                </footer>
            </div>
        </div>
    )
}
