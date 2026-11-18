import { DEF, FCOL, GH, GW, N } from './config'
import { isWater } from './helpers'
import { grade, hsh, mix, tw, vnoise } from './noise'
import { R, toCanvas } from './sprites'
import { bmap, inMap, pathMap, reg, terrain, wx, wy } from './state'
import { GV } from './vars'

/* The ground and the fog are cached in square chunks that are painted when they
   first come into view, so a large map does not need one huge canvas. */
GV.gcv = null
GV.vcv = null
GV.glow = null
GV.torch = null
export const GRASS = [0x4a7f35, 0x548a3a, 0x5e9540, 0x699f47],
    DIRT = [0x8f744d, 0x9d8158, 0xab8f64]
export const AW = GW * R,
    AH = GH * R,
    CH = 512,
    PAD = 2,
    VCH = CH / R,
    VPAD = 1
export const CW = Math.ceil(AW / CH),
    CHN = Math.ceil(AH / CH),
    MAXCH = 80
GV.gbuf = new Uint8ClampedArray(0)
GV.gbx = 0
GV.gby = 0
GV.gbw = 0
GV.gbh = 0
GV.gpainted = 0
GV.groundGen = 1
GV.veilGen = 1
GV.chunkUse = 0
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
/* Season tint of an untinted ground buffer, into new image data. */
export function tintBuf(src?, w?, h?) {
    const s = GV.curSeason < 0 ? 0 : GV.curSeason,
        im = new ImageData(w, h),
        d = im.data
    for (let j = 0; j < w * h * 4; j += 4) {
        let r = src[j],
            g = src[j + 1],
            b = src[j + 2]
        d[j + 3] = src[j + 3]
        if (s !== 1 && src[j + 3]) {
            const green = g > r + 10 && g > b + 18
            if (s === 3) {
                if (green) {
                    const v = 182 + (g - 105) * 0.45
                    r = v - 10
                    g = v - 4
                    b = v + 7
                } else if (b > g && b > r + 16) {
                    r = r * 0.42 + 96
                    g = g * 0.42 + 112
                    b = b * 0.42 + 126
                } else {
                    r = r * 0.7 + 58
                    g = g * 0.7 + 61
                    b = b * 0.7 + 66
                }
            } else if (s === 2) {
                if (green) {
                    r += 42
                    g -= 4
                    b -= 12
                }
            } else if (green) {
                g += 6
                r += 2
            }
        }
        d[j] = r
        d[j + 1] = g
        d[j + 2] = b
    }
    return im
}
/* Paint the ground of one rectangle (ground pixels) from scratch and return it tinted. */
export function paintGround(x0?, y0?, w?, h?) {
    if (GV.gbuf.length < w * h * 4) {
        GV.gbuf = new Uint8ClampedArray(w * h * 4)
    } else {
        GV.gbuf.fill(0, 0, w * h * 4)
    }
    GV.gbx = x0
    GV.gby = y0
    GV.gbw = w
    GV.gbh = h
    GV.gpainted = 0
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const cx = wx(x, y) * R,
                cy = wy(x, y) * R
            if (
                cx + 36 >= x0 &&
                cx - 36 < x0 + w &&
                cy + 20 >= y0 &&
                cy - 20 < y0 + h
            ) {
                drawGroundTile(x, y)
            }
        }
    }
    const Lx = (wx(0, N - 1) - 16) * R,
        Ly = wy(0, N - 1) * R,
        Bx = wx(N - 1, N - 1) * R,
        By = (wy(N - 1, N - 1) + 8) * R,
        Rx = (wx(N - 1, 0) + 16) * R
    for (let px = Math.max(Lx, x0); px < Math.min(Rx, x0 + w); px++) {
        const left = px < Bx,
            ey = Math.floor(left ? Ly + (px - Lx) / 2 : By - (px - Bx) / 2)
        if (ey + 48 < y0 || ey >= y0 + h) {
            continue
        }
        for (let k = 0; k < 48; k++) {
            const py = ey + k
            if (py >= AH) {
                break
            }
            const hh = hsh(px, py, 12),
                band = vnoise(px / 16, k / 6, 13),
                root = hsh(px, 7, 17)
            let c
            if (k < 3) {
                c = k === 0 ? 0x3d6a2e : 0x2f5224
            } else if (k < 5 + root * 7 && hsh(px, 9, 17) < 0.3) {
                c = 0x3a2a1c
            } else {
                c =
                    k < 8 + band * 6
                        ? 0x56402b
                        : band > 0.55
                          ? hsh(px >> 2, k >> 1, 18) < 0.5
                              ? 0x79766d
                              : 0x6c695f
                          : 0x64492f
            }
            c = tw(
                c,
                (left ? 1 : 0.74) *
                    (hh < 0.2 ? 0.86 : hh > 0.95 ? 1.12 : 1) *
                    (1 - k * 0.007)
            )
            if (k >= 43) {
                c = hh < 0.5 ? 0x9cc8d4 : 0x6fa3b6
            }
            gput(px, py, c)
        }
    }
    return GV.gpainted ? tintBuf(GV.gbuf, w, h) : null
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
    return ch
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
export function gput(px?, py?, c?) {
    px -= GV.gbx
    py -= GV.gby
    if (px < 0 || py < 0 || px >= GV.gbw || py >= GV.gbh) {
        return
    }
    const j = (px + py * GV.gbw) * 4,
        q = grade((c >> 16) & 255, (c >> 8) & 255, c & 255)
    GV.gbuf[j] = q[0]
    GV.gbuf[j + 1] = q[1]
    GV.gbuf[j + 2] = q[2]
    GV.gbuf[j + 3] = 255
    GV.gpainted = 1
}
export function drawGroundTile(x?, y?) {
    const cx = wx(x, y) * R,
        cy = wy(x, y) * R,
        i = x + y * N,
        t = terrain[i]
    const isP = pathMap[i] === 1 && t !== 3
    const lk = isP
        ? [
              pathLink(x + 1, y),
              pathLink(x - 1, y),
              pathLink(x, y + 1),
              pathLink(x, y - 1),
          ]
        : null
    const wN = [
        isWater(x + 1, y),
        isWater(x - 1, y),
        isWater(x, y + 1),
        isWater(x, y - 1),
    ]
    const dug = GV.S.tmod[i] === 3
    const moatN = (k?) => {
        const nx = x + +(k === 0) - +(k === 1),
            ny = y + +(k === 2) - +(k === 3)
        return inMap(nx, ny) && GV.S.tmod[nx + ny * N] === 3
    }
    for (let r = 0; r < 32; r++) {
        const hw = r < 16 ? 2 * (r + 1) : 2 * (32 - r)
        for (let dx = -hw; dx < hw; dx++) {
            const px = cx + dx,
                py = cy - 16 + r
            const ddx = (dx + 0.5) / R,
                ddy = (r - 15.5) / R,
                u = ddx / 2 + ddy,
                v = ddy - ddx / 2
            const gx = x + u / 16,
                gy = y + v / 16,
                h = hsh(px, py, 1)
            let c
            if (t === 3) {
                const ed =
                    Math.min(
                        wN[0] ? 9 : 8 - u,
                        wN[1] ? 9 : 8 + u,
                        wN[2] ? 9 : 8 - v,
                        wN[3] ? 9 : 8 + v
                    ) +
                    (vnoise(gx * 5, gy * 5, 3) - 0.5) * 2
                if (ed < 1.1) {
                    c = dug
                        ? h < 0.3
                            ? 0x5f4b31
                            : 0x6e5739
                        : h < 0.2
                          ? 0xb3a26f
                          : 0xc4b27e
                } else if (ed < 1.7) {
                    c = h < 0.55 ? 0x8bbccb : 0x5f9db3
                } else if (ed < 2.9) {
                    c = h < 0.1 ? 0x5a9ab2 : 0x4a8aa3
                } else {
                    c = [0x255a7b, 0x2c6588, 0x347294][
                        Math.min(
                            2,
                            (vnoise(gx * 2.2, gy * 2.2, 4) * 2.4 + h * 0.7) | 0
                        )
                    ]
                    if (
                        (py + (px >> 3)) % 9 === 0 &&
                        hsh(px >> 3, py, 5) < 0.42
                    ) {
                        c = 0x5294b1
                    } else if (
                        (py + (px >> 3)) % 9 === 1 &&
                        hsh(px >> 3, py - 1, 5) < 0.42
                    ) {
                        c = 0x22506e
                    }
                }
            } else {
                const n1 = vnoise(gx / 4.5, gy / 4.5, 6),
                    n2 = vnoise(gx * 1.7, gy * 1.7, 14)
                const gi = Math.max(
                    0,
                    Math.min(
                        3,
                        (n1 * 2.3 + n2 * 0.9 + h * 0.9 - (t === 1 ? 0.9 : 0)) |
                            0
                    )
                )
                c = GRASS[gi]
                if (hsh(px, py, 30) < 0.07) {
                    c = tw(c, 0.74)
                } else if (hsh(px, py + 1, 30) < 0.07) {
                    c = tw(c, 1.17)
                } else if (hsh(px, py + 2, 30) < 0.035) {
                    c = tw(c, 1.08)
                } else if (h < 0.03) {
                    c = tw(c, 0.86)
                }
                if (t === 1 && hsh(px, py, 15) < 0.05) {
                    c = hsh(px, py, 16) < 0.5 ? 0x5a4a2e : 0x6b5532
                }
                if (t === 2 || t === 4) {
                    if (hsh(px >> 1, py >> 1, 7) < (t === 4 ? 0.5 : 0.3)) {
                        const sv = hsh(px >> 1, py >> 1, 8)
                        c = [0x8d8c84, 0x9f9d94, 0x7b7a72][(sv * 3) | 0]
                        if (
                            !(
                                hsh(px >> 1, (py - 1) >> 1, 7) <
                                (t === 4 ? 0.5 : 0.3)
                            ) &&
                            (py & 1) === 0
                        ) {
                            c = tw(c, 1.15)
                        }
                    }
                }
                if (isP) {
                    let pd = Math.hypot(u, v)
                    if (lk[0] && u > 0) {
                        pd = Math.min(pd, Math.abs(v))
                    }
                    if (lk[1] && u < 0) {
                        pd = Math.min(pd, Math.abs(v))
                    }
                    if (lk[2] && v > 0) {
                        pd = Math.min(pd, Math.abs(u))
                    }
                    if (lk[3] && v < 0) {
                        pd = Math.min(pd, Math.abs(u))
                    }
                    const w = 3.1 + (vnoise(gx * 3.3, gy * 3.3, 10) - 0.5) * 2.6
                    if (pd < w) {
                        c =
                            DIRT[
                                Math.min(
                                    2,
                                    (h * 2.1 +
                                        vnoise(gx * 4, gy * 4, 11) * 1.2) |
                                        0
                                )
                            ]
                        if (pd > w - 1) {
                            c = h < 0.5 ? 0x75633f : mix(c, GRASS[gi], 0.5)
                        } else if (Math.abs(pd - w * 0.45) < 0.28) {
                            c = tw(c, 0.86)
                        } else if (h < 0.025) {
                            c = 0xcbbf9e
                        } else if (h > 0.978) {
                            c = 0x6c5e44
                        } else if (hsh(px, py - 1, 1) < 0.025) {
                            c = tw(c, 0.8)
                        }
                    }
                }
                for (let k = 0; k < 4; k++) {
                    if (wN[k]) {
                        const e =
                            (k === 0
                                ? 8 - u
                                : k === 1
                                  ? 8 + u
                                  : k === 2
                                    ? 8 - v
                                    : 8 + v) +
                            (vnoise(gx * 5, gy * 5, 3) - 0.5) * 2
                        if (e < 2.2) {
                            c = moatN(k)
                                ? h < 0.4
                                    ? 0x725a36
                                    : 0x7f6640
                                : h < 0.3
                                  ? 0xb9a872
                                  : 0xc8b682
                        } else if (e < 2.7 && !moatN(k)) {
                            c = mix(c, 0xb9a872, 0.5)
                        }
                    }
                }
            }
            gput(px, py, c)
        }
    }
    if (t !== 3 && !isP && !wN[0] && !wN[1] && !wN[2] && !wN[3]) {
        const n = (hsh(x, y, 20) * 5.2) | 0,
            lush = vnoise(x / 3, y / 3, 9)
        for (let k = 0; k < n; k++) {
            const bx = cx - 18 + ((hsh(x * 7 + k, y, 21) * 36) | 0),
                by = cy - 6 + ((hsh(x, y * 7 + k, 22) * 12) | 0),
                kind = hsh(x + k * 3, y - k, 23)
            if (t === 2 || t === 4 || kind > 0.9) {
                const g = [0xa9a79c, 0x96948a][k & 1]
                gput(bx, by, g)
                gput(bx + 1, by, g)
                gput(bx + 2, by, tw(g, 0.85))
                gput(bx, by - 1, tw(g, 1.15))
                gput(bx + 1, by - 1, tw(g, 1.1))
                gput(bx, by + 1, 0x3c4a2e)
                gput(bx + 1, by + 1, 0x3c4a2e)
                gput(bx + 2, by + 1, 0x3c4a2e)
            } else if (t === 1 && kind > 0.8) {
                const cap = kind > 0.87 ? 0x8a3a2a : 0x9a7a52
                gput(bx, by, 0xd8cfb8)
                gput(bx, by - 1, 0xd8cfb8)
                gput(bx - 1, by - 2, cap)
                gput(bx, by - 2, tw(cap, 1.15))
                gput(bx + 1, by - 2, tw(cap, 0.8))
                gput(bx, by - 3, cap)
                if (kind > 0.87) {
                    gput(bx, by - 2, 0xe6dcc8)
                }
            } else if (t === 0 && kind > 0.62 && lush > 0.45) {
                const fc = [0xe8e4d4, 0xe2bf4a, 0xc85870, 0x9a6ad0, 0xe08a3c][
                    (hsh(x, y, 24) * 5) | 0
                ]
                for (const [ox, oy] of [
                    [0, 0],
                    [4, -1],
                    [-3, 2],
                ]) {
                    gput(bx + ox, by + oy, 0x34652c)
                    gput(bx + ox, by + oy - 1, 0x3c7230)
                    gput(bx + ox, by + oy - 2, fc)
                    gput(bx + ox + 1, by + oy - 2, tw(fc, 0.8))
                    gput(bx + ox, by + oy - 3, tw(fc, 1.12))
                }
            } else {
                const dk = t === 1 ? 0x2f5a26 : 0x3d7230,
                    lt = t === 1 ? 0x548a3a : 0x82b955
                gput(bx, by, dk)
                gput(bx, by - 1, dk)
                gput(bx, by - 2, lt)
                gput(bx - 1, by, dk)
                gput(bx - 2, by - 1, dk)
                gput(bx - 2, by - 2, lt)
                gput(bx + 1, by, dk)
                gput(bx + 2, by - 1, dk)
                gput(bx + 3, by - 2, lt)
                gput(bx + 1, by - 2, dk)
                gput(bx + 1, by - 3, lt)
            }
        }
    }
}
export function drawGroundAll() {
    if (!GV.gcv) {
        return
    }
    GV.gcv.clear()
    GV.vcv.clear()
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
    const d = ch.im.data
    d.fill(0)
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const cx = wx(x, y),
                cy = wy(x, y)
            if (
                cx + 16 < x0 ||
                cx - 16 >= x0 + S2 ||
                cy + 8 < y0 ||
                cy - 8 >= y0 + S2
            ) {
                continue
            }
            const rg = GV.regs[reg[x + y * N]]
            if (rg.disc && rg.owner === 0) {
                continue
            }
            const fog = !rg.disc
            let edge = false
            if (fog) {
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
            const fc = rg.owner > 0 ? FCOL[rg.owner] : 0x0a0e16,
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
                    const j2 = (lx + ly * S2) * 4
                    if (fog) {
                        const n = vnoise(px / 14, py / 9, 40),
                            n2 = vnoise(px / 5, py / 4, 41),
                            v = 14 + n * 18 + n2 * 6
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
        }
    }
    ch.g.putImageData(ch.im, 0, 0)
    ch.gen = GV.veilGen
    return ch
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
export function groundChunk(i?, j?, budget?) {
    let ch = GV.gcv.get(i + j * CW)
    if (!ch || (ch.gen !== GV.groundGen && budget.left())) {
        ch = makeChunk(i, j)
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
        GV.vcv.delete(old[k][0])
    }
}
export function prefetchChunks(gx0?, gy0?, gx1?, gy1?, budget?) {
    const m = VCH
    eachChunk(gx0 - m, gy0 - m, gx1 + m, gy1 + m, (i?, j?) => {
        if (!GV.gcv.has(i + j * CW) && budget.left()) {
            makeChunk(i, j).used = GV.chunkUse
        }
    })
}
