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
} as const
