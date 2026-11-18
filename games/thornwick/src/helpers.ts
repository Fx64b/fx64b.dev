import { logMsg } from './alerts'
import { $, DEF, KEEP_CAP, N } from './config'
import {
    bmap,
    clampN,
    inMap,
    reduceMotion,
    seenAt,
    terrain,
    wx,
    wy,
} from './state'
import { GV } from './vars'

export const near = (b?, t?, rad?) =>
    GV.S.b.some(
        (o?) =>
            o.t === t &&
            o.o === b.o &&
            Math.hypot(o.cx - b.cx, o.cy - b.cy) <= rad
    )
export const cap = () =>
    KEEP_CAP[GV.keep.lvl - 1] +
    3 *
        GV.regs.reduce(
            (n?, rg?) => n + (rg.owner === 0 && rg.poi === 'hamlet' ? 1 : 0),
            0
        ) +
    GV.S.b.reduce(
        (n?, b?) =>
            n +
            (b.o !== 0
                ? 0
                : b.t === 'house'
                  ? 4 + (near(b, 'well', 3.2) ? 2 : 0)
                  : b.t === 'shouse'
                    ? 5 + (near(b, 'well', 3.2) ? 2 : 0)
                    : 0),
        0
    )
export const pop = () => GV.S.vill.length + GV.S.sold.length
export const garr = (b?) =>
    GV.S.sold.reduce(
        (n?, s?) => n + (s.home === b && s.kind !== 'captain' ? 1 : 0),
        0
    )
export const afford = (cost?) =>
    Object.entries<any>(cost).every(([r, n]) => GV.S.res[r] >= n)
export const pay = (cost?) => {
    for (const [r, n] of Object.entries<any>(cost)) {
        GV.S.res[r] -= n
    }
}
export const isWater = (x?, y?) => inMap(x, y) && terrain[x + y * N] === 3
export const wet = (x?, y?) => {
    const i = x + y * N,
        b = bmap[i]
    return terrain[i] === 3 && !(b && b.t === 'bridge' && !b.up)
}
export const adjWater = (x?, y?) =>
    isWater(x + 1, y) ||
    isWater(x - 1, y) ||
    isWater(x, y + 1) ||
    isWater(x, y - 1)
export const flam = (b?) => DEF[b.t].flam && !(b.t === 'keep' && b.lvl > 1)
export function gain(res?, amt?, x?, y?) {
    GV.S.res[res] += amt
    if (seenAt(x, y)) {
        GV.S.floats.push({ x, y, t: 0, txt: '+' + amt, res })
    }
}
export function nearest(list?, x?, y?, maxD?) {
    let best = null,
        bd = maxD
    for (const o of list) {
        if (o.dead) {
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
export function nearestSold(x?, y?, maxD?, incWall?) {
    let best = null,
        bd = maxD
    for (const o of GV.S.sold) {
        if (o.dead || (o.onWall && !incWall)) {
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
export function freeNear(cx?, cy?, rad?) {
    for (let i = 0; i < 14; i++) {
        const x = Math.round(cx + (Math.random() * 2 - 1) * rad),
            y = Math.round(cy + (Math.random() * 2 - 1) * rad)
        if (inMap(x, y) && !bmap[x + y * N] && !terrain[x + y * N]) {
            return [x, y]
        }
    }
    return [clampN(cx), clampN(cy + 2)]
}
export function puff(x?, y?, n?, col?) {
    if (!seenAt(x, y)) {
        return
    }
    for (let i = 0; i < n; i++) {
        GV.parts.push({
            x: wx(x, y) + (Math.random() - 0.5) * 22,
            y: wy(x, y) + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 14,
            vy: -6 - Math.random() * 10,
            t: 0,
            life: 0.5 + Math.random() * 0.5,
            c: col || '#d9cdb0',
            s: 1,
        })
    }
}
/* Messages stay long enough to read (longer for longer text), pause while hovered,
   and close on click. A repeated message counts up instead of stacking. */
export const MSG_MAX = 4
export const MSG_WARN =
    /fire|burn|fallen|marches on thornwick|destroyed|consumed|lost|leave|left|run out|empty|ladders|fever|bandits|anger|sooner|turn on|claims the|spying|lose heart/i
export const MSG_GOOD =
    /gold|beaten back|joins|harvest|are yours|is yours|renown|claimed for thornwick|breaks|unloads|agrees|flees|siege tower|bring down|waver/i
export function msgTimer(el?: any, ms?) {
    clearTimeout(el._t)
    el._left = ms
    el._at = Date.now()
    el._t = setTimeout(() => dismissMsg(el), ms)
}
export function dismissMsg(el?) {
    if (el._gone) {
        return
    }
    el._gone = true
    clearTimeout(el._t)
    el.classList.add('out')
    setTimeout(() => el.remove(), reduceMotion ? 0 : 260)
}
/** opts.go (with opts.label) adds a button that runs it, e.g. to show where something is. */
export function toast(msg?, opts?) {
    logMsg(msg, MSG_WARN.test(msg) ? 'warn' : MSG_GOOD.test(msg) ? 'good' : '')
    const box = $('#toasts')
    for (const el of box.children) {
        if (el._msg === msg && !el._gone) {
            el._n++
            el.querySelector('.n').textContent = '×' + el._n
            el.classList.toggle('again')
            msgTimer(el, el._ms)
            return
        }
    }
    const ms = Math.min(16000, 6500 + msg.length * 55)
    const el: any = document.createElement('div')
    el.className =
        'msg' +
        (MSG_WARN.test(msg) ? ' warn' : MSG_GOOD.test(msg) ? ' good' : '')
    el.style.setProperty('--d', ms + 'ms')
    el.innerHTML =
        '<p></p><button class="btn x" type="button" aria-label="Close message">✕</button>'
    el.querySelector('p').textContent = msg
    el.querySelector('p').insertAdjacentHTML(
        'beforeend',
        '<span class="n"></span>'
    )
    if (opts && opts.go) {
        const go = document.createElement('button')
        go.className = 'btn go'
        go.type = 'button'
        go.textContent = opts.label || 'Show me'
        go.addEventListener('click', (ev) => {
            ev.stopPropagation()
            opts.go()
            dismissMsg(el)
        })
        el.querySelector('p').after(go)
    }
    el._msg = msg
    el._n = 1
    el._ms = ms
    el.addEventListener('click', () => dismissMsg(el))
    el.addEventListener('mouseenter', () => {
        clearTimeout(el._t)
        el._left -= Date.now() - el._at
    })
    el.addEventListener('mouseleave', () =>
        msgTimer(el, Math.max(1500, el._left))
    )
    box.appendChild(el)
    msgTimer(el, ms)
    const live = [...box.children].filter((e?) => !e._gone)
    if (live.length > MSG_MAX) {
        dismissMsg(live[0])
    }
}
export function compass(dx?, dy?) {
    const a = Math.atan2(dx + dy, dx - dy),
        k = ((Math.round(a / 0.7854) % 8) + 8) % 8
    return [
        'east',
        'south-east',
        'south',
        'south-west',
        'west',
        'north-west',
        'north',
        'north-east',
    ][k]
}
