// Display formatting for the UI. The game passes SI units (metres, m/s);
// everything shown to the player is converted here: yards and km/h.
import { dailySeed, parseDateSeed } from '../course/seed'
import { mToYd, msToKmh } from '../physics/units'
import type { SurfaceId } from '../shared/hole'

/** Yards as a number string: whole yards, one decimal below 10 yd. */
export function formatYardsValue(m: number): string {
    if (!Number.isFinite(m)) {
        return '-'
    }
    const yd = mToYd(Math.max(0, m))
    if (yd < 9.95) {
        return yd.toFixed(1)
    }
    return String(Math.round(yd))
}

/** "152 yd", "3.4 yd". */
export function formatYards(m: number): string {
    return `${formatYardsValue(m)} yd`
}

/** Whole km/h as a number string. */
export function formatKmhValue(ms: number): string {
    if (!Number.isFinite(ms)) {
        return '-'
    }
    return String(Math.round(msToKmh(Math.max(0, ms))))
}

const LIE_NAMES: Record<SurfaceId, string> = {
    tee: 'Tee',
    fairway: 'Fairway',
    firstCut: 'First cut',
    rough: 'Rough',
    bunker: 'Bunker',
    green: 'Green',
    water: 'Water',
    ob: 'Out of bounds',
}

export function lieName(lie: SurfaceId): string {
    return LIE_NAMES[lie] ?? lie
}

/** Golf name for a score on one hole. */
export function scoreName(strokes: number, par: number): string {
    if (strokes === 1) {
        return 'Hole in one'
    }
    const diff = strokes - par
    switch (diff) {
        case -3:
            return 'Albatross'
        case -2:
            return 'Eagle'
        case -1:
            return 'Birdie'
        case 0:
            return 'Par'
        case 1:
            return 'Bogey'
        case 2:
            return 'Double bogey'
        case 3:
            return 'Triple bogey'
    }
    if (diff < -3) {
        return 'Condor'
    }
    return `${diff} over par`
}

/** Score relative to par: "E", "+2", "-1". Uses a typographic minus unless
 *  `ascii` is set. */
export function formatToPar(diff: number, ascii = false): string {
    if (diff === 0) {
        return 'E'
    }
    if (diff > 0) {
        return `+${diff}`
    }
    return `${ascii ? '-' : '−'}${-diff}`
}

export function plural(n: number, one: string, many = `${one}s`): string {
    return `${n} ${n === 1 ? one : many}`
}

interface ShareData {
    /** Daily hole number; 0 or less for a random or custom seed. */
    number: number
    seed: string
    strokes: number
    par: number
    putts: number
    penalties: number
    bunkers: number
    /** Optional link appended as a last line. */
    url?: string
}

/** The share text:
 *  "Fairway #12 - 4 (par 4)"
 *  "Par - 2 putts, no penalties" */
export function shareText(d: ShareData): string {
    const head =
        d.number > 0
            ? `Fairway #${d.number} - ${d.strokes} (par ${d.par})`
            : `Fairway seed "${d.seed}" - ${d.strokes} (par ${d.par})`
    const parts = [plural(d.putts, 'putt')]
    parts.push(
        d.penalties === 0
            ? 'no penalties'
            : plural(d.penalties, 'penalty', 'penalties')
    )
    if (d.bunkers > 0) {
        parts.push(plural(d.bunkers, 'bunker'))
    }
    const lines = [head, `${scoreName(d.strokes, d.par)} - ${parts.join(', ')}`]
    if (d.url) {
        lines.push(d.url)
    }
    return lines.join('\n')
}

// --- Dates (UTC, YYYY-MM-DD) -------------------------------------------------

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
]
const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
]
const MONTHS_LONG = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]

/** Today's date in UTC, as a date seed (YYYY-MM-DD). */
export function todayUtc(now: Date = new Date()): string {
    return dailySeed(now)
}

/** "Fri 27 Nov" (short) or "Friday, 27 November 2026" (long). */
export function formatDate(
    iso: string,
    style: 'short' | 'long' = 'short'
): string {
    const d = parseDateSeed(iso)
    if (!d) {
        throw new Error(`Not a date: ${iso}`)
    }
    const day = d.getUTCDate()
    const wd = d.getUTCDay()
    const mo = d.getUTCMonth()
    if (style === 'long') {
        return `${WEEKDAYS_LONG[wd]}, ${day} ${MONTHS_LONG[mo]} ${d.getUTCFullYear()}`
    }
    return `${WEEKDAYS[wd]} ${day} ${MONTHS[mo]}`
}
