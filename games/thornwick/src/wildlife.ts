/* Wildlife and the woods: deer and boar roam the forests, hunters bring home their
   meat, wolves come out of the trees in winter, and forests slowly spread again. */
import { fleeStep } from './combat'
import { DEF, DF, KX, KY, N, NN } from './config'
import { resetSite, workMul } from './eco'
import { groundTileChanged } from './ground'
import { compass, gain, nearestSold, puff, toast } from './helpers'
import { setTerr, spawnEnemy } from './lords'
import { hsh } from './noise'
import { goTo, goToB, hitSold } from './people'
import {
    bailey,
    baseTerr,
    bmap,
    clampN,
    inMap,
    ownedT,
    pathMap,
    season,
    seenAt,
    terrain,
} from './state'
import { GV } from './vars'
import { moveMul } from './weather'

GV.wild = []
GV.wArrows = []
export const GAME = {
    deer: { name: 'Deer', meat: 5, sp: 1.1 },
    boar: { name: 'Wild boar', meat: 7, sp: 0.9 },
}
export const HUNT_R = 14
const HERD_MAX = 26

/* ---------- moving about ---------- */
function walkable(x?, y?) {
    const tx = clampN(x),
        ty = clampN(y),
        i = tx + ty * N,
        t = terrain[i]
    if (t >= 2 || x < 1 || y < 1 || x > N - 2 || y > N - 2) {
        return false
    }
    const b = bmap[i]
    return !b || !!DEF[b.t].walk
}
/* Step straight toward the target. Returns true when there, or blocked. */
function stepTo(a?, tx?, ty?, sp?, dt?) {
    const dx = tx - a.x,
        dy = ty - a.y,
        d = Math.hypot(dx, dy)
    if (d < 0.08) {
        return true
    }
    const st = Math.min(d, sp * dt * moveMul(clampN(a.x), clampN(a.y))),
        nx = a.x + (dx / d) * st,
        ny = a.y + (dy / d) * st
    if (!walkable(nx, ny)) {
        return true
    }
    a.x = nx
    a.y = ny
    a.walk += dt
    a.moving = true
    if (Math.abs(dx - dy) > 0.01) {
        a.face = dx - dy > 0 ? 1 : -1
    }
    return false
}
export function spawnHerd() {
    const T = GV.trees,
        // Game is drawn to the woods round a hunter's lodge, so hunters find something.
        lodges = GV.S.b.filter((b?) => b.o === 0 && b.t === 'lodge'),
        lg =
            lodges.length && Math.random() < 0.6
                ? lodges[(Math.random() * lodges.length) | 0]
                : null
    for (let k = 0; k < 60 && T.length; k++) {
        const p = lg
                ? [
                      Math.round(lg.cx + (Math.random() - 0.5) * 22),
                      Math.round(lg.cy + (Math.random() - 0.5) * 22),
                  ]
                : T[(Math.random() * T.length) | 0],
            d = Math.hypot(p[0] - KX, p[1] - KY)
        if (
            !inMap(p[0], p[1]) ||
            terrain[p[0] + p[1] * N] !== 1 ||
            d < 7 ||
            d > 52 ||
            !seenAt(p[0], p[1])
        ) {
            continue
        }
        let near = 0
        for (let j = -1; j <= 1; j++) {
            for (let i = -1; i <= 1; i++) {
                if (
                    inMap(p[0] + i, p[1] + j) &&
                    terrain[p[0] + i + (p[1] + j) * N] === 1
                ) {
                    near++
                }
            }
        }
        if (near < 3) {
            continue
        }
        const kind = Math.random() < 0.68 ? 'deer' : 'boar',
            n =
                kind === 'deer'
                    ? 1 + ((Math.random() * 3) | 0)
                    : 1 + ((Math.random() * 2) | 0)
        for (let m = 0; m < n; m++) {
            const x = p[0] + (Math.random() - 0.5) * 3,
                y = p[1] + (Math.random() - 0.5) * 3
            if (!walkable(x, y)) {
                continue
            }
            GV.wild.push({
                k: kind,
                x,
                y,
                hx: p[0] + 0.5,
                hy: p[1] + 0.5,
                tx: null,
                ty: null,
                t: Math.random() * 3,
                face: Math.random() < 0.5 ? 1 : -1,
                walk: Math.random() * 3,
                moving: false,
                life: 240 + Math.random() * 200,
                down: false,
                gone: false,
                hunter: null,
                v: (Math.random() * 3) | 0,
            })
        }
        return
    }
}
function animalTick(a?, dt?) {
    a.moving = false
    if (a.down) {
        // A carcass left too long is taken by the crows.
        if ((a.life -= dt) <= 0 && !(a.hunter && a.hunter.prey === a)) {
            a.gone = true
        }
        return
    }
    if ((a.life -= dt) <= 0 && !(a.hunter && a.hunter.prey === a)) {
        a.gone = true
        return
    }
    if ((a.look = (a.look || 0) - dt) <= 0) {
        a.look = 0.5
        // Deer start at people and wolves; boar only at wolves.
        let fx = 0,
            fy = 0,
            n = 0
        const scare = (o?, r?) => {
            const d = Math.hypot(o.x - a.x, o.y - a.y)
            if (d < r && d > 0.01) {
                fx += (a.x - o.x) / d
                fy += (a.y - o.y) / d
                n++
            }
        }
        for (const e of GV.S.en) {
            if (e.type === 'wolf') {
                scare(e, 3)
            }
        }
        if (a.k === 'deer') {
            for (const u of GV.S.vill) {
                if (u.role !== 'hunter' || u.state !== 'aim') {
                    scare(u, 1.6)
                }
            }
        }
        if (n) {
            a.tx = a.x + fx * 3
            a.ty = a.y + fy * 3
            a.flee = 2
        }
    }
    a.flee = Math.max(0, (a.flee || 0) - dt)
    if (a.tx === null) {
        if ((a.t -= dt) > 0) {
            return
        }
        a.tx = a.hx + (Math.random() - 0.5) * 7
        a.ty = a.hy + (Math.random() - 0.5) * 7
    }
    const sp = GAME[a.k].sp * (a.flee > 0 ? 2.4 : 0.5)
    if (stepTo(a, a.tx, a.ty, sp, dt)) {
        a.tx = a.ty = null
        a.t = 1.5 + Math.random() * 4
    }
}

/* ---------- hunters ---------- */
const claimed = (a?) =>
    a.hunter &&
    a.hunter.prey === a &&
    a.hunter.job &&
    a.hunter.role === 'hunter'
export const gameNear = (b?) =>
    GV.wild.filter(
        (a?) =>
            !a.gone && !a.down && Math.hypot(a.x - b.cx, a.y - b.cy) <= HUNT_R
    )
function findPrey(u?, b?) {
    let best = null,
        bd = 1e9
    for (const a of gameNear(b)) {
        if (claimed(a)) {
            continue
        }
        const d = Math.hypot(a.x - u.x, a.y - u.y)
        if (d < bd) {
            bd = d
            best = a
        }
    }
    return best
}
function letGo(u?) {
    if (u.prey && u.prey.hunter === u) {
        u.prey.hunter = null
    }
    u.prey = null
}
/** A hunter's day: find game, stalk it, shoot, butcher and carry the meat home. */
export function hunterUpdate(u?, dt?) {
    const b = u.job,
        p = u.prey
    switch (u.state) {
        case 'start': {
            letGo(u)
            const a = findPrey(u, b)
            if (!a) {
                b.lack = 'game'
                u.state = 'wait'
                u.timer = 4
                return
            }
            b.lack = ''
            a.hunter = u
            u.prey = a
            u.tries = 0
            u.state = 'stalk'
            return
        }
        case 'wait':
            if ((u.timer -= dt) <= 0) {
                u.state = 'start'
            }
            return
        case 'stalk': {
            if (!p || p.gone || p.down) {
                u.state = 'start'
                return
            }
            const d = Math.hypot(p.x - u.x, p.y - u.y)
            if (d <= 3.2) {
                u.state = 'aim'
                u.timer = 1.1
                if (Math.abs(p.x - p.y - (u.x - u.y)) > 0.05) {
                    u.face = p.x - p.y > u.x - u.y ? 1 : -1
                }
                return
            }
            if (
                ++u.tries > 6 ||
                Math.hypot(p.x - b.cx, p.y - b.cy) > HUNT_R + 4
            ) {
                u.state = 'start'
                return
            }
            if (!goTo(u, clampN(p.x), clampN(p.y), p.x, p.y)) {
                u.tries += 2
            }
            return
        }
        case 'aim':
            u.walk = 0
            if ((u.timer -= dt * workMul(u)) > 0) {
                return
            }
            if (
                !p ||
                p.gone ||
                p.down ||
                Math.hypot(p.x - u.x, p.y - u.y) > 4.5
            ) {
                u.state = 'stalk'
                return
            }
            GV.wArrows.push({ x: u.x, y: u.y, a: p, t: 0 })
            p.down = true
            p.life = 40
            u.state = 'butcher'
            u.timer = 2.4
            goTo(u, clampN(p.x), clampN(p.y), p.x - 0.25, p.y + 0.2)
            return
        case 'butcher':
            u.walk += dt
            if ((u.timer -= dt * workMul(u)) > 0) {
                return
            }
            u.carry = 'meat'
            u.carryN = p ? GAME[p.k].meat : 0
            if (p) {
                p.gone = true
            }
            letGo(u)
            goToB(u, b)
            u.state = 'home'
            return
        case 'home':
            if (u.carryN) {
                gain('meat', u.carryN, b.x, b.y)
            }
            u.carry = null
            u.carryN = 0
            u.state = 'start'
            return
        default:
            u.state = 'start'
    }
}

/* ---------- wolves ---------- */
export const wolves = () => GV.S.en.filter((e?) => e.type === 'wolf' && !e.dead)
export function spawnWolves() {
    const D = DF(),
        year = (GV.S.t / 600) | 0,
        cap = Math.max(1, Math.min(6, Math.round((1 + year * 0.5) * D.wolf))),
        have = wolves().length
    if (have >= cap) {
        return
    }
    // Look for a tree 14 to 32 tiles from the keep, in known land and outside the walls.
    for (let k = 0; k < 60; k++) {
        const a = Math.random() * 6.283,
            d = 14 + Math.random() * 18,
            p = [
                Math.round(KX + 0.5 + Math.cos(a) * d),
                Math.round(KY + 0.5 + Math.sin(a) * d),
            ]
        if (
            !inMap(p[0], p[1]) ||
            terrain[p[0] + p[1] * N] !== 1 ||
            !seenAt(p[0], p[1]) ||
            bailey[p[0] + p[1] * N] > 0
        ) {
            continue
        }
        const n = Math.min(cap - have, Math.random() < 0.5 ? 2 : 1)
        for (let m = 0; m < n; m++) {
            const e = spawnEnemy(
                9,
                'wolf',
                null,
                2,
                p[0] + 0.5 + m * 0.4,
                p[1] + 0.5,
                'wild'
            )
            e.hp = e.max = 40 * (0.8 + 0.2 * D.wolf)
            e.dmg = 4 + 2 * Math.min(1.5, D.wolf)
            e.sp = 1.7
            e.hx = p[0] + 0.5
            e.hy = p[1] + 0.5
            e.sated = 6
            e.think = Math.random()
        }
        if (!GV.S.wld.wolfSeen) {
            GV.S.wld.wolfSeen = 1
            toast(
                'Wolves howl in the woods to the ' +
                    compass(p[0] - KX, p[1] - KY) +
                    '. They prey on lone villagers and sheep. Towers and soldiers drive them off.'
            )
        }
        return
    }
}
/* Wolves kill only from the second year on, and never on Gentle or Easy. */
const canKill = () => DF().wolf >= 1 && GV.S.t >= 1200
function wolfPrey(e?) {
    if (e.sated > 0) {
        return null
    }
    const s = nearestSold(e.x, e.y, 1.1, false)
    if (s) {
        return { s }
    }
    let best = null,
        bd = 9
    for (const u of GV.S.vill) {
        const d = Math.hypot(u.x - e.x, u.y - e.y)
        if (d >= bd || bailey[clampN(u.x) + clampN(u.y) * N] > 0) {
            continue
        }
        if (nearestSold(u.x, u.y, 4, true)) {
            continue
        }
        let crowd = 0
        for (const o of GV.S.vill) {
            if (o !== u && Math.abs(o.x - u.x) < 2 && Math.abs(o.y - u.y) < 2) {
                crowd++
            }
        }
        if (crowd < 2) {
            bd = d
            best = { u }
        }
    }
    for (const b of GV.S.b) {
        if (b.o === 0 && b.t === 'sheep') {
            const d = Math.hypot(b.cx - e.x, b.cy - e.y)
            if (d < Math.min(bd, 11)) {
                bd = d
                best = { b }
            }
        }
    }
    return best
}
GV.wolfToast = 0
function bite(e?, u?) {
    u.bites = (u.bites || 0) + 1
    puff(u.x, u.y, 3, '#c8483c')
    goToB(u, GV.keep)
    if (u.bites >= 3 && canKill()) {
        const i = GV.S.vill.indexOf(u)
        if (i >= 0) {
            GV.S.vill.splice(i, 1)
        }
        e.sated = 45
        toast(
            'Wolves have killed a villager out in the open. Towers, soldiers and walls keep them off.'
        )
        return
    }
    if (u.bites >= 2) {
        u.bites = 0
        e.sated = 25
        if (GV.S.t > GV.wolfToast) {
            GV.wolfToast = GV.S.t + 60
            toast(
                'A wolf has bitten a villager, who runs for the keep. Lone workers are in danger in winter.'
            )
        }
    }
}
/** Wolves in the realm's list of enemies (fac 9, mode 'wild'). Called from eUpdate. */
export function wolfUpdate(e?, dt?) {
    e.sated = Math.max(0, (e.sated || 0) - dt)
    if (season() !== 3 || e.hp < e.max * 0.35) {
        e.leave = true
    }
    const sp = e.sp * moveMul(clampN(e.x), clampN(e.y))
    if (e.leave) {
        fleeStep(e, e.hx, e.hy, dt, sp * 1.1)
        if (!e.moving || Math.hypot(e.x - e.hx, e.y - e.hy) < 1) {
            e.dead = true
        }
        return
    }
    if ((e.think -= dt) <= 0) {
        e.think = 0.5
        e.prey = wolfPrey(e)
        if (!e.prey && (!e.wx || Math.hypot(e.wx - e.x, e.wy - e.y) < 0.8)) {
            const f = 0.15 + Math.random() * 0.3
            e.wx = e.hx + (KX - e.hx) * f + (Math.random() - 0.5) * 6
            e.wy = e.hy + (KY - e.hy) * f + (Math.random() - 0.5) * 6
        }
    }
    const q = e.prey
    if (!q) {
        fleeStep(e, e.wx, e.wy, dt, sp * 0.45)
        return
    }
    const o = q.s || q.u || q.b,
        tx = q.b ? o.cx : o.x,
        ty = q.b ? o.cy : o.y,
        d = Math.hypot(tx - e.x, ty - e.y)
    if (((q.s || q.b) && o.dead) || (q.u && !GV.S.vill.includes(o))) {
        e.prey = null
        return
    }
    if (d > (q.b ? 1.3 : 0.7)) {
        fleeStep(e, tx, ty, dt, sp)
        return
    }
    if (e.cd > 0) {
        return
    }
    e.walk += 0.3
    if (q.s) {
        e.cd = 1.1
        hitSold(o, e.dmg, 'melee', e)
    } else if (q.u) {
        e.cd = 1.2
        bite(e, o)
    } else {
        e.cd = 4
        e.sk = (e.sk || 0) + 1
        GV.S.res.wool = Math.max(0, GV.S.res.wool - 3)
        puff(o.cx, o.cy, 4, '#f2ecdc')
        if (e.sk >= 2) {
            e.sk = 0
            e.sated = 40
        }
        if (GV.S.t > GV.wolfToast) {
            GV.wolfToast = GV.S.t + 60
            toast(
                'Wolves are among your sheep. Some of the flock is lost, and wool with it.'
            )
        }
    }
}

/* ---------- forests that grow back ---------- */
GV.tree0 = 0
GV.tree0T = -1
/* The trees the land was made with, counted again once a minute as new land opens. */
function treeBase() {
    if (GV.S.t >= GV.tree0T) {
        GV.tree0T = GV.S.t + 60
        let n = 0
        for (let i = 0; i < NN; i++) {
            n += baseTerr[i] === 1 ? 1 : 0
        }
        GV.tree0 = n
    }
    return GV.tree0
}
function canGrow(x?, y?) {
    if (x < 2 || y < 2 || x > N - 3 || y > N - 3) {
        return false
    }
    const i = x + y * N
    if (terrain[i] !== 0 || bmap[i] || pathMap[i] || bailey[i] > 0) {
        return false
    }
    const own = ownedT(x, y),
        r = own ? 3 : 1
    if (own && Math.hypot(x - KX - 0.5, y - KY - 0.5) < 9) {
        return false
    }
    let trees = 0
    for (let j = -r; j <= r; j++) {
        for (let k = -r; k <= r; k++) {
            if (!inMap(x + k, y + j)) {
                continue
            }
            const n = x + k + (y + j) * N
            if (
                bmap[n] ||
                (Math.abs(k) <= 1 && Math.abs(j) <= 1 && pathMap[n])
            ) {
                return false
            }
            if (Math.abs(k) <= 1 && Math.abs(j) <= 1 && terrain[n] === 1) {
                trees++
            }
        }
    }
    return trees >= 2
}
/** Plant a grown tree on (x, y) without rebuilding every prop. */
export function growTree(x?, y?) {
    const i = x + y * N
    setTerr(x, y, 1, false)
    resetSite(i)
    GV.trees.push([x, y])
    if (ownedT(x, y)) {
        GV.myTrees.push([x, y])
    }
    GV.props.push({
        x,
        y,
        k: 1,
        v: (hsh(x, y, GV.S.seed) * 4) | 0,
        ox: Math.round((hsh(x, y, 5) - 0.5) * 8),
        oy: Math.round((hsh(x, y, 6) - 0.5) * 4),
    })
    groundTileChanged(x, y)
}
/* A few tiles a second at most: pick a tree, look at one tile next to it. */
function regrow() {
    const T = GV.trees
    if (!T.length || T.length > treeBase() * 1.12 || season() === 3) {
        return
    }
    for (let k = 0; k < 2; k++) {
        const p = T[(Math.random() * T.length) | 0],
            x = p[0] + ((Math.random() * 3) | 0) - 1,
            y = p[1] + ((Math.random() * 3) | 0) - 1
        if (Math.random() < 0.3 && canGrow(x, y)) {
            growTree(x, y)
            GV.S.wld.grown = (GV.S.wld.grown || 0) + 1
        }
    }
}

/* ---------- the tick ---------- */
export function wildTick(dt?) {
    const W = GV.S.wld
    if ((W.herdCd -= dt) <= 0) {
        W.herdCd = GV.wild.length < HERD_MAX / 2 ? 2.5 : 6
        if (GV.wild.filter((a?) => !a.down).length < HERD_MAX) {
            spawnHerd()
        }
    }
    for (const a of GV.wild) {
        animalTick(a, dt)
    }
    if (GV.wild.some((a?) => a.gone)) {
        GV.wild = GV.wild.filter((a?) => !a.gone)
    }
    if (season() === 3) {
        if ((W.wolfCd -= dt) <= 0) {
            W.wolfCd = (35 + Math.random() * 30) / DF().wolf
            spawnWolves()
        }
    } else {
        W.wolfSeen = 0
        W.wolfCd = 20
    }
    if ((W.growCd -= dt) <= 0) {
        W.growCd = 1
        regrow()
    }
    for (const r of GV.wArrows) {
        r.t += dt
    }
    if (GV.wArrows.length) {
        GV.wArrows = GV.wArrows.filter((r?) => r.t < 0.3)
    }
}
