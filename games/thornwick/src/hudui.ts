/*
 * The frame round the map: the command dock (Build, Army, Banner), the build
 * tray, the menu, the goods drop-down and the inspect sheet on small screens.
 *
 * Two layouts share one page. "Wide" (a desktop window) keeps the build tray
 * open at the right, the small map at the bottom left and the inspect panel
 * in the middle. "Compact" (a phone or a small window) keeps the map clear:
 * the tray and the inspect panel are sheets that come up from the bottom.
 */
import { $ } from './config'
import { GV } from './vars'

const svg = (body: string) =>
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    body +
    '</svg>'

/* Line icons for the frame. Resource icons stay in config.ICON. */
export const HI = {
    build: svg(
        '<path d="M14.5 5.5l4 4"/><path d="M3 21l9.5-9.5"/><path d="M12 4.5l2-2 7.5 7.5-2 2c-1.5-1.5-3-1.5-4.5 0l-3-3c1.5-1.5 1.5-3 0-4.5z" fill="currentColor" fill-opacity=".25"/>'
    ),
    army: svg(
        '<path d="M4 4l10 10M4 4h3l10 10M14 17l3-3M17 20l3-3M18.5 18.5l2 2"/><path d="M20 4L10 14M20 4h-3L7 14M10 17l-3-3M7 20l-3-3M5.5 18.5l-2 2"/>'
    ),
    banner: svg(
        '<path d="M5 22V3"/><path d="M5 4h12l-3 4 3 4H5" fill="currentColor" fill-opacity=".25"/>'
    ),
    idle: svg(
        '<circle cx="9" cy="7" r="3"/><path d="M3 21c0-4 2.7-7 6-7s6 3 6 7"/><path d="M16 4h4l-4 5h4"/>'
    ),
    empty: svg(
        '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'
    ),
    fire: svg(
        '<path d="M12 22c4 0 7-2.6 7-6.5 0-4-3-6-4-9.5-1.5 2-2 3.5-2 5-1.5-1-2.5-3-2.5-5.5C7 8 5 11.5 5 15.5 5 19.4 8 22 12 22z" fill="currentColor" fill-opacity=".25"/>'
    ),
    atk: svg(
        '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/>'
    ),
    log: svg(
        '<path d="M8 3h11a2 2 0 012 2v1h-4"/><path d="M17 6v13a2 2 0 01-2 2H6a2 2 0 01-2-2v-1h10"/><path d="M8 3a2 2 0 00-2 2v13M10 8h4M10 12h4"/>'
    ),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    pause: svg('<path d="M9 5v14M15 5v14"/>'),
    play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    goods: svg(
        '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>'
    ),
    realm: svg(
        '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'
    ),
    help: svg(
        '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17h.01"/>'
    ),
    crown: svg(
        '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor" fill-opacity=".25"/>'
    ),
    remove: svg(
        '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'
    ),
    ring: svg('<circle cx="12" cy="12" r="8"/><path d="M10 4.2v3.2h4V4.2"/>'),
    grip: svg('<path d="M6 15l6-6 6 6"/>'),
}
document
    .querySelectorAll<HTMLElement>('[data-hi]')
    .forEach((e) => (e.innerHTML = HI[e.dataset.hi]))

/* ---------- layout ---------- */
const WIDE = '(min-width: 1000px) and (min-height: 480px)'
export const compact = () =>
    typeof matchMedia === 'function' ? !matchMedia(WIDE).matches : false

const app = $('#app'),
    pal = $('#palette'),
    buildBtn = $('#buildBtn'),
    menu = $('#menu'),
    menuBtn = $('#menuBtn'),
    goodsBtn = $('#goodsBtn')

GV.palOpen = false
export function showPal(on: boolean) {
    GV.palOpen = on
    pal.hidden = !on
    buildBtn.setAttribute('aria-expanded', String(on))
    buildBtn.setAttribute('aria-pressed', String(on))
    app.classList.toggle('pal-open', on)
    // On a phone the tray and the inspect sheet share the bottom of the screen.
    if (on && compact()) {
        GV.selected = null
    }
}
/* The tray opens by itself on a desktop, and stays shut on a phone. */
export function initFrame() {
    showPal(!compact())
}
buildBtn.addEventListener('click', () => {
    const on = !GV.palOpen
    if (on && compact()) {
        GV.armed = null
        GV.hover = null
    }
    showPal(on)
    GV.hud?.()
})
$('#palClose').addEventListener('click', () => {
    showPal(false)
    GV.hud?.()
})
$('#placingMore').addEventListener('click', () => {
    showPal(true)
    GV.hud?.()
})
/* After a building is chosen on a phone, the tray gets out of the way. */
export function afterArm() {
    if (GV.armed && compact() && GV.palOpen) {
        showPal(false)
    }
}

/* ---------- menu and goods drop-downs ---------- */
function openDrop(btn: HTMLElement, box: HTMLElement, on: boolean) {
    box.hidden = !on
    btn.setAttribute('aria-expanded', String(on))
}
export function closeDrops() {
    openDrop(menuBtn, menu, false)
    app.classList.remove('goods-open')
    goodsBtn.setAttribute('aria-expanded', 'false')
}
menuBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const on = menu.hidden
    closeDrops()
    openDrop(menuBtn, menu, on)
    if (on) {
        ;(menu.querySelector('button') as HTMLElement)?.focus()
    }
})
menu.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-proxy]')
    if (b) {
        closeDrops()
        $('#' + b.dataset.proxy).click()
    }
})
goodsBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const on = !app.classList.contains('goods-open')
    closeDrops()
    app.classList.toggle('goods-open', on)
    goodsBtn.setAttribute('aria-expanded', String(on))
})
document.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement
    if (!t.closest('#menu, #menuBtn, #goods, #goodsBtn')) {
        closeDrops()
    }
})

/* ---------- inspect sheet ---------- */
GV.inspBig = false
/* The grip on top of the inspect sheet makes it tall or short (phones only). */
export const GRIP =
    '<button class="grip" data-act="grip" aria-label="Show more or less">' +
    HI.grip +
    '</button>'
$('#inspect').addEventListener(
    'click',
    (e) => {
        const g = (e.target as HTMLElement).closest('[data-act="grip"]')
        if (g) {
            e.stopPropagation()
            GV.inspBig = !GV.inspBig
            $('#inspect').classList.toggle('big', GV.inspBig)
        }
    },
    true
)

/* ---------- keys ---------- */
window.addEventListener('keydown', (e) => {
    if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        GV.helpOpen ||
        GV.newOpen ||
        GV.overOpen ||
        GV.realmOpen ||
        /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as any)?.tagName || '')
    ) {
        return
    }
    if (
        e.key === ' ' &&
        !GV.armed &&
        !(e.target as HTMLElement).closest('button, a')
    ) {
        e.preventDefault()
        ;($('[data-speed="0"]') as HTMLElement).click()
    } else if (e.key === 'b' || e.key === 'B') {
        buildBtn.click()
    } else if (e.key === 'Escape') {
        closeDrops()
        if (compact()) {
            showPal(false)
        }
    }
})

/* Crossing between the layouts (a window resized, a phone turned). */
if (typeof matchMedia === 'function') {
    matchMedia(WIDE).addEventListener('change', () => {
        closeDrops()
        showPal(!compact())
        GV.hud?.()
    })
}
