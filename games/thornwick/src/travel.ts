/* Travellers and the roads between realms: merchant caravans of the rival lords,
   and pilgrims, minstrels and wandering knights passing through Thornwick. */
import { DEF, KX, KY, N } from './config'
import { specOf } from './eco'
import { GOOD } from './goods'
import { afford, gain, pay, puff, toast } from './helpers'
import { door, frontTile, search, terrCost, trace } from './path'
import { addSoldier, follow, goTo, goToB } from './people'
import { bmap, clampN, inMap, ownedT, rivById, seenAt } from './state'
import { costHTML } from './ui'
import { GV } from './vars'

GV.acar = []
GV.roads = {}
GV.trav = []

/* ---------- caravans of the lords ---------- */
const roadCost = (i?) => {
    const b = bmap[i]
    if (b && !DEF[b.t].walk) {
        return Infinity
    }
    return terrCost(i, b)
}
const atWar = (a?, b?) =>
    (a.out && a.foe === b.id) || (b.out && b.foe === a.id) || !!GV.warOn[b.id]
export function sendLordCaravan() {
    const live = GV.S.riv.filter((r?) => !r.dead && r.keepB && !r.keepB.dead)
    if (live.length < 2 || GV.acar.length >= 4) {
        return
    }
    // Lords the player knows trade where the player can see it, more often.
    const known = live.filter((r?) => GV.regs[r.r].disc),
        pool = known.length && Math.random() < 0.7 ? known : live,
        a = pool[(Math.random() * pool.length) | 0]
    const others = live
        .filter((r?) => r !== a && !atWar(a, r))
        .sort(
            (p?, q?) =>
                Math.hypot(p.kx - a.kx, p.ky - a.ky) -
                Math.hypot(q.kx - a.kx, q.ky - a.ky)
        )
        .slice(0, 3)
    const b = others[(Math.random() * others.length) | 0]
    if (!b || Math.hypot(b.kx - a.kx, b.ky - a.ky) > 130) {
        return
    }
    // Roads between keeps are found once and kept for a few minutes: the search is not cheap.
    const key = a.id + '-' + b.id,
        old = GV.roads[key]
    let road = old && GV.S.t - old.t < 300 ? old.p : null
    if (!road) {
        const s = frontTile(a.keepB),
            t = frontTile(b.keepB)
        road = search([s], t, roadCost)
            ? trace(s, t).map((i?) => [i % N, (i / N) | 0])
            : []
        GV.roads[key] = { t: GV.S.t, p: road }
    }
    if (road.length < 4) {
        return
    }
    const path = road.slice()
    path.push(door(b.keepB))
    const d = door(a.keepB),
        sp = specOf(a),
        g = sp.length ? sp[(Math.random() * sp.length) | 0] : 'food'
    GV.acar.push({
        x: d[0],
        y: d[1],
        path,
        pi: 0,
        from: a.id,
        to: b.id,
        g,
        n: 20 + ((Math.random() * 30) | 0),
        walk: 0,
        moving: true,
        face: 1,
        sw: 0,
        rev: 0,
        robT: 0,
    })
}
function lordCaravanTick(c?, dt?) {
    const a = rivById(c.from),
        b = rivById(c.to)
    if (!a || !b || a.dead || b.dead) {
        c.gone = true
        return
    }
    if (c.path) {
        const ox = c.x,
            oy = c.y
        follow(c, dt, 1.4)
        const dx = c.x - ox,
            dy = c.y - oy
        if (Math.abs(dx) + Math.abs(dy) > 1e-4) {
            c.sw = Math.abs(dx) < Math.abs(dy) ? 1 : 0
            c.rev = (c.sw ? dy : dx) < 0 ? 1 : 0
        }
    }
    if (!c.path) {
        // Arrived: both lords grow a little richer.
        a.wealth += 15 + 3 * a.tier
        b.wealth += 10 + 3 * b.tier
        c.gone = true
        return
    }
    if ((c.robT -= dt) > 0) {
        return
    }
    c.robT = 0.5
    for (const e of GV.S.en) {
        if (
            e.dead ||
            Math.hypot(e.x - c.x, e.y - c.y) > 1.4 ||
            !(
                (e.fac === 9 && e.mode !== 'wild') ||
                (e.mode === 'war' && (e.foe === a.id || e.foe === b.id))
            )
        ) {
            continue
        }
        const rv = e.fac < 9 ? rivById(e.fac) : null
        if (rv) {
            rv.wealth += 40
        }
        if (seenAt(c.x, c.y)) {
            puff(c.x, c.y, 6, '#b9b0a0')
            toast(
                (rv ? 'Soldiers of ' + rv.name : 'Bandits') +
                    ' rob a caravan of ' +
                    a.name +
                    ' on the road to ' +
                    b.name +
                    '.'
            )
        }
        c.gone = true
        return
    }
}

/* ---------- travellers ---------- */
const KNIGHTS = [
    'Sir Aldwyn of the Marches',
    'Sir Beric the Wanderer',
    'Dame Elspeth of Harrow',
    'Sir Cadfael Greymantle',
    'Sir Owain Duskmere',
    'Dame Rowena Ashby',
    'Sir Hamon the Silent',
    'Sir Piers of Lindhurst',
]
export const KNIGHT_COST = 70
export const knightCost = () => KNIGHT_COST + 5 * Math.min(10, GV.S.wave)
const mineOf = (t?) => GV.S.b.filter((b?) => b.o === 0 && b.t === t)
/* An owned tile at the edge of your land, in a random direction, that has a way to the keep. */
function edgeSpot(away?) {
    for (let k = 0; k < 8; k++) {
        const a =
            away === undefined
                ? Math.random() * 6.283
                : away + (Math.random() - 0.5) * 1.2
        let last = null
        for (let r = 6; r < 60; r++) {
            const x = clampN(KX + 0.5 + Math.cos(a) * r),
                y = clampN(KY + 0.5 + Math.sin(a) * r)
            if (!inMap(x, y) || !ownedT(x, y)) {
                break
            }
            last = [x, y]
        }
        if (last && !bmap[last[0] + last[1] * N]) {
            return { p: last, a }
        }
    }
    return null
}
function goal(t?) {
    if (t.k === 'pilgrim') {
        const ch = mineOf('chapel')
        return ch.length ? ch[(Math.random() * ch.length) | 0] : GV.keep
    }
    if (t.k === 'minstrel') {
        const tv = mineOf('tavern')
        return tv.length ? tv[(Math.random() * tv.length) | 0] : GV.keep
    }
    return GV.keep
}
export function spawnTraveller(kind?) {
    const q = Math.random(),
        k =
            kind ||
            (q < 0.4
                ? 'pilgrim'
                : q < 0.75 || GV.S.t < 400
                  ? 'minstrel'
                  : 'knight')
    if (k === 'knight' && GV.trav.some((t?) => t.k === 'knight')) {
        return
    }
    const e = edgeSpot()
    if (!e) {
        return
    }
    const t: any = {
        k,
        x: e.p[0] + 0.5,
        y: e.p[1] + 0.5,
        a: e.a,
        path: null,
        pi: 0,
        walk: 0,
        moving: false,
        face: 1,
        v: (Math.random() * 5) | 0,
        st: 'in',
        timer: 0,
        name:
            k === 'knight' ? KNIGHTS[(Math.random() * KNIGHTS.length) | 0] : '',
    }
    t.to = goal(t)
    goToB(t, t.to)
    if (!t.path) {
        return
    }
    GV.trav.push(t)
    if (k === 'knight') {
        toast(
            t.name +
                ', a wandering knight, rides toward your keep. He may offer his sword.'
        )
    } else {
        toast(
            k === 'pilgrim'
                ? 'A pilgrim on the road to the shrines comes through Thornwick.'
                : 'A minstrel comes up the road with a lute on his back.'
        )
    }
}
function arrive(t?) {
    const at = t.to && !t.to.dead ? t.to : GV.keep
    if (t.k === 'pilgrim') {
        t.timer = 8
        if (at.t === 'chapel') {
            const g = 8 + ((Math.random() * 9) | 0)
            gain('gold', g, at.cx, at.cy)
            toast('A pilgrim prays at your chapel and leaves ' + g + ' gold.')
        } else {
            toast(
                'A pilgrim rests at the keep and walks on. A chapel would earn a gift of gold.'
            )
        }
    } else if (t.k === 'minstrel') {
        t.timer = 20
        const W = GV.S.wld,
            tav = at.t === 'tavern'
        W.joyT = Math.max(W.joyT, tav ? 120 : 60)
        W.joy = Math.max(W.joyT > 0 ? W.joy : 0, tav ? 0.15 : 0.08)
        toast(
            tav
                ? 'A minstrel sings in the tavern. The villagers are merrier for two minutes.'
                : 'A minstrel plays by the keep. The villagers are merrier for a minute. A tavern would keep him longer.'
        )
    } else {
        t.timer = 60
        toast(
            t.name +
                ' offers his sword for ' +
                knightCost() +
                ' gold. Tap the knight by the keep to hire him.'
        )
    }
}
function leave(t?) {
    t.st = 'out'
    const e = edgeSpot((t.a || 0) + Math.PI)
    if (!e || !goTo(t, e.p[0], e.p[1], e.p[0] + 0.5, e.p[1] + 0.5)) {
        t.gone = true
    }
}
function travellerTick(t?, dt?) {
    if (t.path) {
        follow(t, dt, t.k === 'knight' ? 2.2 : 1.3)
        return
    }
    t.moving = false
    if (t.st === 'in') {
        t.st = 'stay'
        arrive(t)
    } else if (t.st === 'stay') {
        t.walk += t.k === 'minstrel' ? dt : 0
        if ((t.timer -= dt) <= 0) {
            if (t.k === 'knight') {
                toast(t.name + ' rides on to seek service elsewhere.')
            }
            leave(t)
        }
    } else {
        t.gone = true
    }
}
/** Hire the wandering knight: he joins your army as a knight. */
export function hireKnight(t?) {
    const cost = { gold: knightCost() }
    if (!t || t.gone || t.k !== 'knight') {
        return false
    }
    if (!afford(cost)) {
        toast('The knight asks ' + knightCost() + ' gold.')
        return false
    }
    pay(cost)
    t.gone = true
    addSoldier(GV.keep, t.x, t.y, 'knight')
    GV.S.wld.hired = (GV.S.wld.hired || 0) + 1
    puff(t.x, t.y, 5, '#e8c45a')
    toast(t.name + ' joins your army as a knight.')
    return true
}
export function sendOn(t?) {
    if (t && !t.gone && t.st !== 'out') {
        leave(t)
    }
}

/* ---------- text ---------- */
export function travelHTML(sel?) {
    const t = sel.u
    if (sel.kind === 'acar') {
        const a = rivById(t.from),
            b = rivById(t.to)
        return (
            '<h2>Merchant caravan</h2><p>A caravan of ' +
            (a ? a.name : 'a lord') +
            ', bound for ' +
            (b ? b.name : 'a lord') +
            ' with ' +
            t.n +
            ' ' +
            GOOD[t.g].name.toLowerCase() +
            '. Trade makes both lords a little richer.</p><p class="note">Bandits and hosts at war rob caravans on the road.</p>'
        )
    }
    if (t.k === 'pilgrim') {
        return (
            '<h2>Pilgrim</h2><p>On the long road to the shrines. ' +
            (mineOf('chapel').length
                ? 'Pilgrims pray at your chapel and leave a gift of gold.'
                : 'With a chapel, pilgrims would leave a gift of gold.') +
            '</p>'
        )
    }
    if (t.k === 'minstrel') {
        return '<h2>Minstrel</h2><p>Songs and tales from far away. While he plays, your villagers are merrier: their needs count for more. He stays longer at a tavern.</p>'
    }
    const here = t.st === 'stay'
    return (
        '<h2>' +
        t.name +
        '</h2><p>A wandering knight on a tall horse, looking for a lord to serve. Hired, he fights in your army as a knight.</p>' +
        (here
            ? '<div class="row"><button class="btn primary" data-act="hireKnight"' +
              (GV.S.res.gold < knightCost() ? ' disabled' : '') +
              '>Hire him</button><span class="costs">' +
              costHTML({ gold: knightCost() }) +
              '</span><button class="btn" data-act="sendOn">Send him on</button></div><p class="note">He waits ' +
              Math.ceil(t.timer) +
              ' more seconds.</p>'
            : t.st === 'in'
              ? '<p class="note">He rides to the keep to offer his sword.</p>'
              : '<p class="note">He rides on.</p>')
    )
}
export function travelTick(dt?) {
    const W = GV.S.wld
    if ((W.carCd -= dt) <= 0) {
        W.carCd = 35 + Math.random() * 40
        sendLordCaravan()
    }
    if (GV.S.t > 200 && (W.travCd -= dt) <= 0) {
        W.travCd = 100 + Math.random() * 80
        spawnTraveller()
    }
    for (const c of GV.acar) {
        lordCaravanTick(c, dt)
    }
    for (const t of GV.trav) {
        travellerTick(t, dt)
    }
    if (GV.acar.some((c?) => c.gone)) {
        GV.acar = GV.acar.filter((c?) => !c.gone)
    }
    if (GV.trav.some((t?) => t.gone)) {
        GV.trav = GV.trav.filter((t?) => !t.gone)
    }
}
