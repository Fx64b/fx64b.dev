import { MAX_BANNERS } from './army'
import {
    DAYLEN,
    DEF,
    DF,
    DIFFS,
    FIRST_RAID,
    GRID,
    HOME,
    KX,
    KY,
    LORDS,
    N,
    NN,
    NRIV,
    OX,
    OY,
    RES,
    SAVE_KEY,
    SEASONLEN,
} from './config'
import { drawGroundAll } from './ground'
import { refreshOwn } from './land'
import { rivalPlan, rivalStep } from './lords'
import { hsh, mulberry, vnoise } from './noise'
import { recomputePaths } from './path'
import { UNITS, addSoldier, spawnVillager } from './people'
import { SAVE_VERSION, migrateSave } from './save-format'
import { GV } from './vars'

GV.S = undefined
GV.keep = undefined
GV.capU = null
GV.flowDirty = true
GV.pathsDirty = true
GV.ownDirty = true
GV.speed = 1
GV.armed = null
GV.drag = null
GV.hover = null
GV.selected = null
GV.overOpen = false
GV.ladderToast = 0
GV.helpOpen = false
GV.jobCd = 0
GV.trainCd = 0
GV.flowCd = 0
GV.gateCd = 0
GV.cntCd = 0
GV.animT = 0
GV.lastInspect = ''
GV.lastEvent = ''
GV.tab = 0
GV.fireToast = 0
GV.curSeason = -1
GV.sqCd = 0
export const bmap = new Array(NN).fill(null)
export const terrain = new Uint8Array(NN),
    baseTerr = new Uint8Array(NN),
    pathMap = new Uint8Array(NN),
    reg = new Uint16Array(NN),
    bailey = new Uint8Array(NN)
export const flow = new Float32Array(NN)
GV.regs = []
GV.rivSpots = []
GV.trees = []
GV.rocks = []
GV.myTrees = []
GV.myRocks = []
GV.props = []
GV.parts = []
export const reduceMotion =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
export const inMap = (x?, y?) => x >= 0 && y >= 0 && x < N && y < N
export const bAt = (x?, y?) => (inMap(x, y) ? bmap[x + y * N] : null)
export const wx = (x?, y?) => OX + (x - y) * 16,
    wy = (x?, y?) => OY + (x + y) * 8
export const clampN = (v?) => Math.max(0, Math.min(N - 1, Math.round(v)))
export const tileI = (x?, y?) => clampN(x) + clampN(y) * N
export const regAt = (x?, y?) => GV.regs[reg[tileI(x, y)]]
export const ownedT = (x?, y?) =>
    inMap(x, y) && GV.regs[reg[x + y * N]].owner === 0
export const seenAt = (x?, y?) => regAt(x, y).disc
export const mine = (b?) => b.o === 0
export const fcol = (o?) => (o === 9 ? 10 : o)
export const season = () => ((GV.S.t / SEASONLEN) | 0) % 4
export function nightF() {
    const p = (GV.S.t % DAYLEN) / DAYLEN
    return p < 0.62
        ? 0
        : p < 0.68
          ? (p - 0.62) / 0.06
          : p < 0.95
            ? 1
            : (1 - p) / 0.05
}
export const isNight = () => nightF() > 0.5
export const rivById = (id?) => GV.S.riv.find((r?) => r.id === id)
export function genWorld(seed?) {
    const r = mulberry(seed),
        sd = seed % 9973
    GV.regs = []
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
    const CS = N / GRID
    for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
            const id = gx + gy * GRID,
                home = id === HOME
            GV.regs.push({
                id,
                gx,
                gy,
                sx: home ? KX + 0.5 : (gx + 0.5) * CS + (r() - 0.5) * 4.5,
                sy: home ? KY + 0.5 : (gy + 0.5) * CS + (r() - 0.5) * 4.5,
                type: home ? 'meadow' : TYPES[(r() * TYPES.length) | 0],
                owner: -1,
                disc: false,
                adj: [],
                poi: null,
            })
        }
    }
    // Rival lords sit evenly round the keep, the first ones nearer, with open land behind them.
    const st = r() * Math.PI * 2,
        RAD = [0.2, 0.3, 0.26, 0.36, 0.33, 0.41, 0.39, 0.43],
        ORD = [0, 3, 6, 1, 4, 7, 2, 5]
    GV.rivSpots = []
    for (let k = 0; k < NRIV; k++) {
        const a = st + (ORD[k] * Math.PI * 2) / NRIV + (r() - 0.5) * 0.25,
            d = RAD[k] * N
        const kx = Math.max(
                12,
                Math.min(N - 14, Math.round(KX + 0.5 + Math.cos(a) * d) - 1)
            ),
            ky = Math.max(
                12,
                Math.min(N - 14, Math.round(KY + 0.5 + Math.sin(a) * d) - 1)
            )
        let rg = null,
            bd = 1e9
        for (const o of GV.regs) {
            if (o.id === HOME || o.riv) {
                continue
            }
            const dd = Math.hypot(o.sx - kx, o.sy - ky)
            if (dd < bd) {
                bd = dd
                rg = o
            }
        }
        rg.type = 'meadow'
        rg.riv = 1
        rg.sx = kx + 0.5
        rg.sy = ky + 0.5
        GV.rivSpots.push({ r: rg.id, kx, ky })
    }
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            let best = 0,
                bd = 1e9
            for (const rg of GV.regs) {
                const d =
                    Math.hypot(x - rg.sx, y - rg.sy) +
                    (vnoise(x * 0.22, y * 0.22, sd + rg.id * 17) - 0.5) * 4.5
                if (d < bd) {
                    bd = d
                    best = rg.id
                }
            }
            if (Math.hypot(x - KX - 0.5, y - KY - 0.5) < 6.3) {
                best = HOME
            }
            for (const sp of GV.rivSpots) {
                if (Math.hypot(x - sp.kx - 0.5, y - sp.ky - 0.5) < 9) {
                    best = sp.r
                }
            }
            reg[x + y * N] = best
        }
    }
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const a = reg[x + y * N]
            for (const [dx, dy] of [
                [1, 0],
                [0, 1],
            ]) {
                if (inMap(x + dx, y + dy)) {
                    const b = reg[x + dx + (y + dy) * N]
                    if (a !== b) {
                        if (!GV.regs[a].adj.includes(b)) {
                            GV.regs[a].adj.push(b)
                        }
                        if (!GV.regs[b].adj.includes(a)) {
                            GV.regs[b].adj.push(a)
                        }
                    }
                }
            }
        }
    }
    baseTerr.fill(0)
    const TT = {
        forest: 0.42,
        meadow: 0.66,
        hills: 0.7,
        lake: 0.62,
        ruins: 0.6,
    }
    for (let y = 1; y < N - 1; y++) {
        for (let x = 1; x < N - 1; x++) {
            const i = x + y * N,
                rg = GV.regs[reg[i]],
                tv = vnoise(x * 0.21, y * 0.21, sd + 1),
                rv = vnoise(x * 0.33, y * 0.33, sd + 2)
            let t = 0
            if (rv > (rg.type === 'hills' ? 0.56 : 0.8)) {
                t = 2
            } else if (tv > TT[rg.type] && r() < 0.82) {
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
    for (let k = 0; k < Math.round((5 * NN) / 6400); k++) {
        const cx = 4 + r() * (N - 8),
            cy = 4 + r() * (N - 8),
            rad = 1.3 + r() * 1.2
        if (Math.hypot(cx - KX, cy - KY) < 9) {
            continue
        }
        for (let y = 2; y < N - 2; y++) {
            for (let x = 2; x < N - 2; x++) {
                if (
                    Math.hypot(x - cx, y - cy) +
                        (vnoise(x * 0.5, y * 0.5, sd + 4 + k) - 0.5) * 1.5 <
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
        if (rg.type === 'ruins') {
            rg.poi = 'ruins'
        } else {
            const q = r()
            rg.poi =
                rg.type === 'hills'
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
        }
        if (!rg.poi) {
            continue
        }
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
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            if (Math.hypot(x - KX - 0.5, y - KY - 0.5) < 4.7) {
                baseTerr[x + y * N] = 0
            }
            for (const sp of GV.rivSpots) {
                if (Math.hypot(x - sp.kx - 0.5, y - sp.ky - 0.5) < 10.8) {
                    baseTerr[x + y * N] = 0
                }
            }
        }
    }
    const count = (t?) => {
        let n = 0
        for (let i = 0; i < NN; i++) {
            if (reg[i] === HOME && baseTerr[i] === t) {
                n++
            }
        }
        return n
    }
    const blobAt = (t?, rad?) => {
        const a = r() * 6.28,
            cx = KX + 0.5 + Math.cos(a) * 5.6,
            cy = KY + 0.5 + Math.sin(a) * 5.6
        for (let y = 1; y < N - 1; y++) {
            for (let x = 1; x < N - 1; x++) {
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
export function applyTerrain() {
    terrain.set(baseTerr)
    for (const k in GV.S.tmod) {
        terrain[+k] = GV.S.tmod[k]
    }
    rebuildProps()
}
export function rebuildProps() {
    GV.trees = []
    GV.rocks = []
    GV.props = []
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const t = terrain[x + y * N]
            if (t === 1) {
                GV.trees.push([x, y])
                GV.props.push({
                    x,
                    y,
                    k: 1,
                    v: (hsh(x, y, GV.S.seed) * 4) | 0,
                    ox: Math.round((hsh(x, y, 5) - 0.5) * 8),
                    oy: Math.round((hsh(x, y, 6) - 0.5) * 4),
                })
            } else if (t === 2) {
                GV.rocks.push([x, y])
                GV.props.push({
                    x,
                    y,
                    k: 2,
                    v: (hsh(x, y, GV.S.seed) * 3) | 0,
                    ox: 0,
                    oy: 0,
                })
            } else if (t === 4) {
                GV.props.push({
                    x,
                    y,
                    k: 4,
                    v: 0,
                    ox: 0,
                    oy: 0,
                    poi: GV.regs[reg[x + y * N]].poi || 'ruins',
                })
            }
        }
    }
    rebuildSites()
}
export function rebuildSites() {
    GV.myTrees = GV.trees.filter((p?) => ownedT(p[0], p[1]))
    GV.myRocks = GV.rocks.filter((p?) => ownedT(p[0], p[1]))
}
export function blank() {
    return {
        seed: (Math.random() * 1e9) | 0,
        res: { food: 90, wood: 130, stone: 40, gold: 30 },
        b: [],
        vill: [],
        sold: [],
        en: [],
        shots: [],
        floats: [],
        tmod: {},
        riv: [],
        conq: {},
        disc: {},
        loot: {},
        banners: [],
        capLvl: 1,
        capXp: 0,
        capDown: 0,
        evCd: 160,
        ev: null,
        stance: 'charge',
        cry: 0,
        cryCd: 0,
        burnT: 0,
        burnCd: 0,
        scoutNote: '',
        mineCd: 8,
        t: 0,
        wave: 0,
        over: false,
        won: false,
        growCd: 5,
        eatCd: 8,
        tavCd: 10,
        hungry: 0,
        diff: 2,
        rconq: {},
    }
}
export function addB(t?, x?, y?, quiet?, o?) {
    const d = DEF[t],
        s = d.size || 1,
        hp = Array.isArray(d.hp) ? d.hp[0] : d.hp
    const b: any = {
        t,
        x,
        y,
        s,
        o: o || 0,
        lvl: 1,
        hp,
        max: hp,
        cd: Math.random(),
        auto: t !== 'stables' && t !== 'workshop',
        shut: false,
        up: false,
        oil: 0,
        ladder: 0,
        fire: 0,
        spread: 0,
        arch: null,
        w: 0,
        dead: false,
        hit: 0,
        v: (hsh(x, y, 91) * 2) | 0,
        drop: quiet ? 0 : 1,
        cx: x + (s - 1) / 2,
        cy: y + (s - 1) / 2,
        seed: hsh(x, y, 92),
        stw: 0,
        dig: 0,
    }
    GV.S.b.push(b)
    for (let j = 0; j < s; j++) {
        for (let i = 0; i < s; i++) {
            bmap[x + i + (y + j) * N] = b
        }
    }
    GV.flowDirty = GV.pathsDirty = true
    if (t === 'outpost') {
        GV.ownDirty = true
    }
    return b
}
export const kMul = (rv?) => 2 + 0.5 * rv.tier
export function makeRival(k?) {
    const sp = GV.rivSpots[k],
        L = LORDS[k + 1]
    return {
        id: k + 1,
        name: L.name,
        pers: L.pers,
        prof: L,
        tier: [1, 2, 2, 3, 3, 4, 4, 5][k],
        r: sp.r,
        kx: sp.kx,
        ky: sp.ky,
        awake: false,
        dead: false,
        wealth: 0,
        pi: 0,
        k: 0,
        atkIn: 300 + k * 45,
        truce: 0,
        out: false,
        q: [],
        scd: 0,
        bcd: 2,
        gcd: 5,
        nh: 0,
        nf: 0,
        nb: 0,
        nt: 0,
        ng: 1,
        pw: 0,
        keepB: null,
        plan: null,
        foe: null,
        nextFoe: null,
        ecd: 150 + k * 20,
        route: null,
        outT: 0,
        heroCd: 0,
        hp0: 0,
        heroFell: false,
        atkDir: null,
        wp: null,
        scoutOut: false,
        broke: false,
        rcd: 0,
    }
}
export function newGame() {
    GV.S = blank()
    GV.S.diff = GV.nextDiff
    bmap.fill(null)
    genWorld(GV.S.seed)
    applyTerrain()
    GV.parts = []
    GV.capU = null
    GV.keep = addB('keep', KX, KY, true, 0)
    for (let k = 0; k < NRIV; k++) {
        const rv = makeRival(k)
        GV.S.riv.push(rv)
        rv.keepB = addB('keep', rv.kx, rv.ky, true, rv.id)
        rv.keepB.max = rv.keepB.hp = Math.round(rv.keepB.max * kMul(rv))
        rv.plan = rivalPlan(rv)
        for (let n = 0; n < 400; n++) {
            const res = rivalStep(rv, true)
            if (res === rv.tier || res === false) {
                break
            }
        }
    }
    GV.S.disc[HOME] = 1
    GV.S.disc[GV.S.riv[0].r] = 1
    GV.S.riv[0].atkIn = FIRST_RAID * DF().first
    GV.S.riv[0].nextFoe = 0
    refreshOwn(true)
    for (let i = 0; i < 6; i++) {
        spawnVillager(true)
    }
    addSoldier(GV.keep, KX + 0.5, KY + 2.6, 'captain')
    GV.selected = null
    GV.armed = null
    GV.curSeason = -1
    pathMap.fill(0)
    recomputePaths(true)
    drawGroundAll()
}
export function snapshot() {
    return JSON.stringify({
        v: SAVE_VERSION,
        seed: GV.S.seed,
        res: GV.S.res,
        t: GV.S.t,
        wave: GV.S.wave,
        tmod: GV.S.tmod,
        conq: GV.S.conq,
        disc: GV.S.disc,
        loot: GV.S.loot,
        banners: GV.S.banners.map((b?) => ({
            id: b.id,
            x: b.x,
            y: b.y,
            n: b.n === undefined ? null : b.n,
            st: b.st,
            eng: b.eng,
        })),
        capLvl: GV.S.capLvl,
        capXp: GV.S.capXp,
        capDown: GV.capU ? 0 : Math.max(1, GV.S.capDown),
        evCd: GV.S.evCd,
        won: GV.S.won,
        diff: GV.S.diff,
        riv: GV.S.riv.map((r?) => ({
            awake: r.awake,
            dead: r.dead,
            wealth: Math.round(r.wealth),
            pi: r.pi,
            k: r.k,
            atkIn: r.out ? 45 : r.atkIn,
            truce: r.truce,
            nf: r.out ? r.foe : r.nextFoe,
            hc: Math.round(r.heroCd || 0),
        })),
        rc: GV.S.rconq,
        b: GV.S.b.map((b?) => ({
            t: b.t,
            x: b.x,
            y: b.y,
            o: b.o,
            l: b.lvl,
            h: Math.round(b.hp),
            a: b.auto ? 1 : 0,
            s:
                DEF[b.t].garrison && b.o === 0
                    ? GV.S.sold
                          .filter((x?) => x.home === b && x.kind !== 'captain')
                          .map((x?) => x.kind)
                    : 0,
            k: b.trainKind || 0,
            g:
                b.stw > 0 || b.dig > 0
                    ? [+(b.stw || 0).toFixed(2), +(b.dig || 0).toFixed(2)]
                    : undefined,
        })),
        vill: GV.S.vill.length,
        stance: GV.S.stance,
        mercs: GV.S.sold
            .filter(
                (s?) =>
                    s.home === GV.keep &&
                    s.kind !== 'captain' &&
                    s.kind !== 'scout'
            )
            .map((s?) => s.kind),
    })
}
export function loadFrom(o?) {
    o = migrateSave(o)
    if (!o || !Array.isArray(o.b) || !Array.isArray(o.riv)) {
        throw new Error('bad save')
    }
    GV.S = blank()
    bmap.fill(null)
    GV.keep = null
    GV.parts = []
    GV.capU = null
    GV.S.seed = o.seed
    for (const r of RES) {
        GV.S.res[r] = +o.res[r] || 0
    }
    GV.S.t = o.t || 0
    GV.S.wave = o.wave || 0
    GV.S.tmod = o.tmod || {}
    GV.S.conq = o.conq || {}
    GV.S.disc = o.disc || {}
    GV.S.loot = o.loot || {}
    GV.S.banners = (Array.isArray(o.banners) ? o.banners : [])
        .filter(
            (b?) =>
                b && b.id >= 1 && b.id <= MAX_BANNERS && inMap(b.x | 0, b.y | 0)
        )
        .slice(0, MAX_BANNERS)
        .map((b?) => ({
            id: b.id | 0,
            x: b.x | 0,
            y: b.y | 0,
            n: typeof b.n === 'number' && b.n >= 1 ? b.n | 0 : null,
            st: b.st === 'hold' ? 'hold' : 'charge',
            eng: b.eng === 'tunnel' ? 'tunnel' : 'tower',
        }))
        .filter((b?, i?, all?) => all.findIndex((o?) => o.id === b.id) === i)
    GV.S.capLvl = o.capLvl || 1
    GV.S.capXp = o.capXp || 0
    GV.S.capDown = o.capDown || 0
    GV.S.evCd = o.evCd || 120
    GV.S.won = !!o.won
    GV.S.diff = o.diff >= 0 && o.diff < DIFFS.length ? o.diff | 0 : 2
    GV.nextDiff = GV.S.diff
    genWorld(GV.S.seed)
    applyTerrain()
    for (let k = 0; k < NRIV; k++) {
        const rv = makeRival(k),
            q = o.riv[k] || {}
        Object.assign(rv, {
            awake: !!q.awake,
            dead: !!q.dead,
            wealth: q.wealth || 0,
            pi: q.pi || 0,
            k: q.k || 0,
            atkIn: q.atkIn || 90,
            truce: q.truce || 0,
            nextFoe: q.nf === undefined ? null : q.nf,
            heroCd: q.hc || 0,
        })
        GV.S.riv.push(rv)
    }
    GV.S.rconq = o.rc && typeof o.rc === 'object' ? o.rc : {}
    for (const q of o.b) {
        if (!DEF[q.t] || !inMap(q.x, q.y)) {
            continue
        }
        const b = addB(q.t, q.x, q.y, true, q.o || 0)
        if (q.t === 'keep') {
            b.lvl = Math.min(3, Math.max(1, q.l | 0))
            b.max = DEF.keep.hp[b.lvl - 1]
            if (b.o === 0) {
                GV.keep = b
            } else {
                const rv = rivById(b.o)
                if (rv) {
                    rv.keepB = b
                    b.max = Math.round(b.max * kMul(rv))
                }
            }
        }
        b.hp = Math.min(b.max, q.h || b.max)
        b.auto = !!q.a
        if (q.k) {
            b.trainKind = q.k
        }
        if (Array.isArray(q.g)) {
            b.stw = +q.g[0] || 0
            b.dig = +q.g[1] || 0
        }
        if (Array.isArray(q.s)) {
            for (const kd of q.s) {
                if (UNITS[kd]) {
                    addSoldier(b, b.x + 0.5, b.y + 0.6, kd)
                }
            }
        }
    }
    if (!GV.keep) {
        throw new Error('no keep')
    }
    for (const rv of GV.S.riv) {
        rv.plan = rivalPlan(rv)
        if (!rv.keepB) {
            rv.dead = true
        }
    }
    for (let i = 0; i < (o.vill | 0); i++) {
        spawnVillager(true)
    }
    if (Array.isArray(o.mercs)) {
        for (const kd of o.mercs) {
            if (UNITS[kd]) {
                addSoldier(GV.keep, KX + 0.5, KY + 2.6, kd)
            }
        }
    }
    GV.S.stance = o.stance === 'hold' ? 'hold' : 'charge'
    if (!GV.S.capDown) {
        addSoldier(GV.keep, KX + 0.5, KY + 2.6, 'captain')
    }
    refreshOwn(true)
    GV.curSeason = -1
    pathMap.fill(0)
    recomputePaths(true)
    drawGroundAll()
}
GV.saveBusy = false
export const store =
    (window as any).storage ||
    (() => {
        try {
            const k = '__thornwick_probe'
            localStorage.setItem(k, '1')
            localStorage.removeItem(k)
        } catch (e) {
            return null
        }
        return {
            async get(key?) {
                const v = localStorage.getItem(key)
                return v === null ? null : { key, value: v }
            },
            async set(key?, value?) {
                localStorage.setItem(key, value)
            },
            async delete(key?) {
                localStorage.removeItem(key)
            },
        }
    })()
export async function save() {
    if (!store || !GV.S || GV.S.over || GV.saveBusy) {
        return
    }
    GV.saveBusy = true
    try {
        await store.set(SAVE_KEY, snapshot(), false)
    } catch {
        // storage can be blocked (private mode); the game runs without it
    }
    GV.saveBusy = false
}
export async function wipeSave() {
    if (!store) {
        return
    }
    try {
        await store.delete(SAVE_KEY, false)
    } catch {
        // storage can be blocked (private mode); the game runs without it
    }
}
