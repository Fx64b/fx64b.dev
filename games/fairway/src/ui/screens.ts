// Menus: title, archive and result (SPEC 9). Plain DOM over the scene. The
// screens only show data and report choices; the game owns storage and
// navigation (it calls showTitle again on onBack, and so on).
import { ICONS, h, soundButton, svg } from './dom'
import {
    formatDate,
    formatToPar,
    formatYardsValue,
    plural,
    scoreName,
    shareText,
    todayUtc,
} from './format'

export interface PlayedScore {
    strokes: number
    par: number
}

export interface TitleData {
    /** Today's date, YYYY-MM-DD (UTC). */
    date: string
    number: number
    par: number
    /** Hole length in metres. */
    lengthM: number
    /** The official result if today's hole is done, else null. */
    result?: PlayedScore | null
}

export interface ArchiveEntry {
    date: string
    number: number
    par?: number | null
    /** The official strokes, or null if not played. */
    strokes?: number | null
}

export interface ResultData {
    /** Daily hole number; 0 or less for a random or custom seed. */
    number: number
    seed: string
    par: number
    strokes: number
    putts: number
    penalties: number
    bunkers: number
    /** True for the first full play of a daily hole. */
    official: boolean
    /** Date of a daily hole, for the subtitle. */
    date?: string
    /** Appended to the share text, e.g. a link to the seed. */
    url?: string
    /** Overrides the generated share text. */
    shareText?: string
}

export type ScreenName = 'title' | 'archive' | 'result'

export interface Screens {
    el: HTMLElement
    showTitle(data: TitleData): void
    showArchive(entries: ArchiveEntry[]): void
    showResult(data: ResultData): void
    hide(): void
    /** The screen on show, or null. */
    current(): ScreenName | null
    onPlayDaily(cb: () => void): () => void
    onPlayDate(cb: (date: string) => void): () => void
    onPlayRandom(cb: () => void): () => void
    onPlaySeed(cb: (seed: string) => void): () => void
    onPlayAgain(cb: () => void): () => void
    /** Archive button on the title screen. Call showArchive in it. */
    onOpenArchive(cb: () => void): () => void
    /** Back from the archive or result (button or Escape). */
    onBack(cb: (from: ScreenName) => void): () => void
    /** The state of the sound toggle on the title screen. */
    setSound(on: boolean): void
    /** The player pressed the sound toggle. */
    onSoundToggle(cb: () => void): () => void
    dispose(): void
}

export const SEED_MAX_LENGTH = 48

type Cb<A extends unknown[] = []> = (...a: A) => void

async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // Fall through to the old way.
    }
    try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.append(ta)
        ta.select()
        const ok = document.execCommand('copy')
        ta.remove()
        return ok
    } catch {
        return false
    }
}

function scoreChip(strokes: number, par: number): HTMLElement {
    const diff = strokes - par
    return h(
        'span',
        {
            class: 'fw-chip',
            'data-score': diff < 0 ? 'under' : diff === 0 ? 'par' : 'over',
        },
        formatToPar(diff)
    )
}

export function createScreens(root: HTMLElement): Screens {
    const el = h('div', {
        class: 'fw-screens',
        'data-hidden': true,
        inert: true,
    })
    root.append(el)

    const cbs = {
        playDaily: new Set<Cb>(),
        playDate: new Set<Cb<[string]>>(),
        playRandom: new Set<Cb>(),
        playSeed: new Set<Cb<[string]>>(),
        playAgain: new Set<Cb>(),
        openArchive: new Set<Cb>(),
        sound: new Set<Cb>(),
        back: new Set<Cb<[ScreenName]>>(),
    }
    function fire<A extends unknown[]>(set: Set<Cb<A>>, ...a: A): void {
        for (const cb of [...set]) {
            cb(...a)
        }
    }
    function on<A extends unknown[]>(set: Set<Cb<A>>, cb: Cb<A>): () => void {
        set.add(cb)
        return () => {
            set.delete(cb)
        }
    }

    let current: ScreenName | null = null
    // One button for every title screen: it keeps its state.
    const sound = soundButton('fw-title-sound')
    sound.el.addEventListener('click', () => fire(cbs.sound))
    let copyTimer: ReturnType<typeof setTimeout> | null = null

    function mount(name: ScreenName, card: HTMLElement, focus?: HTMLElement) {
        current = name
        el.dataset.screen = name
        el.replaceChildren(card)
        el.removeAttribute('data-hidden')
        el.removeAttribute('inert')
        el.setAttribute('aria-hidden', 'false')
        if (focus) {
            try {
                // Focus for Enter/Space, without a ring for pointer users.
                focus.focus({
                    preventScroll: true,
                    focusVisible: false,
                } as FocusOptions)
            } catch {
                // Ignore.
            }
        }
    }

    function button(
        label: string | Node[],
        cls: string,
        onClick: () => void,
        attrs: Record<string, string> = {}
    ): HTMLButtonElement {
        const b = h('button', {
            type: 'button',
            class: `fw-btn ${cls}`,
            ...attrs,
        })
        if (typeof label === 'string') {
            b.textContent = label
        } else {
            b.append(...label)
        }
        b.addEventListener('click', onClick)
        return b
    }

    function header(title: string, from: ScreenName): HTMLElement {
        return h(
            'header',
            { class: 'fw-card-head' },
            button(
                [svg(ICONS.back), h('span', {}, 'Back')],
                'fw-btn-quiet fw-back',
                () => fire(cbs.back, from)
            ),
            h('h2', { class: 'fw-card-title' }, title),
            h('span', { class: 'fw-head-spacer', 'aria-hidden': 'true' })
        )
    }

    // --- Title -------------------------------------------------------------

    function showTitle(d: TitleData): void {
        const played = d.result ?? null
        const play = button(
            played ? 'Play again (practice)' : 'Play',
            played
                ? 'fw-btn-secondary fw-btn-block'
                : 'fw-btn-primary fw-btn-block',
            () => fire(cbs.playDaily)
        )

        const today = h(
            'section',
            { class: 'fw-today', 'aria-label': "Today's hole" },
            h(
                'div',
                { class: 'fw-today-head' },
                h('span', { class: 'fw-eyebrow' }, 'Today'),
                h('span', { class: 'fw-muted' }, formatDate(d.date))
            ),
            h(
                'div',
                { class: 'fw-today-hole' },
                h('span', { class: 'fw-today-num' }, `Hole #${d.number}`),
                h(
                    'span',
                    { class: 'fw-today-facts' },
                    h('span', {}, `Par ${d.par}`),
                    h('span', { class: 'fw-sep', 'aria-hidden': 'true' }),
                    h('span', {}, `${formatYardsValue(d.lengthM)} yd`)
                )
            ),
            played
                ? h(
                      'div',
                      { class: 'fw-today-result' },
                      h('span', { class: 'fw-muted' }, 'Your score'),
                      h(
                          'span',
                          { class: 'fw-today-score' },
                          h(
                              'strong',
                              { class: 'fw-num' },
                              String(played.strokes)
                          ),
                          ` ${scoreName(played.strokes, played.par)}`,
                          scoreChip(played.strokes, played.par)
                      )
                  )
                : null,
            play
        )

        const seedInput = h('input', {
            class: 'fw-input',
            type: 'text',
            name: 'seed',
            placeholder: 'Enter a seed',
            'aria-label': 'Seed',
            maxlength: SEED_MAX_LENGTH,
            autocomplete: 'off',
            autocapitalize: 'off',
            spellcheck: 'false',
            enterkeyhint: 'go',
        })
        const seedGo = h(
            'button',
            {
                type: 'submit',
                class: 'fw-btn fw-btn-secondary',
                disabled: true,
            },
            'Play'
        )
        seedInput.addEventListener('input', () => {
            seedGo.disabled = seedInput.value.trim() === ''
        })
        const seedForm = h(
            'form',
            { class: 'fw-seed', autocomplete: 'off' },
            seedInput,
            seedGo
        )
        seedForm.addEventListener('submit', (e) => {
            e.preventDefault()
            const seed = seedInput.value.trim().slice(0, SEED_MAX_LENGTH)
            if (seed) {
                fire(cbs.playSeed, seed)
            }
        })

        const how = h(
            'details',
            { class: 'fw-how' },
            h('summary', {}, 'How to play'),
            h(
                'ul',
                {},
                h(
                    'li',
                    {},
                    'Aim with A and D, the arrow keys, or drag the view.'
                ),
                h(
                    'li',
                    {},
                    'Pick a club with Q and E, 1 to 8, or the club bar.'
                ),
                h(
                    'li',
                    {},
                    'Hold Space or the swing pad, release to hit. Longer hold, more power.'
                ),
                h(
                    'li',
                    {},
                    'To cancel a swing, press Esc, or slide away from the pad and release.'
                ),
                h(
                    'li',
                    {},
                    'Mind the wind. One hole a day, the first round counts.'
                )
            )
        )

        const card = h(
            'div',
            { class: 'fw-card fw-title-card' },
            h(
                'div',
                { class: 'fw-brand' },
                h('h1', { class: 'fw-wordmark' }, svg(ICONS.flag), 'Fairway'),
                h('p', { class: 'fw-tagline' }, 'One golf hole a day.'),
                sound.el
            ),
            today,
            h(
                'div',
                { class: 'fw-row-2' },
                button(
                    [svg(ICONS.calendar), h('span', {}, 'Archive')],
                    'fw-btn-secondary',
                    () => fire(cbs.openArchive)
                ),
                button(
                    [svg(ICONS.shuffle), h('span', {}, 'Random hole')],
                    'fw-btn-secondary',
                    () => fire(cbs.playRandom)
                )
            ),
            seedForm,
            how
        )
        mount('title', card, play)
    }

    // --- Archive -------------------------------------------------------------

    function showArchive(entries: ArchiveEntry[]): void {
        const sorted = [...entries].sort((a, b) =>
            a.date < b.date ? 1 : a.date > b.date ? -1 : 0
        )
        const today = todayUtc()
        const list = h('ul', { class: 'fw-archive', role: 'list' })
        let playedCount = 0
        for (const e of sorted) {
            const played = e.strokes !== null && e.strokes !== undefined
            if (played) {
                playedCount++
            }
            const right = played
                ? h(
                      'span',
                      { class: 'fw-archive-score' },
                      h('strong', { class: 'fw-num' }, String(e.strokes)),
                      e.par
                          ? h('span', { class: 'fw-muted' }, ` par ${e.par}`)
                          : null,
                      e.par ? scoreChip(e.strokes as number, e.par) : null
                  )
                : h(
                      'span',
                      { class: 'fw-archive-play' },
                      'Play',
                      svg(ICONS.chevron)
                  )
            const row = h(
                'button',
                {
                    type: 'button',
                    class: 'fw-archive-row',
                    'data-played': played ? 'true' : 'false',
                    'data-date': e.date,
                    'aria-label': `Hole ${e.number}, ${formatDate(e.date, 'long')}, ${
                        played ? `${e.strokes} strokes` : 'not played'
                    }`,
                },
                h('span', { class: 'fw-archive-num fw-num' }, `#${e.number}`),
                h(
                    'span',
                    { class: 'fw-archive-date' },
                    formatDate(e.date),
                    e.date === today
                        ? h('span', { class: 'fw-tag' }, 'Today')
                        : null
                ),
                right
            )
            row.addEventListener('click', () => fire(cbs.playDate, e.date))
            list.append(h('li', {}, row))
        }
        const card = h(
            'div',
            { class: 'fw-card fw-archive-card' },
            header('Archive', 'archive'),
            h(
                'p',
                { class: 'fw-muted fw-archive-sub' },
                sorted.length
                    ? `${playedCount} of ${plural(sorted.length, 'hole')} played`
                    : 'No holes yet.'
            ),
            list
        )
        mount(
            'archive',
            card,
            list.querySelector<HTMLElement>('button') ?? undefined
        )
    }

    // --- Result --------------------------------------------------------------

    function showResult(d: ResultData): void {
        const diff = d.strokes - d.par
        const text =
            d.shareText ??
            shareText({
                number: d.number,
                seed: d.seed,
                strokes: d.strokes,
                par: d.par,
                putts: d.putts,
                penalties: d.penalties,
                bunkers: d.bunkers,
                url: d.url,
            })
        const title = d.number > 0 ? `Hole #${d.number}` : `Seed "${d.seed}"`
        const sub = [
            d.date ? formatDate(d.date) : null,
            d.official ? null : 'Practice',
        ].filter(Boolean) as string[]

        const copyLabel = h('span', {}, 'Copy')
        const copyIcon = h('span', { class: 'fw-copy-icon' }, svg(ICONS.copy))
        const copy = button(
            [copyIcon, copyLabel],
            'fw-btn-secondary fw-copy',
            () => {
                void copyText(text).then((ok) => {
                    copyLabel.textContent = ok ? 'Copied' : 'Copy failed'
                    copyIcon.replaceChildren(svg(ok ? ICONS.check : ICONS.copy))
                    copy.toggleAttribute('data-done', ok)
                    if (copyTimer) {
                        clearTimeout(copyTimer)
                    }
                    copyTimer = setTimeout(() => {
                        copyLabel.textContent = 'Copy'
                        copyIcon.replaceChildren(svg(ICONS.copy))
                        copy.removeAttribute('data-done')
                    }, 1800)
                })
            }
        )

        const stat = (label: string, value: number) =>
            h(
                'div',
                { class: 'fw-result-stat' },
                h('span', { class: 'fw-result-stat-v fw-num' }, String(value)),
                h('span', { class: 'fw-label' }, label)
            )

        const again = button('Play again (practice)', 'fw-btn-primary', () =>
            fire(cbs.playAgain)
        )
        const card = h(
            'div',
            { class: 'fw-card fw-result-card' },
            header(title, 'result'),
            sub.length
                ? h(
                      'p',
                      { class: 'fw-result-sub' },
                      ...sub.map((s, i) =>
                          i === sub.length - 1 && !d.official
                              ? h('span', { class: 'fw-tag' }, s)
                              : h('span', { class: 'fw-muted' }, s)
                      )
                  )
                : null,
            h(
                'div',
                { class: 'fw-result-main' },
                h(
                    'span',
                    { class: 'fw-result-strokes fw-num' },
                    String(d.strokes)
                ),
                h(
                    'div',
                    { class: 'fw-result-name' },
                    h(
                        'span',
                        { class: 'fw-result-score' },
                        scoreName(d.strokes, d.par)
                    ),
                    h(
                        'span',
                        { class: 'fw-muted' },
                        `${plural(d.strokes, 'stroke')}, par ${d.par} `,
                        scoreChip(d.strokes, d.par)
                    )
                )
            ),
            h(
                'div',
                { class: 'fw-result-stats', 'data-diff': String(diff) },
                stat(d.putts === 1 ? 'Putt' : 'Putts', d.putts),
                stat(d.penalties === 1 ? 'Penalty' : 'Penalties', d.penalties),
                stat(d.bunkers === 1 ? 'Bunker' : 'Bunkers', d.bunkers)
            ),
            h(
                'div',
                { class: 'fw-share' },
                h(
                    'div',
                    { class: 'fw-share-head' },
                    h('span', { class: 'fw-eyebrow' }, 'Share'),
                    copy
                ),
                h(
                    'pre',
                    { class: 'fw-share-text', 'aria-label': 'Share text' },
                    text
                )
            ),
            h(
                'div',
                { class: 'fw-row-2' },
                button('Back to title', 'fw-btn-secondary', () =>
                    fire(cbs.back, 'result')
                ),
                again
            )
        )
        mount('result', card, again)
    }

    // --- Keys ----------------------------------------------------------------

    function onKey(e: KeyboardEvent): void {
        if (
            e.key !== 'Escape' ||
            (current !== 'archive' && current !== 'result')
        ) {
            return
        }
        e.preventDefault()
        fire(cbs.back, current)
    }
    document.addEventListener('keydown', onKey)

    return {
        el,
        showTitle,
        showArchive,
        showResult,
        hide() {
            current = null
            el.setAttribute('data-hidden', '')
            el.setAttribute('inert', '')
            el.setAttribute('aria-hidden', 'true')
            const active = document.activeElement
            if (active instanceof HTMLElement && el.contains(active)) {
                active.blur()
            }
        },
        current: () => current,
        onPlayDaily: (cb) => on(cbs.playDaily, cb),
        onPlayDate: (cb) => on(cbs.playDate, cb),
        onPlayRandom: (cb) => on(cbs.playRandom, cb),
        onPlaySeed: (cb) => on(cbs.playSeed, cb),
        onPlayAgain: (cb) => on(cbs.playAgain, cb),
        onOpenArchive: (cb) => on(cbs.openArchive, cb),
        onBack: (cb) => on(cbs.back, cb),
        setSound: (v) => sound.set(v),
        onSoundToggle: (cb) => on(cbs.sound, cb),
        dispose() {
            document.removeEventListener('keydown', onKey)
            if (copyTimer) {
                clearTimeout(copyTimer)
            }
            for (const s of Object.values(cbs)) {
                s.clear()
            }
            el.remove()
        },
    }
}
