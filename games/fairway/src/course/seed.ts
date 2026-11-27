// Seeds for daily, archive and random holes.

const DAY_MS = 86_400_000

/** The day of hole #1, as a UTC date. */
export const LAUNCH_DATE = '2026-11-27'

const DATE_SEED = /^(\d{4})-(\d{2})-(\d{2})$/

function utcDay(date: Date): number {
    return Math.floor(date.getTime() / DAY_MS)
}

/** The seed of the daily hole: the UTC date as `YYYY-MM-DD`. */
export function dailySeed(date: Date): string {
    const y = date.getUTCFullYear()
    const m = date.getUTCMonth() + 1
    const d = date.getUTCDate()
    return `${String(y).padStart(4, '0')}-${m < 10 ? '0' : ''}${m}-${d < 10 ? '0' : ''}${d}`
}

/**
 * Parses a `YYYY-MM-DD` seed into a UTC date. Returns null when the seed is
 * not a real calendar date.
 */
export function parseDateSeed(seed: string): Date | null {
    const match = DATE_SEED.exec(seed)
    if (!match) {
        return null
    }
    const y = Number(match[1])
    const m = Number(match[2])
    const d = Number(match[3])
    const date = new Date(Date.UTC(y, m - 1, d))
    if (
        date.getUTCFullYear() !== y ||
        date.getUTCMonth() !== m - 1 ||
        date.getUTCDate() !== d
    ) {
        return null
    }
    return date
}

/**
 * Display number of the daily hole. Launch day is #1. Dates before the
 * launch give 0 or less.
 */
export function holeNumberFor(date: Date): number {
    const launch = parseDateSeed(LAUNCH_DATE) as Date
    return utcDay(date) - utcDay(launch) + 1
}

// No vowels and no look-alike characters: seeds are typed and shared.
const SEED_ALPHABET = 'bcdfghjkmnpqrstvwxz23456789'

/**
 * Turns entropy into a short shareable seed. The entropy is an argument so
 * that this module stays deterministic. In the browser:
 *
 *     randomSeed(crypto.getRandomValues(new Uint32Array(2)))
 */
export function randomSeed(entropy: ArrayLike<number> | number): string {
    const values = typeof entropy === 'number' ? [entropy] : entropy
    // Mix all values into two 32-bit words (FNV-1a style).
    let a = 2166136261
    let b = 40503
    for (let i = 0; i < values.length; i++) {
        // Use the integer part and the fraction, so Math.random-style
        // floats and crypto integers both work.
        const whole = Math.floor(values[i])
        const v = (whole ^ Math.floor((values[i] - whole) * 4294967296)) | 0
        a = Math.imul(a ^ v, 16777619)
        b = Math.imul(b ^ (v >>> 16) ^ a, 2246822519)
        a ^= b >>> 13
    }
    let out = ''
    let x = a >>> 0
    const y = b >>> 0
    for (let i = 0; i < 8; i++) {
        if (i === 4) {
            x = y
        }
        out += SEED_ALPHABET[x % SEED_ALPHABET.length]
        x = Math.floor(x / SEED_ALPHABET.length)
    }
    return out
}
