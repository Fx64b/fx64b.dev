import { bannerOf, slotOf } from './army'
import { ARMOURED, flankMul, fleeStep, shieldCover, shock } from './combat'
import { DEF, KX, KY, N, ORDER, WALLISH } from './config'
import {
    afford,
    compass,
    freeNear,
    gain,
    garr,
    near,
    pay,
    puff,
    toast,
    wet,
} from './helpers'
import { damageB, hitEnemy } from './lords'
import {
    door,
    frontTile,
    rivBlock,
    search,
    siegeCost,
    terrCost,
    trace,
    walkCost,
} from './path'
import {
    bAt,
    bmap,
    clampN,
    ownedT,
    pathMap,
    regAt,
    rivById,
    season,
    terrain,
    tileI,
} from './state'
import { GV } from './vars'

export function spawnVillager(nearKeep?) {
    const [x, y] = freeNear(KX + 0.5, KY + 2.5, nearKeep ? 2.5 : 5.5)
    GV.S.vill.push({
        x,
        y,
        v: (Math.random() * 5) | 0,
        role: 'idle',
        job: null,
        state: 'start',
        timer: Math.random() * 2,
        path: null,
        pi: 0,
        carry: null,
        walk: Math.random() * 5,
        moving: false,
        face: 1,
    })
}
export const UNITS = {
    sword: {
        name: 'Swordsman',
        plural: 'swordsmen',
        cost: { gold: 25 },
        hp: 70,
        dmg: 9,
        sp: 1.9,
        rng: 0.85,
        cd: 0.8,
    },
    pike: {
        name: 'Pikeman',
        plural: 'pikemen',
        cost: { gold: 20, wood: 10 },
        hp: 85,
        dmg: 7,
        sp: 1.7,
        rng: 1.05,
        cd: 0.9,
        big: 2.6,
    },
    archer: {
        name: 'Archer',
        plural: 'archers',
        cost: { gold: 25 },
        hp: 40,
        dmg: 6,
        sp: 1.9,
        rng: 3.4,
        cd: 1.2,
        ranged: 1,
    },
    knight: {
        name: 'Knight',
        plural: 'knights',
        cost: { gold: 60, food: 20 },
        hp: 150,
        dmg: 13,
        sp: 3,
        rng: 0.95,
        cd: 0.9,
        charge: 1,
    },
    pram: {
        name: 'Battering ram',
        plural: 'rams',
        cost: { wood: 80, gold: 20 },
        hp: 320,
        dmg: 14,
        sp: 0.75,
        rng: 1,
        cd: 1.6,
        siege: 1,
    },
    pcat: {
        name: 'Catapult',
        plural: 'catapults',
        cost: { wood: 100, stone: 40, gold: 40 },
        hp: 180,
        dmg: 42,
        sp: 0.65,
        rng: 7.5,
        cd: 4.5,
        siege: 1,
        ranged: 1,
    },
    shield: {
        name: 'Shield-bearer',
        plural: 'shield-bearers',
        cost: { gold: 25, wood: 15 },
        hp: 150,
        dmg: 5,
        sp: 1.35,
        rng: 0.85,
        cd: 1.1,
    },
    xbow: {
        name: 'Crossbowman',
        plural: 'crossbowmen',
        cost: { gold: 40, wood: 10 },
        hp: 55,
        dmg: 24,
        sp: 1.6,
        rng: 3.9,
        cd: 3.2,
        ranged: 1,
        pierce: 1,
        need: 2,
    },
    eng: {
        name: 'Engineer',
        plural: 'engineers',
        cost: { wood: 40, gold: 30 },
        hp: 60,
        dmg: 4,
        sp: 1.6,
        rng: 0.85,
        cd: 1,
    },
    captain: {
        name: 'Captain',
        plural: 'captain',
        hp: 120,
        dmg: 12,
        sp: 2,
        rng: 0.9,
        cd: 0.8,
    },
    scout: { name: 'Scout', plural: 'scouts', hp: 40, dmg: 0, sp: 3.2 },
}
export const BIG = { brute: 1, ram: 1, catapult: 1 }
export const costText = (cost?) =>
    Object.entries<any>(cost)
        .map(([r, n]) => n + ' ' + r)
        .join(' and ')
GV.blessMul = 1
export function addSoldier(home?, x?, y?, kind?) {
    kind = kind || (DEF[home.t].units || ['sword'])[0]
    const U = UNITS[kind],
        max = kind === 'captain' ? 120 + 30 * GV.S.capLvl : U.hp
    const s = {
        x,
        y,
        home,
        kind,
        side: 0,
        hp: max,
        max,
        cd: 0,
        rep: 0,
        think: Math.random() * 0.4,
        postCd: 0,
        timer: 1,
        path: null,
        pi: 0,
        walk: 0,
        moving: false,
        dead: false,
        face: 1,
        tg: null,
        tb: null,
        post: null,
        onWall: false,
        run: 0,
        sw: 0,
        goal: null,
        sq: 0,
        mor: 100,
        rout: 0,
        mt: Math.random() * 0.5,
        hi: 0,
        lastA: null,
        lastAT: 0,
        slot: undefined,
        v: (Math.random() * 5) | 0,
    }
    GV.S.sold.push(s)
    if (kind === 'captain') {
        GV.capU = s
    }
    return s
}
export const smithBonus = () =>
    Math.min(
        2,
        GV.S.b.reduce((n?, b?) => n + (b.t === 'smith' && b.o === 0 ? 1 : 0), 0)
    ) * 2
export function sDmg(s?, tgt?) {
    const U = UNITS[s.kind]
    let d = s.kind === 'captain' ? 12 + 3 * GV.S.capLvl : U.dmg
    if (!U.siege) {
        d += smithBonus()
    }
    if (
        s !== GV.capU &&
        GV.capU &&
        !GV.capU.dead &&
        Math.hypot(GV.capU.x - s.x, GV.capU.y - s.y) < 4.5
    ) {
        d *= 1.2
    }
    if (GV.S.cry > 0) {
        d *= 1.5
    }
    if (U.big && tgt && BIG[tgt.type]) {
        d *= U.big
    }
    // Bolts punch through mail and plate; arrows glance off.
    if (tgt && ARMOURED[tgt.type] && U.ranged && !U.siege) {
        d *= U.pierce ? 1.6 : 0.7
    }
    return d * GV.blessMul
}
export const sSpeed = (s?, f?) =>
    UNITS[s.kind].sp * (f || 1) * (GV.S.cry > 0 ? 1.3 : 1)
export function setJob(u?, b?) {
    u.job = b
    u.role = b ? DEF[b.t].role : 'idle'
    u.state = 'start'
    u.path = null
    u.carry = null
    u.timer = 0
}
export function assignJobs() {
    for (const b of GV.S.b) {
        b.w = 0
    }
    for (const u of GV.S.vill) {
        if (u.job && (u.job.dead || u.job.o !== 0)) {
            setJob(u, null)
        }
        if (u.job) {
            u.job.w++
        }
    }
    const works = GV.S.b.filter((b?) => b.o === 0 && DEF[b.t].role)
    const idle = GV.S.vill.filter((u?) => !u.job)
    let go = true
    while (idle.length && go) {
        go = false
        for (const t of ORDER) {
            for (const b of works) {
                if (b.t === t && idle.length && b.w < DEF[t].slots) {
                    setJob(idle.pop(), b)
                    b.w++
                    go = true
                }
            }
        }
    }
    if (!idle.length) {
        const empty = works.find((b?) => b.w === 0)
        if (empty) {
            let rich = null
            for (const b of works) {
                if (b.w >= 2 && (!rich || b.w > rich.w)) {
                    rich = b
                }
            }
            if (rich) {
                const u = GV.S.vill.find((u?) => u.job === rich)
                rich.w--
                setJob(u, empty)
                empty.w++
            }
        }
    }
}
export function goTo(u?, tx?, ty?, px?, py?, cost?) {
    const s = tileI(u.x, u.y),
        t = tx + ty * N
    let pts = []
    if (s !== t && search([s], t, cost || walkCost)) {
        pts = trace(s, t).map((i?) => [i % N, (i / N) | 0])
    }
    if (pts.length) {
        pts[pts.length - 1] = [px, py]
    } else if (
        s !== t &&
        !(Math.abs((s % N) - tx) + Math.abs(((s / N) | 0) - ty) <= 1)
    ) {
        u.path = null
        return false
    } else {
        pts = [[px, py]]
    }
    u.path = pts
    u.pi = 0
    return true
}
export function goToB(u?, b?) {
    const d = door(b),
        f = frontTile(b)
    goTo(u, f % N, (f / N) | 0, d[0], d[1])
}
export function follow(u?, dt?, sp?) {
    const tx = clampN(u.x),
        ty = clampN(u.y),
        ti = tx + ty * N
    if (wet(tx, ty)) {
        sp *= 0.45
    } else if (u.side !== undefined && terrain[ti] === 1) {
        // Soldiers and raiders push slowly through the woods.
        sp *= 0.7
    } else if (pathMap[ti]) {
        sp *= 1.3
    }
    const p = u.path[u.pi],
        dx = p[0] - u.x,
        dy = p[1] - u.y,
        d = Math.hypot(dx, dy),
        st = sp * dt
    u.walk += dt
    u.moving = true
    if (Math.abs(dx - dy) > 0.01) {
        u.face = dx - dy > 0 ? 1 : -1
    }
    if (d <= st) {
        u.x = p[0]
        u.y = p[1]
        if (++u.pi >= u.path.length) {
            u.path = null
        }
    } else {
        u.x += (dx / d) * st
        u.y += (dy / d) * st
    }
}
export function pickSite(b?, list?) {
    if (!list.length) {
        return null
    }
    const nearL = list
        .map((p?) => [Math.hypot(p[0] - b.x, p[1] - b.y), p])
        .sort((a?, c?) => a[0] - c[0])
        .slice(0, 3)
    return nearL[(Math.random() * nearL.length) | 0][1]
}
export function vUpdate(u?, dt?) {
    if (u.path) {
        follow(u, dt, 1.6)
        return
    }
    u.moving = false
    const b = u.job
    if (!b) {
        u.timer -= dt
        if (u.timer <= 0) {
            u.timer = 2 + Math.random() * 5
            const t = freeNear(KX + 0.5, KY + 3, 3.5)
            goTo(
                u,
                t[0],
                t[1],
                t[0] + (Math.random() - 0.5) * 0.5,
                t[1] + (Math.random() - 0.5) * 0.5
            )
        }
        return
    }
    if (u.role === 'farmer' || u.role === 'fisher') {
        const farm = u.role === 'farmer',
            se = season()
        const spot = () =>
            farm
                ? [
                      b.x + 0.1 + Math.random() * 1.3,
                      b.y + 0.5 + Math.random() * 1,
                  ]
                : door(b)
        if (u.state === 'start') {
            u.state = 'work'
            u.timer = farm ? 6 : 5
            const s = spot()
            goTo(u, Math.round(s[0]), Math.round(s[1]), s[0], s[1])
            return
        }
        u.timer -= dt
        if (!(farm && se === 3)) {
            u.walk += dt
        }
        if (u.timer <= 0) {
            if (farm) {
                u.timer = 6
                if (se !== 3) {
                    gain(
                        'food',
                        Math.round(
                            (near(b, 'mill', 4.5) ? 4.5 : 3) *
                                (se === 2 ? 1.5 : 1)
                        ),
                        b.cx,
                        b.cy
                    )
                }
                const s = spot()
                u.path = [s]
                u.pi = 0
            } else {
                u.timer = 5
                gain('food', se === 3 ? 2 : 4, b.x, b.y)
            }
        }
        return
    }
    const merchant = u.role === 'merchant'
    switch (u.state) {
        case 'start':
            if (merchant) {
                goToB(u, GV.keep)
            } else {
                const s = pickSite(
                    b,
                    u.role === 'woodcutter' ? GV.myTrees : GV.myRocks
                )
                if (!s) {
                    u.timer = 3
                    u.state = 'wait'
                    break
                }
                goTo(
                    u,
                    s[0],
                    s[1],
                    s[0] + (Math.random() - 0.5) * 0.5,
                    s[1] + 0.35
                )
            }
            u.state = 'toSite'
            break
        case 'wait':
            u.timer -= dt
            if (u.timer <= 0) {
                u.state = 'start'
            }
            break
        case 'toSite':
            u.state = 'work'
            u.timer = merchant ? 1.5 : u.role === 'mason' ? 4 : 3
            break
        case 'work':
            u.timer -= dt
            u.walk += dt
            if (u.timer <= 0) {
                u.carry = merchant
                    ? 'gold'
                    : u.role === 'mason'
                      ? 'stone'
                      : 'wood'
                goToB(u, b)
                u.state = 'toHome'
            }
            break
        case 'toHome':
            if (merchant) {
                const lim = { food: 80, wood: 40, stone: 40 }
                const spare = ['food', 'wood', 'stone']
                    .filter((r?) => GV.S.res[r] > lim[r])
                    .sort((a?, c?) => GV.S.res[c] - GV.S.res[a])
                let g = 2
                if (spare.length) {
                    GV.S.res[spare[0]] -= 3
                    g = 6
                }
                gain('gold', g, b.x, b.y)
            } else {
                gain(u.carry, u.role === 'mason' ? 5 : 6, b.x, b.y)
            }
            u.carry = null
            u.state = 'start'
            break
    }
}
export function pickPost(s?) {
    if ((s.postCd -= 0.4) > 0 && s.post && !s.post.dead) {
        return
    }
    s.postCd = 3
    let foe = null,
        fd = 1e9
    for (const e of GV.S.en) {
        if (e.mode === 'atk' && !e.dead) {
            const d = Math.hypot(e.x - KX, e.y - KY)
            if (d < fd) {
                fd = d
                foe = e
            }
        }
    }
    let best = null,
        bd = 1e9
    for (const b of GV.S.b) {
        if (b.o !== 0 || (b.t !== 'wall' && b.t !== 'gate')) {
            continue
        }
        if (b.arch && b.arch !== s && !b.arch.dead) {
            continue
        }
        const d = foe
            ? Math.hypot(b.x - foe.x, b.y - foe.y)
            : Math.hypot(b.x - s.x, b.y - s.y) + (b === s.post ? -3 : 0)
        if (d < bd) {
            bd = d
            best = b
        }
    }
    if (best !== s.post) {
        if (s.post && s.post.arch === s) {
            s.post.arch = null
        }
        s.post = best
        if (best) {
            best.arch = s
        }
        s.path = null
    }
}
export function attackB(s?, b?) {
    const U = UNITS[s.kind]
    if (s.kind === 'pcat') {
        s.cd = U.cd
        GV.S.shots.push({
            x: s.x,
            y: s.y,
            z: 14,
            tx: b.cx,
            ty: b.cy,
            t: 0,
            dur: Math.max(0.7, Math.hypot(b.cx - s.x, b.cy - s.y) / 6),
            dmg: U.dmg,
            stone: 1,
        })
    } else if (U.ranged) {
        s.cd = s.kind === 'xbow' ? U.cd : 1.3
        GV.S.shots.push({
            x: s.x,
            y: s.y,
            z: 10,
            b,
            t: 0,
            dur: 0.3,
            dmg: sDmg(s) * 0.5,
            burn: GV.S.burnT > 0,
        })
    } else {
        s.cd = U.cd
        s.walk += 0.3
        damageB(b, sDmg(s) * (s.kind === 'pram' ? (b.t === 'keep' ? 4 : 7) : 1))
    }
}
export function anchorOf(s?) {
    const bn = bannerOf(s)
    return bn ? [bn.x, bn.y] : [s.home.cx, s.home.cy + 1]
}
export function idleMove(s?, dt?) {
    if (s.path) {
        sMove(s, dt, sSpeed(s, 0.85))
        return
    }
    s.timer -= dt
    const bn = bannerOf(s),
        slot = bn && s.slot !== undefined ? slotOf(s, bn) : null,
        si = slot ? clampN(slot[0]) + clampN(slot[1]) * N : -1
    // Shield-bearers form a line in front of the banner, archers stand behind it.
    if (slot && !bmap[si] && terrain[si] !== 3 && terrain[si] !== 4) {
        if (s.timer <= 0) {
            s.timer = 1.5
            if (Math.hypot(s.x - slot[0], s.y - slot[1]) > 0.45) {
                goTo(
                    s,
                    clampN(slot[0]),
                    clampN(slot[1]),
                    slot[0],
                    slot[1],
                    siegeCost
                )
            } else if (bn.fx - bn.fy !== 0) {
                s.face = bn.fx - bn.fy > 0 ? 1 : -1
            }
        }
        return
    }
    const [ax, ay] = anchorOf(s)
    if (s.timer <= 0 || Math.hypot(s.x - ax, s.y - ay) > 4) {
        s.timer = 3 + Math.random() * 5
        const t = freeNear(ax, ay, 2.2)
        goTo(
            s,
            t[0],
            t[1],
            t[0] + (Math.random() - 0.5) * 0.4,
            t[1] + (Math.random() - 0.5) * 0.4,
            siegeCost
        )
    }
}
/* A soldier who has lost heart runs for home for a few seconds. */
export function routMove(s?, dt?) {
    s.cd -= dt
    s.moving = false
    if (s.post) {
        if (s.post.arch === s) {
            s.post.arch = null
        }
        s.post = null
    }
    fleeStep(s, s.home.cx, s.home.cy + 1, dt, sSpeed(s) * 1.1)
}
export function scoutUpdate(s?, dt?) {
    if (s.path) {
        follow(s, dt, sSpeed(s))
    }
    if (s.goal !== null) {
        const g = GV.regs[s.goal]
        if (regAt(s.x, s.y).id === s.goal || g.disc) {
            if (!GV.S.disc[s.goal]) {
                GV.S.disc[s.goal] = 1
                GV.S.scoutNote =
                    'Your scout has mapped the ' +
                    g.type +
                    ' lands to the ' +
                    compass(g.sx - KX, g.sy - KY) +
                    '.'
                GV.ownDirty = true
            }
            s.goal = null
            goToB(s, GV.keep)
        } else if (!s.path) {
            if (!goTo(s, clampN(g.sx), clampN(g.sy), g.sx, g.sy)) {
                toast('Your scout could not find a way into that land.')
                GV.S.res.gold += 15
                s.dead = true
            }
        }
    } else if (!s.path) {
        s.dead = true
    }
}
export function siegeUpdate(s?, dt?) {
    const U = UNITS[s.kind],
        bn = bannerOf(s),
        flag = bn ? [bn.x, bn.y] : null
    s.cd -= dt
    s.moving = false
    if ((s.think -= dt) <= 0) {
        s.think = 0.8
        s.tb = null
        if (flag) {
            let bd = 1e9
            for (const b of GV.S.b) {
                if (
                    b.o !== 0 &&
                    Math.hypot(b.cx - flag[0], b.cy - flag[1]) < 9
                ) {
                    // Rams go for gates and the keep, catapults for towers.
                    const d =
                        Math.hypot(b.cx - s.x, b.cy - s.y) -
                        (s.kind === 'pram'
                            ? b.t === 'gate' || b.t === 'keep'
                                ? 2.5
                                : 0
                            : b.t === 'tower' ||
                                b.t === 'watch' ||
                                b.t === 'mangonel'
                              ? 3
                              : 0)
                    if (d < bd) {
                        bd = d
                        s.tb = b
                    }
                }
            }
        }
    }
    const b = s.tb && !s.tb.dead ? s.tb : null
    if (b) {
        const d = Math.hypot(b.cx - s.x, b.cy - s.y),
            reach = U.ranged ? U.rng : 0.8 + b.s * 0.45
        if (Math.abs(b.cx - b.cy - (s.x - s.y)) > 0.05) {
            s.face = b.cx - b.cy > s.x - s.y ? 1 : -1
        }
        if (d <= reach) {
            s.path = null
            if (s.cd <= 0) {
                attackB(s, b)
            }
        } else {
            s.rep -= dt
            if (s.rep <= 0 || !s.path) {
                s.rep = 1.2
                goTo(s, clampN(b.cx), clampN(b.cy), b.cx, b.cy, siegeCost)
            }
            if (s.path) {
                sMove(s, dt, sSpeed(s))
            }
        }
        return
    }
    if (!GV.S.en.length || ownedT(clampN(s.x), clampN(s.y))) {
        s.hp = Math.min(s.max, s.hp + 2 * dt)
    }
    idleMove(s, dt)
}
/* Engineers only step round buildings, never through them, and climb walls with a siege tower. */
export const engCost = (i?) => {
    const b = bmap[i]
    if (
        b &&
        b.o !== 0 &&
        (b.t === 'gate' || (!DEF[b.t].walk && !(b.stw >= 1)))
    ) {
        return Infinity
    }
    if (b && b.o === 0 && !DEF[b.t].walk) {
        return Infinity
    }
    return terrCost(i, b)
}
const ENG_WALL = { wall: 1, palisade: 1, tower: 1 }
export function engTarget(s?, bn?) {
    const tunnel = bn.eng === 'tunnel'
    let best = null,
        bs = 1e9
    for (const b of GV.S.b) {
        if (b.o === 0 || b.o === 9 || !ENG_WALL[b.t]) {
            continue
        }
        if (Math.hypot(b.cx - bn.x, b.cy - bn.y) > 9) {
            continue
        }
        if (!tunnel) {
            if (b.stw >= 1) {
                return null
            }
            if (b.t === 'tower') {
                continue
            }
        }
        const sc =
            Math.hypot(b.cx - s.x, b.cy - s.y) -
            (b.dig > 0 || b.stw > 0 ? 5 : 0)
        if (sc < bs) {
            bs = sc
            best = b
        }
    }
    return best
}
/* A tunnel under a wall: the segment falls, and the stretch next to it is badly cracked. */
export function collapse(b?) {
    const rv = rivById(b.o)
    puff(b.cx, b.cy, 18, '#8a7058')
    for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ]) {
        const o = bAt(b.x + dx, b.y + dy)
        if (o && o !== b && o.o === b.o && WALLISH[o.t]) {
            damageB(o, o.max * 0.6, true)
        }
    }
    damageB(b, b.hp + 1, true)
    toast(
        'Your engineers bring down a stretch of ' +
            (rv ? rv.name + "'s" : 'the') +
            ' wall from below.'
    )
}
export function engUpdate(s?, dt?) {
    const bn = bannerOf(s)
    s.cd -= dt
    s.moving = false
    if ((s.think -= dt) <= 0) {
        s.think = 1.2
        s.tb = bn ? engTarget(s, bn) : null
    }
    const b = bn && s.tb && !s.tb.dead && s.tb.o !== 0 ? s.tb : null
    if (b) {
        const d = Math.hypot(b.cx - s.x, b.cy - s.y)
        if (d <= 1.35) {
            s.path = null
            s.walk += dt
            s.moving = true
            if (Math.abs(b.cx - b.cy - (s.x - s.y)) > 0.05) {
                s.face = b.cx - b.cy > s.x - s.y ? 1 : -1
            }
            if (bn.eng === 'tunnel') {
                b.dig = (b.dig || 0) + dt / 30
                if (b.dig >= 1) {
                    collapse(b)
                    s.tb = null
                }
            } else if (!(b.stw >= 1)) {
                b.stw = Math.min(1, (b.stw || 0) + dt / 16)
                if (b.stw >= 1) {
                    const rv = rivById(b.o)
                    toast(
                        'A siege tower stands against the walls of ' +
                            (rv ? rv.name : 'the castle') +
                            '. Your soldiers can climb over there.'
                    )
                }
            }
            return
        }
        s.rep -= dt
        if (s.rep <= 0 || !s.path) {
            s.rep = 1.5
            if (!goTo(s, clampN(b.cx), clampN(b.cy), b.cx, b.cy, engCost)) {
                s.tb = null
                s.think = 3
            }
        }
        if (s.path) {
            follow(s, dt, sSpeed(s))
            if (Math.hypot(b.cx - s.x, b.cy - s.y) <= 1.3) {
                s.path = null
            }
        }
        return
    }
    if (!GV.S.en.length || ownedT(clampN(s.x), clampN(s.y))) {
        s.hp = Math.min(s.max, s.hp + 2 * dt)
    }
    idleMove(s, dt)
}
export function sUpdate(s?, dt?) {
    if (s.kind === 'scout') {
        return scoutUpdate(s, dt)
    }
    if (s.home.dead || s.home.o !== 0) {
        s.home = GV.keep
    }
    if (s.rout > 0) {
        return routMove(s, dt)
    }
    if (s.kind === 'eng') {
        return engUpdate(s, dt)
    }
    if (UNITS[s.kind].siege) {
        return siegeUpdate(s, dt)
    }
    s.cd -= dt
    s.moving = false
    s.think -= dt
    const bn = bannerOf(s),
        flag = bn ? [bn.x, bn.y] : null,
        U = UNITS[s.kind],
        arch = !!U.ranged,
        shield = s.kind === 'shield',
        hold = (bn ? bn.st : GV.S.stance) === 'hold',
        hi = arch ? s.hi || 0 : 0
    const [ax, ay] = anchorOf(s)
    if (s.think <= 0) {
        s.think = 0.4
        let best = null,
            bd = 1e9
        for (const e of GV.S.en) {
            if (e.dead) {
                continue
            }
            const d = Math.hypot(e.x - s.x, e.y - s.y)
            let ok
            if (hold) {
                ok =
                    d < (s.onWall ? 6 : arch ? 4 : shield ? 1.6 : 2.5) + hi ||
                    (!s.onWall &&
                        Math.hypot(e.x - ax, e.y - ay) < (shield ? 3 : 5))
            } else {
                ok =
                    d < (s.onWall ? 6 : 4.5) + hi ||
                    (flag
                        ? Math.hypot(e.x - flag[0], e.y - flag[1]) < 7
                        : !(arch && s.post) &&
                          d < 24 &&
                          (ownedT(clampN(e.x), clampN(e.y)) ||
                              Math.hypot(e.x - KX, e.y - KY) < 15))
            }
            if (ok && d < bd) {
                bd = d
                best = e
            }
        }
        s.tg = best
        s.tb = null
        if (!best && flag) {
            let b2 = 1e9
            for (const b of GV.S.b) {
                if (
                    b.o !== 0 &&
                    Math.hypot(b.cx - flag[0], b.cy - flag[1]) < 8
                ) {
                    const ds =
                        Math.hypot(b.cx - s.x, b.cy - s.y) +
                        (WALLISH[b.t] ? 10 : 0)
                    if (ds < b2) {
                        b2 = ds
                        s.tb = b
                    }
                }
            }
        }
        if (arch && !flag) {
            pickPost(s)
        } else if (s.post) {
            if (s.post.arch === s) {
                s.post.arch = null
            }
            s.post = null
        }
    }
    if (s.post && s.post.dead) {
        s.post = null
    }
    s.onWall = !!(s.post && Math.hypot(s.x - s.post.x, s.y - s.post.y) < 0.3)
    const e = s.tg && !s.tg.dead ? s.tg : null
    if (e) {
        const d = Math.hypot(e.x - s.x, e.y - s.y),
            rng = arch ? (s.onWall ? U.rng + 1.8 : U.rng) + hi : U.rng
        if (Math.abs(e.x - e.y - (s.x - s.y)) > 0.05) {
            s.face = e.x - e.y > s.x - s.y ? 1 : -1
        }
        if (d <= rng) {
            s.path = null
            if (s.cd <= 0) {
                if (arch) {
                    s.cd = U.cd
                    GV.S.shots.push({
                        x: s.x,
                        y: s.y,
                        z: s.onWall ? 22 : 10,
                        e,
                        t: 0,
                        dur: 0.3,
                        dmg: sDmg(s, e),
                        burn: GV.S.burnT > 0,
                        bolt: U.pierce ? 1 : 0,
                    })
                } else {
                    let dm = sDmg(s, e) * flankMul(s, e)
                    if (U.charge && s.run > 2.5) {
                        dm *= 2.4
                        puff(e.x, e.y, 5, '#e8dcc0')
                    }
                    s.run = 0
                    s.cd = U.cd
                    s.walk += 0.3
                    hitEnemy(e, dm)
                }
            }
            return
        }
        if (hold && Math.hypot(s.x - ax, s.y - ay) > (shield ? 3 : 5.5)) {
            s.tg = null
        } else if (!s.onWall && !(arch && s.post && !flag)) {
            s.rep -= dt
            if (s.rep <= 0 || !s.path) {
                s.rep = 0.6
                goTo(s, clampN(e.x), clampN(e.y), e.x, e.y, siegeCost)
            }
            if (s.path) {
                const ox = s.x,
                    oy = s.y
                sMove(s, dt, sSpeed(s))
                s.run += Math.hypot(s.x - ox, s.y - oy)
            }
            return
        }
    }
    const b = !e && s.tb && !s.tb.dead ? s.tb : null
    if (b) {
        const d = Math.hypot(b.cx - s.x, b.cy - s.y),
            reach = arch ? 3.6 : 0.8 + b.s * 0.45
        if (d <= reach) {
            s.path = null
            if (s.cd <= 0) {
                attackB(s, b)
            }
        } else {
            s.rep -= dt
            if (s.rep <= 0 || !s.path) {
                s.rep = 0.9
                goTo(s, clampN(b.cx), clampN(b.cy), b.cx, b.cy, siegeCost)
            }
            if (s.path) {
                sMove(s, dt, sSpeed(s, 0.9))
            }
        }
        return
    }
    s.run = Math.max(0, s.run - dt)
    if (!GV.S.en.length || ownedT(clampN(s.x), clampN(s.y))) {
        s.hp = Math.min(s.max, s.hp + 3 * dt)
    }
    if (s.post && !flag && !s.path) {
        if (!s.onWall) {
            goTo(s, s.post.x, s.post.y, s.post.x, s.post.y)
        }
        return
    }
    if (s.post && !flag) {
        sMove(s, dt, sSpeed(s, 0.85))
        return
    }
    idleMove(s, dt)
}
export function sMove(s?, dt?, sp?) {
    const p = s.path[s.pi],
        b = bAt(clampN(p[0]), clampN(p[1]))
    if (
        b &&
        rivBlock(b) &&
        b !== s.tb &&
        Math.hypot(b.cx - s.x, b.cy - s.y) < 1.4
    ) {
        if (s.cd <= 0) {
            attackB(s, b)
        }
        if (b.dead) {
            s.path = null
        }
        return
    }
    follow(s, dt, sp)
}
/* how: 'arrow', 'melee' or 'stone'. att: the unit striking, for flanking. */
export function hitSold(s?, dmg?, how?, att?) {
    if (s.dead) {
        return
    }
    if (att && how === 'melee') {
        dmg *= flankMul(att, s)
    }
    if (s.kind === 'shield') {
        dmg *= how === 'arrow' ? 0.4 : how === 'melee' ? 0.75 : 1
    } else if (how === 'arrow' && UNITS[s.kind].ranged && shieldCover(s)) {
        dmg *= 0.5
    }
    s.hp -= s.onWall ? dmg * 0.5 : dmg
    if (s.hp <= 0) {
        s.dead = true
        puff(s.x, s.y, 4, '#b9b0a0')
        if (s.post && s.post.arch === s) {
            s.post.arch = null
        }
        if (s === GV.capU) {
            GV.capU = null
            GV.S.capDown = 60
            shock(s.x, s.y, 0, null, 35, 10)
            toast(
                'The captain has fallen. A new one will take up the banner in a while.'
            )
        } else if (s.kind !== 'scout') {
            shock(s.x, s.y, 0, null, 10, 4)
        }
    }
}
export function train(b?, auto?, kind?) {
    const d = DEF[b.t]
    kind = kind || b.trainKind || d.units[0]
    const U = UNITS[kind]
    if (U.need && GV.keep.lvl < U.need) {
        if (!auto) {
            toast(U.name + 's need a stone keep.')
        }
        return
    }
    if (garr(b) >= d.garrison) {
        if (!auto) {
            toast(
                'This ' +
                    d.name.toLowerCase() +
                    ' is full. Build another for more.'
            )
        }
        return
    }
    if (!afford(U.cost)) {
        if (!auto) {
            toast(
                'A ' + U.name.toLowerCase() + ' costs ' + costText(U.cost) + '.'
            )
        }
        return
    }
    let u = GV.S.vill.find((u?) => !u.job)
    if (!u && !auto) {
        u = GV.S.vill
            .slice()
            .sort((a?, c?) => (c.job ? c.job.w : 0) - (a.job ? a.job.w : 0))[0]
    }
    if (!u) {
        if (!auto) {
            toast('No villagers to train. Build houses to grow the village.')
        }
        return
    }
    pay(U.cost)
    GV.S.vill.splice(GV.S.vill.indexOf(u), 1)
    addSoldier(b, u.x, u.y, kind)
}
export function sendScout(rgId?) {
    const rg = GV.regs[rgId]
    if (rg.disc) {
        toast('That land is already known.')
        return false
    }
    if (!rg.adj.some((a?) => GV.regs[a].disc)) {
        toast('Too deep in the unknown. Scout the lands next to it first.')
        return false
    }
    if (GV.S.sold.some((s?) => s.kind === 'scout' && s.goal === rgId)) {
        toast('A scout is already riding there.')
        return false
    }
    if (GV.S.res.gold < 15) {
        toast('A scout needs 15 gold for the road.')
        return false
    }
    GV.S.res.gold -= 15
    const s = addSoldier(GV.keep, KX + 0.5, KY + 2.6, 'scout')
    s.goal = rgId
    toast(
        'A scout rides out toward the ' + compass(rg.sx - KX, rg.sy - KY) + '.'
    )
    return true
}
export function warCry() {
    if (!GV.capU) {
        toast('The captain must be alive to sound the war cry.')
        return
    }
    if (GV.S.cryCd > 0) {
        return
    }
    GV.S.cry = 15
    GV.S.cryCd = 90
    for (const s of GV.S.sold) {
        if (UNITS[s.kind].dmg && !UNITS[s.kind].siege) {
            puff(s.x, s.y, 3, '#e8c45a')
        }
    }
    toast(
        'The captain sounds the war cry. Your soldiers strike harder and faster for fifteen seconds.'
    )
}
export function fireArrows() {
    if (GV.S.burnCd > 0) {
        return
    }
    if (GV.S.res.wood < 20) {
        toast('Fire arrows need 20 wood for pitch and kindling.')
        return
    }
    GV.S.res.wood -= 20
    GV.S.burnT = 12
    GV.S.burnCd = 100
    toast(
        'Braziers are lit along the walls. For twelve seconds every arrow flies burning.'
    )
}
