/*
 * War banners. Up to four fly at once, each with its own squad. Squads are split
 * by themselves (by the size of the fight at each banner and by distance), unless
 * the player sets a squad size. Soldiers in no squad guard home.
 */
import { KX, KY, WALLISH } from './config'
import { toast } from './helpers'
import { UNITS } from './people'
import { regAt, rivById } from './state'
import { GV } from './vars'

export const MAX_BANNERS = 4
/* Cloth colours of banners 1 to 4. */
export const BCOL = ['#2f6a86', '#c9772a', '#4f7a5e', '#8a4a9a']
export const bannerById = (id?) =>
    GV.S.banners.find((b?) => b.id === id) || null
export const bannerOf = (s?) => (s.sq ? bannerById(s.sq) : null)
/* A soldier near the banner of its own squad takes heart from it. */
export const nearOwnBanner = (s?) => {
    const b = bannerOf(s)
    return !!b && Math.hypot(b.x - s.x, b.y - s.y) < 4.5
}
const fieldUnit = (s?) =>
    !s.dead &&
    s.kind !== 'scout' &&
    s.kind !== 'captain' &&
    s.kind !== 'eng' &&
    !UNITS[s.kind].siege
const heavyUnit = (s?) => !s.dead && (s.kind === 'eng' || !!UNITS[s.kind].siege)
export function plantBanner(x?, y?, moveId?) {
    const B = GV.S.banners
    let b = moveId ? bannerById(moveId) : null
    if (!b) {
        // Planting next to a banner already there just moves that one.
        b = B.find((o?) => Math.hypot(o.x - x, o.y - y) < 3) || null
    }
    if (!b) {
        if (B.length >= MAX_BANNERS) {
            toast(
                'Four banners fly already. Remove one, or move one from the Army panel.'
            )
            return null
        }
        let id = 1
        while (B.some((o?) => o.id === id)) {
            id++
        }
        b = { id, x, y, n: null, st: 'charge', eng: 'tower' }
        B.push(b)
        B.sort((p?, q?) => p.id - q.id)
    }
    b.x = x
    b.y = y
    // A banner moved to a new place starts fresh: it is a siege only if rival
    // buildings stand there.
    b.sg = 0
    for (const s of GV.S.sold) {
        if (s.sq === b.id) {
            s.path = null
            s.tg = null
        }
    }
    GV.sqCd = 0
    return b
}
export function removeBanner(id?) {
    GV.S.banners = GV.S.banners.filter((b?) => b.id !== id)
    for (const s of GV.S.sold) {
        if (s.sq === id) {
            s.sq = 0
            s.path = null
            s.tg = null
        }
    }
    if (
        GV.selected &&
        GV.selected.kind === 'banner' &&
        GV.selected.bn.id === id
    ) {
        GV.selected = { kind: 'army' }
    }
    GV.sqCd = 0
}
export function recallAll() {
    for (const b of GV.S.banners.slice()) {
        removeBanner(b.id)
    }
}
/* What the squad at a banner faces: hostile units and rival buildings nearby. */
export function sizeUp(b?) {
    let foes = 0,
        bld = 0,
        fx = 0,
        fy = 0,
        fw = 0
    for (const e of GV.S.en) {
        if (e.dead) {
            continue
        }
        const d = Math.hypot(e.x - b.x, e.y - b.y)
        if (d < 9) {
            const w = e.max / 60
            foes += w
            fx += e.x * w
            fy += e.y * w
            fw += w
        }
    }
    let near = null,
        nd = 1e9
    for (const o of GV.S.b) {
        if (o.o === 0) {
            continue
        }
        const d = Math.hypot(o.cx - b.x, o.cy - b.y)
        if (d < 8) {
            bld += o.t === 'keep' ? 2 : WALLISH[o.t] ? 0.3 : 0.15
            if (d < nd) {
                nd = d
                near = o
            }
        }
    }
    b.siege = bld > 0
    if (b.siege) {
        b.sg = 1
    }
    b.target = near
    // The squad faces the enemy, or the castle, or away from home.
    let dx = b.x - (KX + 0.5),
        dy = b.y - (KY + 0.5)
    if (fw > 0) {
        dx = fx / fw - b.x
        dy = fy / fw - b.y
    } else if (near) {
        dx = near.cx - b.x
        dy = near.cy - b.y
    }
    const l = Math.hypot(dx, dy) || 1
    b.fx = dx / l
    b.fy = dy / l
    return 1 + foes + Math.min(6, bld)
}
/* After a siege, the squad goes for what is left within this many tiles. */
export const MOP_R = 13
/* Hostile units or rival buildings left within MOP_R of a place. */
export function foesNear(x?, y?) {
    for (const e of GV.S.en) {
        if (!e.dead && Math.hypot(e.x - x, e.y - y) < MOP_R) {
            return true
        }
    }
    for (const o of GV.S.b) {
        if (o.o !== 0 && !o.dead && Math.hypot(o.cx - x, o.cy - y) < MOP_R) {
            return true
        }
    }
    return false
}
/*
 * A siege banner whose buildings have all fallen is lowered. Its squad attacks
 * what is left nearby (troops or buildings), then goes home.
 */
function endSiege(b?) {
    const mop = foesNear(b.x, b.y)
    const sq = GV.S.sold.filter((s?) => s.sq === b.id && !s.dead)
    removeBanner(b.id)
    if (mop) {
        for (const s of sq) {
            if (s.kind !== 'eng' && s.kind !== 'scout') {
                s.mop = { x: b.x, y: b.y, t: 120 }
            }
        }
    }
    toast(
        'The siege at banner ' +
            b.id +
            ' is won and the banner comes down. ' +
            (mop
                ? 'The squad attacks what is left nearby, then goes home.'
                : 'The squad goes home.')
    )
}
/* Shares soldiers out among the banners. Run about once a second. */
export function assignSquads() {
    for (const b of GV.S.banners.slice()) {
        b.wt = sizeUp(b)
        if (b.sg && !b.siege) {
            endSiege(b)
        }
    }
    const B = GV.S.banners,
        all = GV.S.sold
    if (!B.length) {
        for (const s of all) {
            s.sq = 0
        }
        return
    }
    const ids = new Set(B.map((b?) => b.id))
    for (const s of all) {
        if (s.sq && !ids.has(s.sq)) {
            s.sq = 0
        }
    }
    const field = all.filter(fieldUnit)
    const weight = {}
    for (const b of B) {
        weight[b.id] = b.wt
    }
    const quota = {}
    let left = field.length
    for (const b of B) {
        if (b.n !== null && b.n !== undefined) {
            quota[b.id] = Math.min(b.n, left)
            left -= quota[b.id]
        }
    }
    const auto = B.filter((b?) => b.n === null || b.n === undefined)
    if (auto.length) {
        const sum = auto.reduce((a?, b?) => a + weight[b.id], 0)
        const raw = auto.map((b?) => (left * weight[b.id]) / sum)
        let given = 0
        auto.forEach((b?, i?) => {
            quota[b.id] = Math.floor(raw[i])
            given += quota[b.id]
        })
        const order = auto
            .map((b?, i?) => [raw[i] - Math.floor(raw[i]), b.id])
            .sort((p?, q?) => q[0] - p[0])
        for (let k = 0; given < left; k++) {
            quota[order[k % order.length][1]]++
            given++
        }
    }
    const mem = {}
    for (const b of B) {
        mem[b.id] = []
    }
    const free = []
    for (const s of field) {
        if (s.sq) {
            mem[s.sq].push(s)
        } else {
            free.push(s)
        }
    }
    const dist = (s?, b?) => Math.hypot(s.x - b.x, s.y - b.y)
    for (const b of B) {
        const m = mem[b.id]
        if (m.length > quota[b.id]) {
            m.sort((p?, q?) => dist(p, b) - dist(q, b))
            for (const s of m.splice(quota[b.id])) {
                s.sq = 0
                s.path = null
                s.tg = null
                free.push(s)
            }
        }
    }
    const pairs = []
    for (const s of free) {
        for (const b of B) {
            if (mem[b.id].length < quota[b.id]) {
                pairs.push([dist(s, b), s, b])
            }
        }
    }
    pairs.sort((p?, q?) => p[0] - q[0])
    for (const [, s, b] of pairs) {
        if (s.sq || mem[b.id].length >= quota[b.id]) {
            continue
        }
        s.sq = b.id
        s.mop = null
        s.path = null
        s.tg = null
        mem[b.id].push(s)
    }
    // Rams, catapults and engineers go with the nearest banner on a rival castle.
    const sb = B.filter((b?) => b.siege)
    for (const s of all) {
        if (!heavyUnit(s)) {
            continue
        }
        if (!sb.length) {
            if (s.sq) {
                s.sq = 0
                s.path = null
            }
            continue
        }
        if (s.sq && sb.some((b?) => b.id === s.sq)) {
            continue
        }
        let best = sb[0]
        for (const b of sb) {
            if (dist(s, b) < dist(s, best)) {
                best = b
            }
        }
        s.sq = best.id
        s.mop = null
        s.path = null
    }
    // The captain rides with the largest squad.
    if (GV.capU && !GV.capU.dead) {
        let big = null
        for (const b of B) {
            if (
                mem[b.id].length &&
                (!big || mem[b.id].length > mem[big.id].length)
            ) {
                big = b
            }
        }
        const id = big ? big.id : 0
        if (GV.capU.sq !== id) {
            GV.capU.sq = id
            GV.capU.path = null
        }
    }
    // Places in the line: shield-bearers in front, archers behind.
    for (const b of B) {
        const sh = mem[b.id].filter((s?) => s.kind === 'shield'),
            rg = mem[b.id].filter((s?) => UNITS[s.kind].ranged)
        sh.forEach((s?, i?) => {
            s.slot = i - (sh.length - 1) / 2
        })
        rg.forEach((s?, i?) => {
            s.slot = i - (rg.length - 1) / 2
        })
        b.count = mem[b.id].length
        b.mem = mem[b.id]
    }
}
/* Where a squad member stands when there is no one to fight. */
export function slotOf(s?, b?) {
    const fx = b.fx || 0,
        fy = b.fy || 1,
        px = -fy,
        py = fx
    if (s.kind === 'shield') {
        return [
            b.x + fx * 1.4 + px * s.slot * 0.8,
            b.y + fy * 1.4 + py * s.slot * 0.8,
        ]
    }
    if (UNITS[s.kind].ranged && !UNITS[s.kind].siege) {
        return [
            b.x - fx * 0.9 + px * s.slot * 0.8,
            b.y - fy * 0.9 + py * s.slot * 0.8,
        ]
    }
    return null
}
/* A few words on the morale of a group. */
export function moraleWord(list?) {
    const l = list.filter((s?) => s.mor !== undefined)
    if (!l.length) {
        return ''
    }
    if (l.filter((s?) => s.rout > 0).length * 3 >= l.length) {
        return 'routing'
    }
    const m = l.reduce((a?, s?) => a + s.mor, 0) / l.length
    return m > 70 ? 'steady' : m > 40 ? 'shaken' : 'wavering'
}
export function bannerPlace(b?) {
    const rg = regAt(b.x, b.y)
    if (b.target && b.target.o === 9) {
        return 'at the bandit camp'
    }
    if (rg.owner > 0) {
        const rv = rivById(rg.owner)
        return 'in the lands of ' + (rv ? rv.name : 'a rival lord')
    }
    return rg.owner === 0 ? 'on your land' : 'in the wild lands'
}
