/* The deeper economy: production chains, the needs of the people, research,
   trade with other lords, the history behind the charts, and trees and rocks
   that run out. Other modules call in through a few small hooks. */
import { DEF, N, WALLISH } from './config'
import { GOOD, GOODS, amountText } from './goods'
import { groundTileChanged } from './ground'
import { afford, gain, pay, pop, puff, toast } from './helpers'
import { setTerr } from './lords'
import { hsh } from './noise'
import { door, frontTile, search, terrCost, trace } from './path'
import { follow, goTo } from './people'
import { bmap, regAt, rivById, terrain } from './state'
import { GV } from './vars'

/* ---------- state ---------- */
/** Adds the economy's fields to a fresh game state. */
export function ecoInit(s?) {
    for (const g of GOODS) {
        s.res[g] = 0
    }
    s.res.weapons = 20
    s.tech = {}
    s.rs = null
    s.trade = []
    s.hist = []
    s.amt = {}
    s.acc = { cloth: 0, tools: 0 }
    s.need = { food: 0, ale: 0, cloth: 0, chapel: 0, sat: 0 }
    s.ateBread = false
    s.aleCov = 0
    s.clothCov = 0
    s.ecoT = { need: 0, cloth: 10, tools: 10, hist: 10, warn: 0 }
}
/** The economy's part of a save. */
export function ecoSave() {
    const S = GV.S
    return {
        tech: S.tech,
        rs: S.rs ? { id: S.rs.id, p: Math.round(S.rs.p) } : null,
        tr: S.trade.map((r?) => ({ r: r.r, s: r.s, b: r.b })),
        h: S.hist,
        am: S.amt,
        ac: S.acc,
    }
}
export function ecoLoad(o?) {
    const S = GV.S,
        e = o.eco || {}
    for (const g of GOODS) {
        S.res[g] = Math.max(0, +(o.res && o.res[g]) || 0)
    }
    S.tech = e.tech && typeof e.tech === 'object' ? e.tech : {}
    S.rs =
        e.rs && RES_BY[e.rs.id] && !S.tech[e.rs.id]
            ? { id: e.rs.id, p: +e.rs.p || 0 }
            : null
    S.trade = Array.isArray(e.tr)
        ? e.tr
              .filter(
                  (r?) =>
                      r &&
                      rivById(r.r) &&
                      !rivById(r.r).dead &&
                      TRADE_GOODS.includes(r.s) &&
                      TRADE_GOODS.includes(r.b)
              )
              .map((r?) => newRoute(r.r, r.s, r.b))
        : []
    S.hist = Array.isArray(e.h) ? e.h.slice(-HIST_MAX) : []
    S.amt = e.am && typeof e.am === 'object' ? e.am : {}
    if (e.ac) {
        S.acc = { cloth: +e.ac.cloth || 0, tools: +e.ac.tools || 0 }
    }
    needsTick()
}

/* ---------- finite trees and rocks ---------- */
/** How much a fresh tree (120 to 180 wood) or rock (120 to 200 stone) holds. */
export const fullAmt = (i?, t?) =>
    t === 1
        ? 120 + ((hsh(i % N, (i / N) | 0, GV.S.seed + 11) * 61) | 0)
        : 120 + ((hsh(i % N, (i / N) | 0, GV.S.seed + 12) * 81) | 0)
export function siteLeft(x?, y?) {
    const i = x + y * N,
        t = terrain[i]
    if (t !== 1 && t !== 2) {
        return 0
    }
    return GV.S.amt[i] !== undefined ? GV.S.amt[i] : fullAmt(i, t)
}
/** Forget what was taken from a tile, when it is cleared or planted anew. */
export function resetSite(i?) {
    delete GV.S.amt[i]
}
/* Clear a used-up tree or rock. Cheaper than setTerr(..., true), which rebuilds
   every prop and every road: a cleared tile only gets a little easier to cross,
   so roads and the raiders' flow field can wait for their next refresh. */
function clearSite(x?, y?, t?) {
    setTerr(x, y, 0, false)
    const other = (p?) => p[0] !== x || p[1] !== y
    if (t === 1) {
        GV.trees = GV.trees.filter(other)
        GV.myTrees = GV.myTrees.filter(other)
    } else {
        GV.rocks = GV.rocks.filter(other)
        GV.myRocks = GV.myRocks.filter(other)
    }
    GV.props = GV.props.filter((p?) => p.x !== x || p.y !== y)
    // Only water and roads blend into the tiles next door, so one repaint will do.
    groundTileChanged(x, y)
}
/** Take wood or stone from a tree or rock. An empty one disappears. */
export function harvest(x?, y?, n?) {
    const i = x + y * N,
        t = terrain[i]
    if (t !== 1 && t !== 2) {
        return
    }
    const left = siteLeft(x, y) - n
    if (left > 0) {
        GV.S.amt[i] = left
        return
    }
    delete GV.S.amt[i]
    clearSite(x, y, t)
    puff(x, y, 5, t === 1 ? '#6c9a4a' : '#b5b4aa')
    const few = t === 1 ? GV.myTrees.length : GV.myRocks.length,
        user = GV.S.b.some(
            (b?) => b.o === 0 && b.t === (t === 1 ? 'lumber' : 'quarry')
        )
    if (user && !GV.treeTold && t === 1 && few > 8) {
        GV.treeTold = true
        toast(
            'A tree is used up and gone. Trees and rocks run out: plant new trees from the Decor tab for 3 wood each.'
        )
    } else if (user && few <= 8 && GV.S.t > GV.S.ecoT.warn) {
        GV.S.ecoT.warn = GV.S.t + 150
        toast(
            t === 1
                ? few
                    ? 'Only ' +
                      few +
                      (few === 1 ? ' tree is' : ' trees are') +
                      ' left on your land. Plant trees from the Decor tab, or claim a forest with an outpost.'
                    : 'The last tree on your land is felled. Plant trees from the Decor tab, or claim a forest with an outpost.'
                : few
                  ? 'Only ' +
                    few +
                    (few === 1 ? ' rock is' : ' rocks are') +
                    ' left on your land. Claim rocky hills with an outpost.'
                  : 'The last rock on your land is cut. Claim rocky hills with an outpost.'
        )
    }
}

/* ---------- workers ---------- */
const TOOL_JOB = {
    farmer: 1,
    fisher: 1,
    woodcutter: 1,
    mason: 1,
    miner: 1,
    shepherd: 1,
}
export const toolBonus = () => (GV.S.tech.tools2 ? 0.35 : 0.2)
/** How fast a worker works: content people and good tools both help. */
export function workMul(u?) {
    return (
        1 +
        0.25 * GV.S.need.sat +
        (TOOL_JOB[u.role] && GV.S.res.tools >= 1 ? toolBonus() : 0)
    )
}
/** Spare food the miller and brewer may use: they leave this much for the people. */
export const foodReserve = () => Math.max(40, pop() * 3)
/* Workplace jobs: walk to the building, then work there in cycles. */
export const CRAFT = {
    miner: 8,
    shepherd: 10,
    weaver: 10,
    miller: 8,
    baker: 8,
    brewer: 10,
    smith: 10,
    scholar: 1,
}
export const mineYield = (b?) =>
    (regAt(b.x, b.y).type === 'hills' ? 3 : 2) + (GV.S.tech.deep ? 1 : 0)
/** What one work cycle takes and makes, for a building. */
export function recipeOf(b?) {
    switch (b.t) {
        case 'ironmine':
            return { inp: {}, out: { iron: mineYield(b) } }
        case 'sheep':
            return { inp: {}, out: { wool: 3 } }
        case 'weaver':
            return { inp: { wool: 3 }, out: { cloth: 2 } }
        case 'mill':
            return { inp: { food: 5 }, out: { flour: 5 }, keep: 1 }
        case 'bakery':
            return { inp: { flour: 4, wood: 1 }, out: { bread: 8 } }
        case 'brewery':
            return { inp: { food: 4 }, out: { ale: 4 }, keep: 1 }
        case 'smith': {
            const mk = b.mk || 'both',
                g = mk === 'both' ? (b.alt ? 'tools' : 'weapons') : mk
            return { inp: { iron: 2, wood: 1 }, out: { [g]: 1 } }
        }
    }
    return { inp: {}, out: {} }
}
/** The first input that is missing, or ''. */
function lackOf(b?, rc?) {
    for (const [r, n] of Object.entries<any>(rc.inp)) {
        const have = GV.S.res[r] - (rc.keep && r === 'food' ? foodReserve() : 0)
        if (have < n) {
            return r
        }
    }
    return ''
}
export const isCraft = (role?) => CRAFT[role] !== undefined
export function craftUpdate(u?, dt?) {
    const b = u.job
    switch (u.state) {
        case 'start': {
            const d = door(b),
                f = frontTile(b)
            goTo(
                u,
                f % N,
                (f / N) | 0,
                d[0] + (Math.random() - 0.5) * 0.4,
                d[1] + (Math.random() - 0.5) * 0.3
            )
            u.state = 'take'
            return
        }
        case 'take': {
            if (u.role === 'scholar') {
                u.state = GV.S.rs ? 'work' : 'stall'
                u.timer = 2
                b.lack = GV.S.rs ? '' : 'plan'
                return
            }
            const rc = recipeOf(b),
                lack = lackOf(b, rc)
            b.lack = lack
            if (lack) {
                u.state = 'stall'
                u.timer = 2
                return
            }
            pay(rc.inp)
            u.make = rc.out
            u.state = 'work'
            u.timer = CRAFT[u.role]
            return
        }
        case 'stall':
            if ((u.timer -= dt) <= 0) {
                u.state = 'take'
            }
            return
        case 'work': {
            const m = workMul(u)
            if (u.role === 'scholar') {
                if (!GV.S.rs) {
                    u.state = 'take'
                    return
                }
                researchTick(dt * m)
                return
            }
            if ((u.timer -= dt * m) > 0) {
                return
            }
            for (const [r, n] of Object.entries<any>(u.make || {})) {
                gain(r, n, b.cx, b.cy)
            }
            if (b.t === 'smith' && (b.mk || 'both') === 'both') {
                b.alt = !b.alt
            }
            u.make = null
            u.state = 'take'
            return
        }
        default:
            u.state = 'start'
    }
}
/** Farm harvest per trip, with the mill, the season and research. */
export function farmYield(b?, se?, millNear?) {
    if (se === 3 && !GV.S.tech.plough) {
        return 0
    }
    const base = millNear ? 4.5 : 3,
        sea = se === 2 ? 1.5 : se === 3 ? 1 / 3 : 1
    return Math.max(1, Math.round(base * sea * (GV.S.tech.crop ? 1.25 : 1)))
}

/* ---------- eating, taverns and needs ---------- */
/** Feed `need` mouths: bread first for up to half, then food. True when all are fed. */
export function eat(need?) {
    const r = GV.S.res
    let bread = Math.min(Math.floor(r.bread), Math.floor(need / 2))
    let rest = need - bread
    if (r.food < rest) {
        const more = Math.min(Math.floor(r.bread) - bread, rest - r.food)
        bread += Math.max(0, more)
        rest -= Math.max(0, more)
    }
    r.bread -= bread
    GV.S.ateBread = bread > 0
    if (r.food >= rest) {
        r.food -= rest
        return true
    }
    r.food = 0
    return false
}
/** Food and bread together, for growth checks. */
export const stores = () => GV.S.res.food + GV.S.res.bread
/** Every 10 seconds: taverns earn gold, more when they pour ale. */
export function tavernTick() {
    const v = GV.S.vill.length
    let left = v,
        withAle = 0
    for (const b of GV.S.b) {
        if (b.t !== 'tavern' || b.o !== 0 || left <= 0) {
            continue
        }
        const n = Math.min(left, 12)
        left -= 12
        let g = Math.floor(n / 3)
        const ale = Math.ceil(n / 4)
        if (n > 0 && GV.S.res.ale >= ale) {
            GV.S.res.ale -= ale
            withAle += n
            g = Math.floor(n / 2)
        }
        if (g > 0) {
            gain('gold', g, b.x, b.y)
        }
    }
    GV.S.aleCov = v ? withAle / v : 0
}
export const CHAPEL_R = 10
export const homes = () =>
    GV.S.b.filter((b?) => b.o === 0 && (b.t === 'house' || b.t === 'shouse'))
export function needsTick() {
    const S = GV.S,
        r = S.res,
        n = S.need
    const fish = S.b.some((b?) => b.o === 0 && b.t === 'fisher' && b.w > 0)
    n.food = ((r.food > 0 ? 1 : 0) + (fish ? 1 : 0) + (S.ateBread ? 1 : 0)) / 3
    n.ale = S.aleCov
    n.cloth = S.clothCov
    const hs = homes(),
        ch = S.b.filter((b?) => b.o === 0 && b.t === 'chapel')
    n.chapel = hs.length
        ? hs.filter((h?) =>
              ch.some((c?) => Math.hypot(c.cx - h.cx, c.cy - h.cy) <= CHAPEL_R)
          ).length / hs.length
        : 0
    n.sat = S.vill.length ? (n.food + n.ale + n.cloth + n.chapel) / 4 : 0
}
/** Growth: content villagers draw settlers up to 35% faster. Only a town of
    40 or more slows down, and only while less than 40% of the needs are met. */
export const BIG_TOWN = 40
export function growMul() {
    const s = GV.S.need.sat
    let m = 1 - 0.35 * s
    if (pop() >= BIG_TOWN && s < 0.4) {
        m += 0.25 * (1 - s / 0.4)
    }
    return m
}
export const moodWord = (s?) =>
    s < 0.25
        ? 'Wanting'
        : s < 0.5
          ? 'Getting by'
          : s < 0.75
            ? 'Content'
            : 'Happy'

/* ---------- research ---------- */
export const RESEARCH = [
    {
        id: 'crop',
        name: 'Crop rotation',
        cost: { gold: 60, food: 60 },
        time: 90,
        eff: 'Farms harvest a quarter more.',
    },
    {
        id: 'tools2',
        name: 'Better tools',
        cost: { gold: 60, iron: 20 },
        time: 100,
        eff: 'Tools make workers 35% faster instead of 20%, and wear out half as fast.',
    },
    {
        id: 'plough',
        name: 'Heavy plough',
        cost: { gold: 80, tools: 10 },
        time: 120,
        eff: 'Farms keep working in winter, at a third of their harvest.',
    },
    {
        id: 'deep',
        name: 'Deep mining',
        cost: { gold: 80, tools: 10 },
        time: 120,
        eff: 'Iron mines dig 1 more iron each trip, and masons cut 1 more stone.',
    },
    {
        id: 'masonry',
        name: 'Masonry',
        cost: { gold: 100, stone: 120 },
        time: 120,
        eff: 'Stone walls, towers and gatehouses take a quarter less damage.',
    },
    {
        id: 'longbows',
        name: 'Longbows',
        cost: { gold: 100, wood: 60, weapons: 10 },
        time: 120,
        eff: 'Archers, watchtowers, towers and outposts shoot 1 tile further.',
    },
    {
        id: 'herbal',
        name: 'Herbal lore',
        cost: { gold: 70, cloth: 10 },
        time: 90,
        eff: 'Fires burn out twice as fast, and fever no longer strikes the village.',
    },
    {
        id: 'charter',
        name: 'Trade charters',
        cost: { gold: 120, cloth: 10 },
        time: 150,
        eff: 'Caravans carry half as much again and get better prices.',
    },
]
export const RES_BY = Object.fromEntries(RESEARCH.map((r?) => [r.id, r]))
export function startResearch(id?) {
    const R = RES_BY[id],
        S = GV.S
    if (!R || S.tech[id]) {
        return false
    }
    if (S.rs) {
        toast('Your scholars are busy with ' + RES_BY[S.rs.id].name + '.')
        return false
    }
    if (!afford(R.cost)) {
        toast('Not enough stores to study ' + R.name.toLowerCase() + '.')
        return false
    }
    pay(R.cost)
    S.rs = { id, p: 0 }
    toast('Your scholars begin to study ' + R.name.toLowerCase() + '.')
    return true
}
export function researchTick(d?) {
    const S = GV.S
    if (!S.rs) {
        return
    }
    S.rs.p += d
    const R = RES_BY[S.rs.id]
    if (S.rs.p >= R.time) {
        S.tech[R.id] = 1
        S.rs = null
        toast(
            'Your scholars have mastered ' + R.name.toLowerCase() + '. ' + R.eff
        )
    }
}
export const scholars = () =>
    GV.S.vill.filter((u?) => u.role === 'scholar' && u.state === 'work').length
/** Masonry: own stone walls, towers and gates take less damage. */
export const wallDmgMul = (b?) =>
    GV.S.tech.masonry && b.o === 0 && WALLISH[b.t] && b.t !== 'palisade'
        ? 0.75
        : 1
/** Longbows: extra reach for own archers and towers. */
export const reachBonus = () => (GV.S.tech.longbows ? 1 : 0)
/** Herbal lore: fires burn out faster. */
export const fireMul = () => (GV.S.tech.herbal ? 2 : 1)

/* ---------- trade ---------- */
export const TRADE_GOODS = ['food', 'wood', 'stone', 'gold', ...GOODS]
export const RESERVE = { food: 60, wood: 40, stone: 40, gold: 40 }
export const SPEC = {
    meadow: ['food', 'wool', 'bread'],
    hills: ['stone', 'iron'],
    gold: ['cloth', 'ale'],
    any: ['weapons', 'tools'],
    forest: ['wood', 'tools'],
    lake: ['food', 'ale'],
}
export const specOf = (rv?) => SPEC[rv.prof.focus] || []
export const capOf = (g?) =>
    Math.round((g === 'gold' ? 60 : 40) * (GV.S.tech.charter ? 1.5 : 1))
/** What a lord pays for one of your goods, in gold. */
export const sellPrice = (rv?, g?) =>
    g === 'gold' ? 1 : GOOD[g].price * (GV.S.tech.charter ? 1 : 0.9)
/** What a lord asks for one of their goods, in gold. */
export const buyPrice = (rv?, g?) =>
    g === 'gold'
        ? 1
        : GOOD[g].price *
          (specOf(rv).includes(g) ? 0.8 : 1.25) *
          (GV.S.tech.charter ? 0.9 : 1)
/** A host of this lord marches on Thornwick. A truce counts as peace. */
export const hostile = (rv?) =>
    (rv.out && rv.foe === 0) ||
    GV.S.en.some((e?) => e.fac === rv.id && e.mode === 'atk')
export const known = (rv?) => GV.regs[rv.r].disc
export const myMarkets = () =>
    GV.S.b.filter((b?) => b.o === 0 && b.t === 'market')
export const ROUTE_COST = 20
function newRoute(r?, s?, b?) {
    return { r, s, b, st: 'home', t: 2, c: null, note: '', last: '' }
}
export function openRoute(id?) {
    const S = GV.S,
        rv = rivById(id)
    if (!rv || rv.dead || !known(rv)) {
        return false
    }
    if (S.trade.some((r?) => r.r === id)) {
        return false
    }
    if (S.trade.length >= myMarkets().length) {
        toast(
            myMarkets().length
                ? 'Each market can run one trade route. Build another market for more.'
                : 'Build a market first. Caravans set out from there.'
        )
        return false
    }
    if (hostile(rv)) {
        toast(rv.name + ' is at war with you. No caravan would be safe.')
        return false
    }
    if (S.res.gold < ROUTE_COST) {
        toast('A trade route costs ' + ROUTE_COST + ' gold to open.')
        return false
    }
    S.res.gold -= ROUTE_COST
    const spec = specOf(rv)
    S.trade.push(newRoute(id, 'wood', spec[0] || 'gold'))
    toast(
        'A trade route to ' +
            rv.name +
            ' is open. The first caravan sets out soon.'
    )
    return true
}
export function closeRoute(id?) {
    const S = GV.S,
        r = S.trade.find((q?) => q.r === id)
    if (!r) {
        return
    }
    if (r.c && r.c.cargo && r.c.cargo.n && r.c.cargo.g === r.s && !r.c.back) {
        S.res[r.s] += r.c.cargo.n
    }
    S.trade.splice(S.trade.indexOf(r), 1)
}
/** About what one caravan of this route would carry out and bring back. */
export function estimate(rt?) {
    const rv = rivById(rt.r),
        have = Math.floor(GV.S.res[rt.s] - (RESERVE[rt.s] || 0)),
        n = Math.max(0, Math.min(capOf(rt.s), have)),
        val = n * sellPrice(rv, rt.s),
        back =
            rt.b === 'gold'
                ? Math.floor(val)
                : Math.floor(val / buyPrice(rv, rt.b))
    return { n, back }
}
/** Buildings a caravan can pass: anything walkable, any lord's. */
const roadCost = (i?) => {
    const b = bmap[i]
    if (b && !DEF[b.t].walk) {
        return Infinity
    }
    return terrCost(i, b)
}
function roadTo(m?, rv?) {
    const k = rv.keepB
    if (!k || k.dead) {
        return null
    }
    const s = frontTile(m),
        t = frontTile(k)
    if (!search([s], t, roadCost)) {
        return null
    }
    const pts = trace(s, t).map((i?) => [i % N, (i / N) | 0])
    pts.pop()
    pts.push(door(k))
    return pts
}
function sendCaravan(rt?, rv?) {
    const S = GV.S,
        ms = myMarkets()
    if (!ms.length) {
        rt.note = 'Needs a market.'
        return false
    }
    if (hostile(rv)) {
        rt.note = 'Paused while ' + rv.name + ' is at war with you.'
        return false
    }
    const k = rv.keepB
    const m = ms.sort(
        (a?, c?) =>
            Math.hypot(a.cx - k.cx, a.cy - k.cy) -
            Math.hypot(c.cx - k.cx, c.cy - k.cy)
    )[0]
    const e = estimate(rt)
    if (e.n < 5) {
        rt.note =
            'Waiting for ' +
            GOOD[rt.s].name.toLowerCase() +
            ' to send' +
            (RESERVE[rt.s] ? ' (it keeps ' + RESERVE[rt.s] + ' at home).' : '.')
        return false
    }
    const path = roadTo(m, rv)
    if (!path || !path.length) {
        rt.note = 'There is no road to ' + rv.name + '.'
        rt.t = 15
        return false
    }
    S.res[rt.s] -= e.n
    const d = door(m)
    rt.c = {
        x: d[0],
        y: d[1],
        full: [...path],
        path,
        pi: 0,
        back: false,
        home: m,
        cargo: { g: rt.s, n: e.n },
        walk: 0,
        moving: false,
        face: 1,
        sw: 0,
        robT: 0,
    }
    rt.st = 'out'
    rt.note = ''
    return true
}
function turnBack(c?) {
    const back = c.full.slice(0, Math.max(0, c.pi)).reverse()
    const d = c.home && !c.home.dead ? door(c.home) : null
    if (d) {
        back.push(d)
    }
    c.path = back.length ? back : null
    c.pi = 0
    c.back = true
}
function caravanTick(rt?, rv?, dt?) {
    const S = GV.S,
        c = rt.c
    if (rt.st === 'trade') {
        if ((rt.t -= dt) <= 0) {
            rt.st = 'back'
            c.back = true
            c.pi = 0
            c.path = c.full.slice().reverse()
            if (c.home && !c.home.dead) {
                c.path.push(door(c.home))
            }
        }
        return
    }
    if (!c.back && hostile(rv)) {
        turnBack(c)
        rt.st = 'back'
        rt.note = 'Turned back: ' + rv.name + ' is at war with you.'
    }
    if (c.path) {
        const ox = c.x,
            oy = c.y
        follow(c, dt, 1.5)
        const dx = c.x - ox,
            dy = c.y - oy
        if (Math.abs(dx) + Math.abs(dy) > 1e-4) {
            c.sw = Math.abs(dx) < Math.abs(dy) ? 1 : 0
            c.rev = (c.sw ? dy : dx) < 0 ? 1 : 0
        }
    }
    c.moving = !!c.path
    if ((c.robT -= dt) <= 0) {
        c.robT = 0.5
        if (c.cargo && c.cargo.n) {
            for (const e of S.en) {
                if (
                    !e.dead &&
                    (e.fac === 9 || e.mode === 'atk') &&
                    Math.hypot(e.x - c.x, e.y - c.y) < 1.4
                ) {
                    const who =
                        e.fac === 9
                            ? 'Bandits'
                            : 'Raiders of ' +
                              ((rivById(e.fac) || {}).name || 'a rival lord')
                    toast(
                        who +
                            ' robbed your caravan on the road to ' +
                            rv.name +
                            '. The goods are lost: ' +
                            amountText(c.cargo.g, c.cargo.n) +
                            '.'
                    )
                    puff(c.x, c.y, 6, '#b9b0a0')
                    rt.last = 'Robbed on the road.'
                    c.cargo = null
                    if (!c.back) {
                        turnBack(c)
                        rt.st = 'back'
                    }
                    break
                }
            }
        }
    }
    if (c.path) {
        return
    }
    if (!c.back) {
        // At the lord's keep: sell, then buy what was asked for.
        const val = c.cargo ? c.cargo.n * sellPrice(rv, c.cargo.g) : 0
        const n =
            rt.b === 'gold'
                ? Math.floor(val)
                : Math.floor(val / buyPrice(rv, rt.b))
        rt.last =
            'Last caravan: ' +
            (c.cargo ? amountText(c.cargo.g, c.cargo.n) : 'nothing') +
            ' out, ' +
            amountText(rt.b, n) +
            ' back.'
        rv.wealth += val * 0.3
        c.cargo = n > 0 ? { g: rt.b, n } : null
        rt.st = 'trade'
        rt.t = 3
        return
    }
    // Home again.
    if (c.cargo && c.cargo.n) {
        gain(c.cargo.g, c.cargo.n, c.x, c.y)
    }
    rt.c = null
    rt.st = 'home'
    rt.t = 8
}
export function tradeTick(dt?) {
    const S = GV.S
    for (const rt of S.trade.slice()) {
        const rv = rivById(rt.r)
        if (!rv || rv.dead) {
            S.trade.splice(S.trade.indexOf(rt), 1)
            if (rv) {
                toast(
                    'The trade route to ' +
                        rv.name +
                        ' is closed: their keep has fallen.'
                )
            }
            continue
        }
        if (rt.c) {
            caravanTick(rt, rv, dt)
        } else if ((rt.t -= dt) <= 0) {
            rt.t = 5
            sendCaravan(rt, rv)
        }
    }
}
/** Caravans on the road, for drawing. */
export const caravans = () =>
    GV.S.trade.filter((r?) => r.c && r.st !== 'trade').map((r?) => r.c)

/* ---------- the regular economy tick ---------- */
export const HIST_MAX = 180
export const goodsTotal = () =>
    GOODS.reduce((n?, g?) => n + Math.floor(GV.S.res[g]), 0)
export function sample() {
    const r = GV.S.res
    GV.S.hist.push([
        Math.floor(r.food),
        Math.floor(r.wood),
        Math.floor(r.stone),
        Math.floor(r.gold),
        goodsTotal(),
        pop(),
    ])
    if (GV.S.hist.length > HIST_MAX) {
        GV.S.hist.splice(0, GV.S.hist.length - HIST_MAX)
    }
}
export function ecoTick(dt?) {
    const S = GV.S,
        T = S.ecoT
    if ((T.need -= dt) <= 0) {
        T.need = 5
        needsTick()
    }
    if ((T.cloth -= dt) <= 0) {
        T.cloth = 10
        S.acc.cloth += S.vill.length / 20
        const want = Math.floor(S.acc.cloth)
        if (want > 0) {
            const used = Math.min(want, Math.floor(S.res.cloth))
            S.res.cloth -= used
            S.acc.cloth -= want
            S.clothCov = used / want
        } else {
            S.clothCov = S.res.cloth >= 1 ? 1 : 0
        }
    }
    if ((T.tools -= dt) <= 0) {
        T.tools = 10
        if (S.res.tools >= 1) {
            const n = S.vill.filter((u?) => TOOL_JOB[u.role]).length
            S.acc.tools += (n / 40) * (S.tech.tools2 ? 0.5 : 1)
            const k = Math.min(Math.floor(S.acc.tools), Math.floor(S.res.tools))
            S.res.tools -= k
            S.acc.tools -= k
        } else {
            S.acc.tools = 0
        }
    }
    if ((T.hist -= dt) <= 0) {
        T.hist = 10
        sample()
    }
    tradeTick(dt)
}
