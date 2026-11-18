/*
 * Battle rules shared by both sides: who stands near whom, morale and routing,
 * flanking, cover in the woods and the reach of high ground.
 */
import { DEF, N } from './config'
import { toast } from './helpers'
import { bAt, clampN, inMap, ownedT, reg, terrain } from './state'
import { GV } from './vars'

/* Fighting units in buckets of 8 by 8 tiles, rebuilt once a tick, so a unit can ask
   who is near without looking at every unit on the map. */
const BS = 8,
    BW = Math.ceil(N / BS)
const cells: any[][] = Array.from({ length: BW * BW }, () => [])
const cellXY = (v?) => Math.min(BW - 1, Math.max(0, (v / BS) | 0))
const used: number[] = []
GV.warOn = {}
function put(u?) {
    const k = cellXY(u.x) + cellXY(u.y) * BW
    if (!cells[k].length) {
        used.push(k)
    }
    cells[k].push(u)
}
export function buildGrid() {
    for (const k of used) {
        cells[k].length = 0
    }
    used.length = 0
    for (const s of GV.S.sold) {
        if (!s.dead) {
            put(s)
        }
    }
    GV.warOn = {}
    for (const e of GV.S.en) {
        if (!e.dead) {
            put(e)
            if (e.mode === 'war') {
                GV.warOn[e.foe] = 1
            }
        }
    }
}
export function eachNear(x?, y?, r?, fn?) {
    const x0 = cellXY(x - r),
        x1 = cellXY(x + r),
        y0 = cellXY(y - r),
        y1 = cellXY(y + r)
    for (let cy = y0; cy <= y1; cy++) {
        for (let cx = x0; cx <= x1; cx++) {
            for (const o of cells[cx + cy * BW]) {
                if (!o.dead && Math.hypot(o.x - x, o.y - y) <= r) {
                    fn(o)
                }
            }
        }
    }
}
/* Two units that fight each other: your soldiers and anyone else, or two lords at war. */
export function hostile(a?, b?) {
    if (a.side !== b.side) {
        return true
    }
    if (!a.side || a.fac === b.fac) {
        return false
    }
    return (
        (a.mode === 'war' && a.foe === b.fac) ||
        (b.mode === 'war' && b.foe === a.fac)
    )
}
export const ARMOURED = { brute: 1, hero: 1, ram: 1 }
const ENGINES = { ram: 1, catapult: 1, pram: 1, pcat: 1 }
/* How much a unit counts when its side sizes up a fight. */
function weight(u?) {
    const k = u.side ? u.type : u.kind
    if (k === 'scout' || u.rout > 0) {
        return 0
    }
    if (ENGINES[k] || k === 'ladder') {
        return 0.3
    }
    return k === 'hero'
        ? 3
        : k === 'captain'
          ? 2
          : k === 'brute' || k === 'knight' || k === 'shield'
            ? 1.6
            : 1
}
/* Engines, scouts, castle guards, the captain and champions never lose heart. */
export function noMorale(u?) {
    const k = u.side ? u.type : u.kind
    return (
        !!ENGINES[k] ||
        k === 'scout' ||
        k === 'captain' ||
        k === 'hero' ||
        k === 'ladder' ||
        u.mode === 'guard'
    )
}
export const MOR_BREAK = 15
GV.routToast = 0
export function startRout(u?) {
    if (u.rout > 0 || noMorale(u) || u.dead) {
        return
    }
    u.rout = 6 + Math.random() * 2.5
    u.path = null
    u.next = null
    u.tg = null
    u.tk = u.tk === 'near' ? null : u.tk
    if (u.ri) {
        u.ri = 0
    }
    u.mor = 0
    if (!u.side && GV.S.t > GV.routToast) {
        GV.routToast = GV.S.t + 40
        toast('Some of your soldiers lose heart and fall back.')
    }
}
/* A blow to morale for one side near (x, y), when a comrade or a leader falls. */
export function shock(x?, y?, side?, fac?, amt?, r?) {
    eachNear(x, y, r, (o?) => {
        if (o.side !== side || (side && o.fac !== fac) || noMorale(o)) {
            return
        }
        o.mor = (o.mor === undefined ? 100 : o.mor) - amt
        if (o.mor < MOR_BREAK) {
            startRout(o)
        }
    })
}
/* High ground: hills lands, or a tile next to rocks. Archers and towers there reach further. */
export function highAt(x?, y?) {
    const tx = clampN(x),
        ty = clampN(y)
    if (GV.regs[reg[tx + ty * N]].type === 'hills') {
        return true
    }
    for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
            if (inMap(tx + i, ty + j) && terrain[tx + i + (ty + j) * N] === 2) {
                return true
            }
        }
    }
    return false
}
export const inWood = (x?, y?) => terrain[clampN(x) + clampN(y) * N] === 1
/* Every half second: look around, gain or lose heart, and break when it runs out. */
export function moraleTick(u?, dt?, bannerAt?) {
    if (u.rout > 0) {
        u.rout -= dt
        if (u.rout <= 0) {
            u.rout = 0
            u.mor = 45
            u.path = null
            u.next = null
        }
        return
    }
    if (u.mt === undefined) {
        u.mt = Math.random() * 0.5
    }
    if ((u.mt -= dt) > 0) {
        return
    }
    u.mt = 0.5
    u.hi = highAt(u.x, u.y) ? 1 : 0
    if (u.mor === undefined) {
        u.mor = 100
    }
    if (noMorale(u)) {
        return
    }
    let al = 0,
        fo = 0,
        lead = false
    eachNear(u.x, u.y, 5, (o?) => {
        if (o === u) {
            return
        }
        if (hostile(u, o)) {
            if (Math.hypot(o.x - u.x, o.y - u.y) < 4.5) {
                fo += weight(o)
            }
        } else if (o.side === u.side) {
            al += weight(o)
            if (o === GV.capU || (o.type === 'hero' && o.fac === u.fac)) {
                lead = true
            }
        }
    })
    let d = 3
    if (fo > al * 1.4 + 1) {
        d -= 4 * Math.min(3, fo / (al + 1))
    }
    if (u.hp < u.max * 0.3) {
        d -= 3
    }
    if (lead) {
        d += 4
    }
    if (!u.side) {
        if (bannerAt && bannerAt(u)) {
            d += 3
        }
        if (ownedT(clampN(u.x), clampN(u.y))) {
            d += 2
        }
        if (GV.S.cry > 0) {
            d += 12
        }
    }
    u.mor = Math.max(0, Math.min(100, u.mor + d * 0.5))
    if (u.mor < MOR_BREAK) {
        startRout(u)
    }
}
/* Attackers who strike a unit already busy with someone else, or from behind, hit harder.
   Shield-bearers turn to face every blow. */
export const FLANK = 1.3
export function flankMul(a?, t?) {
    let m = 1
    if (t.rout > 0) {
        m = FLANK
    } else if (
        t.lastA &&
        t.lastA !== a &&
        !t.lastA.dead &&
        GV.S.t - t.lastAT < 1.2
    ) {
        m = FLANK
    } else if ((a.x - a.y - (t.x - t.y)) * (t.face || 1) < -0.25) {
        m = FLANK
    }
    if (t.kind === 'shield' && !(t.rout > 0)) {
        m = 1
    }
    t.lastA = a
    t.lastAT = GV.S.t
    return m
}
/* A shield-bearer close by catches arrows meant for archers. */
export function shieldCover(s?) {
    let c = false
    eachNear(s.x, s.y, 1.7, (o?) => {
        if (!o.side && o.kind === 'shield' && o !== s && !(o.rout > 0)) {
            c = true
        }
    })
    return c
}
/* Run from the fight toward (hx, hy), sliding round anything in the way. */
export function fleeStep(u?, hx?, hy?, dt?, sp?) {
    const dx = hx - u.x,
        dy = hy - u.y,
        d = Math.hypot(dx, dy)
    if (d < 0.6) {
        u.moving = false
        return
    }
    const tx = clampN(u.x),
        ty = clampN(u.y)
    if (terrain[tx + ty * N] === 3) {
        sp *= 0.45
    } else if (terrain[tx + ty * N] === 1) {
        sp *= 0.7
    }
    const a0 = Math.atan2(dy, dx),
        st = sp * dt
    for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
        const a = a0 + off,
            nx = u.x + Math.cos(a) * st,
            ny = u.y + Math.sin(a) * st,
            cx = clampN(nx),
            cy = clampN(ny)
        if (!inMap(cx, cy) || terrain[cx + cy * N] === 4) {
            continue
        }
        const b = bAt(cx, cy)
        if (
            b &&
            b !== bAt(tx, ty) &&
            (!DEF[b.t].walk || (u.side && b.o === 0 && b.t === 'gate'))
        ) {
            continue
        }
        u.x = nx
        u.y = ny
        u.walk += dt
        u.moving = true
        const sx = Math.cos(a) - Math.sin(a)
        if (Math.abs(sx) > 0.01) {
            u.face = sx > 0 ? 1 : -1
        }
        return
    }
    u.moving = false
}
