import { DEF, DF, HOME, KX, KY, N, NN, WALLISH } from './config'
import { buildVeil } from './ground'
import { compass, toast } from './helpers'
import { spawnVillager } from './people'
import { bailey, bmap, rebuildSites, regAt, rivById } from './state'
import { GV } from './vars'

export function refreshOwn(quiet?) {
    GV.ownDirty = false
    for (const rg of GV.regs) {
        rg.owner = -1
    }
    for (const rv of GV.S.riv) {
        if (!rv.dead) {
            GV.regs[rv.r].owner = rv.id
        }
    }
    GV.regs[HOME].owner = 0
    for (const k in GV.S.conq) {
        if (GV.regs[+k].owner === -1) {
            GV.regs[+k].owner = 0
        }
    }
    for (const b of GV.S.b) {
        if (b.t === 'outpost' && b.o === 0) {
            const rg = regAt(b.x, b.y)
            if (rg.owner === -1) {
                rg.owner = 0
            }
        }
    }
    for (const k in GV.S.rconq) {
        const rv = rivById(GV.S.rconq[k])
        if (rv && !rv.dead && GV.regs[+k] && GV.regs[+k].owner === -1) {
            GV.regs[+k].owner = rv.id
        }
    }
    for (const b of GV.S.b) {
        if (b.t === 'outpost' && b.o > 0 && b.o < 9) {
            const rv = rivById(b.o),
                rg = regAt(b.x, b.y)
            if (rv && !rv.dead && rg.owner === -1) {
                rg.owner = b.o
            }
        }
    }
    for (const rg of GV.regs) {
        if (rg.owner === 0) {
            GV.S.disc[rg.id] = 1
            for (const a of rg.adj) {
                GV.S.disc[a] = 1
            }
        }
    }
    const notes = []
    if (GV.S.scoutNote) {
        notes.push(GV.S.scoutNote)
        GV.S.scoutNote = ''
    }
    for (const rg of GV.regs) {
        const was = rg.disc
        rg.disc = !!GV.S.disc[rg.id]
        if (rg.disc && !was && rg.poi && !quiet) {
            notes.push(
                POI[rg.poi].seen.replace('#', compass(rg.sx - KX, rg.sy - KY))
            )
        }
        if (rg.owner === 0 && rg.poi && !GV.S.loot[rg.id]) {
            GV.S.loot[rg.id] = 1
            if (rg.poi === 'ruins') {
                GV.S.res.gold += 120
            }
            if (rg.poi === 'hamlet') {
                for (let i = 0; i < 4; i++) {
                    spawnVillager(false)
                }
            }
            if (!quiet) {
                notes.push(POI[rg.poi].won)
            }
        }
    }
    GV.blessMul =
        1 +
        0.12 *
            GV.regs.reduce(
                (n?, rg?) =>
                    n + (rg.owner === 0 && rg.poi === 'stones' ? 1 : 0),
                0
            )
    for (const rv of GV.S.riv) {
        if (!rv.awake && !rv.dead && GV.regs[rv.r].disc) {
            rv.awake = true
            if (rv.id > 1) {
                rv.atkIn = 100 * DF().atk
            }
            if (!quiet) {
                notes.push(
                    rv.name +
                        ' has noticed your banners. A new rival enters the war.'
                )
            }
        }
    }
    if (notes.length) {
        toast(notes.join(' '))
    }
    rebuildSites()
    GV.pathsDirty = GV.flowDirty = true
    if (GV.vcv) {
        buildVeil()
    }
}
export const POI = {
    ruins: {
        name: 'Old ruins',
        seen: 'Crumbling ruins stand to the #. Claim the land to search them.',
        won: 'Your people search the old ruins and carry home 120 gold.',
        info: 'Claim this land to search the ruins for 120 gold.',
    },
    mine: {
        name: 'Old gold mine',
        seen: 'An old gold mine lies to the #. Claim the land to work it.',
        won: 'The old gold mine is yours. It will bring in gold steadily.',
        info: 'Claim this land and the mine brings in 4 gold every few seconds.',
    },
    stones: {
        name: 'Standing stones',
        seen: 'Your people speak of standing stones to the #, humming in the dark.',
        won: 'The standing stones are yours. Your soldiers fight harder under their watch.',
        info: 'Claim this land and your soldiers deal a little more damage, for each circle you hold.',
    },
    hamlet: {
        name: 'Abandoned hamlet',
        seen: 'An abandoned hamlet lies empty to the #.',
        won: 'Families return to the old hamlet and join Thornwick.',
        info: 'Claim this land and four settlers join you, with room for three more.',
    },
}
export const ownedCount = () =>
    GV.regs.reduce((n?, rg?) => n + (rg.owner === 0 ? 1 : 0), 0)
export function costOf(t?) {
    if (t === 'outpost') {
        return { wood: 40, stone: 20, gold: 25 * ownedCount() }
    }
    return DEF[t].cost
}
export function computeBailey() {
    bailey.fill(255)
    const dq = new Int32Array(NN * 2 + 4)
    let h = NN,
        tl = NN
    const wc = (i?) => {
        const b = bmap[i]
        return b && b.o === 0 && WALLISH[b.t] ? 1 : 0
    }
    for (let k = 0; k < N; k++) {
        for (const i of [k, k + (N - 1) * N, k * N, N - 1 + k * N]) {
            if (bailey[i] === 255) {
                bailey[i] = 0
                dq[tl++] = i
            }
        }
    }
    while (h < tl) {
        const m = dq[h++],
            x = m % N,
            y = (m / N) | 0,
            d = bailey[m]
        for (let k = 0; k < 4; k++) {
            const nx = x + +(k === 0) - +(k === 1),
                ny = y + +(k === 2) - +(k === 3)
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) {
                continue
            }
            const n = nx + ny * N,
                c = d + wc(n)
            if (c < bailey[n]) {
                bailey[n] = c
                if (c === d && h > 0) {
                    dq[--h] = n
                } else {
                    dq[tl++] = n
                }
            }
        }
    }
}
export const baileyOf = (b?) =>
    WALLISH[b.t] ? 0 : Math.min(2, bailey[b.x + b.y * N])
