/* Build helpers: drag a row of houses or farms, copy a wall and stamp it down again,
   lay a whole ring of wall round a point, and show the reach of towers, wells,
   windmills, chapels and the like while placing them. */
import { placeErr, tryPlace } from './build'
import { highAt } from './combat'
import { $, DEF, KX, KY, WALLISH } from './config'
import { CHAPEL_R, reachBonus } from './eco'
import { afford, toast } from './helpers'
import { setCursor } from './input'
import { costOf } from './land'
import { blit, diamondPath } from './render'
import { R, sprite } from './sprites'
import { bAt, inMap, wx, wy } from './state'
import { hud } from './ui'
import { GV } from './vars'
import { rangeMul } from './weather'
import { HUNT_R } from './wildlife'

/* ---------- reach ---------- */
const HOMES = { house: 1, shouse: 1 },
    SHOTS = { watch: 1, tower: 1, outpost: 1, mangonel: 1 }
/** Circles to show for a building: [radius, colour, the kinds of buildings it reaches]. */
export function reachOf(t?, x?, y?): any[] {
    const d = DEF[t]
    if (!d) {
        return []
    }
    if (SHOTS[t] || t === 'keep') {
        const base =
            t === 'keep' ? 4.5 : d.range + (t === 'mangonel' ? 0 : reachBonus())
        return [
            [
                (base + (t !== 'keep' && highAt(x, y) ? 1 : 0)) * rangeMul(),
                'rgba(255,240,190,.85)',
                null,
            ],
        ]
    }
    switch (t) {
        case 'well':
            return [
                [3.2, 'rgba(140,210,255,.9)', HOMES],
                [4.6, 'rgba(255,170,110,.75)', null],
            ]
        case 'mill':
            return [[4.5, 'rgba(240,220,120,.9)', { farm: 1 }]]
        case 'chapel':
            return [[CHAPEL_R, 'rgba(230,210,255,.85)', HOMES]]
        case 'brazier':
            return [[4.5, 'rgba(255,190,90,.9)', SHOTS]]
        case 'lodge':
            return [[HUNT_R, 'rgba(170,220,140,.8)', null]]
        case 'house':
        case 'shouse':
            return [[3.2, 'rgba(140,210,255,.6)', { well: 1 }]]
        case 'farm':
            return [[4.5, 'rgba(240,220,120,.6)', { mill: 1 }]]
    }
    return []
}
function ringC(c?, gx?, gy?, r?, col?) {
    c.strokeStyle = col
    c.lineWidth = 1
    c.setLineDash([3, 3])
    c.beginPath()
    c.ellipse(
        wx(gx, gy),
        wy(gx, gy),
        r * 16 * Math.SQRT2,
        r * 8 * Math.SQRT2,
        0,
        0,
        7
    )
    c.stroke()
    c.setLineDash([])
}
/** Draw the reach of a building of type t centred on (cx, cy), and mark what it reaches. */
export function drawReach(c?, t?, cx?, cy?, self?) {
    for (const [r, col, hit] of reachOf(t, cx, cy)) {
        ringC(c, cx, cy, r, col)
        if (!hit) {
            continue
        }
        c.strokeStyle = col
        c.lineWidth = 1
        for (const b of GV.S.b) {
            if (
                b.o === 0 &&
                hit[b.t] &&
                b !== self &&
                Math.hypot(b.cx - cx, b.cy - cy) <= r
            ) {
                diamondPath(c, b.x, b.y, b.s)
                c.stroke()
            }
        }
    }
}

/* ---------- rows ---------- */
export const ROW = {
    house: 1,
    shouse: 1,
    farm: 1,
    sheep: 1,
    watch: 1,
    brazier: 1,
    well: 1,
    lodge: 1,
}
export const isRow = (t?) => !!ROW[t]
/** The places of a row from a to b: along the longer axis, one free tile between. */
export function rowPlan(t?, a?, b?) {
    const s = (DEF[t] && DEF[t].size) || 1,
        step = s + 1,
        dx = b[0] - a[0],
        dy = b[1] - a[1]
    let ux = 0,
        uy = 0,
        len
    if (Math.abs(dx) >= Math.abs(dy)) {
        ux = Math.sign(dx) || 1
        len = Math.abs(dx)
    } else {
        uy = Math.sign(dy)
        len = Math.abs(dy)
    }
    const n = Math.min(24, Math.floor(len / step) + 1),
        out = []
    for (let k = 0; k < n; k++) {
        out.push([a[0] + ux * k * step, a[1] + uy * k * step])
    }
    return out
}
GV.row = null
export function rowStart(t?, tile?) {
    GV.row = { t, a: tile, b: tile }
}
export function rowMove(tile?) {
    if (GV.row) {
        GV.row.b = tile
    }
}
/** Build the row. Returns false for a row of one, which is placed like a single tap. */
export function rowEnd() {
    const r = GV.row
    GV.row = null
    if (!r) {
        return false
    }
    const plan = rowPlan(r.t, r.a, r.b)
    if (plan.length < 2) {
        return false
    }
    let n = 0
    for (const [x, y] of plan) {
        if (
            !placeErr(r.t, x, y) &&
            afford(costOf(r.t)) &&
            tryPlace(r.t, x, y, false)
        ) {
            n++
        }
    }
    const nm = DEF[r.t].name.toLowerCase()
    toast(
        n === plan.length
            ? 'A row of ' + n + ' is built: ' + nm + '.'
            : n
              ? n +
                ' of ' +
                plan.length +
                ' built (' +
                nm +
                '). Some places were blocked, or the stores ran short.'
              : 'Nothing could be built there.'
    )
    return true
}

/* ---------- copying walls, and rings of wall ---------- */
GV.stamp = null
GV.ringR = 5
GV.ringT = 'palisade'
/** Every wall, palisade, gate and tower joined to b (corners count), as offsets from the middle. */
export function copyWall(b?) {
    const out = [b],
        seen = new Set([b])
    for (let i = 0; i < out.length && out.length < 600; i++) {
        const c = out[i]
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const o = bAt(c.x + dx, c.y + dy)
                if (o && o.o === 0 && WALLISH[o.t] && !seen.has(o)) {
                    seen.add(o)
                    out.push(o)
                }
            }
        }
    }
    let mx = 0,
        my = 0
    for (const o of out) {
        mx += o.x
        my += o.y
    }
    mx = Math.round(mx / out.length)
    my = Math.round(my / out.length)
    GV.stamp = out.map((o?) => [o.x - mx, o.y - my, o.t])
    armTool('stamp')
    toast(
        'Copied ' +
            out.length +
            ' pieces of wall. Tap the map to build the copy there.'
    )
}
function ringPlan() {
    const r = GV.ringR,
        out = []
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r) {
                out.push([dx, dy, dx === 0 && dy === r ? 'gate' : GV.ringT])
            }
        }
    }
    return out
}
const piecesOf = (t?) => (t === 'ring' ? ringPlan() : GV.stamp || [])
export const isTool = (t?) => t === 'ring' || t === 'stamp'
export function armTool(t?) {
    GV.armed = GV.armed === t && t === 'ring' ? null : t
    GV.selected = null
    GV.hoverPick = null
    GV.hover = GV.armed ? GV.hover || [KX + 1, KY + 3] : null
    setCursor()
    hud()
}
function totalCost(pieces?) {
    const c = {}
    for (const p of pieces) {
        for (const [r, n] of Object.entries<any>(DEF[p[2]].cost)) {
            c[r] = (c[r] || 0) + n
        }
    }
    return c
}
/** Build every piece that fits and that the stores can pay for. Called from tryPlace. */
export function placeTool(t?, x?, y?) {
    const pieces = piecesOf(t)
    if (!pieces.length) {
        return false
    }
    let n = 0,
        lock = 0
    // Walls first, so towers and gates can be set onto them.
    const order = pieces
        .slice()
        .sort(
            (a?, b?) =>
                (a[2] === 'gate' || a[2] === 'tower' ? 1 : 0) -
                (b[2] === 'gate' || b[2] === 'tower' ? 1 : 0)
        )
    for (const [dx, dy, pt] of order) {
        if (DEF[pt].tier > GV.keep.lvl) {
            lock++
            continue
        }
        const old = bAt(x + dx, y + dy)
        if (old && old.o === 0 && old.t === pt) {
            continue
        }
        if (
            !placeErr(pt, x + dx, y + dy) &&
            afford(costOf(pt)) &&
            tryPlace(pt, x + dx, y + dy, false)
        ) {
            n++
        }
    }
    toast(
        n
            ? n +
                  ' of ' +
                  pieces.length +
                  ' pieces built.' +
                  (n < pieces.length
                      ? ' Some places were blocked' +
                        (lock ? ', needed a stone keep' : '') +
                        ', or the stores ran short.'
                      : '')
            : lock
              ? 'Stone walls and towers need a stone keep.'
              : 'Nothing could be built there.'
    )
    return n > 0
}
export function toolText() {
    if (!isTool(GV.armed)) {
        return ''
    }
    const pieces = piecesOf(GV.armed),
        cost = Object.entries<any>(totalCost(pieces))
            .map(([r, n]) => n + ' ' + r)
            .join(', ')
    if (GV.armed === 'stamp') {
        return (
            '<b>Copy of a wall</b><span> · tap where to build it, ' +
            pieces.length +
            ' pieces</span><small>All of it costs ' +
            cost +
            '. Pieces that do not fit are left out.</small>'
        )
    }
    return (
        '<b>Wall ring</b><span> · tap the middle</span><div class="seg ringctl"><button class="btn" type="button" data-ring="-1" aria-label="Smaller ring">−</button><button class="btn" type="button" data-ring="1" aria-label="Larger ring">+</button><button class="btn" type="button" data-ring="t">' +
        (GV.ringT === 'wall' ? 'Stone' : 'Palisade') +
        '</button></div><small>A ring ' +
        (GV.ringR * 2 + 1) +
        ' tiles across with a gatehouse on the near side. All of it costs ' +
        cost +
        '. Keys [ and ] change the size.</small>'
    )
}
function ringSize(d?) {
    GV.ringR = Math.max(2, Math.min(12, GV.ringR + d))
    hud()
}
$('#placing').addEventListener('click', (e?) => {
    const a = e.target.closest('[data-ring]')
    if (!a) {
        return
    }
    if (a.dataset.ring === 't') {
        GV.ringT = GV.ringT === 'wall' ? 'palisade' : 'wall'
        hud()
    } else {
        ringSize(+a.dataset.ring)
    }
})
window.addEventListener('keydown', (e?) => {
    if (GV.armed === 'ring' && (e.key === '[' || e.key === ']')) {
        ringSize(e.key === ']' ? 1 : -1)
    }
})
const rb = $('#ringBtn')
if (rb) {
    rb.addEventListener('click', () => armTool('ring'))
}

/* ---------- ghosts ---------- */
function ghost(c?, t?, x?, y?, ok?) {
    const d = DEF[t],
        s = d.size || 1
    c.fillStyle = ok ? 'rgba(120,230,120,.4)' : 'rgba(220,70,60,.45)'
    diamondPath(c, x, y, s)
    c.fill()
}
/** Draw the ghosts of a row, a copied wall or a wall ring. True when it drew. */
export function drawToolGhost(c?, ghostT?) {
    const h = GV.hover
    if (!h || !inMap(h[0], h[1])) {
        return false
    }
    if (isTool(ghostT)) {
        const lockT = (pt?) => DEF[pt].tier > GV.keep.lvl
        for (const [dx, dy, pt] of piecesOf(ghostT)) {
            const x = h[0] + dx,
                y = h[1] + dy
            const old = inMap(x, y) ? bAt(x, y) : null
            ghost(
                c,
                pt,
                x,
                y,
                !lockT(pt) &&
                    ((old && old.o === 0 && old.t === pt) ||
                        !placeErr(pt, x, y))
            )
        }
        return true
    }
    const r = GV.row
    if (!r || r.t !== ghostT) {
        return false
    }
    const plan = rowPlan(r.t, r.a, r.b)
    if (plan.length < 2) {
        return false
    }
    let money = { ...GV.S.res }
    for (const [x, y] of plan) {
        const cost = costOf(r.t),
            rich = Object.entries<any>(cost).every(([k, n]) => money[k] >= n),
            ok = !placeErr(r.t, x, y) && rich
        if (ok) {
            money = { ...money }
            for (const [k, n] of Object.entries<any>(cost)) {
                money[k] -= n
            }
        }
        ghost(c, r.t, x, y, ok)
        if (ok) {
            const sp = sprite(r.t, {})
            c.globalAlpha = 0.6
            blit(
                c,
                sp.full || sp.parts[0].cv,
                wx(x, y) - sp.ox / R,
                wy(x, y) - sp.oy / R
            )
            c.globalAlpha = 1
        }
    }
    return true
}
