import { BCOL } from './army'
import { placeErr } from './build'
import { DEF, LIT, N, OX, OY, ctx, cv } from './config'
import { caravans } from './eco'
import { GOOD } from './goods'
import {
    CH,
    PAD,
    VCH,
    VPAD,
    chunkSrc,
    eachChunk,
    eachTileIn,
    groundChunk,
    prefetchChunks,
    trimChunks,
    trimVeils,
    veilChunk,
} from './ground'
import { afford, wet } from './helpers'
import { samePick } from './input'
import { costOf } from './land'
import {
    LIVING_KINDS,
    drawLivingItem,
    drawLivingOver,
    livingDrawList,
} from './livingworld'
import { hsh } from './noise'
import { R, propSprite, sprite, unitSprite } from './sprites'
import {
    bAt,
    bmap,
    clampN,
    fcol,
    inMap,
    nightF,
    reduceMotion,
    reg,
    seenAt,
    terrain,
    tileI,
    wx,
    wy,
} from './state'
import { drawReach, drawToolGhost } from './tools'
import { GV } from './vars'
import { drawWeather, fogHides } from './weather'

GV.W = 0
GV.H = 0
GV.DPR = 1
GV.K = 2
GV.sea = '#5f7f8a'
export const cam = { x: 0, y: 0 }
export const Z = () => GV.K / GV.DPR
export function bParams(b?) {
    const o: any = { c: fcol(b.o) },
        d = DEF[b.t],
        sn = GV.curSeason === 3,
        fr = reduceMotion ? 0 : ((GV.animT * 3 + b.x) | 0) % 2
    if (sn) {
        o.sn = 1
    }
    if (b.t === 'keep') {
        o.tier = b.lvl
        o.f = fr
    } else if (b.t === 'house') {
        o.v = b.v
    } else if (b.t === 'farm') {
        o.st = sn ? 3 : Math.min(2, (((GV.S.t + b.seed * 18) % 18) / 6) | 0)
    } else if (b.t === 'cathedral') {
        o.st = b.stage || 0
    } else if (b.t === 'mill') {
        o.f = reduceMotion ? 0 : ((GV.animT * 5) | 0) % 4
    } else if (
        b.t === 'tower' ||
        b.t === 'barracks' ||
        b.t === 'banner' ||
        b.t === 'outpost' ||
        b.t === 'camp' ||
        b.t === 'brazier'
    ) {
        o.f = fr
    }
    if (d.conn && b.t !== 'keep') {
        const cn = (x?, y?) => {
            const o2 = bAt(x, y)
            return o2 && o2.o === b.o && DEF[o2.t].conn ? 1 : 0
        }
        const m =
            cn(b.x + 1, b.y) |
            (cn(b.x - 1, b.y) << 1) |
            (cn(b.x, b.y + 1) << 2) |
            (cn(b.x, b.y - 1) << 3)
        if (b.t === 'gate') {
            o.sw = !(m & 3) && m & 12 ? 1 : 0
            o.op = b.shut ? 0 : 1
        } else {
            o.m = m
        }
    }
    if (b.t === 'bridge') {
        const land = (x?, y?) =>
            inMap(x, y) &&
            (terrain[x + y * N] !== 3 ||
                (bmap[x + y * N] && bmap[x + y * N].t === 'bridge'))
                ? 1
                : 0
        o.sw =
            land(b.x, b.y + 1) + land(b.x, b.y - 1) >
            land(b.x + 1, b.y) + land(b.x - 1, b.y)
                ? 1
                : 0
        o.up = b.up ? 1 : 0
    }
    return o
}
export function hpBar(c?, x?, y?, f?, w?) {
    c.fillStyle = '#1c1a22'
    c.fillRect(x - (w >> 1) - 1, y - 1, w + 2, 4)
    c.fillStyle = f > 0.5 ? '#6fc25a' : f > 0.25 ? '#e6b83e' : '#d8483c'
    c.fillRect(x - (w >> 1), y, Math.max(1, Math.round(w * Math.max(0, f))), 2)
}
export function diamondPath(c?, x?, y?, s?) {
    c.beginPath()
    c.moveTo(wx(x, y), wy(x, y) - 8)
    c.lineTo(wx(x + s - 1, y) + 16, wy(x + s - 1, y))
    c.lineTo(wx(x + s - 1, y + s - 1), wy(x + s - 1, y + s - 1) + 8)
    c.lineTo(wx(x, y + s - 1) - 16, wy(x, y + s - 1))
    c.closePath()
}
export function ring(c?, gx?, gy?, r?) {
    c.strokeStyle = 'rgba(255,240,190,.8)'
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
/* Pixel digits for the numbered war banners. */
const DIGITS = {
    1: ['010', '110', '010', '010', '111'],
    2: ['111', '001', '111', '100', '111'],
    3: ['111', '001', '011', '001', '111'],
    4: ['101', '101', '111', '001', '001'],
}
export function drawBanner(c?, x?, y?, col?, id?) {
    const w = reduceMotion ? 0 : ((GV.animT * 4 + id) | 0) % 2
    c.fillStyle = '#1c1a22'
    c.fillRect(x - 1, y - 27, 3, 28)
    c.fillStyle = '#e6d3a4'
    c.fillRect(x, y - 26, 1, 26)
    c.fillStyle = '#e6b83e'
    c.fillRect(x - 1, y - 29, 3, 2)
    c.fillStyle = '#1c1a22'
    c.fillRect(x + 1, y - 27 + w, 11, 10)
    c.fillStyle = col
    c.fillRect(x + 1, y - 26 + w, 10, 8)
    c.fillStyle = '#f6eed6'
    const g = DIGITS[id]
    if (g) {
        for (let j = 0; j < 5; j++) {
            for (let i = 0; i < 3; i++) {
                if (g[j][i] === '1') {
                    c.fillRect(x + 5 + i, y - 25 + w + j, 1, 1)
                }
            }
        }
    }
}
/* A timber siege tower against a rival wall, or the spoil heap of a tunnel under it. */
export function drawSiegeWork(c?, b?) {
    const x = wx(b.x, b.y),
        y = wy(b.x, b.y)
    if (b.dig > 0) {
        const r = 2 + Math.round(b.dig * 5)
        c.fillStyle = '#4a3622'
        c.fillRect(x - 12 - r, y + 5, r * 2, 3)
        c.fillStyle = '#6e5234'
        c.fillRect(x - 11 - r, y + 4, r * 2 - 2, 2)
        c.fillStyle = '#16120e'
        c.fillRect(x - 13, y + 3, 4, 3)
        c.fillStyle = '#8a6a42'
        c.fillRect(x - 14, y + 2, 6, 1)
    }
    if (b.stw > 0) {
        const h = 6 + Math.round(b.stw * 26),
            tx = x - 9,
            ty = y + 10
        c.fillStyle = '#2e2216'
        c.fillRect(tx - 5, ty - h, 2, h)
        c.fillRect(tx + 4, ty - h, 2, h)
        c.fillStyle = '#7a5a36'
        c.fillRect(tx - 4.5, ty - h, 1, h)
        c.fillRect(tx + 4.5, ty - h, 1, h)
        c.fillStyle = '#9a7648'
        for (let k = 3; k < h; k += 5) {
            c.fillRect(tx - 4, ty - k, 9, 1)
        }
        if (b.stw >= 1) {
            c.fillStyle = '#5e4428'
            c.fillRect(tx - 6, ty - h - 2, 13, 2)
            c.fillStyle = '#1c1a22'
            c.fillRect(tx, ty - h - 9, 1, 7)
            c.fillStyle = BCOL[0]
            c.fillRect(tx + 1, ty - h - 9, 4, 3)
        }
    }
}
export const TOPH = {
    keep: 70,
    house: 26,
    shouse: 26,
    farm: 14,
    lumber: 18,
    quarry: 16,
    fisher: 20,
    well: 18,
    market: 22,
    mill: 36,
    tavern: 28,
    chapel: 40,
    palisade: 16,
    wall: 18,
    gate: 24,
    watch: 32,
    tower: 38,
    mangonel: 22,
    bridge: 10,
    stakes: 10,
    barracks: 26,
    range: 16,
    smith: 26,
    banner: 26,
    statue: 24,
    garden: 8,
    outpost: 34,
    brazier: 14,
    camp: 16,
    ironmine: 18,
    sheep: 12,
    weaver: 24,
    bakery: 26,
    brewery: 26,
    scriptorium: 34,
}
/*
 * Sprites are painted at R pixels a unit. At any other zoom, each sprite is
 * copied once at the scale of the zoom (cleared when the zoom changes), and
 * drawn on whole pixels: a plain copy is much cheaper than scaling at every
 * draw. Zooms more than twice the sprite scale draw as before, to keep memory low.
 */
const scaled = new Map()
let scaledK = 0
/*
 * The same pixels in a canvas filled with putImageData. Chrome draws such a
 * canvas about twice as fast as one filled with drawImage, so every cached
 * copy is settled this way once.
 */
export function settled(c?) {
    const o = document.createElement('canvas')
    o.width = c.width
    o.height = c.height
    o.getContext('2d').putImageData(
        c.getContext('2d').getImageData(0, 0, c.width, c.height),
        0,
        0
    )
    return o
}
function scaleCopy(img?, f?) {
    const o = document.createElement('canvas')
    o.width = Math.max(1, Math.round(img.width * f))
    o.height = Math.max(1, Math.round(img.height * f))
    const g = o.getContext('2d')
    g.imageSmoothingEnabled = f < 1
    g.imageSmoothingQuality = 'medium'
    g.drawImage(img, 0, 0, o.width, o.height)
    return settled(o)
}
/* The copy of a sprite at the scale of the zoom. */
function scaledCopy(img?) {
    const K = GV.K
    if (K !== scaledK) {
        scaled.clear()
        scaledK = K
    }
    let o = scaled.get(img)
    if (!o) {
        o = scaleCopy(img, K / R)
        scaled.set(img, o)
    }
    return o
}
export function blit(c?, img?, x?, y?) {
    const K = GV.K
    if (c !== ctx || K === R || K > 2 * R) {
        c.drawImage(img, x, y, img.width / R, img.height / R)
        return
    }
    const o = scaledCopy(img)
    c.drawImage(
        o,
        Math.round(x * K) / K,
        Math.round(y * K) / K,
        o.width / K,
        o.height / K
    )
}
/* A unit sprite with its shadow on the ground under it: one draw, not three. */
const shaded = new Map()
function withShadow(img?) {
    let o = shaded.get(img)
    if (!o) {
        o = document.createElement('canvas')
        o.width = img.width
        o.height = img.height
        const g = o.getContext('2d'),
            iw = img.width / R,
            ih = img.height / R
        g.scale(R, R)
        g.fillStyle = 'rgba(10,16,22,.32)'
        g.fillRect(iw * 0.22, ih - 1.5, iw * 0.56, 1)
        g.fillRect(iw * 0.32, ih - 0.5, iw * 0.36, 0.5)
        g.setTransform(1, 0, 0, 1, 0, 0)
        g.drawImage(img, 0, 0)
        o = settled(o)
        shaded.set(img, o)
    }
    return o
}
/* The props (trees, rocks, ruins) in cells of 8 by 8 tiles, so a frame looks
   only at the cells in view. Built again when the list of props changes. */
const PB = 8,
    PW = Math.ceil(N / PB)
let pCells = null,
    pSrc = null,
    pLen = -1
function propCells() {
    const P = GV.props
    if (P !== pSrc || P.length !== pLen) {
        pSrc = P
        pLen = P.length
        pCells = Array.from({ length: PW * PW }, () => [])
        for (const p of P) {
            const cx = Math.min(PW - 1, Math.max(0, (p.x / PB) | 0)),
                cy = Math.min(PW - 1, Math.max(0, (p.y / PB) | 0))
            pCells[cx + cy * PW].push(p)
        }
    }
    return pCells
}
/*
 * Zoomed out, most of the view is woods and rocks with no one near: thousands
 * of props, one draw each. A cell of props with nothing else within 4 tiles
 * (a quiet cell) is drawn from one image made once, so the props draw in the
 * same order and nothing can stand between them. A cell keeps its image until
 * its props change (a signature of them), the season or the zoom changes.
 */
const BAKE_M = 4
const bakes = new Map()
const busy = new Uint8Array(PW * PW)
let bakeK = 0,
    bakeUse = 0,
    bakeNew = 0
/* A cheap signature of the props in a cell. */
function cellSig(l?) {
    let h = l.length
    for (const p of l) {
        h = (h * 31 + p.x * 7 + p.y * 13 + (p.k | 0) * 17 + (p.v | 0)) | 0
        h =
            (h +
                Math.round((p.ox || 0) * 8) +
                Math.round((p.oy || 0) * 8) * 3) |
            0
    }
    return h
}
function propImg(p?, se?) {
    return p.k === 4
        ? sprite(p.poi === 'ruins' ? 'ruin' : p.poi, se === 3 ? { sn: 1 } : {})
        : propSprite(p.k, p.v, se)
}
/* Mark the cells near a thing on the map as busy. */
function markBusy(x?, y?, s?) {
    const c0 = Math.max(0, ((x - BAKE_M) / PB) | 0),
        c1 = Math.min(PW - 1, ((x + s + BAKE_M) / PB) | 0),
        r0 = Math.max(0, ((y - BAKE_M) / PB) | 0),
        r1 = Math.min(PW - 1, ((y + s + BAKE_M) / PB) | 0)
    for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
            busy[c + r * PW] = 1
        }
    }
}
/* The image of a quiet cell, made when needed. Null when its props are not
   all in discovered land. */
function bakedCell(ci?, l?, se?) {
    const K = GV.K,
        sig = cellSig(l),
        key = ci + ':' + se
    let b = bakes.get(key)
    if (b && b.sig === sig) {
        b.use = bakeUse
        return b
    }
    // A few new images a frame at most: panning brings many cells at once.
    if (bakeNew >= 4) {
        return null
    }
    for (const p of l) {
        if (!GV.regs[reg[tileI(p.x, p.y)]].disc) {
            return null
        }
    }
    bakeNew++
    // Where each prop goes, in device pixels, as blit would draw it.
    const items = []
    let x0 = 1e9,
        y0 = 1e9,
        x1 = -1e9,
        y1 = -1e9
    for (const p of l) {
        const sp = propImg(p, se),
            src = sp.parts[0].cv,
            o = scaledCopy(src),
            dx = Math.round((wx(p.x, p.y) - sp.ox / R + p.ox) * K),
            dy = Math.round((wy(p.x, p.y) - sp.oy / R + p.oy) * K)
        items.push([p.x + p.y, o, dx, dy])
        x0 = Math.min(x0, dx)
        y0 = Math.min(y0, dy)
        x1 = Math.max(x1, dx + o.width)
        y1 = Math.max(y1, dy + o.height)
    }
    items.sort((a?, q?) => a[0] - q[0])
    const cv = document.createElement('canvas')
    cv.width = Math.max(1, x1 - x0)
    cv.height = Math.max(1, y1 - y0)
    const g = cv.getContext('2d')
    for (const it of items) {
        g.drawImage(it[1], it[2] - x0, it[3] - y0)
    }
    b = { cv: settled(cv), x: x0, y: y0, sig, use: bakeUse }
    bakes.set(key, b)
    if (bakes.size > 200) {
        // Forget the images not drawn for longest.
        const old = [...bakes.entries()].sort((a?, q?) => a[1].use - q[1].use)
        for (let k = 0; k < old.length - 160; k++) {
            bakes.delete(old[k][0])
        }
    }
    return b
}
/* Each prop in view, cell by cell. */
function eachProp(vx0?, vy0?, vx1?, vy1?, fn?) {
    const cells = propCells()
    eachPropCell(vx0, vy0, vx1, vy1, (ci?) => {
        const l = cells[ci]
        for (let k = 0; k < l.length; k++) {
            fn(l[k])
        }
    })
}
/* Each cell of props in view, by its index. */
function eachPropCell(vx0?, vy0?, vx1?, vy1?, fn?) {
    for (let cy = 0; cy < PW; cy++) {
        for (let cx = 0; cx < PW; cx++) {
            const x0 = cx * PB,
                y0 = cy * PB,
                x1 = x0 + PB,
                y1 = y0 + PB
            // The cell's anchor points in world pixels.
            if (
                wx(x1, y0) < vx0 ||
                wx(x0, y1) > vx1 ||
                wy(x1, y1) < vy0 ||
                wy(x0, y0) > vy1
            ) {
                continue
            }
            fn(cx + cy * PW)
        }
    }
}
GV.vgCache = null
export function render() {
    const c = ctx,
        z = Z()
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.fillStyle = GV.sea
    c.fillRect(0, 0, cv.width, cv.height)
    if (!GV.S || !GV.gcv) {
        return
    }
    const tx = Math.round(cam.x * GV.DPR),
        ty = Math.round(cam.y * GV.DPR),
        nf = nightF(),
        se = GV.curSeason < 0 ? 0 : GV.curSeason
    c.setTransform(GV.K, 0, 0, GV.K, tx, ty)
    // Sprites and ground are drawn at their own size (see blit), and smoothing
    // makes even a plain copy about three times slower. Only a draw that
    // still scales down turns it on for itself.
    c.imageSmoothingEnabled = false
    if (!reduceMotion) {
        c.fillStyle = 'rgba(255,255,255,.22)'
        const mx = OX,
            my = OY + (N - 1) * 8,
            sh = (GV.animT * 2) | 0
        for (
            let gy2 = Math.floor(-cam.y / z / 22);
            gy2 * 22 < (GV.H - cam.y) / z;
            gy2++
        ) {
            for (
                let gx2 = Math.floor(-cam.x / z / 46);
                gx2 * 46 < (GV.W - cam.x) / z;
                gx2++
            ) {
                const px = gx2 * 46 + ((hsh(gx2, gy2, 31) * 30) | 0),
                    py = gy2 * 22 + ((hsh(gx2, gy2, 32) * 14) | 0)
                if (
                    Math.abs(px - mx) / (N * 16 + 20) +
                        Math.abs(py - my - 12) / (N * 8 + 26) <
                    1
                ) {
                    continue
                }
                if (hsh(gx2, gy2, sh >> 1) < 0.5) {
                    c.fillRect(px + (sh & 1) * 0.5, py, 6, 0.5)
                }
            }
        }
    }
    GV.chunkUse++
    const t0 = performance.now(),
        budget = { left: () => performance.now() - t0 < 6 },
        // Ground in view that is not painted yet may take a little longer.
        vbudget = { left: () => performance.now() - t0 < 12 }
    GV.bandDone = false
    const gx0 = -cam.x / z,
        gy0 = -cam.y / z,
        gx1 = (GV.W - cam.x) / z,
        gy1 = (GV.H - cam.y) / z
    // The fog comes first: where it is solid, the ground under it is skipped.
    const veils = []
    eachChunk(gx0, gy0, gx1, gy1, (i?, j?) => {
        const v = veilChunk(i, j, budget)
        veils.push(i, j, v)
        // Stale fog that was solid stays solid until it is rebuilt.
        if (v.opaque) {
            return
        }
        const ch = groundChunk(i, j, vbudget)
        if (ch.partial) {
            v.ground = true
            c.drawImage(
                ch.partial.cv,
                PAD,
                PAD,
                CH,
                CH,
                i * VCH,
                j * VCH,
                VCH,
                VCH
            )
        } else if (!ch.empty) {
            v.ground = true
            const src = chunkSrc(ch),
                f = src === ch.cv ? 1 : 0.5
            c.drawImage(
                src,
                PAD * f,
                PAD * f,
                CH * f,
                CH * f,
                i * VCH,
                j * VCH,
                VCH,
                VCH
            )
        } else {
            v.ground = false
        }
    })
    prefetchChunks(gx0, gy0, gx1, gy1, budget)
    trimChunks()
    trimVeils()
    const vx0 = -cam.x / z - 48,
        vy0 = -cam.y / z - 16,
        vx1 = (GV.W - cam.x) / z + 48,
        vy1 = (GV.H - cam.y) / z + 110
    const vis = (x?, y?) => {
        const a = wx(x, y),
            b = wy(x, y)
        return (
            a > vx0 &&
            a < vx1 &&
            b > vy0 &&
            b < vy1 &&
            GV.regs[reg[tileI(x, y)]].disc
        )
    }

    if (!reduceMotion && se !== 3) {
        c.fillStyle = 'rgba(214,236,244,.75)'
        const ph = (GV.animT * 1.5) | 0
        eachTileIn(vx0, vy0, vx1, vy1, (x?, y?) => {
            if (terrain[x + y * N] === 3 && vis(x, y)) {
                const k = hsh(x, y, ph),
                    k2 = hsh(y, x, ph + 3)
                if (k < 0.45) {
                    c.fillRect(
                        wx(x, y) - 8 + ((k2 * 28) | 0) / 2,
                        wy(x, y) - 3 + ((k * 24) | 0) / 2,
                        2,
                        0.5
                    )
                }
            }
        })
    }
    for (let k = 0; k < veils.length; k += 3) {
        const i = veils[k],
            j = veils[k + 1],
            v = veils[k + 2]
        // Off the map there is neither ground nor fog to draw.
        if (!v.opaque && !v.ground) {
            continue
        }
        c.drawImage(v.cv, VPAD, VPAD, VCH, VCH, i * VCH, j * VCH, VCH, VCH)
    }
    const ghostT = GV.drag && GV.drag.active ? GV.drag.t : GV.armed
    if (ghostT && ghostT !== 'flag') {
        c.strokeStyle = 'rgba(255,255,255,.14)'
        c.lineWidth = 1 / GV.K
        c.beginPath()
        for (let i = 0; i <= N; i++) {
            c.moveTo(wx(i, 0), wy(i, 0) - 8)
            c.lineTo(wx(i, N), wy(i, N) - 8)
            c.moveTo(wx(0, i), wy(0, i) - 8)
            c.lineTo(wx(N, i), wy(N, i) - 8)
        }
        c.stroke()
    }
    const selRing = (u?, en?, col?) => {
        const gx = u.x + (en ? u.ox : 0),
            gy = u.y + (en ? u.oy : 0)
        c.strokeStyle = col
        c.lineWidth = 0.75
        c.beginPath()
        c.ellipse(wx(gx, gy), wy(gx, gy) - (u.onWall ? 12 : 0), 6, 3, 0, 0, 7)
        c.stroke()
    }
    const drawSel = (sel?, col?, faint?) => {
        if (!sel) {
            return
        }
        if (sel.t) {
            if (sel.dead) {
                return
            }
            c.strokeStyle = col
            c.lineWidth = faint ? 0.75 : 1
            diamondPath(c, sel.x, sel.y, sel.s)
            c.stroke()
            if (!faint) {
                drawReach(c, sel.t, sel.cx, sel.cy, sel)
            }
        } else if (sel.kind === 'army') {
            if (faint && sel.u) {
                selRing(sel.u, false, col)
            } else {
                for (const s of GV.S.sold) {
                    if (s.kind !== 'scout' && vis(s.x, s.y)) {
                        selRing(s, false, s.sq && !faint ? BCOL[s.sq - 1] : col)
                    }
                }
            }
        } else if (sel.kind === 'banner') {
            c.strokeStyle = col
            c.lineWidth = faint ? 0.75 : 1
            diamondPath(c, sel.bn.x, sel.bn.y, 1)
            c.stroke()
            if (!faint) {
                for (const s of GV.S.sold) {
                    if (s.sq === sel.bn.id && vis(s.x, s.y)) {
                        selRing(s, false, BCOL[s.sq - 1])
                    }
                }
            }
        } else if (sel.kind === 'unit') {
            selRing(sel.u, true, col)
        } else if (LIVING_KINDS[sel.kind]) {
            selRing(sel.u, false, col)
        } else if (sel.kind === 'poi') {
            c.strokeStyle = col
            c.lineWidth = faint ? 0.75 : 1
            diamondPath(c, sel.p.x, sel.p.y, 1)
            c.stroke()
        }
    }
    drawSel(GV.selected, '#f2c84a', false)
    // Enemy riders spying on your land get a pulsing red ring, so they are easy to find.
    for (const e of GV.S.en) {
        if (e.dead || e.mode !== 'scout' || !e.inLand || !vis(e.x, e.y)) {
            continue
        }
        const pulse = 0.5 + 0.5 * Math.sin(GV.animT * 5),
            gx = e.x + e.ox,
            gy = e.y + e.oy
        c.strokeStyle = 'rgba(226,64,48,' + (0.55 + 0.4 * pulse) + ')'
        c.lineWidth = 1.2
        c.beginPath()
        c.ellipse(
            wx(gx, gy),
            wy(gx, gy),
            7 + pulse * 3,
            3.5 + pulse * 1.5,
            0,
            0,
            7
        )
        c.stroke()
    }
    if (GV.hoverPick && !GV.armed && !samePick(GV.hoverPick, GV.selected)) {
        drawSel(GV.hoverPick, 'rgba(255,248,220,.6)', true)
    }

    const list = []
    const bake = GV.K < R
    if (!bake) {
        eachProp(vx0, vy0, vx1, vy1, (p?) => {
            if (vis(p.x, p.y)) {
                list.push([p.x + p.y, 0, p])
            }
        })
    }
    for (const b of GV.S.b) {
        if (vis(b.cx, b.cy)) {
            const sp = sprite(b.t, bParams(b))
            for (const part of sp.parts) {
                list.push([
                    b.x +
                        part.dx +
                        b.y +
                        part.dy +
                        (DEF[b.t].soft && b.t !== 'farm' ? -0.4 : 0),
                    1,
                    b,
                    sp,
                    part,
                ])
            }
        }
    }
    for (const u of GV.S.vill) {
        if (vis(u.x, u.y)) {
            list.push([u.x + u.y + 0.02, 2, u, u.role, 0])
        }
    }
    for (const u of GV.S.sold) {
        if (vis(u.x, u.y)) {
            list.push([u.x + u.y + (u.onWall ? 0.5 : 0.02), 2, u, u.kind, 0])
        }
    }
    for (const u of GV.S.en) {
        if (vis(u.x, u.y) && !fogHides(u)) {
            if (u.type === 'wolf') {
                list.push([u.x + u.ox + u.y + u.oy + 0.02, 7, u, 'wolf'])
                continue
            }
            list.push([
                u.x + u.ox + u.y + u.oy + 0.02,
                3,
                u,
                u.type,
                fcol(u.fac),
            ])
        }
    }
    for (const c of caravans()) {
        if (vis(c.x, c.y)) {
            list.push([c.x + c.y + 0.02, 6, c])
        }
    }
    livingDrawList(list, vis)
    for (const bn of GV.S.banners) {
        if (vis(bn.x, bn.y)) {
            list.push([bn.x + bn.y + 0.03, 5, bn])
        }
    }
    if (bake) {
        // Busy cells: near anything that is not a prop. Their props go into the
        // list one by one; quiet cells are drawn whole, back to front.
        if (GV.K !== bakeK) {
            bakes.clear()
            bakeK = GV.K
        }
        bakeUse++
        bakeNew = 0
        busy.fill(0)
        for (const d of list) {
            const o = d[2]
            markBusy(o.x + (o.ox || 0), o.y + (o.oy || 0), o.s || 1)
        }
        const cells = propCells(),
            quiet = []
        eachPropCell(vx0, vy0, vx1, vy1, (ci?) => {
            const l = cells[ci]
            if (!l.length) {
                return
            }
            const b = busy[ci] ? null : bakedCell(ci, l, se)
            if (b) {
                quiet.push([(ci % PW) + ((ci / PW) | 0), b])
                return
            }
            for (const p of l) {
                if (vis(p.x, p.y)) {
                    list.push([p.x + p.y, 0, p])
                }
            }
        })
        quiet.sort((a?, q?) => a[0] - q[0])
        const K = GV.K
        for (const [, b] of quiet) {
            c.drawImage(b.cv, b.x / K, b.y / K, b.cv.width / K, b.cv.height / K)
        }
    }
    list.sort((a?, b?) => a[0] - b[0])
    for (const d of list) {
        if (d[1] === 0) {
            const p = d[2],
                sp =
                    p.k === 4
                        ? sprite(
                              p.poi === 'ruins' ? 'ruin' : p.poi,
                              se === 3 ? { sn: 1 } : {}
                          )
                        : propSprite(p.k, p.v, se)
            blit(
                c,
                sp.parts[0].cv,
                wx(p.x, p.y) - sp.ox / R + p.ox,
                wy(p.x, p.y) - sp.oy / R + p.oy
            )
        } else if (d[1] === 1) {
            const b = d[2],
                sp = d[3],
                part = d[4]
            if (b.hit > 0) {
                c.globalAlpha = 0.6
            }
            blit(
                c,
                part.cv,
                wx(b.x, b.y) - sp.ox / R,
                wy(b.x, b.y) - sp.oy / R - Math.round(b.drop * b.drop * 36) / 2
            )
            c.globalAlpha = 1
            if (b.stw > 0 || b.dig > 0) {
                drawSiegeWork(c, b)
            }
            if (b.ladder > 0) {
                const lx = wx(b.x, b.y) - 4,
                    ly = wy(b.x, b.y) + 7
                c.fillStyle = '#3a2818'
                c.fillRect(lx - 0.5, ly - 22, 1.5, 22)
                c.fillRect(lx + 4.5, ly - 22, 1.5, 22)
                c.fillStyle = '#6e4e30'
                c.fillRect(lx, ly - 22, 0.5, 22)
                c.fillRect(lx + 5, ly - 22, 0.5, 22)
                c.fillStyle = '#a07c50'
                for (let k = 2; k < 22; k += 3) {
                    c.fillRect(lx + 0.5, ly - k, 4, 0.5)
                }
            }
        } else if (d[1] === 7) {
            drawLivingItem(c, d)
        } else if (d[1] === 6) {
            const u = d[2],
                sp = sprite('caravan', {
                    sw: u.sw,
                    v: u.rev || 0,
                    f: u.moving && !reduceMotion ? ((u.walk * 4) | 0) % 2 : 0,
                })
            blit(
                c,
                sp.parts[0].cv,
                Math.round(wx(u.x, u.y)) - sp.ox / R,
                Math.round(wy(u.x, u.y)) - sp.oy / R
            )
        } else if (d[1] === 5) {
            const bn = d[2]
            drawBanner(
                c,
                wx(bn.x, bn.y),
                wy(bn.x, bn.y),
                BCOL[bn.id - 1],
                bn.id
            )
        } else {
            const u = d[2],
                role = d[3],
                en = d[1] === 3
            const gx = u.x + (en ? u.ox : 0),
                gy = u.y + (en ? u.oy : 0)
            const tX = clampN(gx),
                tY = clampN(gy),
                tb = bmap[tX + tY * N]
            const lift = u.onWall
                ? 12
                : en && tb && tb.ladder > 0
                  ? 11
                  : !en && tb && tb.o !== 0 && tb.stw >= 1
                    ? 11
                    : 0
            const sr =
                role === 'pram' ? 'ram' : role === 'pcat' ? 'catapult' : role
            if (sr === 'ram' || sr === 'catapult') {
                const sp = sprite(sr, { sw: u.sw, c: d[4] })
                blit(
                    c,
                    sp.parts[0].cv,
                    Math.round(wx(gx, gy)) - sp.ox / R,
                    Math.round(wy(gx, gy)) - sp.oy / R
                )
                if (u.hp < u.max - 0.5) {
                    hpBar(
                        c,
                        Math.round(wx(gx, gy)),
                        Math.round(wy(gx, gy)) - 20,
                        u.hp / u.max,
                        14
                    )
                }
                continue
            }
            const fr =
                u.moving || u.state === 'work' ? ((u.walk * 7) | 0) % 2 : 0
            const img = unitSprite(role, fr, u.face < 0, d[4], u.v || 0)
            const iw = img.width / R,
                ih = img.height / R
            const px = Math.round(wx(gx, gy)) - iw / 2,
                py = Math.round(wy(gx, gy)) - ih + 1 - lift
            if (!lift && wet(tX, tY)) {
                c.imageSmoothingEnabled = GV.K < R
                c.drawImage(
                    img,
                    0,
                    0,
                    img.width,
                    img.height - 10,
                    px,
                    py + 2.5,
                    iw,
                    ih - 5
                )
                c.imageSmoothingEnabled = false
                c.fillStyle = 'rgba(190,220,232,.75)'
                c.fillRect(px + 2.5, py + ih - 2.5, iw - 5, 0.5)
                c.fillRect(px + 1.5, py + ih - 2, 1, 0.5)
                c.fillRect(px + iw - 2.5, py + ih - 2, 1, 0.5)
            } else {
                blit(c, lift ? img : withShadow(img), px, py)
            }
            if (u.carry) {
                const bx = px + (u.face < 0 ? iw - 5.5 : 0.5),
                    by = py + ih * 0.42
                c.fillStyle = '#16131c'
                c.fillRect(bx, by, 5, 4.5)
                c.fillStyle =
                    u.carry === 'wood'
                        ? '#8a6038'
                        : u.carry === 'stone'
                          ? '#a9a79c'
                          : u.carry === 'meat'
                            ? '#b8503e'
                            : '#d4a537'
                c.fillRect(bx + 0.5, by + 0.5, 4, 3.5)
                c.fillStyle = 'rgba(255,255,255,.25)'
                c.fillRect(bx + 0.5, by + 0.5, 4, 0.5)
            }
            const lead = role === 'captain' || role === 'hero'
            if (u.max && u.hp < u.max - 0.5) {
                hpBar(c, px + iw / 2, py - 3, u.hp / u.max, lead ? 14 : 10)
            } else if (lead) {
                c.fillStyle = '#d4a537'
                c.fillRect(px + iw / 2 - 1, py - 4, 2.5, 1.5)
            }
            if (u.rout > 0 && ((GV.animT * 4) | 0) % 2) {
                // Broken: a pale mark over the head while they run.
                c.fillStyle = '#f4f0e0'
                c.fillRect(px + iw / 2 - 0.5, py - 8, 1, 3)
                c.fillRect(px + iw / 2 - 0.5, py - 4, 1, 1)
            }
            if (
                !en &&
                GV.S.cry > 0 &&
                role !== 'scout' &&
                ((GV.animT * 6 + u.x * 3) | 0) % 3 === 0
            ) {
                c.fillStyle = '#ffe08a'
                c.fillRect(px + iw / 2 - 0.5, py - 2, 1, 1)
            }
            if (en && u.burn > 0) {
                c.fillStyle = ((GV.animT * 10) | 0) % 2 ? '#ffb02e' : '#ff7a1e'
                c.fillRect(px + iw * 0.3, py + ih * 0.3, 1, 1.5)
                c.fillRect(px + iw * 0.6, py + ih * 0.15, 1, 1.5)
                c.fillStyle = '#ffe06a'
                c.fillRect(px + iw * 0.45, py + ih * 0.05, 0.5, 1)
            }
        }
    }
    for (const b of GV.S.b) {
        if (b.hp < b.max - 0.5 && vis(b.cx, b.cy)) {
            hpBar(
                c,
                wx(b.cx, b.cy),
                wy(b.cx, b.cy) -
                    (TOPH[b.t] || 20) -
                    (b.t === 'keep' ? b.lvl * 8 : 0),
                b.hp / b.max,
                b.s === 2 ? 22 : 14
            )
        }
    }

    for (const p of GV.parts) {
        c.globalAlpha = Math.max(0, 1 - p.t / p.life) * 0.85
        c.fillStyle = p.c
        c.fillRect(Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2, p.s, p.s)
    }
    c.globalAlpha = 1
    drawLivingOver(c)
    for (const a of GV.S.shots) {
        if (!seenAt(a.x, a.y)) {
            continue
        }
        const f = a.t / a.dur,
            sx = wx(a.x, a.y),
            sy = wy(a.x, a.y) - a.z
        if (a.stone) {
            const ex = wx(a.tx, a.ty),
                ey = wy(a.tx, a.ty),
                x = sx + (ex - sx) * f,
                y = sy + (ey - sy) * f - Math.sin(f * 3.1416) * 34
            c.fillStyle = '#16131c'
            c.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4)
            c.fillStyle = '#8d8b84'
            c.fillRect(Math.round(x) - 1.5, Math.round(y) - 1.5, 3, 3)
            c.fillStyle = '#b8b6ac'
            c.fillRect(Math.round(x) - 1.5, Math.round(y) - 1.5, 1.5, 1)
        } else {
            const t = a.b || a.e
            if (!t || t.dead) {
                continue
            }
            const gx = a.b ? t.cx : t.x + (t.ox || 0),
                gy = a.b ? t.cy : t.y + (t.oy || 0)
            const ex = wx(gx, gy),
                ey = wy(gx, gy) - (t.onWall ? 19 : 7)
            const x = sx + (ex - sx) * f,
                y = sy + (ey - sy) * f,
                dl = Math.hypot(ex - sx, ey - sy) || 1

            for (let k = 0; k < 8; k++) {
                c.fillStyle =
                    k < 2
                        ? a.burn
                            ? k
                                ? '#ff9a2a'
                                : '#ffe06a'
                            : '#e8e2cc'
                        : k > 5
                          ? '#d8d0c0'
                          : '#6b4a2a'
                c.fillRect(
                    Math.round((x - ((ex - sx) / dl) * k * 0.5) * 2) / 2,
                    Math.round((y - ((ey - sy) / dl) * k * 0.5) * 2) / 2,
                    0.5,
                    0.5
                )
            }
        }
    }
    if (
        ghostT &&
        !drawToolGhost(c, ghostT) &&
        GV.hover &&
        inMap(GV.hover[0], GV.hover[1])
    ) {
        const [x, y] = GV.hover
        if (ghostT === 'flag') {
            c.fillStyle = seenAt(x, y)
                ? 'rgba(240,210,90,.4)'
                : 'rgba(220,70,60,.45)'
            diamondPath(c, x, y, 1)
            c.fill()
            c.globalAlpha = 0.75
            let id = GV.moveBn || 1
            while (!GV.moveBn && GV.S.banners.some((b?) => b.id === id)) {
                id++
            }
            drawBanner(c, wx(x, y), wy(x, y), BCOL[(id - 1) % 4], id)
            c.globalAlpha = 1
        } else if (ghostT === 'remove') {
            const b = bAt(x, y)
            c.fillStyle = 'rgba(220,70,60,.45)'
            diamondPath(c, b ? b.x : x, b ? b.y : y, b ? b.s : 1)
            c.fill()
        } else {
            const d = DEF[ghostT],
                s = d.size || 1,
                ok =
                    d.tier <= GV.keep.lvl &&
                    !placeErr(ghostT, x, y) &&
                    afford(costOf(ghostT))
            c.fillStyle = ok ? 'rgba(120,230,120,.4)' : 'rgba(220,70,60,.45)'
            diamondPath(c, x, y, s)
            c.fill()
            c.globalAlpha = 0.7
            if (ghostT === 'grove') {
                const sp = propSprite(1, 2, se)
                blit(
                    c,
                    sp.parts[0].cv,
                    wx(x, y) - sp.ox / R,
                    wy(x, y) - sp.oy / R
                )
            } else if (ghostT !== 'moat') {
                const sp = sprite(ghostT, {})
                blit(
                    c,
                    sp.full || sp.parts[0].cv,
                    wx(x, y) - sp.ox / R,
                    wy(x, y) - sp.oy / R
                )
            }
            c.globalAlpha = 1
            drawReach(c, ghostT, x + (s - 1) / 2, y + (s - 1) / 2)
        }
    }
    if (nf > 0) {
        c.setTransform(1, 0, 0, 1, 0, 0)
        c.fillStyle = 'rgba(12,12,44,' + (0.56 * nf).toFixed(3) + ')'
        c.fillRect(0, 0, cv.width, cv.height)
        c.setTransform(GV.K, 0, 0, GV.K, tx, ty)
        c.globalCompositeOperation = 'lighter'
        c.globalAlpha = nf * 0.85
        for (const b of GV.S.b) {
            if (!vis(b.cx, b.cy)) {
                continue
            }
            if (LIT[b.t] || b.fire > 0) {
                c.drawImage(
                    GV.glow,
                    wx(b.cx, b.cy) - 24,
                    wy(b.cx, b.cy) - 16 - (TOPH[b.t] || 20) * 0.55
                )
            } else if (
                (b.t === 'wall' || b.t === 'palisade') &&
                (b.x * 3 + b.y) % 4 === 0
            ) {
                const x = wx(b.x, b.y),
                    y = wy(b.x, b.y) - (b.t === 'wall' ? 26 : 20)
                c.drawImage(GV.torch, x - 11, y - 4)
                c.globalCompositeOperation = 'source-over'
                c.globalAlpha = 1
                c.fillStyle = '#3a2c1c'
                c.fillRect(x, y + 2, 1, 4)
                c.fillStyle =
                    ((GV.animT * 6 + b.x) | 0) % 2 ? '#ffe06a' : '#ff9a2a'
                c.fillRect(x - 1, y, 3, 2)
                c.globalCompositeOperation = 'lighter'
                c.globalAlpha = nf * 0.85
            }
        }
        c.globalCompositeOperation = 'source-over'
        c.globalAlpha = 1
    } else {
        c.globalCompositeOperation = 'lighter'
        c.globalAlpha = 0.7
        for (const b of GV.S.b) {
            if (b.fire > 0 && vis(b.cx, b.cy)) {
                c.drawImage(GV.glow, wx(b.cx, b.cy) - 24, wy(b.cx, b.cy) - 26)
            }
        }
        c.globalCompositeOperation = 'source-over'
        c.globalAlpha = 1
    }
    c.setTransform(1, 0, 0, 1, 0, 0)
    if (
        !GV.vgCache ||
        GV.vgCache.w !== cv.width ||
        GV.vgCache.h !== cv.height
    ) {
        const g = c.createRadialGradient(
            cv.width / 2,
            cv.height / 2,
            Math.min(cv.width, cv.height) * 0.3,
            cv.width / 2,
            cv.height / 2,
            Math.hypot(cv.width, cv.height) * 0.62
        )
        g.addColorStop(0, 'rgba(8,10,20,0)')
        g.addColorStop(0.6, 'rgba(8,10,20,.14)')
        g.addColorStop(1, 'rgba(8,10,20,.46)')
        GV.vgCache = { w: cv.width, h: cv.height, g }
    }
    c.fillStyle = GV.vgCache.g
    c.fillRect(0, 0, cv.width, cv.height)
    c.setTransform(GV.DPR, 0, 0, GV.DPR, 0, 0)
    if (se === 3 && !reduceMotion) {
        c.fillStyle = 'rgba(255,255,255,.85)'
        for (let i = 0; i < 70; i++) {
            const sp = 26 + hsh(i, 3, 50) * 34
            c.fillRect(
                (hsh(i, 1, 50) * GV.W +
                    Math.sin(GV.animT + i) * 12 +
                    GV.animT * 8) %
                    GV.W,
                (hsh(i, 2, 50) * GV.H + GV.animT * sp) % GV.H,
                2,
                2
            )
        }
    }
    drawWeather(c, GV.W, GV.H)
    c.font =
        '600 13px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif'
    c.textAlign = 'center'
    const FC = {
        food: '#f6dc7c',
        wood: '#f0cfa2',
        stone: '#eeeee6',
        gold: '#ffd95a',
    }
    for (const f of GV.S.floats) {
        const sx = wx(f.x, f.y) * z + cam.x,
            sy = (wy(f.x, f.y) - 22) * z + cam.y - (reduceMotion ? 0 : f.t * 22)
        c.globalAlpha = 1 - f.t / 1.2
        c.lineWidth = 3
        c.strokeStyle = 'rgba(20,28,32,.85)'
        c.strokeText(f.txt, sx, sy)
        c.fillStyle = FC[f.res] || (GOOD[f.res] ? GOOD[f.res].col : '#fff')
        c.fillText(f.txt, sx, sy)
    }
    c.globalAlpha = 1
}
