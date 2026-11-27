import { DEF, FCOL, GH, GW, N, OX, OY } from './config'
import { paintGround as paintPure, setPaintData } from './groundpaint'
import { vnoise } from './noise'
import { R, toCanvas } from './sprites'
import { bmap, fcol, inMap, pathMap, reg, terrain, wx, wy } from './state'
import { GV } from './vars'

/* The ground and the fog are cached in square chunks that are painted when they
   first come into view, so a large map does not need one huge canvas. */
GV.gcv = null
GV.vcv = null
GV.glow = null
GV.torch = null
export { DIRT, GRASS } from './groundpaint'
export const AW = GW * R,
    AH = GH * R,
    CH = 512,
    PAD = 2,
    VCH = CH / R,
    VPAD = 1
export const CW = Math.ceil(AW / CH),
    CHN = Math.ceil(AH / CH),
    MAXCH = 80,
    // Fog chunks are smaller and many stand over land never painted: keep more.
    MAXV = 220
GV.groundGen = 1
GV.veilGen = 1
GV.chunkUse = 0
/* What the painter reads, live, on the main thread. */
function liveData() {
    return {
        N,
        OX,
        OY,
        R,
        AH,
        season: GV.curSeason,
        terrain,
        pathMap,
        link: (i?) => pathLink(i % N, (i / N) | 0),
        moat: (i?) => GV.S.tmod[i] === 3,
    }
}
/* Paint one rectangle of ground pixels on the main thread, tinted. */
function paintGround(x0?, y0?, w?, h?) {
    setPaintData(liveData())
    return paintPure(x0, y0, w, h)
}
/*
 * Workers paint whole chunks off the main thread, so panning and zooming out do
 * not stop the frame. The workers paint from a copy of the map (a snapshot,
 * at most one each half second). Each job carries the generation of the ground
 * and the count of changes in its snapshot. When the pixels come back, the
 * small changes made since are painted over them here; after a large change,
 * or with ground of an older generation, the pixels are thrown away and the
 * chunk is asked for again. Without workers, chunks are painted in bands on
 * the main thread as before.
 */
GV.groundChg = 0
/* Recent changes: { c, x0, y0, x1, y1, big } in chunk pixels. */
const changes = []
let snapChg = 0,
    snapAt = -1,
    lost = 0,
    lastBig = 0
const pool = []
let poolOn = false,
    sentVer = ''
const jobs = new Map()
/* True while workers paint (for tests). */
export const groundBusy = () => jobs.size > 0
const wanted = []
function initPool() {
    if (pool.length || typeof Worker === 'undefined') {
        return
    }
    // Leave two cores for the game and the browser.
    const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 2))
    try {
        for (let k = 0; k < n; k++) {
            const w = new Worker(
                new URL('./groundworker.ts', import.meta.url),
                {
                    type: 'module',
                }
            )
            const slot = { w, busy: 0 }
            w.onmessage = (e?) => {
                slot.busy--
                jobDone(e.data)
            }
            w.onerror = () => stopPool()
            pool.push(slot)
        }
        poolOn = true
    } catch {
        stopPool()
    }
}
function stopPool() {
    for (const p of pool) {
        p.w.terminate()
    }
    pool.length = 0
    jobs.clear()
    poolOn = false
}
/* A copy of what the painter reads, for the workers. */
function snapshot() {
    const link = new Uint8Array(N * N),
        moat = new Uint8Array(N * N)
    for (let i = 0; i < N * N; i++) {
        link[i] = pathLink(i % N, (i / N) | 0) ? 1 : 0
    }
    for (const k in GV.S.tmod) {
        if (GV.S.tmod[k] === 3) {
            moat[+k] = 1
        }
    }
    return {
        N,
        OX,
        OY,
        R,
        AH,
        season: GV.curSeason,
        terrain: terrain.slice(),
        pathMap: pathMap.slice(),
        link,
        moat,
    }
}
function jobDone(m?) {
    jobs.delete(m.key)
    if (m.gen !== GV.groundGen || m.chg < lost) {
        return
    }
    const x0 = m.x0,
        y0 = m.y0,
        x1 = x0 + m.w,
        y1 = y0 + m.h,
        late = changes.filter(
            (c?) =>
                c.c > m.chg && c.x1 > x0 && c.x0 < x1 && c.y1 > y0 && c.y0 < y1
        )
    if (late.some((c?) => c.big)) {
        return
    }
    let ch = GV.gcv.get(m.key)
    if (!m.buf) {
        GV.gcv.set(m.key, { empty: true, gen: m.gen, used: GV.chunkUse })
        return
    }
    if (!ch || ch.empty) {
        const c = document.createElement('canvas')
        c.width = c.height = m.w
        ch = { cv: c, g: c.getContext('2d'), gen: 0, used: GV.chunkUse }
        GV.gcv.set(m.key, ch)
    }
    ch.g.putImageData(
        new ImageData(new Uint8ClampedArray(m.buf), m.w, m.h),
        0,
        0
    )
    for (const c of late) {
        const im = paintGround(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0)
        if (im) {
            ch.g.putImageData(im, c.x0 - x0, c.y0 - y0)
        }
    }
    ch.gen = m.gen
    ch.mip = null
}
/* Send the wanted chunks to free workers, the first wanted first. */
function dispatch() {
    const S2 = CH + 2 * PAD
    for (const key of wanted) {
        if (jobs.has(key)) {
            continue
        }
        let slot = null
        for (const p of pool) {
            if (p.busy < 2 && (!slot || p.busy < slot.busy)) {
                slot = p
            }
        }
        if (!slot) {
            break
        }
        const ver = GV.groundGen + ':' + GV.groundChg,
            now = performance.now()
        if (
            ver !== sentVer &&
            (snapAt < 0 ||
                now - snapAt > 500 ||
                snapChg < lastBig ||
                !sentVer.startsWith(GV.groundGen + ':'))
        ) {
            sentVer = ver
            snapAt = now
            snapChg = GV.groundChg
            const data = snapshot()
            for (const p of pool) {
                p.w.postMessage({ data })
            }
        }
        const i = key % CW,
            j = (key / CW) | 0
        jobs.set(key, 1)
        slot.busy++
        slot.w.postMessage({
            job: {
                key,
                x0: i * CH - PAD,
                y0: j * CH - PAD,
                w: S2,
                h: S2,
                gen: GV.groundGen,
                chg: snapChg,
            },
        })
    }
    wanted.length = 0
}
/* Note a change to the ground over a rectangle of chunk pixels. */
function stamp(px0?, py0?, px1?, py1?, big?) {
    const c = ++GV.groundChg
    changes.push({ c, x0: px0, y0: py0, x1: px1, y1: py1, big })
    if (big) {
        lastBig = c
    }
    // Keep the last few hundred. A job older than the ones let go is redone.
    if (changes.length > 400) {
        lost = changes[changes.length - 301].c
        changes.splice(0, changes.length - 300)
    }
}
export function groundInit() {
    GV.gcv = new Map()
    GV.vcv = new Map()
    const gw = 48,
        gh = 32,
        px = new Uint8ClampedArray(gw * gh * 4)
    for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
            const d = Math.hypot((x - 23.5) / 24, (y - 15.5) / 16),
                a = Math.max(0, 1 - d),
                j = (x + y * gw) * 4
            px[j] = 255
            px[j + 1] = 166
            px[j + 2] = 76
            px[j + 3] = Math.round(a * a * 10) * 14
        }
    }
    GV.glow = toCanvas(gw, gh, px)
    const tw3 = 22,
        th3 = 14,
        p2 = new Uint8ClampedArray(tw3 * th3 * 4)
    for (let y = 0; y < th3; y++) {
        for (let x = 0; x < tw3; x++) {
            const d = Math.hypot((x - 10.5) / 11, (y - 6.5) / 7),
                a = Math.max(0, 1 - d),
                j = (x + y * tw3) * 4
            p2[j] = 255
            p2[j + 1] = 166
            p2[j + 2] = 76
            p2[j + 3] = Math.round(a * a * 8) * 15
        }
    }
    GV.torch = toCanvas(tw3, th3, p2)
}
/* Every tile whose centre lies in a rectangle of world pixels, row by row. */
export function eachTileIn(px0?, py0?, px1?, py1?, fn?) {
    const u0 = Math.ceil((px0 - OX) / 16),
        u1 = Math.floor((px1 - OX) / 16),
        s0 = Math.ceil((py0 - OY) / 8),
        s1 = Math.floor((py1 - OY) / 8)
    const ya = Math.max(0, Math.ceil((s0 - u1) / 2)),
        yb = Math.min(N - 1, Math.floor((s1 - u0) / 2))
    for (let y = ya; y <= yb; y++) {
        const xa = Math.max(0, u0 + y, s0 - y),
            xb = Math.min(N - 1, u1 + y, s1 - y)
        for (let x = xa; x <= xb; x++) {
            fn(x, y)
        }
    }
}
/** Repaint, a little at a time, the painted ground over a rectangle of tiles. */
export function staleGround(x0?, y0?, x1?, y1?) {
    if (!GV.gcv) {
        return
    }
    const px0 = (wx(x0, y1) - 40) * R,
        px1 = (wx(x1, y0) + 40) * R,
        py0 = (wy(x0, y0) - 24) * R,
        py1 = (wy(x1, y1) + 24) * R
    stamp(px0, py0, px1, py1, true)
    for (const [k, ch] of GV.gcv) {
        const i = k % CW,
            j = (k / CW) | 0
        if (
            i * CH + CH >= px0 &&
            i * CH <= px1 &&
            j * CH + CH >= py0 &&
            j * CH <= py1
        ) {
            if (ch.empty) {
                GV.gcv.delete(k)
            } else {
                ch.gen = -1
            }
        }
    }
    dropPend(px0, py0, px1, py1)
}
export function makeChunk(i?, j?) {
    const S2 = CH + 2 * PAD,
        im = paintGround(i * CH - PAD, j * CH - PAD, S2, S2)
    let ch = GV.gcv.get(i + j * CW)
    if (!im) {
        ch = { empty: true, gen: GV.groundGen, used: GV.chunkUse }
        GV.gcv.set(i + j * CW, ch)
        return ch
    }
    if (!ch || ch.empty) {
        const c = document.createElement('canvas')
        c.width = c.height = S2
        ch = { cv: c, g: c.getContext('2d'), gen: 0, used: 0 }
        GV.gcv.set(i + j * CW, ch)
    }
    ch.g.putImageData(im, 0, 0)
    ch.gen = GV.groundGen
    ch.used = GV.chunkUse
    ch.mip = null
    return ch
}
/* A chunk drawn smaller than its pixels (zoomed out) is drawn from a copy at
   half size, made once, instead of being shrunk again every frame. */
export function chunkSrc(ch?) {
    if (GV.K >= R) {
        return ch.cv
    }
    if (!ch.mip) {
        const S2 = CH + 2 * PAD,
            m = document.createElement('canvas')
        m.width = m.height = S2 / 2
        const g = m.getContext('2d')
        g.imageSmoothingEnabled = true
        g.imageSmoothingQuality = 'medium'
        g.drawImage(ch.cv, 0, 0, S2, S2, 0, 0, S2 / 2, S2 / 2)
        // Read back once: a canvas filled with putImageData draws faster.
        const m2 = document.createElement('canvas')
        m2.width = m2.height = S2 / 2
        m2.getContext('2d').putImageData(
            g.getImageData(0, 0, S2 / 2, S2 / 2),
            0,
            0
        )
        ch.mip = m2
    }
    return ch.mip
}
/* Repaint the ground around one tile in every chunk that is already painted. */
export function groundTileChanged(x?, y?) {
    if (!GV.gcv) {
        return
    }
    const x0 = Math.floor(wx(x, y) * R - 36),
        y0 = Math.floor(wy(x, y) * R - 20),
        w = 72,
        h = 40
    // A half-painted chunk here starts over, so it shows the change.
    dropPend(x0, y0, x0 + w, y0 + h)
    stamp(x0, y0, x0 + w, y0 + h)
    let im = null
    for (
        let j = Math.floor((y0 + PAD) / CH) - 1;
        j <= Math.floor((y0 + h + PAD) / CH);
        j++
    ) {
        for (
            let i = Math.floor((x0 + PAD) / CH) - 1;
            i <= Math.floor((x0 + w + PAD) / CH);
            i++
        ) {
            if (i < 0 || j < 0 || i >= CW || j >= CHN) {
                continue
            }
            const ch = GV.gcv.get(i + j * CW)
            if (!ch) {
                continue
            }
            const ox = i * CH - PAD,
                oy = j * CH - PAD
            if (
                x0 + w <= ox ||
                y0 + h <= oy ||
                x0 >= ox + CH + 2 * PAD ||
                y0 >= oy + CH + 2 * PAD
            ) {
                continue
            }
            if (ch.empty) {
                GV.gcv.delete(i + j * CW)
                continue
            }
            if (!im) {
                im = paintGround(x0, y0, w, h)
            }
            if (im) {
                ch.g.putImageData(im, x0 - ox, y0 - oy)
                ch.mip = null
            }
        }
    }
}
export function tintAll() {
    GV.groundGen++
}
export function pathLink(x?, y?) {
    if (!inMap(x, y)) {
        return false
    }
    const i = x + y * N
    if (pathMap[i]) {
        return true
    }
    const b = bmap[i]
    return !!(b && b.o === 0 && (DEF[b.t].path || b === GV.keep))
}
export function drawGroundAll() {
    if (!GV.gcv) {
        return
    }
    GV.gcv.clear()
    GV.vcv.clear()
    GV.gpend.clear()
    wanted.length = 0
    GV.groundGen++
    GV.veilGen++
}
export function buildVeil() {
    GV.veilGen++
}
export function makeVeil(i?, j?) {
    const S2 = VCH + 2 * VPAD,
        x0 = i * VCH - VPAD,
        y0 = j * VCH - VPAD
    let ch = GV.vcv.get(i + j * CW)
    if (!ch) {
        const c = document.createElement('canvas')
        c.width = c.height = S2
        ch = { cv: c, g: c.getContext('2d'), im: null, gen: 0 }
        GV.vcv.set(i + j * CW, ch)
    }
    if (!ch.im) {
        ch.im = ch.g.createImageData(S2, S2)
    }
    // The texture of the fog and the mist never changes, so it is worked out
    // once per chunk (on 2 by 2 pixel blocks) and kept for later rebuilds.
    // 0 means "not worked out yet": no shade of either is 0.
    const H = (S2 + 1) >> 1
    if (!ch.nm) {
        ch.nm = new Uint8Array(H * H)
        ch.nf = new Uint8Array(H * H)
    }
    const nm = ch.nm,
        nf = ch.nf
    const d = ch.im.data
    d.fill(0)
    eachTileIn(x0 - 16, y0 - 8, x0 + S2 + 16, y0 + S2 + 8, (x?, y?) => {
        const cx = wx(x, y),
            cy = wy(x, y)
        const rg = GV.regs[reg[x + y * N]]
        if (rg.disc && rg.owner === 0) {
            return
        }
        const fog = !rg.disc,
            // Land that has not opened yet lies under a darker mist.
            mist = !rg.gen
        let edge = false
        if (fog && !mist) {
            for (const [a, b] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]) {
                if (
                    inMap(x + a, y + b) &&
                    GV.regs[reg[x + a + (y + b) * N]].disc
                ) {
                    edge = true
                }
            }
        }
        const fc = rg.owner > 0 ? FCOL[fcol(rg.owner)] : 0x0a0e16,
            al = rg.owner > 0 ? 62 : 78
        for (let r = 0; r < 16; r++) {
            const hw = r < 8 ? 2 * (r + 1) : 2 * (16 - r),
                py = cy - 8 + r,
                ly = py - y0
            if (ly < 0 || ly >= S2) {
                continue
            }
            for (let dx = -hw; dx < hw; dx++) {
                const px = cx + dx,
                    lx = px - x0
                if (lx < 0 || lx >= S2) {
                    continue
                }
                const j2 = (lx + ly * S2) * 4,
                    q = (lx >> 1) + (ly >> 1) * H
                if (mist) {
                    let v = nm[q]
                    if (!v) {
                        const bx = px - (lx & 1),
                            by = py - (ly & 1),
                            n = vnoise(bx / 26, by / 12, 42),
                            n2 = vnoise(bx / 9, by / 5, 43)
                        nm[q] = 108 + n * 40 + n2 * 12
                        v = nm[q]
                    }
                    d[j2] = v - 6
                    d[j2 + 1] = v + 2
                    d[j2 + 2] = v + 10
                    d[j2 + 3] = 255
                } else if (fog) {
                    let v = nf[q]
                    if (!v) {
                        const bx = px - (lx & 1),
                            by = py - (ly & 1),
                            n = vnoise(bx / 14, by / 9, 40),
                            n2 = vnoise(bx / 5, by / 4, 41)
                        nf[q] = 14 + n * 18 + n2 * 6
                        v = nf[q]
                    }
                    d[j2] = v
                    d[j2 + 1] = v + 7
                    d[j2 + 2] = v + 18
                    d[j2 + 3] = edge && (px + py) & 1 ? 150 : 255
                } else {
                    d[j2] = (fc >> 16) & 255
                    d[j2 + 1] = (fc >> 8) & 255
                    d[j2 + 2] = fc & 255
                    d[j2 + 3] = al
                }
            }
        }
    })
    ch.g.putImageData(ch.im, 0, 0)
    ch.gen = GV.veilGen
    ch.used = GV.chunkUse
    // A chunk under solid fog hides the ground: it never needs painting.
    let opaque = true
    for (let y = VPAD; y < VPAD + VCH && opaque; y++) {
        for (
            let x = VPAD, k = (x + y * S2) * 4 + 3;
            x < VPAD + VCH;
            x++, k += 4
        ) {
            if (d[k] !== 255) {
                opaque = false
                break
            }
        }
    }
    ch.opaque = opaque
    return ch
}
/* The fog over one chunk. A stale one is redrawn within the frame's time
   budget; until then the old fog shows for a moment. */
export function veilChunk(i?, j?, budget?) {
    const v = GV.vcv.get(i + j * CW)
    if (!v || (v.gen !== GV.veilGen && budget.left())) {
        return makeVeil(i, j)
    }
    v.used = GV.chunkUse
    return v
}
export function trimVeils() {
    if (GV.vcv.size <= MAXV) {
        return
    }
    const old = [...GV.vcv.entries()]
        .filter(([, c]) => c.used !== GV.chunkUse)
        .sort((a?, b?) => a[1].used - b[1].used)
    for (let k = 0; k < old.length && GV.vcv.size > MAXV; k++) {
        GV.vcv.delete(old[k][0])
    }
}
/* Chunks under the view rectangle (world units). New chunks are painted at once,
   stale ones (after a season change) within a small time budget per frame. */
export function eachChunk(vx0?, vy0?, vx1?, vy1?, fn?) {
    const i0 = Math.max(0, Math.floor((vx0 * R) / CH)),
        i1 = Math.min(CW - 1, Math.floor((vx1 * R) / CH))
    const j0 = Math.max(0, Math.floor((vy0 * R) / CH)),
        j1 = Math.min(CHN - 1, Math.floor((vy1 * R) / CH))
    for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
            fn(i, j)
        }
    }
}
/* Painting a whole chunk takes tens of milliseconds. Chunks painted ahead of
   time (the ones just outside the view, or old ones after a season change)
   are painted in bands, a few per frame, while the old chunk still shows. */
const BAND = 32
GV.gpend = new Map()
function startPend(key?) {
    let p = GV.gpend.get(key)
    if (!p || p.gen !== GV.groundGen) {
        const S2 = CH + 2 * PAD,
            c = document.createElement('canvas')
        c.width = c.height = S2
        p = {
            cv: c,
            g: c.getContext('2d'),
            row: 0,
            any: false,
            gen: GV.groundGen,
        }
        GV.gpend.set(key, p)
    }
    return p
}
/* Paint the next band; true when the chunk is done. */
function bandStep(key?, p?) {
    const S2 = CH + 2 * PAD,
        i = key % CW,
        j = (key / CW) | 0,
        h = Math.min(BAND, S2 - p.row),
        im = paintGround(i * CH - PAD, j * CH - PAD + p.row, S2, h)
    if (im) {
        p.g.putImageData(im, 0, p.row)
        p.any = true
    }
    p.row += h
    return p.row >= S2
}
function finishPend(key?, p?) {
    GV.gpend.delete(key)
    const ch = p.any
        ? { cv: p.cv, g: p.g, gen: p.gen, used: GV.chunkUse, mip: null }
        : { empty: true, gen: p.gen, used: GV.chunkUse }
    GV.gcv.set(key, ch)
    return ch
}
/* Forget half-painted chunks over a rectangle of chunk pixels (it changed). */
function dropPend(px0?, py0?, px1?, py1?) {
    for (const k of [...GV.gpend.keys()]) {
        const i = k % CW,
            j = (k / CW) | 0
        if (
            i * CH + CH >= px0 &&
            i * CH <= px1 &&
            j * CH + CH >= py0 &&
            j * CH <= py1
        ) {
            GV.gpend.delete(k)
        }
    }
}
/* The ground of a chunk in view. One not painted yet is painted in bands
   while the frame has time; until it is done, `partial` holds what is
   painted so far, so a wide view fills in over a few frames instead of
   stopping the game. */
const MISSING = { empty: true, missing: true }
export function groundChunk(i?, j?, budget?) {
    const key = i + j * CW
    const ch = GV.gcv.get(key)
    initPool()
    if (poolOn) {
        // The workers paint it; until then there is only the sea here.
        if (!ch || ch.gen !== GV.groundGen) {
            wanted.push(key)
        }
        if (!ch) {
            return MISSING
        }
        ch.used = GV.chunkUse
        return ch
    }
    if (!ch) {
        const p = startPend(key)
        let first = !GV.bandDone
        while (first || budget.left()) {
            first = false
            GV.bandDone = true
            if (bandStep(key, p)) {
                return finishPend(key, p)
            }
        }
        return { partial: p }
    } else if (ch.gen !== GV.groundGen) {
        startPend(key)
    }
    ch.used = GV.chunkUse
    return ch
}
export function trimChunks() {
    if (GV.gcv.size <= MAXCH) {
        return
    }
    const old = [...GV.gcv.entries()]
        .filter(([, c]) => c.used !== GV.chunkUse)
        .sort((a?, b?) => a[1].used - b[1].used)
    for (let k = 0; k < old.length && GV.gcv.size > MAXCH; k++) {
        GV.gcv.delete(old[k][0])
    }
}
export function prefetchChunks(gx0?, gy0?, gx1?, gy1?, budget?) {
    const m = VCH
    if (poolOn) {
        // Missing chunks in view first, nearest the middle first, then stale
        // ones, then the ring just outside the view when it fits in the cache.
        const mx = ((gx0 + gx1) / 2) * R,
            my = ((gy0 + gy1) / 2) * R,
            far = (k?) =>
                Math.hypot(
                    ((k % CW) + 0.5) * CH - mx,
                    (((k / CW) | 0) + 0.5) * CH - my
                ) + (GV.gcv.has(k) ? 1e6 : 0)
        wanted.sort((a?, b?) => far(a) - far(b))
        let n = 0
        eachChunk(gx0 - m, gy0 - m, gx1 + m, gy1 + m, () => {
            n++
        })
        if (n <= MAXCH) {
            eachChunk(gx0 - m, gy0 - m, gx1 + m, gy1 + m, (i?, j?) => {
                const key = i + j * CW
                if (!GV.gcv.has(key) && !GV.vcv.get(key)?.opaque) {
                    wanted.push(key)
                }
            })
        }
        dispatch()
        return
    }
    // When the view and the ring round it do not fit in the cache, painting the
    // ring would only push out chunks in view, to be painted again: skip it.
    let n = 0
    eachChunk(gx0 - m, gy0 - m, gx1 + m, gy1 + m, () => {
        n++
    })
    if (n > MAXCH) {
        return
    }
    eachChunk(gx0 - m, gy0 - m, gx1 + m, gy1 + m, (i?, j?) => {
        const key = i + j * CW
        if (GV.gcv.has(key) || GV.gpend.has(key) || GV.gpend.size >= 3) {
            return
        }
        const v = GV.vcv.get(key)
        if (v && v.opaque) {
            return
        }
        startPend(key)
    })
    // Bands as long as the frame has time, but at least one, so work goes on.
    let first = true
    for (const [key, p] of GV.gpend) {
        while (first || budget.left()) {
            first = false
            if (bandStep(key, p)) {
                finishPend(key, p)
                break
            }
        }
        if (!budget.left()) {
            return
        }
    }
}
