import { placeErr, tryPlace } from './build'
import { $, DEF, KX, KY, N, OX, OY, PAINT, cv } from './config'
import { livingPick } from './livingworld'
import { UNITS } from './people'
import { Z, bParams, cam } from './render'
import { R, sprite } from './sprites'
import { bAt, inMap, reg, seenAt, terrain, wx, wy } from './state'
import { isRow, rowEnd, rowMove, rowStart } from './tools'
import { hud } from './ui'
import { GV } from './vars'
import { fogHides } from './weather'

/* The middle of the view stays over the open land (with a little of the mist round it). */
export function clampCam() {
    const z = Z(),
        b = GV.wb,
        m = 6,
        x0 = Math.max(0, b.x0 - m),
        y0 = Math.max(0, b.y0 - m),
        x1 = Math.min(N - 1, b.x1 + m),
        y1 = Math.min(N - 1, b.y1 + m)
    cam.x = Math.max(
        GV.W / 2 - wx(x1, y0) * z,
        Math.min(GV.W / 2 - wx(x0, y1) * z, cam.x)
    )
    cam.y = Math.max(
        GV.H / 2 - wy(x1, y1) * z,
        Math.min(GV.H / 2 - wy(x0, y0) * z, cam.y)
    )
}
export function lookAt(gx?, gy?) {
    const z = Z()
    cam.x = GV.W / 2 - wx(gx, gy) * z
    cam.y = GV.H / 2 - wy(gx, gy) * z
    clampCam()
}
export function centreCam() {
    const small = GV.W < 720
    GV.K = Math.max(1, Math.round((small ? 1.5 : 2) * GV.DPR))
    const z = Z()
    cam.x = (small ? GV.W / 2 : (GV.W - 252) / 2) - wx(KX + 0.5, KY + 0.5) * z
    cam.y = (GV.H + (small ? -70 : 40)) / 2 - wy(KX + 0.5, KY + 0.5) * z
}
export function setZoom(px?, py?, nk?) {
    nk = Math.max(
        Math.max(1, Math.round(GV.DPR * 0.75)),
        Math.min(Math.round(GV.DPR * 4), Math.round(nk))
    )
    if (nk === GV.K) {
        return
    }
    const z = Z(),
        wxp = (px - cam.x) / z,
        wyp = (py - cam.y) / z
    GV.K = nk
    const nz = Z()
    cam.x = px - wxp * nz
    cam.y = py - wyp * nz
    clampCam()
}
export function tileAt(clientX?, clientY?) {
    const r = cv.getBoundingClientRect(),
        z = Z()
    const X = (clientX - r.left - cam.x) / z - OX,
        Y = (clientY - r.top - cam.y) / z - OY
    return [Math.round((X / 16 + Y / 8) / 2), Math.round((Y / 8 - X / 16) / 2)]
}
export function anchor(t?, tile?) {
    const s = (DEF[t] && DEF[t].size) || 1
    return s === 2 ? [tile[0] - 1, tile[1] - 1] : tile
}
export function readTheme() {
    GV.sea =
        getComputedStyle(document.documentElement)
            .getPropertyValue('--sea')
            .trim() || GV.sea
}
GV.firstSize = true
export function resize() {
    const oz = Z(),
        ocx = GV.W ? (GV.W / 2 - cam.x) / oz : 0,
        ocy = GV.H ? (GV.H / 2 - cam.y) / oz : 0,
        had = GV.W > 0 && !GV.firstSize
    GV.DPR = Math.min(3, window.devicePixelRatio || 1)
    GV.W = cv.clientWidth
    GV.H = cv.clientHeight
    if (had) {
        const nz = Z()
        cam.x = GV.W / 2 - ocx * nz
        cam.y = GV.H / 2 - ocy * nz
    }
    cv.width = Math.round(GV.W * GV.DPR)
    cv.height = Math.round(GV.H * GV.DPR)
    const root = document.documentElement.style
    root.setProperty('--bar-h', $('#bar').offsetHeight + 'px')
    if (GV.firstSize && GV.W > 0) {
        centreCam()
        GV.firstSize = false
    }
    clampCam()
}
window.addEventListener('resize', resize)
if (typeof matchMedia === 'function') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener(
        'change',
        readTheme
    )
}
window.addEventListener('message', (e?) => {
    if (
        e.origin !== location.origin ||
        !e.data ||
        e.data.type !== 'thornwick:theme'
    ) {
        return
    }
    const t = e.data.theme
    if (t === 'light' || t === 'dark') {
        document.documentElement.dataset.theme = t
    } else {
        delete document.documentElement.dataset.theme
    }
    readTheme()
})
export const ptrs = new Map()
GV.down = null
GV.pinch = null
GV.hoverPick = null
export const maskCache = new WeakMap()
export function maskOf(img?) {
    let m = maskCache.get(img)
    if (!m) {
        const d = img
            .getContext('2d')
            .getImageData(0, 0, img.width, img.height).data
        m = new Uint8Array(img.width * img.height)
        for (let i = 0; i < m.length; i++) {
            m[i] = d[i * 4 + 3] === 255 ? 1 : 0
        }
        maskCache.set(img, m)
    }
    return m
}
export function hitSprite(img?, ox?, oy?, X?, Y?) {
    const lx = Math.floor((X - ox) * R),
        ly = Math.floor((Y - oy) * R)
    if (lx < 0 || ly < 0 || lx >= img.width || ly >= img.height) {
        return false
    }
    return maskOf(img)[lx + ly * img.width] === 1
}
export function unitBox(u?, en?) {
    const gx = u.x + (en ? u.ox : 0),
        gy = u.y + (en ? u.oy : 0),
        x = wx(gx, gy),
        y = wy(gx, gy)
    const big =
            (UNITS[u.kind] && UNITS[u.kind].siege) ||
            u.type === 'ram' ||
            u.type === 'catapult',
        mounted =
            u.kind === 'knight' || u.kind === 'scout' || u.type === 'scout',
        large = u.type === 'hero' || u.type === 'brute'
    const w = big ? 22 : mounted ? 18 : large ? 15 : 12,
        h = big ? 18 : mounted ? 19 : large ? 20 : 16
    return [x - w / 2, y - h - (u.onWall ? 12 : 0), w, h + 2]
}
export function pick(clientX?, clientY?) {
    const r = cv.getBoundingClientRect(),
        z = Z(),
        X = (clientX - r.left - cam.x) / z,
        Y = (clientY - r.top - cam.y) / z
    let best = null,
        bd = 1e9
    const tryU = (u?, en?) => {
        if (u.dead || !seenAt(u.x, u.y)) {
            return
        }
        const [bx, by, bw, bh] = unitBox(u, en)
        if (X >= bx && X <= bx + bw && Y >= by && Y <= by + bh) {
            const d = Math.abs(X - (bx + bw / 2)) + Math.abs(Y - (by + bh))
            if (d < bd) {
                bd = d
                best = en ? { kind: 'unit', u } : { kind: 'army', u }
            }
        }
    }
    for (const bn of GV.S.banners) {
        if (!seenAt(bn.x, bn.y)) {
            continue
        }
        const x = wx(bn.x, bn.y),
            y = wy(bn.x, bn.y)
        if (X >= x - 2 && X <= x + 12 && Y >= y - 30 && Y <= y + 1) {
            return { kind: 'banner', bn }
        }
    }
    for (const u of GV.S.sold) {
        tryU(u, false)
    }
    for (const u of GV.S.en) {
        if (!fogHides(u)) {
            tryU(u, true)
        }
    }
    if (best) {
        return best
    }
    const wp = livingPick(X, Y)
    if (wp) {
        return wp
    }
    const bs = GV.S.b
        .filter((b?) => seenAt(b.cx, b.cy))
        .sort((a?, b?) => b.x + b.y + b.s - (a.x + a.y + a.s))
    for (const b of bs) {
        const sp = sprite(b.t, bParams(b)),
            img = sp.full || sp.parts[0].cv
        if (
            hitSprite(
                img,
                wx(b.x, b.y) - sp.ox / R,
                wy(b.x, b.y) - sp.oy / R,
                X,
                Y
            )
        ) {
            return b
        }
    }
    for (const p of GV.props) {
        if (p.k !== 4 || !seenAt(p.x, p.y)) {
            continue
        }
        const sp = sprite(p.poi === 'ruins' ? 'ruin' : p.poi, {}),
            img = sp.parts[0].cv
        if (
            hitSprite(
                img,
                wx(p.x, p.y) - sp.ox / R,
                wy(p.x, p.y) - sp.oy / R,
                X,
                Y
            )
        ) {
            return { kind: 'poi', p }
        }
    }
    const t = [
        Math.round(((X - OX) / 16 + (Y - OY) / 8) / 2),
        Math.round(((Y - OY) / 8 - (X - OX) / 16) / 2),
    ]
    if (!inMap(t[0], t[1])) {
        return null
    }
    const rg = GV.regs[reg[t[0] + t[1] * N]]
    if (!rg.disc) {
        return { kind: 'fog', rg }
    }
    const b = bAt(t[0], t[1])
    return b || null
}
export const samePick = (a?, b?) =>
    a === b ||
    (a &&
        b &&
        a.kind &&
        a.kind === b.kind &&
        a.u === b.u &&
        a.bn === b.bn &&
        a.p === b.p &&
        a.rg === b.rg)
export function setCursor() {
    cv.style.cursor = GV.armed
        ? 'crosshair'
        : GV.down && GV.down.moved
          ? 'grabbing'
          : GV.hoverPick
            ? 'pointer'
            : 'grab'
}
cv.addEventListener('contextmenu', (e?) => {
    e.preventDefault()
    if (GV.armed) {
        GV.armed = null
        GV.hover = null
        GV.moveBn = 0
    } else {
        GV.selected = null
    }
    hud()
})
cv.addEventListener('pointerdown', (e?) => {
    if (e.button === 2) {
        return
    }
    cv.setPointerCapture(e.pointerId)
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ptrs.size === 1) {
        GV.down = {
            x: e.clientX,
            y: e.clientY,
            cx: cam.x,
            cy: cam.y,
            moved: false,
            paint: !!GV.armed && PAINT(GV.armed),
            row: !!GV.armed && isRow(GV.armed),
        }
        if (GV.down.row) {
            rowStart(GV.armed, anchor(GV.armed, tileAt(e.clientX, e.clientY)))
        }
        if (GV.down.paint) {
            GV.hover = tileAt(e.clientX, e.clientY)
            tryPlace(GV.armed, GV.hover[0], GV.hover[1], true)
        }
    } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]
        GV.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: GV.K }
        if (GV.down) {
            GV.down.moved = true
        }
    }
})
cv.addEventListener('pointermove', (e?) => {
    if (ptrs.has(e.pointerId)) {
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    if (!ptrs.size) {
        if (GV.armed) {
            GV.hover = anchor(GV.armed, tileAt(e.clientX, e.clientY))
        } else if (e.pointerType === 'mouse') {
            GV.hoverPick = pick(e.clientX, e.clientY)
            if (GV.hoverPick && GV.hoverPick.kind === 'fog') {
                GV.hoverPick = null
            }
        }
        setCursor()
        return
    }
    if (GV.pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()],
            r = cv.getBoundingClientRect()
        setZoom(
            (a.x + b.x) / 2 - r.left,
            (a.y + b.y) / 2 - r.top,
            (GV.pinch.k * Math.hypot(a.x - b.x, a.y - b.y)) / GV.pinch.d
        )
        return
    }
    if (!GV.down) {
        return
    }
    const dx = e.clientX - GV.down.x,
        dy = e.clientY - GV.down.y
    if (GV.down.row && !GV.down.moved) {
        GV.hover = anchor(GV.armed, tileAt(e.clientX, e.clientY))
        rowMove(GV.hover)
        return
    }
    if (GV.down.paint) {
        const t = tileAt(e.clientX, e.clientY)
        if (!GV.hover || t[0] !== GV.hover[0] || t[1] !== GV.hover[1]) {
            GV.hover = t
            if (
                GV.armed === 'remove'
                    ? bAt(t[0], t[1]) ||
                      (inMap(t[0], t[1]) && terrain[t[0] + t[1] * N])
                    : !placeErr(GV.armed, t[0], t[1])
            ) {
                tryPlace(GV.armed, t[0], t[1], false)
            }
        }
    } else if (GV.down.moved || Math.hypot(dx, dy) > 6) {
        GV.down.moved = true
        cam.x = GV.down.cx + dx
        cam.y = GV.down.cy + dy
        clampCam()
        GV.hoverPick = null
        setCursor()
    }
})
cv.addEventListener('pointerleave', () => {
    GV.hoverPick = null
})
export function ptrEnd(e?) {
    ptrs.delete(e.pointerId)
    if (ptrs.size < 2) {
        GV.pinch = null
    }
    if (GV.down && !ptrs.size) {
        // A row of houses or farms dragged out: build them all, stay armed for more.
        if (
            GV.down.row &&
            !GV.down.moved &&
            e.type === 'pointerup' &&
            rowEnd()
        ) {
            GV.down = null
            setCursor()
            hud()
            return
        }
        GV.row = null
        if (!GV.down.moved && !GV.down.paint && e.type === 'pointerup') {
            const t = tileAt(e.clientX, e.clientY)
            if (GV.armed) {
                GV.hover = anchor(GV.armed, t)
                const was = GV.armed,
                    moving = GV.moveBn,
                    ok = tryPlace(GV.armed, GV.hover[0], GV.hover[1], true)
                if (ok && was === 'flag' && moving) {
                    const bn = GV.S.banners.find((b?) => b.id === moving)
                    if (bn) {
                        GV.selected = { kind: 'banner', bn }
                    }
                }
                if (
                    ok &&
                    was === GV.armed &&
                    was !== 'flag' &&
                    !PAINT(was) &&
                    !e.shiftKey
                ) {
                    GV.armed = null
                    GV.hover = null
                }
            } else {
                const p = pick(e.clientX, e.clientY)
                GV.selected =
                    samePick(p, GV.selected) &&
                    GV.selected &&
                    GV.selected.kind !== 'army'
                        ? null
                        : p
            }
            hud()
        }
        GV.down = null
        setCursor()
        if (e.pointerType !== 'mouse' && !GV.armed) {
            GV.hover = null
        }
    }
}
cv.addEventListener('pointerup', ptrEnd)
cv.addEventListener('pointercancel', ptrEnd)
GV.wheelAcc = 0
cv.addEventListener(
    'wheel',
    (e?) => {
        e.preventDefault()
        GV.wheelAcc += e.deltaY
        if (Math.abs(GV.wheelAcc) < 40) {
            return
        }
        const r = cv.getBoundingClientRect()
        setZoom(
            e.clientX - r.left,
            e.clientY - r.top,
            GV.K + (GV.wheelAcc < 0 ? 1 : -1)
        )
        GV.wheelAcc = 0
    },
    { passive: false }
)
cv.addEventListener('keydown', (e?) => {
    const mv = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
    }[e.key]
    if (mv && GV.armed) {
        GV.hover = GV.hover || [KX + 1, KY + 3]
        GV.hover = [
            Math.max(1, Math.min(N - 2, GV.hover[0] + mv[0])),
            Math.max(1, Math.min(N - 2, GV.hover[1] + mv[1])),
        ]
        e.preventDefault()
    } else if (mv) {
        cam.x -= (mv[0] - mv[1]) * 40
        cam.y -= (mv[0] + mv[1]) * 20
        clampCam()
        e.preventDefault()
    } else if ((e.key === 'Enter' || e.key === ' ') && GV.armed && GV.hover) {
        tryPlace(GV.armed, GV.hover[0], GV.hover[1], true)
        e.preventDefault()
    } else if (e.key === '+' || e.key === '=') {
        setZoom(GV.W / 2, GV.H / 2, GV.K + 1)
    } else if (e.key === '-') {
        setZoom(GV.W / 2, GV.H / 2, GV.K - 1)
    }
})
window.addEventListener('keydown', (e?) => {
    if (e.key === 'Escape') {
        GV.armed = null
        GV.hover = null
        GV.selected = null
        GV.moveBn = 0
        if (GV.newOpen) {
            $('#newkCancel').click()
        }
    }
})
