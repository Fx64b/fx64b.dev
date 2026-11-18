/*
 * A world that grows as it is explored.
 *
 * The world is a grid of GRID x GRID regions, one region per cell of CS tiles.
 * Its land is a pure function of the seed, but only the regions that are "open"
 * can be seen, walked or claimed. A new game opens the 9 x 9 regions round the
 * keep. When Thornwick discovers a region at the open edge, or a lord claims one
 * there, the regions beyond it open as well, up to the full size of the grid.
 * New lords rise in the newly opened land. Land that has not opened has terrain
 * VOID: it is drawn under a pale mist and nothing can walk into it.
 * (worldSave/worldLoad only exist for the save code and go with it.)
 */
import { CS, GRID, HOME, KX, KY, LORDS, N, NN, NRIV } from './config'
import { buildVeil, staleGround } from './ground'
import { compass, toast } from './helpers'
import { endScreen, rivalExpand, rivalPlan, rivalStep } from './lords'
import { hsh, mulberry, vnoise } from './noise'
import {
    addB,
    baseTerr,
    kMul,
    makeRival,
    rebuildProps,
    reg,
    terrain,
} from './state'
import { GV } from './vars'

/** Terrain of land that has not opened yet. Nothing can enter it. */
export const VOID = 5
/** A new game opens the regions within START_R of the keep's region. */
export const START_R = 4
/** Reaching the open edge opens the regions within GROW_R of that region. */
export const GROW_R = 2
/** Seconds between two openings caused by the lords. */
export const LORD_GROW_GAP = 120
/** Seconds before the first new lord may rise, and between new lords. */
export const FIRST_NEW_LORD = 480,
    NEW_LORD_GAP = 300
const MID = (GRID - 1) >> 1
const TYPES = [
    'forest',
    'forest',
    'hills',
    'hills',
    'lake',
    'meadow',
    'meadow',
    'ruins',
]
const TT = {
    forest: 0.42,
    meadow: 0.66,
    hills: 0.7,
    lake: 0.62,
    ruins: 0.6,
}
GV.wb = { x0: 0, y0: 0, x1: N - 1, y1: N - 1 }
GV.wCd = 0
GV.growToast = 0
GV.fcm = []

export const cellAt = (gx?, gy?) =>
    gx >= 0 && gy >= 0 && gx < GRID && gy < GRID
        ? GV.regs[gx + gy * GRID]
        : null
const blankRegion = (gx?, gy?) => ({
    id: gx + gy * GRID,
    gx,
    gy,
    sx: (gx + 0.5) * CS,
    sy: (gy + 0.5) * CS,
    type: 'meadow',
    owner: -1,
    disc: false,
    adj: [],
    all: [],
    poi: null,
    gen: false,
})

/** World fields of a new game state. */
export function worldInit(s?) {
    s.wo = []
    s.ls = []
    s.lp = []
    s.lc = 0
    s.nlCd = FIRST_NEW_LORD
    s.gcd = LORD_GROW_GAP
}

/* ---------- the land ---------- */
/** Make the land of a new world, with the middle open and the first three lords in it. */
export function genWorld(seed?) {
    const r = mulberry(seed),
        sd = seed % 9973
    GV.regs = []
    for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
            const rg = blankRegion(gx, gy)
            if (rg.id === HOME) {
                rg.sx = KX + 0.5
                rg.sy = KY + 0.5
            } else {
                rg.sx += (hsh(gx, gy, sd + 101) - 0.5) * 4.5
                rg.sy += (hsh(gx, gy, sd + 102) - 0.5) * 4.5
                rg.type = TYPES[(hsh(gx, gy, sd + 103) * TYPES.length) | 0]
            }
            rg.gen = Math.max(Math.abs(gx - MID), Math.abs(gy - MID)) <= START_R
            GV.regs.push(rg)
        }
    }
    // The first three lords sit round the keep, the first one nearest, all inside the open land.
    const st = r() * Math.PI * 2,
        RAD = [45, 50, 52]
    GV.rivSpots = []
    for (let k = 0; k < RAD.length; k++) {
        const a = st + (k * Math.PI * 2) / RAD.length + (r() - 0.5) * 0.25
        let dx = Math.cos(a) * RAD[k],
            dy = Math.sin(a) * RAD[k]
        const m = Math.max(Math.abs(dx), Math.abs(dy))
        if (m > 50) {
            dx *= 50 / m
            dy *= 50 / m
        }
        const kx = Math.round(KX + 0.5 + dx) - 1,
            ky = Math.round(KY + 0.5 + dy) - 1,
            rg = cellAt(Math.floor((kx + 1) / CS), Math.floor((ky + 1) / CS))
        const sp = { r: rg.id, kx, ky }
        markLord(sp)
        GV.rivSpots.push(sp)
    }
    for (let y = 0; y < N; y++) {
        const cy = Math.floor(y / CS)
        for (let x = 0; x < N; x++) {
            const cx = Math.floor(x / CS)
            let best = HOME,
                bd = 1e9
            for (let j = cy - 1; j <= cy + 1; j++) {
                for (let i = cx - 1; i <= cx + 1; i++) {
                    const rg = cellAt(i, j)
                    if (!rg) {
                        continue
                    }
                    const d =
                        Math.hypot(x - rg.sx, y - rg.sy) +
                        (vnoise(x * 0.22, y * 0.22, sd + rg.id * 17) - 0.5) *
                            4.5
                    if (d < bd) {
                        bd = d
                        best = rg.id
                    }
                }
            }
            if (Math.hypot(x - KX - 0.5, y - KY - 0.5) < 6.3) {
                best = HOME
            }
            reg[x + y * N] = best
        }
    }
    baseTerr.fill(0)
    for (let y = 1; y < N - 1; y++) {
        for (let x = 1; x < N - 1; x++) {
            const i = x + y * N,
                rg = GV.regs[reg[i]],
                tv = vnoise(x * 0.21, y * 0.21, sd + 1),
                rv = vnoise(x * 0.33, y * 0.33, sd + 2)
            let t = 0
            if (rv > (rg.type === 'hills' ? 0.56 : 0.8)) {
                t = 2
            } else if (tv > TT[rg.type] && hsh(x, y, sd + 5) < 0.82) {
                t = 1
            }
            if (
                rg.type === 'lake' &&
                Math.hypot(x - rg.sx, y - rg.sy) +
                    (vnoise(x * 0.4, y * 0.4, sd + 3) - 0.5) * 3 <
                    3.8
            ) {
                t = 3
            }
            baseTerr[i] = t
        }
    }
    // Small ponds, about one in five regions.
    for (const rg of GV.regs) {
        if (hsh(rg.gx, rg.gy, sd + 7) >= 0.18) {
            continue
        }
        const cx = (rg.gx + 0.15 + 0.7 * hsh(rg.gx, rg.gy, sd + 8)) * CS,
            cy = (rg.gy + 0.15 + 0.7 * hsh(rg.gx, rg.gy, sd + 9)) * CS,
            rad = 1.3 + hsh(rg.gx, rg.gy, sd + 10) * 1.2
        if (Math.hypot(cx - KX, cy - KY) < 9) {
            continue
        }
        for (let y = Math.max(2, Math.floor(cy - 5)); y < cy + 5; y++) {
            for (let x = Math.max(2, Math.floor(cx - 5)); x < cx + 5; x++) {
                if (
                    x < N - 2 &&
                    y < N - 2 &&
                    Math.hypot(x - cx, y - cy) +
                        (vnoise(x * 0.5, y * 0.5, sd + 4 + rg.id) - 0.5) * 1.5 <
                        rad
                ) {
                    baseTerr[x + y * N] = 3
                }
            }
        }
    }
    for (const rg of GV.regs) {
        if (rg.id === HOME || rg.riv) {
            continue
        }
        const q = hsh(rg.gx, rg.gy, sd + 11)
        rg.poi =
            rg.type === 'ruins'
                ? 'ruins'
                : rg.type === 'hills'
                  ? q < 0.55
                      ? 'mine'
                      : q < 0.7
                        ? 'stones'
                        : null
                  : rg.type === 'lake'
                    ? null
                    : q < 0.22
                      ? 'stones'
                      : q < 0.44
                        ? 'hamlet'
                        : null
        if (rg.poi) {
            placePoi(rg)
        }
    }
    for (let y = KY - 6; y < KY + 8; y++) {
        for (let x = KX - 6; x < KX + 8; x++) {
            if (Math.hypot(x - KX - 0.5, y - KY - 0.5) < 4.7) {
                baseTerr[x + y * N] = 0
            }
        }
    }
    for (const sp of GV.rivSpots) {
        stampLord(sp)
    }
    homeWoods(r)
    frameEdge()
    computeAdj()
}
function placePoi(rg?) {
    const pts =
        rg.poi === 'ruins'
            ? [
                  [0, 0],
                  [2, -1],
                  [-1, 2],
              ]
            : [[0, 0]]
    for (const [dx, dy] of pts) {
        const x = Math.round(rg.sx) + dx,
            y = Math.round(rg.sy) + dy
        if (x > 1 && y > 1 && x < N - 2 && y < N - 2) {
            baseTerr[x + y * N] = 4
            for (const [a, b] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]) {
                if (baseTerr[x + a + (y + b) * N] === 3) {
                    baseTerr[x + a + (y + b) * N] = 0
                }
            }
        }
    }
}
/* Make sure the keep has some trees and rocks close by. */
function homeWoods(r?) {
    const x0 = KX - 16,
        x1 = KX + 18
    const count = (t?) => {
        let n = 0
        for (let y = x0; y < x1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = x + y * N
                if (reg[i] === HOME && baseTerr[i] === t) {
                    n++
                }
            }
        }
        return n
    }
    const blobAt = (t?, rad?) => {
        const a = r() * 6.28,
            cx = KX + 0.5 + Math.cos(a) * 5.6,
            cy = KY + 0.5 + Math.sin(a) * 5.6
        for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
            for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
                const i = x + y * N
                if (
                    reg[i] === HOME &&
                    !baseTerr[i] &&
                    Math.hypot(x - cx, y - cy) < rad &&
                    Math.hypot(x - KX - 0.5, y - KY - 0.5) >= 4.7
                ) {
                    baseTerr[i] = t
                }
            }
        }
    }
    for (let k = 0; k < 6 && count(1) < 16; k++) {
        blobAt(1, 2.1)
    }
    for (let k = 0; k < 6 && count(2) < 7; k++) {
        blobAt(2, 1.5)
    }
}
/* No water or ruins on the outermost ring of tiles. */
function frameEdge() {
    for (let i = 1; i < N - 1; i++) {
        for (const j of [1, N - 2]) {
            if (baseTerr[i + j * N] >= 3) {
                baseTerr[i + j * N] = 0
            }
            if (baseTerr[j + i * N] >= 3) {
                baseTerr[j + i * N] = 0
            }
        }
    }
}
/** Make a region the home of a lord whose keep stands at (kx, ky). */
export function markLord(sp?) {
    const rg = GV.regs[sp.r]
    rg.type = 'meadow'
    rg.riv = 1
    rg.poi = null
    rg.sx = sp.kx + 0.5
    rg.sy = sp.ky + 0.5
}
/** Give a lord's region the land round the keep, and clear it. */
export function stampLord(sp?) {
    markLord(sp)
    for (let y = Math.max(0, sp.ky - 12); y < Math.min(N, sp.ky + 14); y++) {
        for (
            let x = Math.max(0, sp.kx - 12);
            x < Math.min(N, sp.kx + 14);
            x++
        ) {
            const d = Math.hypot(x - sp.kx - 0.5, y - sp.ky - 0.5)
            if (d < 9) {
                reg[x + y * N] = sp.r
            }
            if (d < 10.8) {
                baseTerr[x + y * N] = 0
            }
        }
    }
}
/** Which regions touch which, over the whole grid; `adj` only lists open ones. */
export function computeAdj() {
    for (const rg of GV.regs) {
        rg.all = []
    }
    const link = (a?, b?) => {
        const A = GV.regs[a]
        if (!A.all.includes(b)) {
            A.all.push(b)
            GV.regs[b].all.push(a)
        }
    }
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const i = x + y * N,
                a = reg[i]
            if (x + 1 < N && reg[i + 1] !== a) {
                link(a, reg[i + 1])
            }
            if (y + 1 < N && reg[i + N] !== a) {
                link(a, reg[i + N])
            }
        }
    }
    refreshAdj()
}
function refreshAdj() {
    for (const rg of GV.regs) {
        rg.adj = rg.gen ? rg.all.filter((a?) => GV.regs[a].gen) : []
    }
}
/** After the terrain is set from the land: close what has not opened yet. */
export function closeUnopened() {
    for (let i = 0; i < NN; i++) {
        if (!GV.regs[reg[i]].gen) {
            terrain[i] = VOID
        }
    }
    updateBounds()
}
/* The smallest rectangle of tiles that holds all open land. */
function updateBounds() {
    let x0 = N,
        y0 = N,
        x1 = 0,
        y1 = 0
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            if (terrain[x + y * N] !== VOID) {
                if (x < x0) {
                    x0 = x
                }
                if (x > x1) {
                    x1 = x
                }
                if (y < y0) {
                    y0 = y
                }
                y1 = y
            }
        }
    }
    GV.wb = { x0, y0, x1, y1 }
}
/* Set the live terrain of the tiles in a rectangle from the land and the changes made to it. */
function reopen(x0?, y0?, x1?, y1?) {
    for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) {
            const i = x + y * N
            if (!GV.regs[reg[i]].gen) {
                terrain[i] = VOID
            } else if (GV.S.tmod[i] !== undefined) {
                terrain[i] = GV.S.tmod[i]
            } else {
                terrain[i] = baseTerr[i]
            }
        }
    }
}
/** Open these regions. Returns how many were not open before. */
export function openCells(ids?) {
    const fresh = []
    for (const id of ids) {
        const rg = GV.regs[id]
        if (rg && !rg.gen) {
            rg.gen = true
            fresh.push(rg)
            GV.S.wo.push(id)
        }
    }
    if (!fresh.length) {
        return 0
    }
    const m = 12,
        x0 = Math.min(...fresh.map((rg?) => rg.gx)) * CS - m,
        y0 = Math.min(...fresh.map((rg?) => rg.gy)) * CS - m,
        x1 = (Math.max(...fresh.map((rg?) => rg.gx)) + 1) * CS + m,
        y1 = (Math.max(...fresh.map((rg?) => rg.gy)) + 1) * CS + m
    reopen(x0, y0, x1, y1)
    refreshAdj()
    landChanged(x0, y0, x1, y1)
    return fresh.length
}
function landChanged(x0?, y0?, x1?, y1?) {
    rebuildProps()
    updateBounds()
    GV.flowDirty = GV.pathsDirty = GV.ownDirty = true
    staleGround(x0, y0, x1, y1)
    if (GV.vcv) {
        buildVeil()
    }
}
export const worldFull = () => GV.regs.every((rg?) => rg.gen)
/** No more land can open and no new lord can rise in it. */
export const worldDone = () => worldFull()
/* A region at the open edge: some region next to it has not opened yet. */
function atEdge(rg?) {
    for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
            const c = cellAt(rg.gx + i, rg.gy + j)
            if (c && !c.gen) {
                return true
            }
        }
    }
    return false
}
/** Open the land round a region at the edge. `by` is who reached it (0 is Thornwick). */
export function growAround(rg?, by?) {
    const ids = []
    for (let j = -GROW_R; j <= GROW_R; j++) {
        for (let i = -GROW_R; i <= GROW_R; i++) {
            const c = cellAt(rg.gx + i, rg.gy + j)
            if (c) {
                ids.push(c.id)
            }
        }
    }
    const n = openCells(ids)
    if (!n) {
        return 0
    }
    const dir = compass(rg.sx - KX, rg.sy - KY)
    if (worldFull()) {
        toast(
            'The last of the mist lifts. The realm has reached its full size, and the sea lies beyond it.'
        )
    } else if (by === 0 && GV.S.t > GV.growToast) {
        GV.growToast = GV.S.t + 30
        toast(
            'The mist draws back beyond the ' +
                rg.type +
                ' lands to the ' +
                dir +
                '. New land lies open to explore.'
        )
    }
    return n
}

/* ---------- the lords who come later ---------- */
/** Colours of the lords' banners, by lord id. */
export function lordCols() {
    GV.fcm = []
    for (const rv of GV.S.riv) {
        GV.fcm[rv.id] = rv.prof.col
    }
}
/* A banner for a new lord: an id never used, or one whose lord fell a while ago. */
function freeId() {
    const S = GV.S
    for (let id = 1; id <= NRIV; id++) {
        if (!S.riv.some((rv?) => rv.id === id)) {
            return { id, slot: -1 }
        }
    }
    const slot = S.riv.findIndex(
        (rv?) => rv.dead && S.t - (rv.deadT || 0) > 120
    )
    return slot < 0 ? null : { id: S.riv[slot].id, slot }
}
/* Land for a new lord: open, unclaimed and unseen, with unclaimed land all round
   and far from every keep. */
function lordLand() {
    const S = GV.S,
        keeps = [
            GV.keep,
            ...S.riv.filter((rv?) => !rv.dead).map((rv?) => rv.keepB),
        ].filter((k?) => k && !k.dead)
    let best = null,
        bs = -1
    for (const rg of GV.regs) {
        if (
            !rg.gen ||
            rg.disc ||
            rg.owner !== -1 ||
            rg.riv ||
            rg.id === HOME ||
            rg.gx < 1 ||
            rg.gy < 1 ||
            rg.gx > GRID - 2 ||
            rg.gy > GRID - 2
        ) {
            continue
        }
        let ok = true
        for (let j = -1; ok && j <= 1; j++) {
            for (let i = -1; ok && i <= 1; i++) {
                const c = cellAt(rg.gx + i, rg.gy + j)
                if (c.owner !== -1 || c.disc || c.riv || c.id === HOME) {
                    ok = false
                }
            }
        }
        if (!ok) {
            continue
        }
        const cx = (rg.gx + 0.5) * CS,
            cy = (rg.gy + 0.5) * CS
        let dmin = 1e9
        for (const k of keeps) {
            const d = Math.hypot(k.cx - cx, k.cy - cy)
            if (k === GV.keep ? d < 60 : d < 48) {
                ok = false
                break
            }
            dmin = Math.min(dmin, d)
        }
        if (!ok) {
            continue
        }
        const sc = Math.min(dmin, 90) + hsh(rg.id, S.lc, S.seed) * 25
        if (sc > bs) {
            bs = sc
            best = rg
        }
    }
    return best
}
/* A lord no one has met yet, from those who have not ruled before. */
function freeProfile() {
    const S = GV.S,
        used = new Set([...S.lp, ...S.riv.map((rv?) => rv.lp)])
    let pool = []
    for (let p = 4; p < LORDS.length; p++) {
        if (!used.has(p)) {
            pool.push(p)
        }
    }
    if (!pool.length) {
        const alive = new Set(
            S.riv.filter((rv?) => !rv.dead).map((rv?) => rv.lp)
        )
        pool = []
        for (let p = 1; p < LORDS.length; p++) {
            if (!alive.has(p)) {
                pool.push(p)
            }
        }
    }
    return pool.length ? pool[(hsh(S.lc, 3, S.seed) * pool.length) | 0] : 0
}
/** A new lord rises in the open land, as strong as the time of the game asks. */
export function newLord() {
    const S = GV.S
    if (S.riv.filter((rv?) => !rv.dead).length >= NRIV) {
        return null
    }
    const fid = freeId(),
        lp = freeProfile(),
        rg = fid && lp ? lordLand() : null
    if (!rg) {
        return null
    }
    const kx = Math.round((rg.gx + 0.5) * CS) - 1,
        ky = Math.round((rg.gy + 0.5) * CS) - 1,
        sp = { r: rg.id, kx, ky }
    // The land round the keep opens with it.
    const ring = []
    for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
            ring.push(cellAt(rg.gx + i, rg.gy + j).id)
        }
    }
    openCells(ring)
    stampLord(sp)
    S.ls.push(sp)
    reopen(kx - 12, ky - 12, kx + 14, ky + 14)
    computeAdj()
    const tier = Math.min(5, 2 + Math.floor(S.t / 900)),
        rv = makeRival(-1, { id: fid.id, sp, lp, tier, nw: 1 })
    rv.born = S.t
    if (fid.slot >= 0) {
        S.riv[fid.slot] = rv
    } else {
        S.riv.push(rv)
    }
    S.lp.push(lp)
    S.lc++
    lordCols()
    rv.keepB = addB('keep', kx, ky, true, rv.id)
    rv.keepB.max = rv.keepB.hp = Math.round(rv.keepB.max * kMul(rv))
    rv.plan = rivalPlan(rv)
    for (let n = 0; n < 400; n++) {
        const res = rivalStep(rv, true)
        if (res === rv.tier || res === false) {
            break
        }
    }
    // They arrive with some land already settled round their keep.
    rg.owner = rv.id
    for (let n = 1; n < tier; n++) {
        rv.wealth = 1e6
        if (!rivalExpand(rv)) {
            break
        }
        for (const b of S.b) {
            if (b.t === 'outpost' && b.o === rv.id) {
                GV.regs[reg[b.x + b.y * N]].owner = rv.id
            }
        }
    }
    rv.wealth = 80 * tier
    rv.atkIn = 240 + hsh(S.lc, 5, S.seed) * 90
    rv.ecd = 60
    landChanged(kx - 14, ky - 14, kx + 16, ky + 16)
    toast(
        'Rumours come of a new lord raising a keep far to the ' +
            compass(kx - KX, ky - KY) +
            '.'
    )
    return rv
}
/** The first words about a new lord, once their land is found. */
export const lordNews = (rv?) =>
    'A new lord rules the land to the ' +
    compass(rv.kx - KX, rv.ky - KY) +
    ': ' +
    rv.name +
    '. ' +
    rv.prof.desc

/* ---------- each second ---------- */
export function worldTick(dt?) {
    const S = GV.S
    if ((GV.wCd -= dt) > 0) {
        return
    }
    GV.wCd = 1
    S.gcd -= 1
    S.nlCd -= 1
    if (!worldFull()) {
        // Land Thornwick has found at the edge opens what lies beyond at once.
        for (const rg of GV.regs) {
            if (rg.gen && rg.disc && atEdge(rg)) {
                growAround(rg, 0)
            }
        }
        // The lords push the edge back too, but more slowly.
        if (S.gcd <= 0) {
            const edge = GV.regs.filter(
                (rg?) => rg.gen && rg.owner > 0 && rg.owner < 9 && atEdge(rg)
            )
            if (edge.length) {
                const rg = edge[(hsh(S.wo.length, 7, S.seed) * edge.length) | 0]
                growAround(rg, rg.owner)
                S.gcd = LORD_GROW_GAP
            }
        }
    }
    if (S.nlCd <= 0) {
        S.nlCd = newLord() ? NEW_LORD_GAP : 30
    }
    if (
        !S.won &&
        S.riv.length &&
        S.riv.every((rv?) => rv.dead) &&
        worldDone()
    ) {
        S.won = true
        endScreen(true)
    }
}

/* ---------- saves ---------- */
/** The world's part of a save. */
export function worldSave() {
    const S = GV.S
    return {
        wo: S.wo,
        ls: S.ls,
        lp: S.lp,
        lc: S.lc,
        nl: Math.round(S.nlCd),
        gc: Math.round(S.gcd),
    }
}
/** Make the world of a save: its land, the open regions and the keeps of the new lords. */
export function worldLoad(o?) {
    const S = GV.S,
        w = o.w || {}
    genWorld(S.seed)
    const ok = (sp?) =>
        sp &&
        GV.regs[sp.r] &&
        sp.kx >= 12 &&
        sp.ky >= 12 &&
        sp.kx < N - 14 &&
        sp.ky < N - 14
    S.ls = (Array.isArray(w.ls) ? w.ls : [])
        .filter(ok)
        .map((sp?) => ({ r: sp.r | 0, kx: sp.kx | 0, ky: sp.ky | 0 }))
    for (const sp of S.ls) {
        stampLord(sp)
    }
    S.wo = []
    for (const id of Array.isArray(w.wo) ? w.wo : []) {
        const rg = GV.regs[id]
        if (rg && !rg.gen) {
            rg.gen = true
            S.wo.push(id)
        }
    }
    computeAdj()
    S.lp = Array.isArray(w.lp) ? w.lp.filter((p?) => LORDS[p]) : []
    S.lc = w.lc | 0
    S.nlCd = typeof w.nl === 'number' ? w.nl : FIRST_NEW_LORD
    S.gcd = typeof w.gc === 'number' ? w.gc : LORD_GROW_GAP
}
