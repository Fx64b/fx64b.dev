/*
 * Save format versions. Every save carries `v`. When the format changes,
 * raise SAVE_VERSION and add a step to MIGRATIONS that turns a save of the
 * previous version into the new one, so players keep their kingdoms.
 * This module has no imports, so it can be tested on its own.
 */

export type Save = Record<string, any> & { v: number }

export const SAVE_VERSION = 6
/** Oldest version that can still be migrated. Older saves used a smaller map. */
export const OLDEST_SUPPORTED = 6

/** MIGRATIONS[n] turns a save of version n into version n + 1. */
export const MIGRATIONS: Record<number, (o: Save) => Save> = {}

/** The save brought up to SAVE_VERSION, or null if it cannot be used. */
export function migrateSave(
    o: unknown,
    steps: Record<number, (o: Save) => Save> = MIGRATIONS,
    target = SAVE_VERSION
): Save | null {
    if (!o || typeof o !== 'object') {
        return null
    }
    let s = o as Save
    if (typeof s.v !== 'number' || s.v < OLDEST_SUPPORTED || s.v > target) {
        return null
    }
    while (s.v < target) {
        const step = steps[s.v]
        if (!step) {
            return null
        }
        s = { ...step(s), v: s.v + 1 }
    }
    return s
}
