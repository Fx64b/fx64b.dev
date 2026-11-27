// Generator versions.
//
// Every date maps to the generator version that was live on that day, so
// archive holes never change. To change the generator: copy the newest
// version folder, bump CURRENT_VERSION, register the new generator and add
// a schedule entry with the first date that uses it. Never edit a version
// that has been live.
import type { HoleData } from '../shared/hole'
import { dailySeed, holeNumberFor, parseDateSeed } from './seed'
import { generateHoleV1 } from './v1/generate'

export type HoleGenerator = (seed: string, number: number) => HoleData

export const GENERATORS: Readonly<Record<number, HoleGenerator>> = {
    1: generateHoleV1,
}

/** The version used for new random and custom seeds. */
export const CURRENT_VERSION = 1

export interface ScheduleEntry {
    /** First UTC date (`YYYY-MM-DD`) that uses this version. */
    from: string
    version: number
}

/** Sorted by date. The first entry also covers every earlier date. */
export const VERSION_SCHEDULE: readonly ScheduleEntry[] = [
    { from: '2026-11-27', version: 1 },
]

/** Finds the version for a date in a schedule. */
export function versionInSchedule(
    schedule: readonly ScheduleEntry[],
    date: Date | string
): number {
    // ISO dates sort as strings.
    const day = typeof date === 'string' ? date : dailySeed(date)
    let version = schedule[0].version
    for (const entry of schedule) {
        if (entry.from <= day) {
            version = entry.version
        }
    }
    return version
}

/** The generator version of the daily hole of a date. */
export function versionForDate(date: Date | string): number {
    return versionInSchedule(VERSION_SCHEDULE, date)
}

/**
 * The version a seed uses by default: date seeds use the version of their
 * day, everything else uses the current version.
 */
export function versionForSeed(seed: string): number {
    return parseDateSeed(seed) ? versionForDate(seed) : CURRENT_VERSION
}

export interface GenerateOptions {
    /** Generator version. Default: versionForSeed(seed). */
    version?: number
    /** Display number. Default: the daily number for date seeds, else 0. */
    number?: number
}

/**
 * Generates a hole. The result depends only on (seed, version).
 *
 * Random and custom seeds should store the version next to the seed, and
 * pass it back in, so that shared holes survive a generator update.
 */
export function generateHole(
    seed: string,
    opts: GenerateOptions = {}
): HoleData {
    const version = opts.version ?? versionForSeed(seed)
    const generator = GENERATORS[version]
    if (!generator) {
        throw new Error(`Fairway: unknown generator version ${version}`)
    }
    let number = opts.number
    if (number === undefined) {
        const date = parseDateSeed(seed)
        number = date ? Math.max(0, holeNumberFor(date)) : 0
    }
    return generator(seed, number)
}

/** The daily hole of a date (UTC). */
export function generateDailyHole(date: Date): HoleData {
    return generateHole(dailySeed(date), { number: holeNumberFor(date) })
}
