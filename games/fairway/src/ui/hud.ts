// The in-round HUD (SPEC 8): hole info, distance, club, wind, power meter,
// swing pad, hint line, toasts and the skip button. Plain DOM; the game
// calls the setters, the HUD never reads game state.
import { msToKmh } from '../physics/units'
import type { SurfaceId } from '../shared/hole'
import { CLUB_LABELS, clampClubIndex } from './clubs'
import { ICONS, h, prefersTouch, soundButton, svg } from './dom'
import { formatKmhValue, formatYardsValue, lieName } from './format'

export interface HoleInfo {
    /** Daily hole number; 0 or less for a random or custom seed. */
    number: number
    par: number
    /** Shown instead of "Hole #n" when there is no number, e.g. a seed. */
    title?: string
}

export interface ToastOptions {
    /** How long the toast stays, in ms. Default 2200. */
    duration?: number
    /** 'accent' for good news (on the green, in the hole, birdie). */
    tone?: 'neutral' | 'accent'
}

const DEFAULT_HINT =
    'Hold Space or the pad, release to hit. Esc cancels. A/D to aim.'
const DEFAULT_HINT_TOUCH =
    'Hold the pad, release to hit. Slide away to cancel. Drag to aim.'

export interface Hud {
    /** The HUD root element. */
    el: HTMLElement
    /** The swing pad. Pass it to createInput. */
    swingPad: HTMLElement
    setHoleInfo(info: HoleInfo): void
    /** Strokes taken so far, penalties included. */
    setStrokes(n: number): void
    setLie(lie: SurfaceId): void
    /** Distance to the pin in metres. */
    setDistance(m: number): void
    /** Selected club (0..7, physics CLUB_ORDER) and its nominal carry in
     *  metres. For the putter pass its nominal full roll or null. */
    setClub(index: number, nominalCarryM: number | null): void
    /** Wind speed in m/s and the direction it blows toward, relative to
     *  the aim: 0 = straight down the aim line (helping), +pi/2 = toward
     *  the player's right, pi = into the face. */
    setWind(speedMs: number, relativeAngleRad: number): void
    /** Power 0..1. `charging` defaults to power > 0. */
    setPower(p: number, charging?: boolean): void
    toast(text: string, opts?: ToastOptions): void
    /** Ball in flight: hides the club bar and pad, shows the skip button. */
    showSkip(v: boolean): void
    /** The first-time hint. `text` defaults to a keyboard or touch line. */
    showHint(v: boolean, text?: string): void
    /** Show or hide the whole HUD (fades). */
    setVisible(v: boolean): void
    /** The state of the sound toggle (the game owns the setting). */
    setSound(on: boolean): void
    onClubSelect(cb: (index: number) => void): () => void
    onSkip(cb: () => void): () => void
    /** The player closed the hint (store it so it stays closed). */
    onHintDismiss(cb: () => void): () => void
    /** The player pressed the sound toggle. */
    onSoundToggle(cb: () => void): () => void
    dispose(): void
}

const POWER_LINGER_MS = 900

function wrapPi(a: number): number {
    const t = 2 * Math.PI
    return ((((a + Math.PI) % t) + t) % t) - Math.PI
}

export function createHud(root: HTMLElement): Hud {
    // --- Build -----------------------------------------------------------

    const holeTitle = h('span', { class: 'fw-hole-title' }, 'Hole')
    const parEl = h('span', { class: 'fw-num' }, '-')
    const strokesEl = h('span', { class: 'fw-num' }, '0')
    const lieDot = h('span', { class: 'fw-lie-dot', 'data-lie': 'tee' })
    const lieText = h('span', {}, 'Tee')
    const sound = soundButton('fw-hole-sound')
    const holePanel = h(
        'section',
        { class: 'fw-panel fw-hole', 'aria-label': 'Hole' },
        holeTitle,
        h(
            'div',
            { class: 'fw-hole-meta' },
            h('span', {}, 'Par ', parEl),
            h('span', { class: 'fw-sep', 'aria-hidden': 'true' }),
            h('span', {}, 'Strokes ', strokesEl)
        ),
        h('div', { class: 'fw-lie' }, lieDot, lieText),
        sound.el
    )

    const windArrow = svg(
        '<g class="fw-wind-arrow-g"><path d="M12 19.5V6.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7.6 10.2L12 5.2l4.4 5z" fill="currentColor"/></g>',
        'fw-wind-arrow'
    )
    const windDial = h(
        'div',
        { class: 'fw-wind-dial', 'aria-hidden': 'true' },
        h('span', { class: 'fw-wind-aim' }),
        windArrow
    )
    const windValue = h('span', { class: 'fw-num' }, '0')
    const windUnit = h('span', { class: 'fw-unit' }, 'km/h')
    const windPanel = h(
        'section',
        { class: 'fw-panel fw-wind', 'aria-label': 'Wind' },
        windDial,
        h(
            'div',
            { class: 'fw-stat' },
            h('span', { class: 'fw-big' }, windValue, windUnit),
            h('span', { class: 'fw-label' }, 'Wind')
        )
    )

    const distValue = h('span', { class: 'fw-num' }, '-')
    const carryValue = h('span', { class: 'fw-num' }, '-')
    const carryUnit = h('span', { class: 'fw-unit' }, 'yd')
    const clubName = h('span', { class: 'fw-label' }, CLUB_LABELS[0].name)
    const shotPanel = h(
        'section',
        { class: 'fw-panel fw-shot', 'aria-label': 'Shot' },
        h(
            'div',
            { class: 'fw-stat' },
            h(
                'span',
                { class: 'fw-big' },
                distValue,
                h('span', { class: 'fw-unit' }, 'yd')
            ),
            h('span', { class: 'fw-label' }, 'To pin')
        ),
        h('span', { class: 'fw-vrule', 'aria-hidden': 'true' }),
        h(
            'div',
            { class: 'fw-stat' },
            h('span', { class: 'fw-big' }, carryValue, carryUnit),
            clubName
        )
    )

    const clubButtons: HTMLButtonElement[] = []
    const clubBar = h('div', {
        class: 'fw-clubs',
        role: 'toolbar',
        'aria-label': 'Club',
    })
    CLUB_LABELS.forEach((club, i) => {
        const b = h(
            'button',
            {
                type: 'button',
                class: 'fw-club',
                'data-index': i,
                'aria-pressed': 'false',
                'aria-label': club.name,
                title: `${club.name} (${i + 1})`,
            },
            h('span', { class: 'fw-club-wide' }, club.short),
            h('span', { class: 'fw-club-narrow' }, club.narrow)
        )
        clubButtons.push(b)
        clubBar.append(b)
    })

    const meterFill = h('span', { class: 'fw-meter-fill' })
    const meter = h(
        'div',
        {
            class: 'fw-meter',
            role: 'meter',
            'aria-label': 'Power',
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': 0,
        },
        h('span', { class: 'fw-meter-tick', 'aria-hidden': 'true' }),
        meterFill
    )
    const swingPad = h(
        'div',
        {
            class: 'fw-pad',
            role: 'button',
            'aria-label': 'Swing. Hold to charge, release to hit.',
        },
        h('span', { class: 'fw-pad-ring', 'aria-hidden': 'true' }),
        h('span', { class: 'fw-pad-label' }, 'Swing')
    )
    const swingGroup = h('div', { class: 'fw-swing' }, meter, swingPad)

    const hintText = h('span', { class: 'fw-hint-text' }, DEFAULT_HINT)
    const hintClose = h(
        'button',
        { type: 'button', class: 'fw-icon-btn', 'aria-label': 'Dismiss hint' },
        svg(ICONS.close)
    )
    const hint = h(
        'div',
        { class: 'fw-panel fw-hint', hidden: true },
        hintText,
        hintClose
    )

    const toastEl = h('div', {
        class: 'fw-panel fw-toast',
        role: 'status',
        'aria-live': 'polite',
    })

    const skipBtn = h(
        'button',
        { type: 'button', class: 'fw-panel fw-skip', tabindex: -1 },
        h('span', {}, 'Skip'),
        svg(ICONS.forward)
    )

    const el = h(
        'div',
        { class: 'fw-hud', 'data-mode': 'aim' },
        holePanel,
        windPanel,
        toastEl,
        hint,
        shotPanel,
        clubBar,
        swingGroup,
        skipBtn
    )
    root.append(el)

    // --- Behaviour -------------------------------------------------------

    const clubCbs = new Set<(i: number) => void>()
    const skipCbs = new Set<() => void>()
    const hintCbs = new Set<() => void>()
    const soundCbs = new Set<() => void>()

    // Keep focus where it is (Space must not click a club button later).
    function keepFocus(e: Event): void {
        e.preventDefault()
    }
    clubBar.addEventListener('pointerdown', keepFocus)
    skipBtn.addEventListener('pointerdown', keepFocus)
    sound.el.addEventListener('pointerdown', keepFocus)
    sound.el.addEventListener('click', () => {
        for (const cb of [...soundCbs]) {
            cb()
        }
    })

    clubBar.addEventListener('click', (e) => {
        const b = (e.target as Element).closest<HTMLButtonElement>('.fw-club')
        if (!b || b.disabled) {
            return
        }
        const i = Number(b.dataset.index)
        for (const cb of [...clubCbs]) {
            cb(i)
        }
    })
    skipBtn.addEventListener('click', () => {
        for (const cb of [...skipCbs]) {
            cb()
        }
    })
    hintClose.addEventListener('click', () => {
        hint.hidden = true
        for (const cb of [...hintCbs]) {
            cb()
        }
    })

    let windDeg = 0
    let lastPower = 0
    let lingerTimer: ReturnType<typeof setTimeout> | null = null
    let toastTimer: ReturnType<typeof setTimeout> | null = null
    let toastSeq = 0

    function setMeter(p: number): void {
        const v = Math.max(0, Math.min(1, p))
        meterFill.style.transform = `scaleY(${v})`
        meter.setAttribute('aria-valuenow', String(Math.round(v * 100)))
        meter.toggleAttribute('data-full', v >= 1)
    }

    function on<T>(set: Set<T>, cb: T): () => void {
        set.add(cb)
        return () => {
            set.delete(cb)
        }
    }

    const hud: Hud = {
        el,
        swingPad,
        setHoleInfo(info) {
            holeTitle.textContent =
                info.number > 0
                    ? `Hole #${info.number}`
                    : (info.title ?? 'Practice hole')
            parEl.textContent = String(info.par)
        },
        setStrokes(n) {
            strokesEl.textContent = String(n)
        },
        setLie(lie) {
            lieDot.dataset.lie = lie
            lieText.textContent = lieName(lie)
        },
        setDistance(m) {
            distValue.textContent = formatYardsValue(m)
        },
        setClub(index, nominalCarryM) {
            const i = clampClubIndex(index)
            clubButtons.forEach((b, j) => {
                b.setAttribute('aria-pressed', String(i === j))
            })
            clubName.textContent = CLUB_LABELS[i].name
            if (nominalCarryM === null || !Number.isFinite(nominalCarryM)) {
                carryValue.textContent = '-'
            } else {
                carryValue.textContent = formatYardsValue(nominalCarryM)
            }
        },
        setWind(speedMs, relativeAngleRad) {
            const calm = msToKmh(speedMs) < 0.5
            windPanel.toggleAttribute('data-calm', calm)
            windValue.textContent = calm ? 'Calm' : formatKmhValue(speedMs)
            windUnit.hidden = calm
            // Unwrap so the arrow turns the short way.
            const target = (relativeAngleRad * 180) / Math.PI
            windDeg +=
                (wrapPi(((target - windDeg) * Math.PI) / 180) * 180) / Math.PI
            windArrow.style.transform = `rotate(${windDeg.toFixed(2)}deg)`
        },
        setPower(p, charging = p > 0) {
            swingPad.toggleAttribute('data-active', charging)
            if (charging || p > 0) {
                if (lingerTimer) {
                    clearTimeout(lingerTimer)
                    lingerTimer = null
                }
                meter.removeAttribute('data-linger')
                meter.toggleAttribute('data-charging', charging)
                lastPower = p
                setMeter(p)
                return
            }
            // Back to 0: keep the last value visible for a moment.
            meter.removeAttribute('data-charging')
            if (lastPower > 0 && !lingerTimer) {
                meter.setAttribute('data-linger', '')
                lingerTimer = setTimeout(() => {
                    lingerTimer = null
                    meter.removeAttribute('data-linger')
                    setMeter(0)
                }, POWER_LINGER_MS)
            }
            lastPower = 0
        },
        toast(text, opts = {}) {
            const seq = ++toastSeq
            toastEl.textContent = text
            toastEl.dataset.tone = opts.tone ?? 'neutral'
            toastEl.removeAttribute('data-show')
            // Restart the fade-in.
            void toastEl.offsetWidth
            toastEl.setAttribute('data-show', '')
            if (toastTimer) {
                clearTimeout(toastTimer)
            }
            toastTimer = setTimeout(() => {
                if (seq === toastSeq) {
                    toastEl.removeAttribute('data-show')
                }
            }, opts.duration ?? 2200)
        },
        showSkip(v) {
            el.dataset.mode = v ? 'flight' : 'aim'
            skipBtn.tabIndex = v ? 0 : -1
        },
        showHint(v, text) {
            hintText.textContent =
                text ?? (prefersTouch() ? DEFAULT_HINT_TOUCH : DEFAULT_HINT)
            hint.hidden = !v
        },
        setVisible(v) {
            el.toggleAttribute('data-hidden', !v)
            el.toggleAttribute('inert', !v)
        },
        onClubSelect: (cb) => on(clubCbs, cb),
        onSkip: (cb) => on(skipCbs, cb),
        onHintDismiss: (cb) => on(hintCbs, cb),
        setSound: (v) => sound.set(v),
        onSoundToggle: (cb) => on(soundCbs, cb),
        dispose() {
            if (lingerTimer) {
                clearTimeout(lingerTimer)
            }
            if (toastTimer) {
                clearTimeout(toastTimer)
            }
            clubCbs.clear()
            skipCbs.clear()
            hintCbs.clear()
            soundCbs.clear()
            el.remove()
        },
    }

    hud.setClub(0, null)
    hud.setWind(0, 0)
    setMeter(0)
    return hud
}
