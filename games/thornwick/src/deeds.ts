/*
 * Deeds: a chain of goals that leads from the first fields to the crown.
 * They fill the gap between "survive the next attack" and "take every keep",
 * and they point at the trades the Great keep needs (tools, cloth, 40 people).
 * Any deed counts as soon as it is done, in any order. The tracker shows the
 * first one still open; the Realm sheet lists them all.
 */
import { $, ICON } from './config'
import { amountText } from './goods'
import { pop, puff, toast } from './helpers'
import { GV } from './vars'

type Deed = {
    id: string
    name: string
    text: string
    reward: Record<string, number>
    // [what you have, what the deed needs]
    prog: () => [number, number]
}

const own = (t: string) =>
    GV.S.b.reduce((n, b) => n + (b.o === 0 && b.t === t && !b.dead ? 1 : 0), 0)
const has = (t: string) => (own(t) > 0 ? 1 : 0)
const store = (r: string) => Math.floor(GV.S.res[r] || 0)
const lands = () => GV.regs.reduce((n, rg) => n + (rg.owner === 0 ? 1 : 0), 0)
const studied = () => Object.keys(GV.S.tech || {}).length

export const DEEDS: Deed[] = [
    {
        id: 'fields',
        name: 'First fields',
        text: 'Build a farm and a lumber camp.',
        reward: { wood: 40 },
        prog: () => [has('farm') + has('lumber'), 2],
    },
    {
        id: 'homes',
        name: 'A growing village',
        text: 'Have 16 people in Thornwick.',
        reward: { food: 50 },
        prog: () => [pop(), 16],
    },
    {
        id: 'hold',
        name: 'Hold the keep',
        text: 'Beat back an attack.',
        reward: { gold: 40 },
        prog: () => [GV.S.wave, 1],
    },
    {
        id: 'stone',
        name: 'Walls of stone',
        text: 'Rebuild the keep in stone.',
        reward: { stone: 80 },
        prog: () => [GV.keep.lvl >= 2 ? 1 : 0, 1],
    },
    {
        id: 'border',
        name: 'Beyond the border',
        text: 'Hold 3 lands. Raise outposts on the dim land past your border.',
        reward: { gold: 60 },
        prog: () => [lands(), 3],
    },
    {
        id: 'iron',
        name: 'Iron and hammer',
        text: 'Have 10 tools in store. An iron mine digs ore and a blacksmith forges it.',
        reward: { gold: 60 },
        prog: () => [store('tools'), 10],
    },
    {
        id: 'ale',
        name: 'Ale and prayer',
        text: 'Build a tavern and a chapel.',
        reward: { gold: 60 },
        prog: () => [has('tavern') + has('chapel'), 2],
    },
    {
        id: 'loom',
        name: 'Wool and loom',
        text: 'Have 15 cloth in store. A sheep farm shears wool and a weaver makes cloth.',
        reward: { gold: 80 },
        prog: () => [store('cloth'), 15],
    },
    {
        id: 'learn',
        name: 'Learned men',
        text: 'Finish 2 studies at a scriptorium.',
        reward: { gold: 80 },
        prog: () => [studied(), 2],
    },
    {
        id: 'town',
        name: 'A town',
        text: 'Have 40 people in Thornwick. The Great keep needs them.',
        reward: { wood: 120, stone: 120 },
        prog: () => [pop(), 40],
    },
    {
        id: 'great',
        name: 'The Great keep',
        text: 'Rebuild the keep as a Great keep.',
        reward: { gold: 150, weapons: 20 },
        prog: () => [GV.keep.lvl >= 3 ? 1 : 0, 1],
    },
    {
        id: 'six',
        name: 'Unbroken',
        text: 'Beat back 6 attacks.',
        reward: { gold: 150 },
        prog: () => [GV.S.wave, 6],
    },
    {
        id: 'siege',
        name: 'Lay low a lord',
        text: 'Take the keep of a rival lord.',
        reward: { gold: 200 },
        prog: () => [GV.S.taken || 0, 1],
    },
    {
        id: 'crown',
        name: 'The crown',
        text: 'Take every rival keep once the realm has reached its full size.',
        reward: {},
        prog: () => [GV.S.won ? 1 : 0, 1],
    },
]

const rewardText = (r: Record<string, number>) =>
    Object.entries(r)
        .map(([k, n]) => amountText(k, n))
        .join(' and ')
const rewardHTML = (r: Record<string, number>) =>
    Object.entries(r)
        .map(
            ([k, n]) =>
                '<span class="c" title="' +
                k +
                '">' +
                (ICON[k] || '') +
                n +
                '</span>'
        )
        .join('')

export const deedsDone = () => {
    GV.S.deeds = GV.S.deeds || {}
    return GV.S.deeds
}
export const nextDeed = () => DEEDS.find((d) => !deedsDone()[d.id]) || null

/* Called with the HUD. Pays out every deed that is now done. */
export function checkDeeds() {
    if (!GV.S || !GV.keep || GV.S.over) {
        return
    }
    const done = deedsDone()
    for (const d of DEEDS) {
        if (done[d.id]) {
            continue
        }
        const [a, b] = d.prog()
        if (a < b) {
            continue
        }
        done[d.id] = 1
        for (const [r, n] of Object.entries(d.reward)) {
            GV.S.res[r] = (GV.S.res[r] || 0) + n
        }
        puff(GV.keep.cx, GV.keep.cy, 10, '#e0b23a')
        GV.deedFlash = 2
        const rw = rewardText(d.reward)
        toast(
            'Deed done: ' +
                d.name +
                '. Your renown grows' +
                (rw ? ', and the realm sends ' + rw : '') +
                '.'
        )
    }
}

/* The tracker: the next open deed and how far along it is. */
export function deedHud() {
    const el = $('#deed')
    if (!el || !GV.S) {
        return
    }
    const d = nextDeed()
    if (!d) {
        el.hidden = true
        return
    }
    const [a, b] = d.prog(),
        f = Math.max(0, Math.min(1, a / b)),
        n = DEEDS.filter((x) => deedsDone()[x.id]).length,
        key = d.id + ':' + Math.min(a, b) + '/' + b
    if (el._k !== key) {
        el._k = key
        el.querySelector('.dn').textContent = d.name
        el.querySelector('.dp').textContent =
            b > 1 ? Math.min(a, b) + '/' + b : ''
        el.querySelector('.dt').textContent = d.text
        ;(el.querySelector('.bar i') as HTMLElement).style.width =
            Math.round(f * 100) + '%'
        el.setAttribute(
            'aria-label',
            'Deed ' +
                (n + 1) +
                ' of ' +
                DEEDS.length +
                ': ' +
                d.name +
                '. ' +
                d.text
        )
    }
    el.hidden = false
    if (GV.deedFlash > 0) {
        GV.deedFlash -= 0.25
        el.classList.add('flash')
    } else {
        el.classList.remove('flash')
    }
}

/* The Deeds page of the Realm sheet. */
export function deedsHTML() {
    const done = deedsDone(),
        n = DEEDS.filter((d) => done[d.id]).length,
        next = nextDeed()
    return (
        '<p class="facts">' +
        n +
        ' of ' +
        DEEDS.length +
        ' deeds done. Each one brings a gift from the realm.</p><ol class="deeds">' +
        DEEDS.map((d) => {
            const ok = !!done[d.id],
                [a, b] = d.prog(),
                f = ok ? 1 : Math.max(0, Math.min(1, a / b)),
                cls = ok ? 'done' : d === next ? 'now' : ''
            return (
                '<li class="' +
                cls +
                '"><div class="nh"><b>' +
                (ok ? '✓ ' : '') +
                d.name +
                '</b><span class="costs">' +
                rewardHTML(d.reward) +
                '</span></div><p class="note">' +
                d.text +
                (!ok && b > 1 ? ' (' + Math.min(a, b) + '/' + b + ')' : '') +
                '</p>' +
                (ok
                    ? ''
                    : '<div class="hp prog"><i style="width:' +
                      Math.round(f * 100) +
                      '%"></i></div>') +
                '</li>'
            )
        }).join('') +
        '</ol>'
    )
}
