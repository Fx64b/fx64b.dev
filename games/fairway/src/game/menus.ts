// The menu flow (SPEC 9): title, archive and result screens, the two game
// modes (a daily hole or a seed), official results and the start links.
import {
    archiveDates,
    generateHole,
    holeLength,
    holeNumberFor,
    parseDateSeed,
    randomSeed,
} from '../course'
import type { HoleData } from '../shared/hole'
import {
    type ArchiveEntry,
    type Hud,
    SEED_MAX_LENGTH,
    type Screens,
    todayUtc,
} from '../ui'
import type { RoundController } from './controller'
import type { Round } from './round'
import type { Storage } from './storage'

type Mode =
    | { kind: 'daily'; date: string; official: boolean }
    | { kind: 'seed'; seed: string }

export interface MenuDeps {
    screens: Screens
    hud: Hud
    storage: Storage
    controller: RoundController
}

export interface Menus {
    showTitle(): void
    /** Play the daily hole of a date. The first full play is official. */
    playDaily(date: string): void
    playSeed(seed: string): void
    /**
     * The start page: the title, then the round a link asks for.
     * ?date=YYYY-MM-DD plays a daily hole (not a future one), ?seed=<text>
     * plays a seed.
     */
    start(params: URLSearchParams): void
}

export function createMenus(deps: MenuDeps): Menus {
    const { screens, hud, storage, controller } = deps
    let mode: Mode | null = null

    function showTitle(): void {
        const today = todayUtc()
        const hole = generateHole(today)
        controller.showMenu(hole)
        const done = storage.result(today)
        screens.showTitle({
            date: today,
            number: hole.number,
            par: hole.par,
            lengthM: holeLength(hole),
            result: done ? { strokes: done.strokes, par: done.par } : null,
        })
    }

    function archiveEntries(): ArchiveEntry[] {
        const results = storage.results()
        return archiveDates(todayUtc()).map((date) => {
            const r = results[date]
            const d = parseDateSeed(date)
            return {
                date,
                number: d ? holeNumberFor(d) : 0,
                par: r?.par ?? null,
                strokes: r?.strokes ?? null,
            }
        })
    }

    function play(hole: HoleData): void {
        screens.hide()
        controller.startRound(hole)
        if (!storage.hintDismissed()) {
            hud.showHint(true)
        }
    }

    function playDaily(date: string): void {
        const official = storage.result(date) === null && date <= todayUtc()
        mode = { kind: 'daily', date, official }
        play(generateHole(date))
    }

    function playSeed(seed: string): void {
        mode = { kind: 'seed', seed }
        play(generateHole(seed))
    }

    /** Save an official result and show the result screen. */
    function finish(r: Round): void {
        const m = mode!
        let official = false
        if (m.kind === 'daily' && m.official && r.holed) {
            official = storage.saveResult(m.date, {
                strokes: r.stats.strokes,
                par: r.hole.par,
                putts: r.stats.putts,
                penalties: r.stats.penalties,
                bunkers: r.stats.bunkers,
                version: r.hole.version,
            })
            m.official = false
        }
        const url =
            m.kind === 'seed'
                ? `${location.origin}${location.pathname}?seed=${encodeURIComponent(m.seed)}`
                : undefined
        screens.showResult({
            number: r.hole.number,
            seed: r.hole.seed,
            par: r.hole.par,
            strokes: r.stats.strokes,
            putts: r.stats.putts,
            penalties: r.stats.penalties,
            bunkers: r.stats.bunkers,
            official,
            date: m.kind === 'daily' ? m.date : undefined,
            url,
        })
    }

    controller.onFinish(finish)
    hud.onHintDismiss(() => storage.dismissHint())
    screens.onPlayDaily(() => playDaily(todayUtc()))
    screens.onPlayDate((date) => playDaily(date))
    screens.onPlayRandom(() => {
        const entropy = new Uint32Array(2)
        crypto.getRandomValues(entropy)
        playSeed(randomSeed(entropy))
    })
    screens.onPlaySeed((seed) => {
        const s = seed.trim()
        if (s) {
            if (parseDateSeed(s)) {
                playDaily(s)
            } else {
                playSeed(s)
            }
        }
    })
    screens.onOpenArchive(() => screens.showArchive(archiveEntries()))
    screens.onBack(() => showTitle())
    screens.onPlayAgain(() => {
        if (!mode) {
            return
        }
        if (mode.kind === 'daily') {
            playDaily(mode.date)
        } else {
            playSeed(mode.seed)
        }
    })

    return {
        showTitle,
        playDaily,
        playSeed,
        start(params) {
            const date = params.get('date')
            const seed = params.get('seed')
            showTitle()
            if (date && parseDateSeed(date) && date <= todayUtc()) {
                playDaily(date)
            } else if (seed) {
                playSeed(seed.slice(0, SEED_MAX_LENGTH))
            }
        },
    }
}
