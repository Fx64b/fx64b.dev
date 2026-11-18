import { attackPing, firePing } from './alerts'
import { flankMul, fleeStep, inWood, shock } from './combat'
import { $, DEF, DF, DIFFS, HOME, KX, KY, N, WALLISH } from './config'
import { wallDmgMul } from './eco'
import { groundTileChanged } from './ground'
import {
    compass,
    flam,
    freeNear,
    gain,
    nearestSold,
    pop,
    puff,
    toast,
    wet,
} from './helpers'
import { baileyOf } from './land'
import { blocks, enemyCost, rivWalk, search, terrCost, trace } from './path'
import { follow, goTo, hitSold } from './people'
import {
    addB,
    bAt,
    baseTerr,
    bmap,
    clampN,
    flow,
    inMap,
    isNight,
    kMul,
    ownedT,
    rebuildProps,
    reg,
    rivById,
    save,
    season,
    terrain,
    tileI,
    wipeSave,
} from './state'
import { GV } from './vars'

export function rivalPlan(rv?) {
    const P = [],
        a = (t?, dx?, dy?) => P.push([t, rv.kx + dx, rv.ky + dy])
    const dxp = KX - rv.kx,
        dyp = KY - rv.ky
    const side =
        Math.abs(dxp) >= Math.abs(dyp) ? (dxp > 0 ? 0 : 1) : dyp > 0 ? 2 : 3
    const gate = [
            [6, 0],
            [-5, 1],
            [0, 6],
            [1, -5],
        ][side],
        w1 = [
            [4, 0],
            [-3, 1],
            [0, 4],
            [1, -3],
        ][side],
        w2 = [
            [4, 2],
            [-3, -1],
            [2, 4],
            [-1, -3],
        ][side]
    const ring = []
    for (let i = -5; i <= 6; i++) {
        ring.push([i, -5], [i, 6])
    }
    for (let j = -4; j <= 5; j++) {
        ring.push([-5, j], [6, j])
    }
    const corner = (p?) =>
        (p[0] === -5 || p[0] === 6) && (p[1] === -5 || p[1] === 6)
    const seg = ring
        .filter((p?) => !corner(p) && !(p[0] === gate[0] && p[1] === gate[1]))
        .sort(
            (p?, q?) =>
                Math.hypot(p[0] - gate[0], p[1] - gate[1]) -
                Math.hypot(q[0] - gate[0], q[1] - gate[1])
        )
    const corners = ring.filter(corner)
    const H = [
            [-2, 0],
            [3, 1],
            [0, 3],
            [1, -2],
            [-3, 3],
            [4, -2],
            [-3, -3],
            [4, 4],
        ],
        F = [
            [-9, -1],
            [8, 2],
            [-1, 8],
            [2, -9],
        ]
    const H2 = [
            [-7, 3],
            [8, -1],
            [3, 8],
            [-2, -7],
        ],
        F2 = [
            [-8, -6],
            [8, -5],
            [-6, 8],
            [6, 7],
        ]
    const pal = () => {
        a('gate', gate[0], gate[1])
        for (const p of seg) {
            a('palisade', p[0], p[1])
        }
        for (const p of corners) {
            a('palisade', p[0], p[1])
        }
    }
    const war = rv.pers === 'warlord'
    a('house', ...H[0])
    a('farm', ...F[0])
    a('house', ...H[1])
    P.push(['mark', 1])
    a('barracks', 3, -1)
    if (war) {
        a('barracks', -2, 2)
    }
    a('farm', ...F[1])
    a('house', ...H[2])
    if (!war) {
        pal()
    }
    a('watch', ...w1)
    a('house', ...H[3])
    if (war) {
        pal()
    }
    a('farm', ...F[2])
    a('smith', -1, -3)
    a('house', ...H[4])
    a('farm', ...F2[0])
    a('house', ...H2[0])
    P.push(['mark', 2])
    P.push(['keep2'])
    for (const p of seg) {
        a('wall', p[0], p[1])
    }
    for (const p of corners) {
        a('tower', p[0], p[1])
    }
    P.push(['mark', 3])
    if (!war) {
        a('barracks', -2, 2)
    }
    a('range', 3, 3)
    a('house', ...H[5])
    a('farm', ...F[3])
    a('farm', ...F2[1])
    a('house', ...H2[1])
    a('mangonel', -3, 0)
    P.push(['keep3'])
    a('house', ...H[6])
    a('house', ...H[7])
    a('watch', ...w2)
    a('farm', ...F2[2])
    a('farm', ...F2[3])
    a('house', ...H2[2])
    a('house', ...H2[3])
    P.push(['mark', 4])
    return P
}
export const planCostOf = (t?) =>
    t === 'keep2'
        ? 250
        : t === 'keep3'
          ? 500
          : Object.values<any>(DEF[t].cost).reduce((a?, c?) => a + c, 0)
export function setTerr(x?, y?, type?, draw?) {
    const i = x + y * N
    terrain[i] = type
    if (type === baseTerr[i]) {
        delete GV.S.tmod[i]
    } else {
        GV.S.tmod[i] = type
    }
    if (draw) {
        rebuildProps()
        GV.flowDirty = GV.pathsDirty = true
        if (GV.gcv) {
            for (const [a, b] of [
                [0, 0],
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]) {
                if (inMap(x + a, y + b)) {
                    groundTileChanged(x + a, y + b)
                }
            }
        }
    }
}
export function rivalStep(rv?, free?) {
    const P = rv.plan
    if (rv.pi >= P.length) {
        return false
    }
    const [t, x, y] = P[rv.pi]
    if (t === 'mark') {
        if (
            !free &&
            GV.S.t < ((x - 1) * 340) / (1 + 0.35 * (rv.tier - 1)) / DF().eco
        ) {
            return false
        }
        rv.pi++
        return x
    }
    const cost = planCostOf(t)
    if (!free && rv.wealth < cost) {
        return false
    }
    rv.pi++
    if (t === 'keep2' || t === 'keep3') {
        const k = rv.keepB
        if (!k || k.dead) {
            return true
        }
        k.lvl = t === 'keep2' ? 2 : 3
        const m = Math.round(DEF.keep.hp[k.lvl - 1] * kMul(rv))
        k.hp += m - k.max
        k.max = m
        if (!free) {
            k.drop = 1
            puff(k.cx, k.cy, 14)
        }
    } else {
        const s = DEF[t].size || 1
        for (let j = 0; j < s; j++) {
            for (let i = 0; i < s; i++) {
                if (x + i < 1 || y + j < 1 || x + i > N - 2 || y + j > N - 2) {
                    return true
                }
                const o2 = bmap[x + i + (y + j) * N]
                if (o2) {
                    if (o2.o === rv.id && s === 1 && o2.s === 1 && o2.t !== t) {
                        removeB(o2)
                    } else {
                        return true
                    }
                }
            }
        }
        for (let j = 0; j < s; j++) {
            for (let i = 0; i < s; i++) {
                if (terrain[x + i + (y + j) * N]) {
                    setTerr(x + i, y + j, 0, !free)
                }
            }
        }
        const b = addB(t, x, y, free, rv.id)
        if (!free) {
            puff(b.cx, b.cy, 6)
        }
    }
    if (!free) {
        rv.wealth -= cost
    }
    return true
}
/* A free spot of size s in region rg, as near to (cx, cy) as possible. */
export function regionSpot(rg?, s?, cx?, cy?, maxR?) {
    for (let r = 0; r <= (maxR || 7); r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) {
                    continue
                }
                const x = Math.round(cx) + dx,
                    y = Math.round(cy) + dy
                let ok = x >= 2 && y >= 2 && x + s < N - 2 && y + s < N - 2
                for (let j = 0; ok && j < s; j++) {
                    for (let i = 0; ok && i < s; i++) {
                        const t = x + i + (y + j) * N
                        if (reg[t] !== rg.id || bmap[t] || terrain[t] >= 3) {
                            ok = false
                        }
                    }
                }
                // Keep a free ring round it so lords do not wall in their own people.
                for (let j = -1; ok && j <= s; j++) {
                    for (let i = -1; ok && i <= s; i++) {
                        const b = bAt(x + i, y + j)
                        if (b && !DEF[b.t].soft) {
                            ok = false
                        }
                    }
                }
                if (ok) {
                    return [x, y]
                }
            }
        }
    }
    return null
}
export function rivalBuild(rv?, t?, rg?, cx?, cy?, maxR?) {
    const s = DEF[t].size || 1,
        sp = regionSpot(rg, s, cx, cy, maxR)
    if (!sp) {
        return null
    }
    for (let j = 0; j < s; j++) {
        for (let i = 0; i < s; i++) {
            if (terrain[sp[0] + i + (sp[1] + j) * N]) {
                setTerr(sp[0] + i, sp[1] + j, 0, true)
            }
        }
    }
    const b = addB(t, sp[0], sp[1], false, rv.id)
    puff(b.cx, b.cy, 6)
    return b
}
GV.claimToast = 0
/* Claim a free region next to the lord's land with an outpost, and settle it. */
export function rivalExpand(rv?) {
    if (GV.S.t < 240 || !rv.keepB || rv.keepB.dead) {
        return false
    }
    // Each new region costs more than the last, so no lord can swallow the realm quickly.
    const P = rv.prof,
        cost = 160 + 90 * rv.ng + 12 * rv.ng * rv.ng
    if (rv.wealth < cost) {
        return false
    }
    const own = GV.regs.filter((rg?) => rg.owner === rv.id)
    let best = null,
        bs = -1e9
    for (const rg of own) {
        for (const a of rg.adj) {
            const c = GV.regs[a]
            if (c.owner !== -1 || c.id === HOME) {
                continue
            }
            let sc =
                Math.random() * 0.8 -
                Math.hypot(c.sx - rv.kx, c.sy - rv.ky) / 18
            if (P.focus === 'meadow') {
                sc += c.type === 'meadow' ? 2 : c.type === 'lake' ? 1 : 0
            } else if (P.focus === 'hills') {
                sc += c.type === 'hills' ? 2.2 : 0
            } else if (P.focus === 'gold') {
                sc += c.poi === 'mine' ? 3.5 : c.poi === 'ruins' ? 1.5 : 0
            }
            if (c.poi) {
                sc += 1
            }
            const dp = Math.hypot(c.sx - KX, c.sy - KY)
            if (dp < 24) {
                sc -= ((24 - dp) / 6) * (P.agg < 1 ? 0.5 : 1.2)
            }
            if (sc > bs) {
                bs = sc
                best = c
            }
        }
    }
    if (!best) {
        return false
    }
    const op = rivalBuild(rv, 'outpost', best, best.sx, best.sy)
    if (!op) {
        return false
    }
    rv.wealth -= cost
    // Settle the new land after the lord's own taste.
    const list = ['farm', 'house']
    if (P.food >= 1.3) {
        list.push('farm')
    }
    if (P.def >= 1.3 || Math.random() < P.def - 0.8) {
        list.push('watch')
    }
    if (P.pers === 'warlord' && rv.ng >= 3) {
        list.push('barracks')
    }
    for (const t of list) {
        rivalBuild(rv, t, best, op.x, op.y, 5)
    }
    if (best.disc && GV.S.t > GV.claimToast) {
        GV.claimToast = GV.S.t + 25
        toast(
            rv.name +
                ' claims the ' +
                best.type +
                ' lands to the ' +
                compass(best.sx - KX, best.sy - KY) +
                '.'
        )
    }
    return true
}
/* Once the castle is finished, keep building up the outer land. */
export function rivalGrow(rv?) {
    const P = rv.prof,
        own = GV.regs.filter((rg?) => rg.owner === rv.id && rg.id !== rv.r)
    if (!own.length) {
        return false
    }
    const rg = own[(Math.random() * own.length) | 0]
    const op = GV.S.b.find(
        (b?) =>
            b.t === 'outpost' && b.o === rv.id && reg[b.x + b.y * N] === rg.id
    )
    const cx = op ? op.x : rg.sx,
        cy = op ? op.y : rg.sy
    if (
        GV.S.b.filter((b?) => b.o === rv.id && reg[b.x + b.y * N] === rg.id)
            .length >= 7
    ) {
        return false
    }
    const w = {
        farm: 1.2 * P.food,
        house: 1,
        watch: 0.5 * P.def,
        barracks: P.pers === 'warlord' ? 0.7 : 0.35,
        tower: P.def >= 1.3 ? 0.4 : 0,
    }
    let r = Math.random() * Object.values<any>(w).reduce((a?, c?) => a + c, 0),
        t = 'farm'
    for (const k in w) {
        r -= w[k]
        if (r <= 0) {
            t = k
            break
        }
    }
    if (DEF[t].tier > (rv.keepB ? rv.keepB.lvl : 1)) {
        t = 'farm'
    }
    const cost = planCostOf(t)
    if (rv.wealth < cost) {
        return false
    }
    if (!rivalBuild(rv, t, rg, cx, cy, 6)) {
        return false
    }
    rv.wealth -= cost
    return true
}
export function countRivals() {
    for (const rv of GV.S.riv) {
        rv.nh = rv.nf = rv.nb = rv.nt = 0
        rv.ng = 0
    }
    for (const b of GV.S.b) {
        if (b.o > 0 && b.o < 9) {
            const rv = rivById(b.o)
            if (!rv) {
                continue
            }
            if (b.t === 'house') {
                rv.nh++
            } else if (b.t === 'farm') {
                rv.nf++
            } else if (b.t === 'barracks') {
                rv.nb++
            } else if (b.t === 'watch' || b.t === 'tower') {
                rv.nt++
            }
        }
    }
    for (const rg of GV.regs) {
        if (rg.owner > 0 && rg.owner < 9) {
            const rv = rivById(rg.owner)
            if (rv) {
                rv.ng++
            }
        }
    }
}
export const known = (rv?) => GV.regs[rv.r].disc
export const keepOf = (id?) => (id === 0 ? GV.keep : (rivById(id) || {}).keepB)
/* A rough measure of strength, used by the lords to pick fights. */
export function power(id?) {
    if (id === 0) {
        const land = GV.regs.reduce(
            (n?, rg?) => n + (rg.owner === 0 ? 1 : 0),
            0
        )
        return land + GV.S.sold.length / 5 + GV.keep.lvl + pop() / 15
    }
    const rv = rivById(id)
    return (
        rv.ng +
        rv.nb * 0.8 +
        rv.nt * 0.3 +
        rv.tier * 0.5 +
        (rv.keepB ? rv.keepB.lvl : 1)
    )
}
export function chooseFoe(rv?) {
    const me = power(rv.id),
        opts = []
    if (rv.awake && rv.truce <= 0) {
        opts.push(0)
    }
    if (GV.S.t > 600) {
        for (const o of GV.S.riv) {
            if (o !== rv && !o.dead && o.keepB && !o.keepB.dead) {
                opts.push(o.id)
            }
        }
    }
    if (!opts.length) {
        return null
    }
    const pp = power(0),
        top = Math.max(
            0,
            ...GV.S.riv.filter((o?) => !o.dead).map((o?) => power(o.id))
        )
    let best = null,
        bs = -1
    for (const id of opts) {
        const k = keepOf(id),
            d = Math.hypot(k.x - rv.kx, k.y - rv.ky),
            them = power(id)
        let sc = 1 / (1 + d / 40)
        const mode = rv.prof.target
        if (mode === 'nearest') {
            sc *= sc * 2.2
        } else if (mode === 'weakest') {
            sc *= (me + 1) / (them + 1)
        } else {
            sc *= ((them + 1) / (me + 1)) * 1.2
        }
        // A lord who grows far ahead of the others draws them all against him.
        if (id > 0) {
            const others = GV.S.riv.filter((o?) => !o.dead && o.id !== id)
            const avg =
                others.reduce((a?, o?) => a + power(o.id), 0) /
                (others.length || 1)
            if (them > avg * 1.4) {
                sc *= 1.6 + (them / (avg + 1) - 1.4)
            }
        }
        if (id === 0) {
            sc *= 1.25
            // When Thornwick outgrows every rival, the lords turn on it together.
            if (pp > top * 1.4) {
                sc *= 2 + (pp / (top + 1) - 1.4) * 2
            }
        }
        sc *= 0.75 + Math.random() * 0.5
        if (sc > bs) {
            bs = sc
            best = id
        }
    }
    return best
}
export function muster(rv?, foe?) {
    const k = keepOf(foe || 0) || GV.keep,
        dx = k.x - rv.kx,
        dy = k.y - rv.ky,
        d = Math.hypot(dx, dy) || 1
    return [rv.kx + 0.5 + (dx / d) * 8.5, rv.ky + 0.5 + (dy / d) * 8.5]
}
/* A route for a host marching on another lord. It goes round other buildings and
   breaks through the target's walls where that is cheapest. */
export function warRoute(rv?, foe?) {
    const k = keepOf(foe)
    if (!k || k.dead) {
        return null
    }
    const m = muster(rv, foe),
        sx = clampN(m[0]),
        sy = clampN(m[1])
    const cost = (i?) => {
        const b = bmap[i]
        if (b) {
            if (b.o === foe) {
                return DEF[b.t].walk ? terrCost(i, b) : 3 + b.hp / 12
            }
            if (!DEF[b.t].walk) {
                return Infinity
            }
        }
        return terrCost(i, b)
    }
    const src = sx + sy * N,
        tgt = k.x + k.y * N
    if (!search([src], tgt, cost)) {
        return null
    }
    return [[sx, sy], ...trace(src, tgt).map((i?) => [i % N, (i / N) | 0])]
}
export function launch(rv?, foe?) {
    foe = foe || 0
    if (foe !== 0) {
        return launchWar(rv, foe)
    }
    rv.foe = 0
    const se = season(),
        night = isNight()
    const pw = hostPower(rv)
    const mult =
        (se === 1 ? 1.25 : se === 3 ? 0.7 : 1) *
        (night ? 1.15 : 1) *
        (rv.pers === 'warlord' ? 1.15 : 1)
    const q = [],
        add = (t?, n?, tk?) => {
            for (let i = 0; i < n; i++) {
                q.push([t, tk])
            }
        }
    add('raider', Math.round((2 + pw) * mult))
    add('looter', Math.floor(pw / 3) + (rv.pers === 'schemer' ? 1 : 0), 'loot')
    add('brute', Math.floor(pw / 4))
    add('earcher', pw >= 4 ? Math.floor((pw - 2) / 2.5) : 0)
    const rams = pw >= 5 ? 1 + Math.floor((pw - 5) / 5) : 0,
        ladders = rv.tier >= 2 || pw >= 7 ? Math.floor(pw / 5) : 0,
        cats =
            rv.tier >= 3 || pw >= 10
                ? 1 + Math.floor(Math.max(0, pw - 10) / 6)
                : 0
    add('ladder', ladders)
    add('ram', rams)
    add('catapult', cats)
    if (
        rv.pers === 'schemer' &&
        GV.S.b.some((b?) => b.t === 'outpost' && b.o === 0)
    ) {
        add('raider', 2 + Math.floor(pw / 3), 'outpost')
    }
    if (q.length > 60) {
        q.length = 60
    }
    const hero = addHero(rv, q, pw >= 7)
    rv.q = q
    rv.pw = pw
    rv.out = true
    rv.outT = 0
    rv.k++
    rv.scd = 0
    rv.hp0 = 0
    rv.heroFell = false
    rv.broke = false
    // What the scout saw: the host goes round to the weakest side first.
    rv.wp = null
    if (rv.atkDir !== null && rv.atkDir !== undefined) {
        rv.wp = approachPoint(rv.atkDir)
    }
    GV.flowDirty = true
    const eng = [
        rams ? 'a battering ram' : '',
        ladders ? 'ladders' : '',
        cats ? 'a catapult' : '',
    ].filter(Boolean)
    toast(
        rv.name +
            ' marches on Thornwick from the ' +
            compass(rv.kx - KX, rv.ky - KY) +
            ' with ' +
            q.length +
            ' men' +
            (eng.length ? ', bringing ' + eng.join(' and ') : '') +
            (night ? ', under cover of night.' : '.') +
            (hero ? ' ' + rv.prof.hero + ', their champion, leads them.' : '') +
            (rv.wp
                ? ' Their scout found your weak side: they will strike from the ' +
                  compass(rv.wp[0] - KX, rv.wp[1] - KY) +
                  '.'
                : '')
    )
}
/* A champion leads the larger hosts, unless he fell in the last war and none has risen. */
export function addHero(rv?, q?, big?) {
    if (!big || rv.heroCd > 0 || !rv.prof.hero) {
        return false
    }
    // He takes the place of two raiders, so the host is not much stronger for him.
    for (let k = 0; k < 2; k++) {
        const i = q.findIndex((e?) => e[0] === 'raider' && !e[1])
        if (i >= 0) {
            q.splice(i, 1)
        }
    }
    q.splice(Math.min(q.length, 3), 0, ['hero', null])
    return true
}
/* Where a host gathers before it strikes from direction a (an angle from the keep). */
export function approachPoint(a?, rads?) {
    for (const r of rads || [16, 14, 18, 12]) {
        const x = KX + 0.5 + Math.cos(a) * r,
            y = KY + 0.5 + Math.sin(a) * r
        const p = freeNear(x, y, 2)
        if (
            inMap(p[0], p[1]) &&
            !bmap[p[0] + p[1] * N] &&
            !terrain[p[0] + p[1] * N]
        ) {
            return p
        }
    }
    return null
}
/* The scout's report: the side of Thornwick with the least wall, towers and soldiers. */
export function weakSide(rv?) {
    const base = Math.atan2(rv.ky - KY, rv.kx - KX)
    const shooters = GV.S.b.filter(
        (b?) => b.o === 0 && (DEF[b.t].range || b.t === 'keep')
    )
    const guards = GV.S.sold.filter((s?) => !s.sq && s.kind !== 'scout')
    let best = base,
        bs = 1e9
    for (let k = 0; k < 8; k++) {
        const a = base + (k * Math.PI) / 4,
            ca = Math.cos(a),
            sa = Math.sin(a)
        let sc = Math.min(k, 8 - k) * 0.8
        for (let r = 3; r <= 15; r++) {
            const x = clampN(KX + 0.5 + ca * r),
                y = clampN(KY + 0.5 + sa * r),
                b = bmap[x + y * N]
            if (b && b.o === 0 && blocks(b)) {
                sc += b.hp / 60
            }
            if (terrain[x + y * N] === 3) {
                sc += 1.5
            }
        }
        for (const r of [7, 11]) {
            const px = KX + 0.5 + ca * r,
                py = KY + 0.5 + sa * r
            for (const t of shooters) {
                const d = DEF[t.t],
                    rg = t.t === 'keep' ? 4.5 : d.range
                if (Math.hypot(t.cx - px, t.cy - py) < rg + 1) {
                    sc += ((t.t === 'keep' ? 10 : d.dmg) / (d.rate || 1)) * 0.3
                }
            }
            for (const s of guards) {
                if (Math.hypot(s.x - px, s.y - py) < 6) {
                    sc += 0.5
                }
            }
        }
        sc *= 0.85 + Math.random() * 0.3
        if (sc < bs) {
            bs = sc
            best = a
        }
    }
    return best
}
/* Hosts grow with every attack, with barracks and land, and slowly with time. */
export const hostPower = (rv?) =>
    (rv.k * 0.7 +
        rv.tier * 1.4 +
        rv.nb * 0.6 +
        Math.max(0, rv.ng - 1) * 0.5 +
        GV.S.t / 600) *
    DF().pow *
    rv.prof.army
export function launchWar(rv?, foe?) {
    const tr = rivById(foe),
        route = warRoute(rv, foe)
    if (!tr || !route) {
        rv.atkIn = 60
        rv.nextFoe = null
        return
    }
    const pw = hostPower(rv) * 0.65,
        q = [],
        add = (t?, n?) => {
            for (let i = 0; i < n; i++) {
                q.push([t, null])
            }
        }
    add('raider', Math.round(3 + pw * 1.1))
    add('brute', Math.floor(pw / 4))
    add('earcher', pw >= 3 ? Math.floor((pw - 1) / 2.5) : 0)
    add('ram', pw >= 4 ? 1 + Math.floor((pw - 4) / 6) : 0)
    add('catapult', pw >= 9 ? 1 + Math.floor((pw - 9) / 7) : 0)
    if (q.length > 60) {
        q.length = 60
    }
    addHero(rv, q, pw >= 5)
    rv.q = q
    rv.pw = pw
    rv.out = true
    rv.outT = 0
    rv.k++
    rv.scd = 0
    rv.hp0 = 0
    rv.heroFell = false
    rv.wp = null
    rv.foe = foe
    rv.route = route
    if (known(rv) || known(tr)) {
        toast(
            (known(rv) ? rv.name : 'A lord in the unknown') +
                ' marches on ' +
                (known(tr) ? tr.name : 'a lord in the unknown') +
                ' with ' +
                q.length +
                ' men.'
        )
    }
}
export function spawnEnemy(fac?, type?, tk?, pw?, x?, y?, mode?) {
    const D = DF(),
        big = type === 'brute',
        hero = type === 'hero',
        hp =
            type === 'scout'
                ? 45 * D.hp
                : (24 + 5 * pw) *
                  (big
                      ? 3
                      : hero
                        ? 7
                        : type === 'ram'
                          ? 5
                          : type === 'catapult'
                            ? 3
                            : type === 'earcher'
                              ? 0.7
                              : 1) *
                  D.hp
    const e: any = {
        x,
        y,
        side: 1,
        fac,
        mode: mode || 'atk',
        hp,
        max: hp,
        dmg: (3 + 0.45 * pw) * D.dmg * (hero ? 1.8 : 1),
        bm: big ? 3 : type === 'looter' ? 2 : 1,
        sp: big
            ? 0.6
            : hero
              ? 0.95
              : type === 'scout'
                ? 2.4
                : type === 'ram'
                  ? 0.5
                  : type === 'catapult'
                    ? 0.45
                    : type === 'ladder'
                      ? 0.8
                      : type === 'looter'
                        ? 1.15
                        : 0.95,
        type,
        v: (Math.random() * 5) | 0,
        tk: tk || null,
        ammo: type === 'catapult' ? 10 : 0,
        cd: Math.random(),
        next: null,
        target: null,
        tb: null,
        tbT: 0,
        path: null,
        pi: 0,
        think: Math.random(),
        hx: x,
        hy: y,
        ox: (Math.random() - 0.5) * 0.44,
        oy: (Math.random() - 0.5) * 0.44,
        walk: Math.random() * 3,
        moving: true,
        dead: false,
        face: 1,
        sw: 0,
        // Every field a unit may get is set here, so all units share one shape.
        mor: 100,
        rout: 0,
        mt: Math.random() * 0.5,
        hi: 0,
        lastA: null,
        lastAT: 0,
        landT: 0,
        inLand: false,
        wp: null,
        wpT: 0,
        gate: null,
        gp: null,
        gi: 0,
        gT: 0,
        goal: null,
        nearT: 0,
        burn: 0,
        tg: null,
        foe: null,
        route: null,
        ri: 0,
    }
    GV.S.en.push(e)
    return e
}
export function rivalFall(rv?, by?) {
    const cq = by > 0 && by < 9 ? rivById(by) : null
    if (cq && !cq.dead) {
        // One lord takes another: the castle, the land and the people change hands.
        rv.dead = true
        rv.out = false
        rv.q = []
        for (const e of GV.S.en) {
            if (e.fac === rv.id) {
                e.dead = true
                puff(e.x, e.y, 3, '#b9b0a0')
            }
        }
        for (const b of GV.S.b) {
            if (b.o === rv.id) {
                b.o = cq.id
                b.fire = 0
                b.hp = Math.max(1, b.hp * 0.5)
            }
        }
        GV.S.rconq[rv.r] = cq.id
        for (const k in GV.S.rconq) {
            if (GV.S.rconq[k] === rv.id) {
                GV.S.rconq[k] = cq.id
            }
        }
        cq.wealth += 100 * rv.tier
        cq.k++
        cq.atkIn = Math.max(cq.atkIn, 240)
        for (const e of GV.S.en) {
            if (e.fac === cq.id && e.mode === 'war') {
                e.mode = 'flee'
                e.path = null
            }
        }
        GV.ownDirty = GV.flowDirty = GV.pathsDirty = true
        if (known(rv) || known(cq)) {
            toast(
                (known(cq) ? cq.name : 'A lord from the unknown') +
                    ' has taken the keep of ' +
                    (known(rv) ? rv.name : 'a distant lord') +
                    ' and all their land.'
            )
        }
        save()
        return
    }
    for (const k in GV.S.rconq) {
        if (GV.S.rconq[k] === rv.id) {
            GV.S.conq[k] = 1
            delete GV.S.rconq[k]
        }
    }
    rv.dead = true
    rv.out = false
    rv.q = []
    for (const e of GV.S.en) {
        if (e.fac === rv.id) {
            e.dead = true
            puff(e.x, e.y, 3, '#b9b0a0')
        }
    }
    for (const b of GV.S.b) {
        if (b.o === rv.id) {
            b.o = 0
            b.fire = 0
            b.auto = true
        }
    }
    GV.S.conq[rv.r] = 1
    const g = 120 * rv.tier
    GV.S.res.gold += g
    GV.ownDirty = GV.flowDirty = GV.pathsDirty = true
    toast(
        'The keep of ' +
            rv.name +
            ' has fallen. Their lands and ' +
            g +
            ' gold are yours.'
    )
    if (GV.S.riv.every((r?) => r.dead) && !GV.S.won) {
        GV.S.won = true
        endScreen(true)
    }
    save()
}
export function rivalsTick(dt?) {
    if ((GV.cntCd -= dt) <= 0) {
        GV.cntCd = 3
        countRivals()
    }
    for (const rv of GV.S.riv) {
        if (rv.dead) {
            continue
        }
        // Lords only march on Thornwick once they know of it: when their land is found, it borders yours, or word spreads.
        if (
            !rv.awake &&
            (GV.S.t > 900 + rv.id * 150 ||
                GV.regs[rv.r].disc ||
                GV.regs.some(
                    (rg?) =>
                        rg.owner === rv.id &&
                        rg.adj.some((a?) => GV.regs[a].owner === 0)
                ))
        ) {
            rv.awake = true
            if (!rv.out) {
                rv.nextFoe = chooseFoe(rv)
                if (rv.nextFoe === 0) {
                    rv.atkIn = Math.min(rv.atkIn, 100 * DF().atk)
                }
            }
        }
        const P = rv.prof
        rv.wealth +=
            dt *
            (0.55 +
                0.15 * rv.nh +
                0.3 * rv.nf +
                0.2 * Math.max(0, rv.ng - 1) +
                (0.025 * GV.S.t) / 60) *
            [1, 1.25, 1.5, 1.8, 2.1][rv.tier - 1] *
            (season() === 3 ? 0.7 : 1) *
            DF().eco *
            P.eco
        if ((rv.bcd -= dt) <= 0) {
            rv.bcd = 1.2
            rivalStep(rv, false)
        }
        if ((rv.ecd -= dt) <= 0) {
            rv.ecd = (70 + Math.random() * 50) / P.expand
            if (!rivalExpand(rv) && rv.pi >= rv.plan.length) {
                rivalGrow(rv)
            }
        }
        if ((rv.gcd -= dt) <= 0) {
            rv.gcd = GV.S.en.some(
                (e?) => e.fac === rv.id && e.mode === 'guard' && e.hp < e.max
            )
                ? 30
                : 9
            const want = Math.round(
                    (4 + rv.tier * 2 + rv.nb * 2) * DF().guard * P.def
                ),
                have = GV.S.en.reduce(
                    (n?, e?) =>
                        n + (e.fac === rv.id && e.mode === 'guard' ? 1 : 0),
                    0
                )
            if (have < want && rv.keepB && !rv.keepB.dead) {
                const p = freeNear(rv.kx + 0.5, rv.ky + 2.5, 2.5)
                const g = spawnEnemy(
                    rv.id,
                    have % 3 === 2
                        ? 'earcher'
                        : have % 5 === 4
                          ? 'brute'
                          : 'raider',
                    null,
                    4 + rv.tier * 2.5 + GV.S.t / 150,
                    p[0],
                    p[1],
                    'guard'
                )
                g.hx = rv.kx + 0.5
                g.hy = rv.ky + 0.5
            }
        }
        if (rv.truce > 0) {
            rv.truce -= dt
        }
        if (rv.heroCd > 0) {
            rv.heroCd -= dt
        }
        // Before a host marches on Thornwick, a rider comes to look at its defences.
        if (
            !rv.out &&
            !rv.scoutOut &&
            rv.nextFoe === 0 &&
            rv.awake &&
            rv.truce <= 0 &&
            GV.S.wave >= 2 &&
            rv.atkIn < 55 &&
            rv.atkIn > 15 &&
            rv.keepB &&
            !rv.keepB.dead
        ) {
            rv.scoutOut = true
            const a = Math.atan2(rv.ky - KY, rv.kx - KX),
                goal = approachPoint(a, [11, 13, 9]),
                m = muster(rv, 0),
                p = freeNear(m[0], m[1], 2)
            if (goal) {
                const sc = spawnEnemy(
                    rv.id,
                    'scout',
                    null,
                    0,
                    p[0],
                    p[1],
                    'scout'
                )
                sc.goal = goal
            }
        }
        if (!rv.out) {
            rv.atkIn -= dt
            if (rv.atkIn <= 0) {
                let foe = rv.nextFoe
                if (
                    foe === null ||
                    (foe === 0 && (!rv.awake || rv.truce > 0)) ||
                    (foe > 0 && (!rivById(foe) || rivById(foe).dead))
                ) {
                    foe = chooseFoe(rv)
                }
                if (foe === null) {
                    rv.atkIn = 60
                } else if (
                    foe === 0 &&
                    DF() !== DIFFS[3] &&
                    DF() !== DIFFS[4] &&
                    GV.S.riv.some((o?) => o.out && o.foe === 0 && o !== rv)
                ) {
                    rv.atkIn = 35
                } else {
                    launch(rv, foe)
                }
            }
        }
        if (rv.q.length) {
            if ((rv.scd -= dt) <= 0) {
                rv.scd = 0.45
                const [t, tk] = rv.q.shift(),
                    m = muster(rv, rv.foe),
                    p = freeNear(m[0], m[1], 2),
                    war = rv.foe > 0
                const e = spawnEnemy(
                    rv.id,
                    t,
                    tk,
                    rv.pw,
                    p[0],
                    p[1],
                    war ? 'war' : 'atk'
                )
                rv.hp0 = (rv.hp0 || 0) + e.max
                if (war) {
                    e.foe = rv.foe
                    e.route = rv.route
                    e.ri = 0
                    e.tbT = 0
                } else if (rv.wp) {
                    e.wp = rv.wp
                    e.wpT = 0
                }
            }
        } else if (rv.out && (rv.outT += dt) > (rv.foe > 0 ? 480 : 260)) {
            for (const e of GV.S.en) {
                if (e.fac === rv.id && (e.mode === 'atk' || e.mode === 'war')) {
                    e.mode = 'flee'
                    e.next = null
                    e.path = null
                }
            }
            rv.outT = -1e9
            if (rv.foe === 0) {
                toast(
                    'The host of ' +
                        rv.name +
                        ' gives up the siege and withdraws.'
                )
            }
        } else if (rv.out && rv.outT > 0 && hostBroken(rv, dt)) {
            for (const e of GV.S.en) {
                if (e.fac === rv.id && (e.mode === 'atk' || e.mode === 'war')) {
                    e.mode = 'flee'
                    e.next = null
                    e.path = null
                    e.rout = 0
                }
            }
            rv.outT = -1e9
            const tr = rivById(rv.foe)
            if (rv.foe === 0) {
                rv.broke = true
            } else if (known(rv) || (tr && known(tr))) {
                toast(
                    (known(rv) ? 'The host of ' + rv.name : 'A host') +
                        ' falls back, beaten, from the walls of ' +
                        (tr && known(tr) ? tr.name : 'a distant lord') +
                        '.'
                )
            }
        } else if (
            rv.out &&
            // Men walking home in defeat no longer count as an attack.
            !GV.S.en.some(
                (e?) =>
                    e.fac === rv.id && (e.mode === 'atk' || e.mode === 'war')
            )
        ) {
            rv.out = false
            rv.atkIn =
                (rv.pers === 'warlord'
                    ? 115
                    : rv.pers === 'builder'
                      ? 175
                      : 145) *
                (0.85 + Math.random() * 0.3) *
                DF().atk *
                P.agg
            if (rv.foe === 0) {
                GV.S.wave++
                const bonus = 10 + 5 * Math.round(rv.pw)
                GV.S.res.gold += bonus
                toast(
                    'The host of ' +
                        rv.name +
                        (rv.broke
                            ? ' has had enough and flees. Your people gather '
                            : ' is beaten back. Your people gather ') +
                        bonus +
                        ' gold from the field.'
                )
                rv.broke = false
                save()
            }
            rv.foe = null
            rv.route = null
            rv.wp = null
            rv.atkDir = null
            rv.scoutOut = false
            rv.nextFoe = chooseFoe(rv)
        }
    }
    for (const b of GV.S.b) {
        if (b.t === 'camp') {
            if ((b.cd -= dt) <= 0) {
                b.cd = 50
                for (let k = 0; k < 2; k++) {
                    spawnEnemy(
                        9,
                        k ? 'looter' : 'raider',
                        'loot',
                        2 + GV.S.wave * 0.3,
                        b.x + 0.6,
                        b.y + 0.6 + k * 0.3
                    )
                }
            }
        }
    }
}
/* A host that has lost most of its strength, its champion or its nerve withdraws
   instead of fighting to the last man. Checked about once a second. */
export function hostBroken(rv?, dt?) {
    if ((rv.rcd = (rv.rcd || 0) - dt) > 0 || !rv.hp0) {
        return false
    }
    rv.rcd = 1
    let hp = 0,
        mor = 0,
        n = 0
    for (const e of GV.S.en) {
        if (
            e.fac === rv.id &&
            (e.mode === 'atk' || e.mode === 'war') &&
            e.type !== 'scout'
        ) {
            hp += e.hp
            if (e.type !== 'ram' && e.type !== 'catapult') {
                mor += e.rout > 0 ? 0 : e.mor
                n++
            }
        }
    }
    if (hp <= 0) {
        return false
    }
    const left = hp / rv.hp0,
        avg = n ? mor / n : 100
    return (
        left < 0.3 || (rv.heroFell && left < 0.6) || (avg < 30 && left < 0.65)
    )
}
/* When a champion falls, his host loses heart. */
export function heroDown(e?, by?) {
    const rv = rivById(e.fac)
    shock(e.x, e.y, 1, e.fac, 50, 14)
    if (!rv) {
        return
    }
    rv.heroCd = 420
    rv.heroFell = true
    if (!by) {
        toast(
            'You have slain ' +
                rv.prof.hero +
                ', champion of ' +
                rv.name +
                '. The host wavers.'
        )
    } else if (known(rv)) {
        toast(
            rv.prof.hero +
                ', champion of ' +
                rv.name +
                ', has fallen in battle.'
        )
    }
}
export function hitEnemy(e?, dmg?, by?) {
    if (e.dead) {
        return
    }
    e.hp -= dmg
    if (e.hp <= 0) {
        e.dead = true
        if (e.type === 'hero') {
            heroDown(e, by)
        } else if (e.type !== 'scout') {
            shock(e.x, e.y, 1, e.fac, 10, 4)
        }
        if (by) {
            puff(e.x, e.y, 4, '#b9b0a0')
            return
        }
        gain(
            'gold',
            e.type === 'brute'
                ? 6
                : e.type === 'hero'
                  ? 30
                  : e.type === 'ram'
                    ? 8
                    : e.type === 'catapult'
                      ? 12
                      : 2,
            e.x,
            e.y
        )
        puff(e.x, e.y, 4, '#b9b0a0')
        if (
            GV.capU &&
            !GV.capU.dead &&
            Math.hypot(GV.capU.x - e.x, GV.capU.y - e.y) < 5 &&
            ++GV.S.capXp >= GV.S.capLvl * 5
        ) {
            GV.S.capXp = 0
            GV.S.capLvl++
            GV.capU.max += 30
            GV.capU.hp = GV.capU.max
            toast(
                'The captain grows in renown and is now level ' +
                    GV.S.capLvl +
                    '.'
            )
        }
    }
}
export function ignite(b?) {
    if (b.dead || b.fire > 0 || !flam(b)) {
        return
    }
    b.fire = 20
    b.spread = 1.5
    if (b.o === 0) {
        firePing(b)
    }
    if (b.o === 0 && GV.S.t > GV.fireToast) {
        GV.fireToast = GV.S.t + 20
        toast(
            'Fire! The ' +
                DEF[b.t].name.toLowerCase() +
                ' is burning. A well nearby puts fires out fast.'
        )
    }
}
export function damageB(b?, dmg?, raw?, by?) {
    if (b.dead) {
        return
    }
    if (b.o === 0 && !raw) {
        const d = baileyOf(b)
        dmg *= d >= 2 ? 0.6 : d === 1 ? 0.8 : 1
        if (b.t === 'gate' && b.shut) {
            dmg *= 0.7
        }
        dmg *= wallDmgMul(b)
    }
    b.hp -= dmg
    if (!raw) {
        b.hit = 0.15
    }
    if (b.hp <= 0) {
        if (b === GV.keep) {
            b.hp = 0
            endScreen(false)
            return
        }
        puff(b.cx, b.cy, 12, '#8a7f70')
        if (b.t === 'keep') {
            const rv = rivById(b.o)
            removeB(b)
            if (rv) {
                rivalFall(rv, by)
            }
            return
        }
        if (b.o === 0 && b.t !== 'stakes') {
            toast(
                (b.fire > 0 ? 'Fire consumed the ' : 'Raiders destroyed the ') +
                    DEF[b.t].name.toLowerCase() +
                    '.' +
                    (b.t === 'outpost' ? ' The land it held is lost.' : '')
            )
        }
        if (b.t === 'camp') {
            GV.S.res.gold += 60
            toast(
                'The bandit camp is burned out. You take 60 gold from their hoard.'
            )
            for (const e of GV.S.en) {
                if (e.fac === 9) {
                    e.tk = e.tk || 'loot'
                }
            }
        }
        removeB(b)
    }
}
export function removeB(b?) {
    b.dead = true
    for (let j = 0; j < b.s; j++) {
        for (let i = 0; i < b.s; i++) {
            bmap[b.x + i + (b.y + j) * N] = null
        }
    }
    GV.S.b.splice(GV.S.b.indexOf(b), 1)
    GV.flowDirty = GV.pathsDirty = true
    if (b.t === 'outpost') {
        GV.ownDirty = true
    }
    if (b.arch) {
        b.arch.post = null
    }
    if (GV.selected === b) {
        GV.selected = null
    }
}
export function flowNext(cx?, cy?) {
    let bd = flow[cx + cy * N],
        opts = []
    for (let k = 0; k < 4; k++) {
        const nx = cx + +(k === 0) - +(k === 1),
            ny = cy + +(k === 2) - +(k === 3)
        if (!inMap(nx, ny)) {
            continue
        }
        const d = flow[nx + ny * N]
        if (d < bd - 0.01) {
            bd = d
            opts = [[nx, ny]]
        } else if (opts.length && Math.abs(d - bd) <= 0.01) {
            opts.push([nx, ny])
        }
    }
    return opts.length ? opts[(Math.random() * opts.length) | 0] : [KX, KY]
}
/* Units of other lords that march on lord `fac`, or that lord's own units when marching on it. */
export function warFoes(fac?, x?, y?, maxD?) {
    let best = null,
        bd = maxD
    // Most of the time no one marches on this lord at all.
    if (!GV.warOn[fac]) {
        return null
    }
    for (const o of GV.S.en) {
        if (o.dead || o.fac === fac || o.fac === 9) {
            continue
        }
        if (o.mode !== 'war' || o.foe !== fac) {
            continue
        }
        const d = Math.hypot(o.x - x, o.y - y)
        if (d < bd) {
            bd = d
            best = o
        }
    }
    return best
}
export function guardUpdate(e?, dt?) {
    const r0 = e.type === 'earcher' ? 4 : 0.9
    const s = nearestSold(e.x, e.y, r0, e.type === 'earcher')
    let w = null
    if (!s) {
        w = warFoes(e.fac, e.x, e.y, r0)
    }
    if (s || w) {
        if (e.cd <= 0) {
            const tg = s || w
            if (e.type === 'earcher') {
                e.cd = 1.3
                GV.S.shots.push({
                    x: e.x,
                    y: e.y,
                    z: 9,
                    e: tg,
                    t: 0,
                    dur: 0.3,
                    dmg: e.dmg,
                    by: e.fac,
                })
            } else {
                e.cd = 1
                e.walk += 0.3
                if (s) {
                    hitSold(s, e.dmg, 'melee', e)
                } else {
                    hitEnemy(w, e.dmg * flankMul(e, w), e.fac)
                }
            }
        }
        return
    }
    if ((e.think -= dt) <= 0) {
        e.think = 0.8
        const t =
            nearestSold(e.hx, e.hy, 9, false) || warFoes(e.fac, e.hx, e.hy, 9)
        if (t) {
            goTo(e, clampN(t.x), clampN(t.y), t.x, t.y, rivWalk)
        } else if (
            !e.path &&
            (Math.random() < 0.12 || Math.hypot(e.x - e.hx, e.y - e.hy) > 5)
        ) {
            const p = freeNear(e.hx, e.hy + 1, 3)
            goTo(e, p[0], p[1], p[0], p[1], rivWalk)
        }
    }
    if (e.path) {
        follow(e, dt, 1.1)
    }
}
/* Step straight toward (tx, ty). Returns the building in the way, or null. */
export function stepToward(e?, tx?, ty?, dt?, sp?) {
    const dx = tx - e.x,
        dy = ty - e.y,
        d = Math.hypot(dx, dy)
    if (d < 0.05) {
        return null
    }
    const st = Math.min(
            d,
            sp *
                dt *
                (wet(clampN(e.x), clampN(e.y))
                    ? 0.3
                    : inWood(e.x, e.y)
                      ? 0.7
                      : 1)
        ),
        nx = e.x + (dx / d) * st,
        ny = e.y + (dy / d) * st
    const b = bAt(clampN(nx), clampN(ny))
    if (b && !DEF[b.t].walk && b !== bAt(clampN(e.x), clampN(e.y))) {
        return b
    }
    if (terrain[tileI(nx, ny)] === 4) {
        return null
    }
    e.x = nx
    e.y = ny
    e.walk += dt
    e.moving = true
    if (Math.abs(dx - dy) > 0.01) {
        e.face = dx - dy > 0 ? 1 : -1
    }
    return null
}
/* The nearest building of `foe`, with walls counted as much further away: a host
   breaks in where it must, then goes for the buildings and people inside. */
export function warTarget(e?, foe?, rad?) {
    let best = null,
        bs = 1e9
    for (const b of GV.S.b) {
        if (b.o !== foe || b.dead) {
            continue
        }
        const d = Math.hypot(b.cx - e.x, b.cy - e.y)
        if (d > rad) {
            continue
        }
        // Rams look for the gate, catapults for the towers.
        const pref =
            e.type === 'ram'
                ? b.t === 'gate'
                    ? -4
                    : 0
                : e.type === 'catapult' &&
                    (b.t === 'tower' || b.t === 'watch' || b.t === 'mangonel')
                  ? -12
                  : 0
        const sc = d + (WALLISH[b.t] ? 8 : 0) + (b.t === 'keep' ? -1 : 0) + pref
        if (sc < bs) {
            bs = sc
            best = b
        }
    }
    return best
}
export function hitBuildingWar(e?, b?) {
    if (e.cd > 0) {
        return
    }
    const T = e.type
    e.cd = T === 'ram' ? 1.6 : 1
    e.walk += 0.3
    damageB(
        b,
        e.dmg *
            (T === 'ram'
                ? WALLISH[b.t]
                    ? 7
                    : b.t === 'keep'
                      ? 4
                      : 1
                : T === 'earcher'
                  ? 0.6
                  : e.bm) *
            0.6,
        false,
        e.fac
    )
}
export function warUpdate(e?, dt?) {
    const T = e.type,
        foe = e.foe,
        tr = rivById(foe)
    if (!tr || tr.dead || !tr.keepB || tr.keepB.dead) {
        e.mode = 'flee'
        e.path = null
        return
    }
    const sp = e.sp * 1.05
    if (T !== 'ram' && T !== 'catapult') {
        if ((e.think -= dt) <= 0) {
            e.think = 0.5
            // Fight the guards and hosts of the lord they march on, and any of your soldiers that come close.
            let best = null,
                bd = T === 'earcher' ? 4.2 : 2.6
            for (const o of GV.S.en) {
                if (o.dead || o.fac !== foe) {
                    continue
                }
                const d = Math.hypot(o.x - e.x, o.y - e.y)
                if (d < bd) {
                    bd = d
                    best = o
                }
            }
            const s = nearestSold(e.x, e.y, 1.4, false)
            if (s && Math.hypot(s.x - e.x, s.y - e.y) < bd) {
                best = s
            }
            e.tg = best
        }
        const h = e.tg && !e.tg.dead ? e.tg : null
        if (h) {
            const d = Math.hypot(h.x - e.x, h.y - e.y),
                rng = T === 'earcher' ? 4.2 : 0.9
            if (d <= rng) {
                if (e.cd <= 0) {
                    if (T === 'earcher') {
                        e.cd = 1.3
                        GV.S.shots.push({
                            x: e.x,
                            y: e.y,
                            z: 9,
                            e: h,
                            t: 0,
                            dur: 0.3,
                            dmg: e.dmg,
                            by: e.fac,
                        })
                    } else {
                        e.cd = 1
                        e.walk += 0.3
                        if (h.side) {
                            hitEnemy(
                                h,
                                e.dmg *
                                    (T === 'brute' ? 1.6 : 1) *
                                    flankMul(e, h),
                                e.fac
                            )
                        } else {
                            hitSold(
                                h,
                                e.dmg *
                                    (T === 'brute' && h.kind !== 'shield'
                                        ? 1.6
                                        : 1),
                                'melee',
                                e
                            )
                        }
                    }
                }
                return
            }
            const blk = stepToward(e, h.x, h.y, dt, sp)
            if (!blk) {
                return
            }
            if (blk.o === foe) {
                hitBuildingWar(e, blk)
                return
            }
            e.tg = null
        }
    }
    if ((e.tbT -= dt) <= 0 || (e.tb && e.tb.dead)) {
        e.tbT = 1.5
        e.tb = warTarget(e, foe, T === 'catapult' ? 9.5 : 4)
    }
    const tb = e.tb && !e.tb.dead ? e.tb : null
    if (tb) {
        if (T === 'catapult') {
            if (e.ammo > 0) {
                if (e.cd <= 0) {
                    e.cd = 4.5
                    e.ammo--
                    GV.S.shots.push({
                        x: e.x,
                        y: e.y,
                        z: 14,
                        tx: tb.cx,
                        ty: tb.cy,
                        t: 0,
                        dur: Math.max(
                            0.7,
                            Math.hypot(tb.cx - e.x, tb.cy - e.y) / 6
                        ),
                        dmg: 30,
                        stone: 1,
                        side: 1,
                        war: foe,
                        by: e.fac,
                        dmgB: 0.6,
                    })
                }
                return
            }
        } else {
            const d = Math.hypot(tb.cx - e.x, tb.cy - e.y),
                reach = 0.8 + tb.s * 0.45
            if (d <= reach) {
                hitBuildingWar(e, tb)
                return
            }
            const blk = stepToward(
                e,
                tb.cx,
                tb.cy + (tb.s > 1 ? 0.6 : 0),
                dt,
                sp
            )
            if (!blk) {
                return
            }
            if (blk.o === foe) {
                hitBuildingWar(e, blk)
                return
            }
            e.tb = null
            e.tbT = 2
        }
    }
    // March along the lord's route, breaking what blocks it.
    const R = e.route
    if (!R || e.ri >= R.length) {
        e.tb = tr.keepB
        return
    }
    if (e.ri === 0) {
        let bd = 1e9
        for (let i = 0; i < Math.min(R.length, 30); i++) {
            const d = Math.hypot(R[i][0] - e.x, R[i][1] - e.y)
            if (d < bd) {
                bd = d
                e.ri = i
            }
        }
        if (e.ri === 0) {
            e.ri = 1
        }
    }
    const [tx, ty] = R[Math.min(e.ri, R.length - 1)],
        b = bAt(tx, ty)
    if (b && b.o === foe && !DEF[b.t].walk) {
        if (Math.hypot(b.cx - e.x, b.cy - e.y) <= 0.8 + b.s * 0.45) {
            hitBuildingWar(e, b)
        } else {
            stepToward(e, tx, ty, dt, sp)
        }
        return
    }
    const blk = stepToward(e, tx + e.ox * 0.5, ty + e.oy * 0.5, dt, sp)
    if (blk) {
        if (blk.o === foe) {
            hitBuildingWar(e, blk)
        } else {
            e.ri++
        }
        return
    }
    if (Math.hypot(tx - e.x, ty - e.y) < 0.35) {
        e.ri++
    }
}
/* An enemy scout rides to the edge of Thornwick, looks it over and rides home.
   If it is cut down first, its lord attacks blind. */
export function scoutRide(e?, dt?) {
    const rv = rivById(e.fac)
    if (!rv || rv.dead) {
        e.dead = true
        return
    }
    if ((e.landT = (e.landT || 0) - dt) <= 0) {
        e.landT = 1
        if (!e.inLand && ownedT(clampN(e.x), clampN(e.y))) {
            e.inLand = true
            attackPing(e)
        }
    }
    if (
        !e.path &&
        !goTo(e, e.goal[0], e.goal[1], e.goal[0], e.goal[1], rivWalk)
    ) {
        e.mode = 'flee'
        return
    }
    follow(e, dt, e.sp)
    if (Math.hypot(e.x - e.goal[0], e.y - e.goal[1]) < 1.5) {
        rv.atkDir = weakSide(rv)
        e.mode = 'flee'
        e.path = null
    }
}
export function eUpdate(e?, dt?) {
    e.cd -= dt
    e.moving = false
    if (e.burn > 0) {
        e.burn -= dt
        hitEnemy(e, 7 * dt)
        if (e.dead) {
            return
        }
    }
    if (e.mode === 'guard') {
        return guardUpdate(e, dt)
    }
    if (e.rout > 0) {
        // Broken men run back the way they came.
        fleeStep(e, e.hx, e.hy, dt, e.sp * 1.15)
        return
    }
    if (e.mode === 'scout') {
        return scoutRide(e, dt)
    }
    if (e.mode === 'war') {
        return warUpdate(e, dt)
    }
    if (e.mode === 'flee') {
        const rv = rivById(e.fac)
        if (!rv || rv.dead) {
            e.dead = true
            return
        }
        if (!e.path) {
            goTo(
                e,
                clampN(rv.kx + 0.5),
                clampN(rv.ky + 2.5),
                rv.kx + 0.5,
                rv.ky + 2.5,
                rivWalk
            )
            if (
                !e.path ||
                (e.path.length < 2 && Math.hypot(e.x - rv.kx, e.y - rv.ky) > 4)
            ) {
                e.dead = true
                return
            }
        }
        follow(e, dt, e.sp * 1.2)
        if (!e.path) {
            e.dead = true
        }
        return
    }
    const T = e.type,
        cx = clampN(e.x),
        cy = clampN(e.y),
        here = bmap[cx + cy * N]
    if ((e.landT = (e.landT || 0) - dt) <= 0) {
        e.landT = 1
        if (!e.inLand && ownedT(cx, cy)) {
            e.inLand = true
            attackPing(e)
        }
    }
    if (T !== 'ram' && T !== 'catapult' && T !== 'ladder') {
        const s = nearestSold(
            e.x,
            e.y,
            T === 'earcher' ? 4.2 + (e.hi || 0) : 0.9,
            T === 'earcher'
        )
        if (s) {
            if (e.cd <= 0) {
                if (T === 'earcher') {
                    e.cd = 1.3
                    GV.S.shots.push({
                        x: e.x,
                        y: e.y,
                        z: 9,
                        e: s,
                        t: 0,
                        dur: 0.3,
                        dmg: e.dmg,
                    })
                } else {
                    e.cd = 1
                    e.walk += 0.3
                    hitSold(
                        s,
                        e.dmg *
                            (T === 'brute' && s.kind !== 'shield' ? 1.6 : 1),
                        'melee',
                        e
                    )
                }
            }
            return
        }
    }
    // First ride round to the side the scout chose, then strike.
    if (e.wp) {
        e.wpT += dt
        if (e.wpT > 60 || Math.hypot(e.x - e.wp[0], e.y - e.wp[1]) < 1.6) {
            e.wp = null
            e.path = null
            e.next = null
        } else {
            if (
                !e.path &&
                !goTo(
                    e,
                    e.wp[0],
                    e.wp[1],
                    e.wp[0] + e.ox,
                    e.wp[1] + e.oy,
                    rivWalk
                )
            ) {
                e.wp = null
                e.next = null
            }
            if (e.path) {
                follow(e, dt, e.sp)
                return
            }
        }
    }
    if (T === 'catapult') {
        if ((e.tbT -= dt) <= 0 || (e.tb && e.tb.dead)) {
            e.tbT = 3
            e.tb = null
            // Towers first: they are what keeps the host from the walls.
            let bs = 1e9
            for (const b of GV.S.b) {
                if (b.o === 0) {
                    const d = Math.hypot(b.cx - e.x, b.cy - e.y)
                    if (d >= 9.5) {
                        continue
                    }
                    const sc = d - (DEF[b.t].range ? 5 : b.t === 'gate' ? 2 : 0)
                    if (sc < bs) {
                        bs = sc
                        e.tb = b
                    }
                }
            }
        }
        if (e.tb && e.ammo > 0) {
            if (e.cd <= 0) {
                e.cd = 4.5
                e.ammo--
                GV.S.shots.push({
                    x: e.x,
                    y: e.y,
                    z: 14,
                    tx: e.tb.cx,
                    ty: e.tb.cy,
                    t: 0,
                    dur: Math.max(
                        0.7,
                        Math.hypot(e.tb.cx - e.x, e.tb.cy - e.y) / 6
                    ),
                    dmg: 30,
                    stone: 1,
                    side: 1,
                })
            }
            return
        }
    }
    if (
        !e.tk &&
        T !== 'ram' &&
        T !== 'catapult' &&
        T !== 'ladder' &&
        (e.nearT = (e.nearT || 0) - dt) <= 0
    ) {
        e.nearT = 1
        let best = null,
            bd = 2.8
        for (const b of GV.S.b) {
            if (
                b.o !== 0 ||
                WALLISH[b.t] ||
                b.t === 'stakes' ||
                b.t === 'bridge'
            ) {
                continue
            }
            const d = Math.hypot(b.cx - e.x, b.cy - e.y)
            if (d >= bd) {
                continue
            }
            let clear = true
            for (let k = 1; k < 6 && clear; k++) {
                const q = bAt(
                    clampN(e.x + ((b.cx - e.x) * k) / 6),
                    clampN(e.y + ((b.cy - e.y) * k) / 6)
                )
                if (q && q !== b && q.o === 0 && WALLISH[q.t]) {
                    clear = false
                }
            }
            if (clear) {
                bd = d
                best = b
            }
        }
        if (best) {
            e.tk = 'near'
            e.target = best
            e.next = null
        }
    }
    if (e.tk === 'near' && (!e.target || e.target.dead || e.target.o !== 0)) {
        e.tk = null
        e.target = null
        e.next = null
    }
    if (e.tk) {
        if (!e.target || e.target.dead || e.target.o !== 0) {
            let best = null,
                bd = 1e9
            for (const b of GV.S.b) {
                if (
                    b.o === 0 &&
                    (e.tk === 'loot' ? DEF[b.t].loot : b.t === 'outpost')
                ) {
                    const d = Math.hypot(b.cx - e.x, b.cy - e.y)
                    if (d < bd) {
                        bd = d
                        best = b
                    }
                }
            }
            e.target = best
            e.next = null
            if (!best) {
                e.tk = e.tk === 'outpost' ? 'loot' : null
            }
        }
        if (e.target && here === e.target) {
            if (e.cd <= 0) {
                e.cd = 1
                damageB(here, e.dmg * e.bm)
                if (T === 'looter') {
                    ignite(here)
                }
            }
            return
        }
    }
    // Rams make for a gate along their own road.
    if (
        T === 'ram' &&
        (!e.gate || e.gate.dead) &&
        (e.gT = (e.gT || 0) - dt) <= 0
    ) {
        e.gT = 5
        e.gate = null
        e.gp = null
        let best = null,
            bd = 40
        for (const b of GV.S.b) {
            if (b.o === 0 && b.t === 'gate') {
                const d = Math.hypot(b.cx - e.x, b.cy - e.y)
                if (d < bd) {
                    bd = d
                    best = b
                }
            }
        }
        if (best) {
            const src = cx + cy * N,
                tgt = best.x + best.y * N
            if (src !== tgt && search([src], tgt, enemyCost)) {
                e.gate = best
                e.gp = trace(src, tgt).map((i?) => [i % N, (i / N) | 0])
                e.gi = 0
                e.next = null
            }
        }
    }
    if (!e.next && T === 'ram' && e.gp && e.gate && !e.gate.dead) {
        if (e.gi < e.gp.length) {
            e.next = e.gp[e.gi++]
            e.sw = e.next[1] !== cy ? 1 : 0
        } else {
            e.gp = null
        }
    }
    if (!e.next) {
        if (e.tk && e.target) {
            const tx = Math.round(e.target.cx),
                ty = Math.round(e.target.cy),
                dx = tx - cx,
                dy = ty - cy
            let nx =
                Math.abs(dx) >= Math.abs(dy) && dx
                    ? [cx + Math.sign(dx), cy]
                    : dy
                      ? [cx, cy + Math.sign(dy)]
                      : [cx + (dx ? Math.sign(dx) : 1), cy]
            const nb = bAt(nx[0], nx[1])
            if (
                !inMap(nx[0], nx[1]) ||
                terrain[nx[0] + nx[1] * N] === 4 ||
                (nb && nb.o !== 0 && !DEF[nb.t].walk)
            ) {
                nx = flowNext(cx, cy)
            }
            e.next = nx
        } else {
            e.next = flowNext(cx, cy)
        }
        e.sw = e.next[1] !== cy ? 1 : 0
    }
    const nx = e.next[0],
        ny = e.next[1],
        b = bAt(nx, ny)
    const dx = nx - e.x,
        dy = ny - e.y,
        d = Math.hypot(dx, dy)
    if (b && b.o === 0 && blocks(b) && d <= 0.85) {
        if (T === 'ladder' && (b.t === 'wall' || b.t === 'palisade')) {
            b.ladder = 25
            GV.flowDirty = true
            e.dead = true
            if (GV.S.t > GV.ladderToast) {
                GV.ladderToast = GV.S.t + 30
                toast(
                    'Ladders are up against your walls. Soldiers nearby can throw them down.'
                )
            }
            return
        }
        if (e.cd <= 0) {
            e.cd = T === 'ram' ? 1.6 : 1
            e.walk += 0.3
            damageB(
                b,
                e.dmg *
                    (T === 'ram'
                        ? WALLISH[b.t]
                            ? 7
                            : 1
                        : T === 'earcher'
                          ? 0.6
                          : e.bm)
            )
            if (T === 'looter' || (T === 'earcher' && Math.random() < 0.08)) {
                ignite(b)
            }
        }
        return
    }
    let sp = e.sp
    if (wet(cx, cy)) {
        sp *= 0.3
    } else if (terrain[cx + cy * N] === 1) {
        sp *= 0.7
    }
    if (here && here.o === 0) {
        if (here.t === 'stakes') {
            sp *= 0.5
            hitEnemy(e, 9 * dt)
            damageB(here, 4 * dt, true)
            if (e.dead) {
                return
            }
        } else if (here.ladder > 0) {
            sp *= 0.4
        }
    }
    const st = sp * dt
    e.walk += dt
    e.moving = true
    if (Math.abs(dx - dy) > 0.01) {
        e.face = dx - dy > 0 ? 1 : -1
    }
    if (d <= st + 0.02) {
        e.x = nx
        e.y = ny
        e.next = null
    } else {
        e.x += (dx / d) * st
        e.y += (dy / d) * st
    }
}
export function endScreen(won?) {
    if (!won) {
        GV.S.over = true
    }
    $('#overTitle').textContent = won
        ? 'The realm is yours'
        : 'The keep has fallen'
    $('#overText').textContent = won
        ? 'Every rival keep has fallen and all the land flies the banner of Thornwick. You broke ' +
          GV.S.wave +
          ' attacks along the way. You may rule on in peace, or begin again.'
        : GV.S.wave === 0
          ? 'The first host broke through. Next time, raise a palisade and a watchtower, or train soldiers, before the pennant runs out.'
          : 'Thornwick broke ' +
            GV.S.wave +
            (GV.S.wave === 1 ? ' attack' : ' attacks') +
            ' and sheltered ' +
            pop() +
            ' people at the end.'
    $('#overKeep').hidden = !won
    $('#over').hidden = false
    GV.overOpen = true
    if (!won) {
        wipeSave()
    }
}
