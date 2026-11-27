// Tiny DOM helpers for the UI (no framework).

type Attrs = Record<string, string | number | boolean | null | undefined>
type Child = Node | string | null | undefined | false

/** Create an element. `class` and other attributes go in `attrs`; boolean
 *  true sets an empty attribute, false/null/undefined skips it. */
export function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Attrs = {},
    ...children: Child[]
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) {
        if (v === false || v === null || v === undefined) {
            continue
        }
        el.setAttribute(k, v === true ? '' : String(v))
    }
    append(el, children)
    return el
}

export function append(el: Element, children: Child[]): void {
    for (const c of children) {
        if (c === null || c === undefined || c === false) {
            continue
        }
        el.append(typeof c === 'string' ? document.createTextNode(c) : c)
    }
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Create an SVG element from markup (static icons only). */
export function svg(markup: string, cls = ''): SVGSVGElement {
    const el = document.createElementNS(SVG_NS, 'svg')
    el.setAttribute('viewBox', '0 0 24 24')
    el.setAttribute('aria-hidden', 'true')
    el.setAttribute('focusable', 'false')
    if (cls) {
        el.setAttribute('class', cls)
    }
    el.innerHTML = markup
    return el
}

export const ICONS = {
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    back: '<path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    chevron:
        '<path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 5.5v-.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    check: '<path d="M5.5 12.5l4 4 9-9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
    flag: '<path d="M7 21V3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7.8 4h9.7l-2.6 3.6 2.6 3.6H7.8z" fill="currentColor"/>',
    shuffle:
        '<path d="M4 7h3.2c1.6 0 3 .8 3.9 2.1l1.8 2.8c.9 1.3 2.3 2.1 3.9 2.1H20M4 17h3.2c1.6 0 3-.8 3.9-2.1M20 7h-3.2c-1.3 0-2.5.6-3.4 1.5M17.5 4.5L20 7l-2.5 2.5M17.5 11.5L20 14l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    calendar:
        '<rect x="4" y="5.5" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    forward:
        '<path d="M6 6.5l6 5.5-6 5.5M13 6.5l6 5.5-6 5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    soundOn:
        '<path d="M4.5 9.75h2.9l4.1-3.5v11.5l-4.1-3.5H4.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15 9.4a3.7 3.7 0 0 1 0 5.2M17.4 7a7.1 7.1 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    soundOff:
        '<path d="M4.5 9.75h2.9l4.1-3.5v11.5l-4.1-3.5H4.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M15.5 9.75l4.5 4.5M20 9.75l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
} as const

export interface SoundButton {
    el: HTMLButtonElement
    /** Show the sound as on or off. */
    set(on: boolean): void
}

/**
 * The sound toggle: a small speaker button. aria-pressed is true while the
 * sound is on. The caller listens for the click.
 */
export function soundButton(cls = ''): SoundButton {
    const el = h('button', {
        type: 'button',
        class: `fw-icon-btn fw-sound${cls ? ` ${cls}` : ''}`,
        'aria-label': 'Sound',
    })
    function set(on: boolean): void {
        el.setAttribute('aria-pressed', String(on))
        el.title = on ? 'Sound on (M)' : 'Sound off (M)'
        el.replaceChildren(svg(on ? ICONS.soundOn : ICONS.soundOff))
    }
    set(true)
    return { el, set }
}
