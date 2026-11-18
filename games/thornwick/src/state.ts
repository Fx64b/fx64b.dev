import {
    DAYLEN,
    DEF,
    DF,
    FIRST_RAID,
    HOME,
    KX,
    KY,
    LORDS,
    N,
    NN,
    OX,
    OY,
    SEASONLEN,
} from './config'
import { ecoInit } from './eco'
import { drawGroundAll } from './ground'
import { refreshOwn } from './land'
import { livingInit } from './livingworld'
import { rivalPlan, rivalStep } from './lords'
import { hsh } from './noise'
import { recomputePaths } from './path'
import { addSoldier, spawnVillager } from './people'
import { GV } from './vars'
import { closeUnopened, genWorld, lordCols, worldInit } from './world'

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
export const fcol = (o?) => (o === 9 ? 10 : GV.fcm[o] || o)
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
export function applyTerrain() {
    terrain.set(baseTerr)
    for (const k in GV.S.tmod) {
        terrain[+k] = GV.S.tmod[k]
    }
    closeUnopened()
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
    const s = {
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
    ecoInit(s)
    livingInit(s)
    worldInit(s)
    return s
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
    // The lords build all the time across a large world: their buildings update
    // the raiders' paths a few seconds later, in one go.
    if (b.o === 0) {
        GV.flowDirty = GV.pathsDirty = true
    } else {
        GV.flowLazy = true
    }
    if (t === 'outpost') {
        GV.ownDirty = true
    }
    return b
}
export const kMul = (rv?) => 2 + 0.5 * rv.tier
/* Lord number k of the world's first lords, or (with o) a lord with this id, spot,
   profile (index into LORDS) and tier. */
export function makeRival(k?, o?) {
    o = o || {}
    const sp = o.sp || GV.rivSpots[k],
        lp = o.lp || k + 1,
        L = LORDS[lp]
    if (k < 0) {
        k = 3
    }
    return {
        id: o.id || k + 1,
        name: L.name,
        pers: L.pers,
        prof: L,
        lp,
        nw: o.nw ? 1 : 0,
        born: 0,
        ann: 0,
        deadT: 0,
        tier: o.tier || [1, 2, 2, 3, 3, 4, 4, 5][k],
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
    for (let k = 0; k < GV.rivSpots.length; k++) {
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
    lordCols()
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
