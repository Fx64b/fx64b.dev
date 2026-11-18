/* The living world: weather, wildlife, travellers, tales and build helpers.
   This module holds their saved state and the small hooks the rest of the game calls. */
import { DEF, DF, FCOL, WALLISH } from './config'
import { R, sprite, unitSprite } from './sprites'
import { animalSprite } from './sprites-wild'
import { reduceMotion, seenAt, wx, wy } from './state'
import { talesTick } from './tales'
import { copyWall } from './tools'
import { hireKnight, sendOn, travelHTML, travelTick } from './travel'
import { GV } from './vars'
import {
    WX,
    drawWeather,
    fogHides,
    harvestMul,
    rangeMul,
    weatherLeft,
    weatherName,
    weatherTick,
    wxIs,
    wxNew,
} from './weather'
import { GAME, HUNT_R, gameNear, wildTick, wolfUpdate } from './wildlife'

export { animalSprite, drawWeather, fogHides, wolfUpdate }

/* ---------- state ---------- */
const fresh = () => ({
    wx: wxNew(),
    joy: 0,
    joyT: 0,
    gloom: 0,
    gloomT: 0,
    bountyT: 0,
    later: [],
    herdCd: 2,
    wolfCd: 20,
    wolfSeen: 0,
    growCd: 1,
    carCd: 25,
    travCd: 40,
    hired: 0,
    grown: 0,
})
export function livingInit(s?) {
    s.wld = fresh()
    GV.wild = []
    GV.trav = []
    GV.acar = []
    GV.roads = {}
    GV.tree0T = -1
    GV.wArrows = []
}
const num = (v?, d?) => (typeof v === 'number' && isFinite(v) ? v : d)
/** Joy from a minstrel or a feast, gloom from a bad omen: added to the needs met. */
export function moodBonus() {
    const w = GV.S && GV.S.wld
    if (!w) {
        return 0
    }
    return (w.joyT > 0 ? w.joy : 0) - (w.gloomT > 0 ? w.gloom : 0)
}
export function livingTick(dt?) {
    const w = GV.S.wld
    w.joyT = Math.max(0, w.joyT - dt)
    w.gloomT = Math.max(0, w.gloomT - dt)
    w.bountyT = Math.max(0, w.bountyT - dt)
    weatherTick(dt)
    wildTick(dt)
    travelTick(dt)
    talesTick()
}

/* ---------- drawing ---------- */
/** Add animals, travellers and the lords' caravans to the draw list (kind 7). */
export function livingDrawList(list?, vis?) {
    for (const a of GV.wild) {
        if (vis(a.x, a.y)) {
            list.push([a.x + a.y + (a.down ? -0.05 : 0.02), 7, a, 'animal'])
        }
    }
    for (const t of GV.trav) {
        if (vis(t.x, t.y)) {
            list.push([t.x + t.y + 0.02, 7, t, 'trav'])
        }
    }
    for (const c of GV.acar) {
        if (vis(c.x, c.y)) {
            list.push([c.x + c.y + 0.02, 7, c, 'acar'])
        }
    }
}
const frameOf = (u?) => (u.moving && !reduceMotion ? ((u.walk * 6) | 0) % 2 : 0)
export function drawLivingItem(c?, d?) {
    const u = d[2],
        k = d[3],
        X = Math.round(wx(u.x + (u.ox || 0), u.y + (u.oy || 0))),
        Y = Math.round(wy(u.x + (u.ox || 0), u.y + (u.oy || 0)))
    if (k === 'animal' || k === 'wolf') {
        const img = animalSprite(
                k === 'wolf' ? 'wolf' : u.k,
                u.down ? 2 : frameOf(u),
                u.face < 0
            ),
            iw = img.width / R,
            ih = img.height / R
        c.fillStyle = 'rgba(10,16,22,.3)'
        c.fillRect(X - 4, Y - 0.5, 8, 1)
        blit(c, img, X - iw / 2, Y - ih + 1)
        if (k === 'wolf' && u.hp < u.max - 0.5) {
            c.fillStyle = '#1c1a22'
            c.fillRect(X - 6, Y - ih - 2, 12, 4)
            c.fillStyle = u.hp / u.max > 0.5 ? '#6fc25a' : '#d8483c'
            c.fillRect(
                X - 5,
                Y - ih - 1,
                Math.max(1, Math.round(10 * (u.hp / u.max))),
                2
            )
        }
        return
    }
    if (k === 'acar') {
        const sp = sprite('caravan', { sw: u.sw, v: u.rev || 0, f: frameOf(u) })
        blit(c, sp.parts[0].cv, X - sp.ox / R, Y - sp.oy / R)
        // A pennant in the lord's colour.
        const col = FCOL[u.from] || 0
        c.fillStyle = '#1c1a22'
        c.fillRect(X - 1, Y - 24, 1, 9)
        c.fillStyle = '#' + col.toString(16).padStart(6, '0')
        c.fillRect(X, Y - 24, 5, 3)
        return
    }
    const role = u.k === 'knight' ? 'knight' : u.k,
        img = unitSprite(
            role,
            frameOf(u),
            u.face < 0,
            u.k === 'knight' ? 10 : 0,
            u.v
        ),
        iw = img.width / R,
        ih = img.height / R
    c.fillStyle = 'rgba(10,16,22,.32)'
    c.fillRect(X - iw * 0.28, Y - 0.5, iw * 0.56, 1)
    blit(c, img, X - iw / 2, Y - ih + 1)
    if (u.k === 'minstrel' && u.st === 'stay' && !reduceMotion) {
        const ph = (GV.animT * 2) % 1
        c.fillStyle = '#f6eed6'
        c.fillRect(X + 3 + ph * 3, Y - ih - 2 - ph * 6, 1, 2.5)
        c.fillRect(X + 4 + ph * 3, Y - ih - 2 - ph * 6, 1, 0.5)
    }
}
const blit = (c?, img?, x?, y?) =>
    c.drawImage(img, x, y, img.width / R, img.height / R)
/** Hunters' arrows, drawn over the units. */
export function drawLivingOver(c?) {
    c.fillStyle = '#e8e2cc'
    for (const r of GV.wArrows) {
        if (!seenAt(r.x, r.y)) {
            continue
        }
        const f = Math.min(1, r.t / 0.3),
            x = wx(r.x + (r.a.x - r.x) * f, r.y + (r.a.y - r.y) * f),
            y = wy(r.x + (r.a.x - r.x) * f, r.y + (r.a.y - r.y) * f) - 7
        c.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, 2, 0.5)
    }
}

/* ---------- picking and the inspect panel ---------- */
/** A tap at world point (X, Y): an animal, a traveller or a lord's caravan. */
export function livingPick(X?, Y?) {
    let best = null,
        bd = 1e9
    const test = (u?, kind?, w?, h?) => {
        if (!seenAt(u.x, u.y)) {
            return
        }
        const x = wx(u.x, u.y),
            y = wy(u.x, u.y)
        if (X >= x - w / 2 && X <= x + w / 2 && Y >= y - h && Y <= y + 2) {
            const d = Math.abs(X - x) + Math.abs(Y - y)
            if (d < bd) {
                bd = d
                best = { kind, u }
            }
        }
    }
    for (const a of GV.wild) {
        test(a, 'wild', 14, 11)
    }
    for (const t of GV.trav) {
        test(t, 'trav', t.k === 'knight' ? 18 : 12, t.k === 'knight' ? 19 : 16)
    }
    for (const c of GV.acar) {
        test(c, 'acar', 22, 16)
    }
    return best
}
export const LIVING_KINDS = { wild: 1, trav: 1, acar: 1 }
/** True when a selected animal or traveller has left the map. */
export const livingGone = (sel?) =>
    !!(sel && LIVING_KINDS[sel.kind] && sel.u.gone)
const hpBar = (f?) =>
    '<div class="hp" title="Condition"><i class="' +
    (f < 0.35 ? 'low' : '') +
    '" style="width:' +
    Math.round(Math.max(0, f) * 100) +
    '%"></i></div>'
export function livingInspect(sel?, close?) {
    if (sel.kind === 'unit' && sel.u.type === 'wolf') {
        const u = sel.u
        return (
            close +
            '<h2>Wolf</h2>' +
            hpBar(u.hp / u.max) +
            '<p>A grey wolf out of the winter woods. Wolves prey on lone villagers and on sheep, and run when they are hurt. Towers, archers and soldiers drive them off.</p><p class="note">' +
            (DF().wolf < 1
                ? 'On this difficulty wolves only bite and scare.'
                : 'From the second year on, wolves can kill a villager caught alone. Walls keep them out.') +
            '</p>'
        )
    }
    if (sel.kind === 'wild') {
        const a = sel.u
        return (
            close +
            '<h2>' +
            GAME[a.k].name +
            '</h2><p>' +
            (a.down
                ? 'Brought down by a hunter.'
                : a.k === 'deer'
                  ? 'A deer at the edge of the forest. It bolts when people come close.'
                  : 'A wild boar rooting under the trees.') +
            '</p><p class="note">A hunter&#39;s lodge sends hunters for game within ' +
            HUNT_R +
            ' tiles. Each ' +
            GAME[a.k].name.toLowerCase() +
            ' brings home ' +
            GAME[a.k].meat +
            ' meat.</p>'
        )
    }
    if (sel.kind === 'trav' || sel.kind === 'acar') {
        return close + travelHTML(sel)
    }
    return null
}
/** Extra lines for the inspect panel of one of your buildings. */
export function livingInspectB(b?) {
    let h = ''
    if (b.t === 'lodge') {
        const g = gameNear(b),
            deer = g.filter((a?) => a.k === 'deer').length,
            boar = g.length - deer
        h +=
            '<p class="note">' +
            (g.length
                ? 'Game within reach: ' +
                  (deer ? deer + (deer === 1 ? ' deer' : ' deer') : '') +
                  (deer && boar ? ' and ' : '') +
                  (boar ? boar + (boar === 1 ? ' boar' : ' boar') : '') +
                  '.'
                : 'No game within reach. Deer and boar live by the forests, and come back in time.') +
            '</p>'
    }
    if (WALLISH[b.t]) {
        h +=
            '<div class="row"><button class="btn" data-act="copyWall">Copy this wall</button><span class="note" style="margin:0">Build the same layout somewhere else</span></div>'
    }
    return h
}
/** The how-it-works text of buildings this phase adds. True when it wrote one. */
export function livingHow(b?, P?, now?) {
    if (b.t !== 'lodge') {
        return false
    }
    P.push(
        'Each hunter stalks the nearest deer or boar within ' +
            HUNT_R +
            ' tiles, shoots it and carries home ' +
            GAME.deer.meat +
            ' meat for a deer or ' +
            GAME.boar.meat +
            ' for a boar. People eat meat for up to a quarter of each meal.'
    )
    P.push(
        'Meat counts as its own dish for the food on the table: grain, fish, bread and meat, any three fill the need.'
    )
    now.push(Math.floor(GV.S.res.meat || 0) + ' meat in store.')
    return true
}
/** Notes on the weather for farms and towers. */
export function livingHowMore(b?, P?, now?) {
    if (b.o !== 0) {
        return
    }
    if (b.t === 'farm') {
        const m = harvestMul()
        if (m !== 1) {
            now.push(
                (m < 1
                    ? 'The drought'
                    : wxIs('rain') && m < 1.2
                      ? 'The rain'
                      : 'The good season') +
                    ' changes the harvest by ' +
                    (m > 1 ? '+' : '') +
                    Math.round((m - 1) * 100) +
                    '% for now.'
            )
        }
    }
    if ((DEF[b.t].range || b.t === 'keep') && rangeMul() < 1) {
        now.push(
            'The ' +
                WX[GV.S.wld.wx.k].name.toLowerCase() +
                ' cuts its reach by ' +
                Math.round((1 - rangeMul()) * 100) +
                '% for now.'
        )
    }
}
/** Buttons from the inspect panel. True when handled. */
export function livingAct(act?, sel?) {
    switch (act) {
        case 'hireKnight':
            if (hireKnight(sel.u)) {
                GV.selected = null
            }
            return true
        case 'sendOn':
            sendOn(sel.u)
            GV.selected = null
            return true
        case 'copyWall':
            copyWall(sel)
            return true
    }
    return false
}
/** The weather after the season and time of day in the top bar. */
export function livingClock() {
    const n = weatherName()
    return n ? ' · ' + n : ''
}
export function weatherTip() {
    const n = weatherName()
    return n
        ? 'Season, time of day and weather. ' +
              n +
              ' for about ' +
              Math.max(1, Math.round(weatherLeft() / 60)) +
              ' more minute' +
              (Math.round(weatherLeft() / 60) > 1 ? 's' : '') +
              '.'
        : 'Season, time of day and weather.'
}
