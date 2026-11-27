/*
 * The ground painter. Pure: it reads only what setPaintData gives it and the
 * noise functions, so it runs the same on the main thread and in the workers
 * of groundworker.ts, which paint whole chunks off the main thread.
 */
import { grade, hsh, mix, tw, vnoise } from './noise'

export const GRASS = [0x4a7f35, 0x548a3a, 0x5e9540, 0x699f47],
    DIRT = [0x8f744d, 0x9d8158, 0xab8f64]
/* What the painter reads. terrain, pathMap: as in state.ts. link: true where
   a path reaches the tile (a path, or one of your buildings on a path). moat:
   true where a moat was dug. Arrays (in a worker) or functions. */
export type PaintData = {
    N: number
    OX: number
    OY: number
    R: number
    AH: number
    season: number
    terrain: Uint8Array
    pathMap: Uint8Array
    link: Uint8Array | ((i: number) => boolean)
    moat: Uint8Array | ((i: number) => boolean)
}
let P: any = null,
    N = 0,
    OX = 0,
    OY = 0,
    R = 2,
    AH = 0,
    season = 0
let gbuf = new Uint8ClampedArray(0),
    gbx = 0,
    gby = 0,
    gbw = 0,
    gbh = 0,
    gpainted = 0
export function setPaintData(d?: PaintData) {
    N = d.N
    OX = d.OX
    OY = d.OY
    R = d.R
    AH = d.AH
    season = d.season < 0 ? 0 : d.season
    const link = d.link,
        moat = d.moat
    P = {
        terrain: d.terrain,
        pathMap: d.pathMap,
        link: typeof link === 'function' ? link : (i?) => link[i] === 1,
        moat: typeof moat === 'function' ? moat : (i?) => moat[i] === 1,
    }
}
const wx = (x?, y?) => OX + (x - y) * 16,
    wy = (x?, y?) => OY + (x + y) * 8,
    inMap = (x?, y?) => x >= 0 && y >= 0 && x < N && y < N,
    isWater = (x?, y?) => inMap(x, y) && P.terrain[x + y * N] === 3,
    linkAt = (x?, y?) => inMap(x, y) && P.link(x + y * N)
/* Every tile whose centre lies in a rectangle of world pixels, row by row. */
function eachTileIn(px0?, py0?, px1?, py1?, fn?) {
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
/* Season tint of an untinted ground buffer, into new image data. */
export function tintBuf(src?, w?, h?) {
    const s = season < 0 ? 0 : season,
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
    if (gbuf.length < w * h * 4) {
        gbuf = new Uint8ClampedArray(w * h * 4)
    } else {
        gbuf.fill(0, 0, w * h * 4)
    }
    gbx = x0
    gby = y0
    gbw = w
    gbh = h
    gpainted = 0
    eachTileIn(
        (x0 - 36) / R,
        (y0 - 20) / R,
        (x0 + w + 36) / R,
        (y0 + h + 20) / R,
        drawGroundTile
    )
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
    return gpainted ? tintBuf(gbuf, w, h) : null
}
export function gput(px?, py?, c?) {
    px -= gbx
    py -= gby
    if (px < 0 || py < 0 || px >= gbw || py >= gbh) {
        return
    }
    const j = (px + py * gbw) * 4,
        q = grade((c >> 16) & 255, (c >> 8) & 255, c & 255)
    gbuf[j] = q[0]
    gbuf[j + 1] = q[1]
    gbuf[j + 2] = q[2]
    gbuf[j + 3] = 255
    gpainted = 1
}
export function drawGroundTile(x?, y?) {
    const cx = wx(x, y) * R,
        cy = wy(x, y) * R,
        i = x + y * N,
        t = P.terrain[i]
    const isP = P.pathMap[i] === 1 && t !== 3
    const lk = isP
        ? [
              linkAt(x + 1, y),
              linkAt(x - 1, y),
              linkAt(x, y + 1),
              linkAt(x, y - 1),
          ]
        : null
    const wN = [
        isWater(x + 1, y),
        isWater(x - 1, y),
        isWater(x, y + 1),
        isWater(x, y - 1),
    ]
    const dug = P.moat(i)
    const moatN = (k?) => {
        const nx = x + +(k === 0) - +(k === 1),
            ny = y + +(k === 2) - +(k === 3)
        return inMap(nx, ny) && P.moat(nx + ny * N)
    }
    // Only the rows and columns inside the buffer: a band of a chunk crosses
    // only part of each tile, and every pixel costs several noise lookups.
    const r0 = Math.max(0, gby - (cy - 16)),
        r1 = Math.min(32, gby + gbh - (cy - 16))
    for (let r = r0; r < r1; r++) {
        const hw = r < 16 ? 2 * (r + 1) : 2 * (32 - r),
            dx1 = Math.min(hw, gbx + gbw - cx)
        for (let dx = Math.max(-hw, gbx - cx); dx < dx1; dx++) {
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
                // Blades of grass: short upright strokes, dark at the root
                // and light at the tip, a little denser where it is lush.
                // One hash gives both the chance of a blade and its offset.
                const bh = hsh(px, py >> 2, 31),
                    ph = (py & 3) + ((bh * 4096) & 3)
                if (bh < 0.13 + n1 * 0.06 && (ph & 3) < 3) {
                    c = tw(
                        c,
                        (ph & 3) === 0 ? 1.16 : (ph & 3) === 1 ? 0.98 : 0.8
                    )
                } else if (hsh(px, py, 30) < 0.05) {
                    c = tw(c, 0.76)
                } else if (hsh(px, py + 1, 30) < 0.04) {
                    c = tw(c, 1.14)
                } else if (h < 0.03) {
                    c = tw(c, 0.86)
                }
                // Soft patches of clover and of drier grass.
                const pt = n2
                if (t === 0 && pt > 0.72 && hsh(px >> 1, py >> 1, 33) < 0.45) {
                    c = tw(c, 1.07)
                } else if (
                    t === 0 &&
                    pt < 0.2 &&
                    hsh(px >> 1, py >> 1, 34) < 0.35
                ) {
                    c = mix(c, 0x9a9a4a, 0.22)
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
                        } else if (hsh(px >> 1, py >> 1, 35) < 0.05) {
                            // Stones trodden into the road, lit on top.
                            const top = !(
                                hsh(px >> 1, (py - 1) >> 1, 35) < 0.05
                            )
                            c = top && (py & 1) === 0 ? 0xb4ab96 : 0x8f8672
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
