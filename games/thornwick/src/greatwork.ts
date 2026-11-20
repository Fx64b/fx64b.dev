/*
 * The great work: a cathedral raised in four stages after the Great keep.
 * Each stage is paid for and started from its panel and takes some minutes.
 * Starting a stage alarms the lords. From the roof on, it serves every home
 * as a chapel. When the spires are done, the realm is won.
 */
import { DEF } from './config'
import { afford, pay, puff, toast } from './helpers'
import { GV } from './vars'

export const STAGES = [
    {
        name: 'Walls',
        cost: { wood: 250, stone: 450, gold: 150 },
        time: 90,
        done: 'The walls of the cathedral stand.',
    },
    {
        name: 'Nave roof',
        cost: { wood: 350, stone: 400, gold: 250, tools: 15 },
        time: 120,
        done: 'The nave is roofed. The cathedral now serves every home as a chapel.',
    },
    {
        name: 'Towers',
        cost: { stone: 600, gold: 350, cloth: 20 },
        time: 150,
        done: 'The towers of the cathedral rise over the land.',
    },
    {
        name: 'Spires and bells',
        cost: { stone: 400, gold: 600, tools: 20, cloth: 20 },
        time: 180,
        done: 'The bells ring out from the spires. The great work is done.',
    },
]

export const cathedral = () =>
    GV.S.b.find((b) => b.o === 0 && b.t === 'cathedral' && !b.dead) || null
/** Stages done so far (0 to 4) of your cathedral, or -1 when there is none. */
export const gwStage = () => {
    const c = cathedral()
    return c ? c.stage || 0 : -1
}
/** From the roof on, the cathedral serves every home as a chapel. */
export const gwChapel = () => gwStage() >= 2

const pct = (f: number) => Math.round(f * 100) + '%'

export function gwTick(dt: number) {
    const c = cathedral()
    if (!c || !c.work) {
        return
    }
    c.prog = (c.prog || 0) + dt
    const S = STAGES[c.stage || 0]
    if (c.prog < S.time) {
        return
    }
    c.stage = (c.stage || 0) + 1
    c.work = false
    c.prog = 0
    c.drop = 1
    puff(c.cx, c.cy, 18, '#e0b23a')
    toast(S.done)
    GV.chron?.(
        'The ' + S.name.toLowerCase() + ' of the cathedral were finished.'
    )
    if (c.stage >= STAGES.length) {
        GV.endScreen?.('wonder')
    }
}

function startStage(c: any) {
    const k = c.stage || 0,
        S = STAGES[k]
    if (!S || c.work) {
        return
    }
    if (!afford(S.cost)) {
        toast('Not enough stores for the ' + S.name.toLowerCase() + '.')
        return
    }
    pay(S.cost)
    c.work = true
    c.prog = 0
    // A rising cathedral makes the lords uneasy: they march sooner.
    for (const rv of GV.S.riv) {
        if (!rv.dead && rv.awake && !rv.out) {
            rv.atkIn *= 0.75
        }
    }
    toast(
        'Work begins on the ' +
            S.name.toLowerCase() +
            ' of the cathedral. The rival lords hear of it and grow uneasy.'
    )
}

/* The part of the inspect panel that belongs to the cathedral. */
export function gwInspect(b: any, costHTML: (c: any) => string) {
    if (b.t !== 'cathedral' || b.o !== 0) {
        return ''
    }
    const k = b.stage || 0
    let h =
        '<h3 class="sub">The great work: stage ' +
        Math.min(k + 1, STAGES.length) +
        ' of ' +
        STAGES.length +
        '</h3><ol class="gw">' +
        STAGES.map(
            (S, i) =>
                '<li class="' +
                (i < k ? 'done' : i === k ? 'now' : '') +
                '">' +
                (i < k ? '✓ ' : '') +
                S.name +
                '</li>'
        ).join('') +
        '</ol>'
    if (k >= STAGES.length) {
        return h + '<p class="note">The great work is done.</p>'
    }
    const S = STAGES[k]
    if (b.work) {
        const f = (b.prog || 0) / S.time
        h +=
            '<p>Building the ' +
            S.name.toLowerCase() +
            ': ' +
            pct(f) +
            ', about ' +
            Math.ceil((S.time - (b.prog || 0)) / 60) +
            ' min left.</p><div class="hp prog"><i style="width:' +
            pct(f) +
            '"></i></div>'
    } else {
        h +=
            '<div class="row"><button class="btn primary" data-act="gw"' +
            (afford(S.cost) ? '' : ' disabled') +
            '>Build the ' +
            S.name.toLowerCase() +
            '</button><span class="costs">' +
            costHTML(S.cost) +
            '</span></div><p class="note">Takes ' +
            Math.round((S.time / 60) * 10) / 10 +
            ' minutes. The rival lords will march sooner.</p>'
    }
    h +=
        '<p class="note">' +
        (k >= 2
            ? 'It serves every home as a chapel.'
            : 'Once the nave is roofed, it serves every home as a chapel.') +
        ' Finish all four stages and the realm is yours. If raiders bring it down, the work is lost.</p>'
    return h
}
export function gwAct(act: string, b: any) {
    if (act !== 'gw' || !b || b.t !== 'cathedral') {
        return false
    }
    startStage(b)
    return true
}
/* Only one cathedral can rise in a realm. */
export function gwPlaceErr(t: string) {
    if (
        DEF[t] &&
        DEF[t].unique &&
        GV.S.b.some((b) => b.o === 0 && b.t === t && !b.dead)
    ) {
        return 'Only one ' + DEF[t].name.toLowerCase() + ' can rise in a realm.'
    }
    return null
}
