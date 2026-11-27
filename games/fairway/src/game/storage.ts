// Local results and settings. Every access is guarded: storage can be full,
// blocked or missing (private mode, iframes), and the game must still work.

export interface DailyResult {
    strokes: number
    par: number
    putts: number
    penalties: number
    bunkers: number
    /** Generator version of the hole that was played. */
    version: number
}

const PREFIX = 'fairway:'
const RESULTS_KEY = `${PREFIX}daily-results`
const HINT_KEY = `${PREFIX}hint-dismissed`

export interface KeyValueStore {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
}

function defaultStore(): KeyValueStore | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage
    } catch {
        return null
    }
}

export function createStorage(store: KeyValueStore | null = defaultStore()) {
    function read<T>(key: string, fallback: T): T {
        try {
            const raw = store?.getItem(key)
            return raw ? (JSON.parse(raw) as T) : fallback
        } catch {
            return fallback
        }
    }

    function write(key: string, value: unknown): void {
        try {
            store?.setItem(key, JSON.stringify(value))
        } catch {
            // Ignore: the result is only lost for the next visit.
        }
    }

    return {
        /** All official daily results, by date (YYYY-MM-DD). */
        results(): Record<string, DailyResult> {
            return read<Record<string, DailyResult>>(RESULTS_KEY, {})
        },
        result(date: string): DailyResult | null {
            return this.results()[date] ?? null
        },
        /**
         * Save the official result of a daily hole. The first full play is
         * official, so an existing result is never replaced.
         */
        saveResult(date: string, r: DailyResult): boolean {
            const all = this.results()
            if (all[date]) {
                return false
            }
            all[date] = r
            write(RESULTS_KEY, all)
            return true
        },
        hintDismissed(): boolean {
            return read<boolean>(HINT_KEY, false)
        },
        dismissHint(): void {
            write(HINT_KEY, true)
        },
    }
}

export type Storage = ReturnType<typeof createStorage>
