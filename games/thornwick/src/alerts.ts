/*
 * Alerts and the message log: buttons (and keys) that jump the view to idle
 * villagers, empty workplaces, fires and attacks; a log that keeps every message
 * with the time it came; and pings on the small map where trouble starts.
 */
import { $, DAYLEN, DEF, KX, KY, SEASONLEN, SEASONS } from './config'
import { toast } from './helpers'
import { lookAt } from './input'
import { rivById } from './state'
import { hud } from './ui'
import { GV } from './vars'

GV.log = []
GV.logUnread = 0
GV.logOpen = false
GV.pings = []
GV.atkPings = []
GV.alertIdx = {}
GV.pinged = {}
const LOG_MAX = 80
/* Called by toast(): keep the message with the time it came. */
export function logMsg(msg?, cls?) {
    const t = GV.S ? GV.S.t : 0,
        top = GV.log[0]
    if (top && top.msg === msg && t - top.t < 60) {
        top.n++
        top.t = t
    } else {
        GV.log.unshift({ t, msg, cls, n: 1 })
        if (GV.log.length > LOG_MAX) {
            GV.log.length = LOG_MAX
        }
    }
    if (GV.logOpen) {
        renderLog()
    } else {
        GV.logUnread++
    }
}
export function gameTime(t?) {
    const day = ((t / DAYLEN) | 0) + 1,
        se = SEASONS[((t / SEASONLEN) | 0) % 4]
    return 'Day ' + day + ', ' + se.toLowerCase()
}
export function clock(t?) {
    const s = Math.max(0, Math.floor(t))
    return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0')
}
export function renderLog() {
    const box = $('#logList')
    if (!box) {
        return
    }
    box.innerHTML = GV.log.length
        ? GV.log
              .map(
                  (m?) =>
                      '<li class="' +
                      (m.cls || '') +
                      '"><time>' +
                      clock(m.t) +
                      ' · ' +
                      gameTime(m.t) +
                      '</time><span></span></li>'
              )
              .join('')
        : '<li class="empty">No messages yet.</li>'
    // Text goes in as text, never as markup.
    const items = box.querySelectorAll('li span')
    GV.log.forEach((m?, i?) => {
        if (items[i]) {
            items[i].textContent = m.msg + (m.n > 1 ? ' (×' + m.n + ')' : '')
        }
    })
}
export function showLog(on?) {
    GV.logOpen = on
    $('#log').hidden = !on
    if (on) {
        GV.logUnread = 0
        renderLog()
    }
    alertsHud()
}
/* A ring on the small map where trouble starts. */
export function ping(x?, y?, kind?) {
    GV.pings.push({ x, y, t: GV.animT, kind })
    if (GV.pings.length > 12) {
        GV.pings.shift()
    }
    if (kind === 'atk') {
        GV.atkPings.unshift({ x, y, t: GV.S.t })
        if (GV.atkPings.length > 8) {
            GV.atkPings.length = 8
        }
    }
}
/* The first raider of a host (or a scout) sets foot on your land. */
export function attackPing(e?) {
    const rv = rivById(e.fac)
    if (e.mode === 'scout') {
        if (rv && !GV.pinged['s' + rv.id + '.' + rv.k]) {
            GV.pinged['s' + rv.id + '.' + rv.k] = 1
            ping(e.x, e.y, 'atk')
            toast(
                'A rider of ' +
                    rv.name +
                    ' is spying on your defences. Hunt him down before he rides home.',
                {
                    label: 'Show me',
                    go: () => {
                        if (e.dead) {
                            toast('The rider is gone.')
                            return
                        }
                        lookAt(e.x, e.y)
                        GV.selected = { kind: 'unit', u: e }
                        GV.armed = null
                        hud()
                    },
                }
            )
        }
        return
    }
    const key = rv ? rv.id + '.' + rv.k : 'b' + ((GV.S.t / 30) | 0)
    if (!GV.pinged[key]) {
        GV.pinged[key] = 1
        ping(e.x, e.y, 'atk')
    }
}
export function firePing(b?) {
    if (
        !GV.pings.some(
            (p?) =>
                p.kind === 'fire' &&
                GV.animT - p.t < 4 &&
                Math.hypot(p.x - b.cx, p.y - b.cy) < 4
        )
    ) {
        ping(b.cx, b.cy, 'fire')
    }
}
/* Groups of raiders now on the march against Thornwick, nearest to the keep first. */
function attackSpots() {
    const out = []
    for (const e of GV.S.en) {
        if (e.dead || (e.mode !== 'atk' && e.mode !== 'scout')) {
            continue
        }
        const g = out.find((p?) => Math.hypot(p.x - e.x, p.y - e.y) < 7)
        if (g) {
            g.n++
        } else {
            out.push({ x: e.x, y: e.y, n: 1 })
        }
    }
    out.sort(
        (a?, b?) =>
            Math.hypot(a.x - KX, a.y - KY) - Math.hypot(b.x - KX, b.y - KY)
    )
    if (!out.length) {
        for (const p of GV.atkPings) {
            if (GV.S.t - p.t < 120) {
                out.push(p)
            }
        }
    }
    return out
}
export function matches(kind?) {
    const S = GV.S
    if (kind === 'idle') {
        return S.vill.filter((u?) => !u.job)
    }
    if (kind === 'empty') {
        return S.b.filter((b?) => b.o === 0 && DEF[b.t].role && !b.w)
    }
    if (kind === 'fire') {
        return S.b.filter((b?) => b.o === 0 && b.fire > 0)
    }
    return attackSpots()
}
export function jump(kind?) {
    if (!GV.S) {
        return
    }
    const list = matches(kind)
    if (!list.length) {
        return
    }
    const i = (GV.alertIdx[kind] =
            ((GV.alertIdx[kind] || 0) + 1) % list.length),
        m = list[i]
    if (typeof m.t === 'string') {
        lookAt(m.cx, m.cy)
        GV.selected = m
        GV.armed = null
    } else {
        lookAt(m.x, m.y)
    }
    hud()
}
const LABEL = { idle: 'Idle', empty: 'Empty', fire: 'Fire', atk: 'Attack' }
export function alertsHud() {
    if (!GV.S) {
        return
    }
    for (const k in LABEL) {
        const el = $('#al-' + k)
        const n = matches(k).length,
            txt = LABEL[k] + (n && k !== 'atk' ? ' ' + n : '')
        if (el._t !== txt) {
            el.textContent = txt
            el._t = txt
        }
        el.disabled = !n
        el.classList.toggle('hot', !!n && (k === 'fire' || k === 'atk'))
    }
    const lb = $('#al-log'),
        lt = GV.logUnread ? 'Log ' + Math.min(99, GV.logUnread) : 'Log'
    if (lb._t !== lt) {
        lb.textContent = lt
        lb._t = lt
    }
    lb.setAttribute('aria-pressed', String(GV.logOpen))
}
for (const k in LABEL) {
    $('#al-' + k).addEventListener('click', () => jump(k))
}
$('#al-log').addEventListener('click', () => showLog(!GV.logOpen))
$('#logClose').addEventListener('click', () => showLog(false))
const KEYS = { i: 'idle', e: 'empty', f: 'fire', a: 'atk' }
window.addEventListener('keydown', (e?) => {
    if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        GV.helpOpen ||
        GV.newOpen ||
        GV.overOpen ||
        /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as any)?.tagName || '')
    ) {
        return
    }
    const k = e.key.toLowerCase()
    if (KEYS[k]) {
        jump(KEYS[k])
    } else if (k === 'l') {
        showLog(!GV.logOpen)
    }
})
