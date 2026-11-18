import { DEF, FCOL } from './config'
import { C, grade, hsh, tw } from './noise'
import { GV } from './vars'

export const R = 2,
    SS = 0.5 / R
export const LL = 0.95,
    LR = 0.72,
    LT = 1.12
GV.cur = null
export function Sp(size?) {
    const w = (size === 2 ? 76 : 40) * R,
        h = (size === 2 ? 112 : 72) * R
    return (GV.cur = {
        w,
        h,
        ox: w / 2,
        oy: (size === 2 ? 74 : 58) * R,
        size,
        swap: false,
        snow: false,
        px: new Uint8ClampedArray(w * h * 4),
        zb: new Float32Array(w * h).fill(-1e9),
        fl: new Uint8Array(w * h),
        tid: new Uint8Array(w * h),
    })
}
export function plot(X?, Y?, Z?, c?, l?, bias?) {
    if (c < 0 || Z < -0.05) {
        return
    }
    if (GV.cur.swap) {
        const t = X
        X = Y
        Y = t
        if (l === LL) {
            l = LR
        } else if (l === LR) {
            l = LL
        }
    }
    if (
        GV.cur.snow &&
        Z > 0.5 &&
        (l > 1.05 || (l === 0.98 && hsh((X * 4) | 0, (Y * 4) | 0, 97) < 0.5))
    ) {
        c = hsh((X * 5) | 0, (Y * 5) | 0, 98) < 0.15 ? 0xd3dde6 : 0xeef3f7
        l = l > 1.05 ? 1 : 0.92
    }
    const sx = Math.floor(GV.cur.ox + (X - Y) * R),
        sy = Math.floor(GV.cur.oy + ((X + Y) / 2 - Z) * R)
    if (sx < 0 || sy < 0 || sx >= GV.cur.w || sy >= GV.cur.h) {
        return
    }
    const i = sx + sy * GV.cur.w,
        d = X + Y + Z + (bias || 0)
    if (d < GV.cur.zb[i]) {
        return
    }
    GV.cur.zb[i] = d
    if (l < 1 && Z < 2.4) {
        l *= 0.8 + 0.083 * Z
    }
    let r = ((c >> 16) & 255) * l,
        g = ((c >> 8) & 255) * l,
        b = (c & 255) * l
    if (l < 0.86) {
        r *= 0.92
        g *= 0.97
        b *= 1.08
    } else if (l > 1.05) {
        r *= 1.04
        b *= 0.94
    }
    const q = grade(r, g, b),
        j = i * 4
    GV.cur.px[j] = q[0]
    GV.cur.px[j + 1] = q[1]
    GV.cur.px[j + 2] = q[2]
    GV.cur.px[j + 3] = 255
    GV.cur.fl[i] =
        GV.cur.size === 1 && (Math.abs(X) > 7.4 || Math.abs(Y) > 7.4) ? 1 : 0
    if (GV.cur.size === 2) {
        GV.cur.tid[i] = (X >= 8 ? 1 : 0) + (Y >= 8 ? 2 : 0)
    }
}
export function surf(p?, du?, dv?, nu?, nv?, tex?, light?, bias?) {
    const cu = Math.ceil(nu),
        cvv = Math.ceil(nv),
        NU = Math.ceil(nu * R - 0.01),
        NV = Math.ceil(nv * R - 0.01)
    for (let u = SS / 2; u < nu; u += SS) {
        for (let v = SS / 2; v < nv; v += SS) {
            plot(
                p[0] + du[0] * u + dv[0] * v,
                p[1] + du[1] * u + dv[1] * v,
                p[2] + du[2] * u + dv[2] * v,
                tex(u | 0, v | 0, cu, cvv, (u * R) | 0, (v * R) | 0, NU, NV),
                light,
                bias
            )
        }
    }
}
export function box(x0?, y0?, x1?, y1?, z0?, z1?, side?, top?) {
    surf([x0, y1, z0], [1, 0, 0], [0, 0, 1], x1 - x0, z1 - z0, side, LL)
    surf([x1, y1, z0], [0, -1, 0], [0, 0, 1], y1 - y0, z1 - z0, side, LR)
    surf([x0, y0, z1], [1, 0, 0], [0, 1, 0], x1 - x0, y1 - y0, top || side, LT)
    return {
        L: (u?, v?, w?, h?, t?) =>
            surf(
                [x0 + u, y1 + 0.05, z0 + v],
                [1, 0, 0],
                [0, 0, 1],
                w,
                h,
                t,
                LL,
                0.5
            ),
        R: (u?, v?, w?, h?, t?) =>
            surf(
                [x1 + 0.05, y1 - u, z0 + v],
                [0, -1, 0],
                [0, 0, 1],
                w,
                h,
                t,
                LR,
                0.5
            ),
    }
}
export function gable(x0?, y0?, x1?, y1?, z0?, h?, tex?, gtex?, axis?, inset?) {
    inset = inset || 0
    if (axis === 'x') {
        const half = (y1 - y0) / 2,
            L = Math.hypot(half, h),
            ym = (y0 + y1) / 2
        surf(
            [x0, y1, z0],
            [1, 0, 0],
            [0, -half / L, h / L],
            x1 - x0,
            L,
            tex,
            0.98
        )
        surf(
            [x0, y0, z0],
            [1, 0, 0],
            [0, half / L, h / L],
            x1 - x0,
            L,
            tex,
            1.16
        )
        if (gtex) {
            for (let y = y0 + inset + SS / 2; y < y1 - inset; y += SS) {
                const top = h * (1 - Math.abs(y - ym) / half)
                for (let z = SS / 2; z < top; z += SS) {
                    plot(
                        x1 - inset,
                        y,
                        z0 + z,
                        gtex(
                            (y1 - y) | 0,
                            z | 0,
                            16,
                            16,
                            ((y1 - y) * R) | 0,
                            (z * R) | 0,
                            32,
                            32
                        ),
                        LR
                    )
                }
            }
        }
    } else {
        const half = (x1 - x0) / 2,
            L = Math.hypot(half, h),
            xm = (x0 + x1) / 2
        surf(
            [x1, y0, z0],
            [0, 1, 0],
            [-half / L, 0, h / L],
            y1 - y0,
            L,
            tex,
            0.76
        )
        surf(
            [x0, y0, z0],
            [0, 1, 0],
            [half / L, 0, h / L],
            y1 - y0,
            L,
            tex,
            1.12
        )
        if (gtex) {
            for (let x = x0 + inset + SS / 2; x < x1 - inset; x += SS) {
                const top = h * (1 - Math.abs(x - xm) / half)
                for (let z = SS / 2; z < top; z += SS) {
                    plot(
                        x,
                        y1 - inset,
                        z0 + z,
                        gtex(
                            (x - x0) | 0,
                            z | 0,
                            16,
                            16,
                            ((x - x0) * R) | 0,
                            (z * R) | 0,
                            32,
                            32
                        ),
                        LL
                    )
                }
            }
        }
    }
}
export function pyramid(x0?, y0?, x1?, y1?, z0?, h?, tex?) {
    const ax = (x0 + x1) / 2,
        ay = (y0 + y1) / 2
    const f = (px?, py?, qx?, qy?, light?) => {
        const len = Math.hypot(qx - px, qy - py),
            sl = Math.hypot(h, len / 2)
        for (let t = SS / 2; t < len; t += SS) {
            for (let s = SS / 2; s < sl; s += SS) {
                const k = s / sl,
                    ex = px + ((qx - px) * t) / len,
                    ey = py + ((qy - py) * t) / len
                plot(
                    ex + (ax - ex) * k,
                    ey + (ay - ey) * k,
                    z0 + h * k,
                    tex(t | 0, s | 0, 0, 0, (t * R) | 0, (s * R) | 0),
                    light
                )
            }
        }
    }
    f(x0, y0, x1, y0, 1.16)
    f(x0, y1, x0, y0, 1.1)
    f(x0, y1, x1, y1, 0.98)
    f(x1, y1, x1, y0, 0.76)
}
export const quant = (l?) => Math.round(l * 14) / 14
export const cylLight = (a?) =>
    quant(
        0.56 + 0.38 * Math.max(0, Math.sin(a)) + 0.14 * Math.max(0, Math.cos(a))
    )
export function cyl(cx?, cy?, r?, z0?, z1?, tex?, top?) {
    const st = 0.45 / r / R
    for (let a = 0; a < 6.2832; a += st) {
        const l = cylLight(a),
            x = cx + r * Math.cos(a),
            y = cy + r * Math.sin(a),
            u = (a * r) | 0,
            U = (a * r * R) | 0
        for (let z = SS / 2; z < z1 - z0; z += SS) {
            plot(x, y, z0 + z, tex(u, z | 0, 0, 0, U, (z * R) | 0), l)
        }
    }
    const tt = top || tex
    for (let x = -r; x <= r; x += SS) {
        for (let y = -r; y <= r; y += SS) {
            if (x * x + y * y <= r * r) {
                plot(
                    cx + x,
                    cy + y,
                    z1,
                    tt(
                        (x + r) | 0,
                        (y + r) | 0,
                        0,
                        0,
                        ((x + r) * R) | 0,
                        ((y + r) * R) | 0
                    ),
                    LT
                )
            }
        }
    }
}
export function cone(cx?, cy?, r?, z0?, h?, tex?) {
    const st = 0.45 / r / R,
        sl = Math.hypot(r, h)
    for (let a = 0; a < 6.2832; a += st) {
        const l = quant(cylLight(a) + 0.06),
            ca = Math.cos(a),
            sa = Math.sin(a),
            u = (a * r) | 0,
            U = (a * r * R) | 0
        for (let s = SS / 2; s < sl; s += SS) {
            const k = s / sl,
                rr = r * (1 - k)
            plot(
                cx + rr * ca,
                cy + rr * sa,
                z0 + h * k,
                tex(u, s | 0, 0, 0, U, (s * R) | 0),
                l
            )
        }
    }
}
export function blob(cx?, cy?, cz?, r?, rz?, tex?) {
    const st = 0.5 / r / R
    for (let b = -1.57; b <= 1.57; b += st) {
        const cb = Math.cos(b),
            sb = Math.sin(b)
        for (let a = 0; a < 6.2832; a += st / Math.max(0.2, cb)) {
            const nx = cb * Math.cos(a),
                ny = cb * Math.sin(a)
            plot(
                cx + r * nx,
                cy + r * ny,
                cz + rz * sb,
                tex(
                    (a * r) | 0,
                    ((b + 1.6) * r) | 0,
                    0,
                    0,
                    (a * r * R) | 0,
                    ((b + 1.6) * r * R) | 0
                ),
                quant(0.64 + 0.32 * sb + 0.2 * ny - 0.14 * nx)
            )
        }
    }
}
export function line3(a?, b?, c?, l?, thick?) {
    const n = Math.ceil(
        Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 2 * R
    )
    for (let i = 0; i <= n; i++) {
        const k = i / n,
            x = a[0] + (b[0] - a[0]) * k,
            y = a[1] + (b[1] - a[1]) * k,
            z = a[2] + (b[2] - a[2]) * k
        plot(x, y, z, c, l || 1, 0.3)
        if (thick) {
            plot(x, y, z + 0.3, tw(c, 1.12), l || 1, 0.3)
            plot(x, y, z + 0.55, c, l || 1, 0.3)
        }
    }
}
export function shadow(x0?, y0?, x1?, y1?) {
    for (let x = x0; x < x1; x += SS) {
        for (let y = y0; y < y1; y += SS) {
            let X = x + 1.5,
                Y = y - 1.5
            if (GV.cur.swap) {
                const t = X
                X = Y
                Y = t
            }
            const sx = Math.floor(GV.cur.ox + (X - Y) * R),
                sy = Math.floor(GV.cur.oy + ((X + Y) / 2) * R)
            if (sx < 0 || sy < 0 || sx >= GV.cur.w || sy >= GV.cur.h) {
                continue
            }
            const i = sx + sy * GV.cur.w
            if (GV.cur.zb[i] > -1e8) {
                continue
            }
            const edge =
                x < x0 + 0.6 || y > y1 - 0.6 || x > x1 - 0.6 || y < y0 + 0.6
            GV.cur.zb[i] = -1e6
            GV.cur.px[i * 4] = 12
            GV.cur.px[i * 4 + 1] = 18
            GV.cur.px[i * 4 + 2] = 26
            GV.cur.px[i * 4 + 3] = edge ? 50 : 88
            if (GV.cur.size === 2) {
                GV.cur.tid[i] = (X >= 8 ? 1 : 0) + (Y >= 8 ? 2 : 0)
            }
        }
    }
}
export function flag(x?, y?, z0?, h?, col?, frame?, trim?) {
    for (let z = 0; z < h; z += SS) {
        plot(x, y, z0 + z, 0x4a3828, 1, 0.2)
        plot(x + 0.25, y, z0 + z, 0x6b5238, 1, 0.2)
    }
    plot(x, y, z0 + h, C.gold, 1, 0.2)
    plot(x, y, z0 + h + 0.25, tw(C.gold, 1.2), 1, 0.2)
    for (let u = 0; u < 7; u += SS) {
        for (let v = 0; v < 4.5; v += SS) {
            const ph = (u + frame * 2.4) * 0.9,
                wv = Math.round(Math.sin(ph) * 0.9 * (u / 7) * R) / R
            if (u > 5 && Math.abs(v - 2.25) < (u - 5) * 1.1) {
                continue
            }
            const l =
                v < 0.5 ? 0.72 : quant(0.9 + 0.16 * Math.cos(ph) * (u / 7))
            plot(
                x + 0.6 + u,
                y,
                z0 + h - 5 + v + wv,
                trim && v >= 2 && v < 2.75 ? trim : col,
                l,
                0.2
            )
        }
    }
}
export function toCanvas(w?, h?, px?) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d'),
        im = g.createImageData(w, h)
    im.data.set(px)
    g.putImageData(im, 0, 0)
    return c
}
export function finish() {
    const s = GV.cur,
        w = s.w,
        h = s.h,
        px = s.px,
        edge = new Uint8Array(w * h)
    const op = (i?) => px[i * 4 + 3] === 255
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = x + y * w
            if (!op(i) || s.fl[i]) {
                continue
            }
            if (
                x === 0 ||
                y === 0 ||
                x === w - 1 ||
                y === h - 1 ||
                !op(i - 1) ||
                !op(i + 1) ||
                !op(i - w) ||
                !op(i + w)
            ) {
                edge[i] = 1
            }
        }
    }
    for (let y = 2; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = x + y * w
            if (op(i) && !edge[i] && edge[i - w] && !op(i - 2 * w)) {
                px[i * 4] = Math.min(255, px[i * 4] * 1.16 + 6)
                px[i * 4 + 1] = Math.min(255, px[i * 4 + 1] * 1.14 + 6)
                px[i * 4 + 2] = Math.min(255, px[i * 4 + 2] * 1.1 + 4)
            }
        }
    }
    for (let i = 0; i < w * h; i++) {
        if (edge[i]) {
            px[i * 4] *= 0.38
            px[i * 4 + 1] *= 0.38
            px[i * 4 + 2] *= 0.46
        }
    }
    if (s.size === 1) {
        return {
            ox: s.ox,
            oy: s.oy,
            parts: [{ cv: toCanvas(w, h, px), dx: 0, dy: 0 }],
        }
    }
    const parts = []
    for (let k = 0; k < 4; k++) {
        const p = new Uint8ClampedArray(w * h * 4)
        let any = false
        for (let i = 0; i < w * h; i++) {
            if (px[i * 4 + 3] && s.tid[i] === k) {
                p[i * 4] = px[i * 4]
                p[i * 4 + 1] = px[i * 4 + 1]
                p[i * 4 + 2] = px[i * 4 + 2]
                p[i * 4 + 3] = px[i * 4 + 3]
                any = true
            }
        }
        if (any) {
            parts.push({ cv: toCanvas(w, h, p), dx: k & 1, dy: k >> 1 })
        }
    }
    return { ox: s.ox, oy: s.oy, parts, full: toCanvas(w, h, px) }
}
/* ---------- textures (u, v in world units; U, V in texels) ---------- */
export const TX = {
    flat: (c?) => () => c,
    speck: (c?, s?) => (u?, v?, nu?, nv?, U?, V?) => {
        const h = hsh(U, V, s),
            h2 = hsh(U >> 1, V >> 1, s + 1)
        return tw(
            c,
            (h < 0.12 ? 0.86 : h > 0.91 ? 1.1 : 1) * (h2 < 0.2 ? 0.94 : 1)
        )
    },
    stone:
        (c?, s?) =>
        (u?, v?, nu?, nv?, U?, V?, ..._rest) => {
            const row = (V / 5) | 0,
                rv = V % 5,
                uu = U + (row & 1) * 5,
                cu = uu % 10
            if (rv === 0 || cu === 0) {
                return tw(c, hsh(U, V, s + 7) < 0.3 ? 0.55 : 0.62)
            }
            const hb = hsh((uu / 10) | 0, row, s),
                n = hsh(U, V, s + 3)
            if (n > 0.987) {
                return tw(0x5c6e44, 0.95)
            }
            let f = hb < 0.22 ? 0.86 : hb > 0.78 ? 1.08 : hb > 0.6 ? 1.02 : 0.96
            if (rv === 4 || cu === 1) {
                f *= 1.12
            } else if (rv === 1 || cu === 9) {
                f *= 0.86
            }
            if (n < 0.07) {
                f *= 0.88
            }
            return tw(c, f)
        },
    brick: (c?, s?) => (u?, v?, nu?, nv?, U?, V?) => {
        const row = (V / 3) | 0,
            rv = V % 3,
            uu = U + (row & 1) * 3
        if (rv === 0 || uu % 6 === 0) {
            return tw(c, 0.58)
        }
        const hb = hsh((uu / 6) | 0, row, s)
        return tw(
            c,
            (rv === 2 ? 1.08 : 0.94) * (hb < 0.3 ? 0.86 : hb > 0.8 ? 1.06 : 1)
        )
    },
    plank: (c?, s?) => (u?, v?, nu?, nv?, U?, V?) => {
        const bd = (U / 4) | 0,
            x = U % 4
        if (x === 0) {
            return tw(c, 0.58)
        }
        const tone =
                hsh(bd, 3, s) < 0.35 ? 0.88 : hsh(bd, 4, s) > 0.8 ? 1.07 : 1,
            g = hsh(U, (V / 3) | 0, s + 1)
        if (hsh(U, V, s + 2) < 0.008) {
            return tw(c, 0.62)
        }
        return tw(
            c,
            tone * (x === 1 ? 1.08 : x === 3 ? 0.9 : 1) * (g < 0.2 ? 0.9 : 1)
        )
    },
    hplank: (c?, s?) => (u?, v?, nu?, nv?, U?, V?) => {
        const bd = (V / 4) | 0,
            y = V % 4
        if (y === 0) {
            return tw(c, 0.58)
        }
        const tone =
                hsh(bd, 3, s) < 0.35 ? 0.88 : hsh(bd, 4, s) > 0.8 ? 1.07 : 1,
            g = hsh((U / 3) | 0, V, s + 1)
        return tw(
            c,
            tone * (y === 3 ? 1.08 : y === 1 ? 0.9 : 1) * (g < 0.2 ? 0.9 : 1)
        )
    },
    logs: (c?) => (u?, v?, nu?, nv?, U?, V?) => {
        const y = V % 5
        if (hsh(U, V, 61) < 0.05) {
            return tw(c, 0.72)
        }
        return tw(c, [0.58, 0.84, 1.02, 1.13, 0.96][y])
    },
    timber: (c?, b?, s?) => (u?, v?, nu?, nv?, U?, V?, NU?, NV?) => {
        const m = NV >> 1,
            mu = NU >> 1
        if (
            V >= NV - 2 ||
            U <= 1 ||
            U >= NU - 2 ||
            V === m ||
            V === m - 1 ||
            U === mu ||
            U === mu - 1
        ) {
            return V === NV - 1 || U === 0 || U === NU - 1 ? tw(b, 0.8) : b
        }
        if (V < m - 1) {
            const pw = mu - 2,
                t = (U < mu ? U - 2 : U - mu - 1) / Math.max(1, pw),
                k = V / Math.max(1, m - 1)
            if (
                Math.abs(t - (U < mu ? k : 1 - k)) <
                0.5 / Math.max(1, pw) + 0.06
            ) {
                return b
            }
        }
        const n = hsh(U, V, s)
        return tw(
            c,
            (n < 0.08 ? 0.9 : n > 0.96 ? 1.05 : 1) * (V < 3 ? 0.88 : 1)
        )
    },
    thatch: (c?, s?) => (u?, v?, nu?, nv?, U?, V?) => {
        if (V < 2) {
            return tw(c, V === 0 ? 0.48 : 0.66)
        }
        const rv = V % 4,
            st = hsh(U, (V / 4) | 0, s),
            fine = hsh(U, V, s + 5)
        let f = st < 0.25 ? 0.82 : st > 0.8 ? 1.1 : 1
        if (rv === 0) {
            f *= 0.78
        } else if (rv === 3) {
            f *= 1.06
        }
        if (fine < 0.12) {
            f *= 0.88
        }
        return tw(c, f)
    },
    shingle: (c?, s?) => (u?, v?, nu?, nv?, U?, V?) => {
        const row = (V / 3) | 0,
            rv = V % 3,
            uu = U + (row & 1) * 2
        if (rv === 0) {
            return tw(c, 0.64)
        }
        if (uu % 4 === 0) {
            return tw(c, 0.8)
        }
        const hb = hsh((uu / 4) | 0, row, s)
        return tw(
            c,
            (rv === 2 ? 1.09 : 0.97) * (hb < 0.25 ? 0.88 : hb > 0.82 ? 1.1 : 1)
        )
    },
    leaf: (c?, s?) => (u?, v?, nu?, nv?, U?, V?) => {
        const cl = hsh(U >> 1, V >> 1, s),
            f = hsh(U, V, s + 3)
        return tw(
            c,
            (cl < 0.3 ? 0.78 : cl > 0.82 ? 1.16 : 1) *
                (f < 0.14 ? 0.88 : f > 0.94 ? 1.12 : 1)
        )
    },
    door: (w?, h?, c?) => (u?, v?, nu?, nv?, U?, V?, NU?, NV?) => {
        const base = c || C.woodD
        if (U === 0 || U === NU - 1 || V === NV - 1) {
            return C.dark
        }
        if (V === NV - 2 && (U === 1 || U === NU - 2)) {
            return C.dark
        }
        if (V === 2 || V === NV - 4) {
            return U % 3 === 1 ? 0x77777c : 0x3b3a3e
        }
        if (U === NU - 3 && V === ((NV * 0.45) | 0)) {
            return C.gold
        }
        return tw(base, (U % 2 ? 1 : 0.82) * (hsh(U, V, 63) < 0.15 ? 0.9 : 1))
    },
    win: (lit?) => (u?, v?, nu?, nv?, U?, V?, NU?, NV?) => {
        if (U === 0 || U === NU - 1 || V === NV - 1) {
            return C.beam
        }
        if (V === 0) {
            return 0x8c8a82
        }
        if (U === NU >> 1 || V === NV >> 1) {
            return tw(C.beam, 1.15)
        }
        if (lit) {
            const cx = (NU - 1) / 2,
                cy = (NV - 1) / 2
            return Math.hypot(U - cx, V - cy) < 1.3 ? 0xffe6a0 : 0xf0b54c
        }
        return U === 1 && V === NV - 2 ? 0x5e7a8e : 0x26323f
    },
    stripe: (a?, b?) => (u?, v?, nu?, nv?, U?, V?) => {
        const s = ((U / 3) | 0) & 1
        return tw(s ? a : b, V % 6 === 0 ? 0.82 : 1)
    },
}
/* ---------- building recipes ---------- */
export function crenRect(x0?, y0?, x1?, y1?, z?, tex?) {
    for (let x = x0; x < x1 - 1; x += 4) {
        box(x, y0, x + 2, y0 + 1.4, z, z + 2.5, tex)
        box(x, y1 - 1.4, x + 2, y1, z, z + 2.5, tex)
    }
    for (let y = y0 + 4; y < y1 - 3; y += 4) {
        box(x0, y, x0 + 1.4, y + 2, z, z + 2.5, tex)
        box(x1 - 1.4, y, x1, y + 2, z, z + 2.5, tex)
    }
}
export function wallArms(m?, H?, st?, top?, r?) {
    const seg = (a?, b?, c?, d?) => box(a, b, c, d, 0, H, st, top)
    const mx = (a?, b?, y?) => {
        for (let x = -8; x < 8; x += 4) {
            if (x + 1 >= a && x + 3 <= b) {
                box(x + 1, y, x + 3, y + 1.2, H, H + 2.5, st)
            }
        }
    }
    const my = (a?, b?, x?) => {
        for (let y = -8; y < 8; y += 4) {
            if (y + 1 >= a && y + 3 <= b) {
                box(x, y + 1, x + 1.2, y + 3, H, H + 2.5, st)
            }
        }
    }
    if (m & 8) {
        seg(-3, -8, 3, -r)
        my(-8, -r, -3)
        my(-8, -r, 1.8)
    }
    if (m & 2) {
        seg(-8, -3, -r, 3)
        mx(-8, -r, -3)
        mx(-8, -r, 1.8)
    }
    if (m & 1) {
        seg(r, -3, 8, 3)
        mx(r, 8, -3)
        mx(r, 8, 1.8)
    }
    if (m & 4) {
        seg(-3, r, 3, 8)
        my(r, 8, -3)
        my(r, 8, 1.8)
    }
    return { mx, my }
}
export function recipe(t?, o?) {
    const st = TX.stone(C.stone, 1),
        st2 = TX.stone(C.stone2, 2),
        stTop = TX.speck(tw(C.stone, 0.92), 3)
    const plank = TX.plank(C.wood, 4),
        plankD = TX.plank(C.woodD, 5),
        logs = TX.logs(C.wood)
    const f = o.f || 0,
        m = o.m || 0,
        FC = FCOL[o.c || 0]
    switch (t) {
        case 'keep': {
            const tier = o.tier || 1
            shadow(-7, -7, 23, 23)
            if (tier === 1) {
                const b = box(-5, -5, 21, 21, 0, 9, logs)
                b.L(10, 0, 6, 7, TX.door(6, 7))
                b.L(3, 4, 3, 3, TX.win(1))
                b.L(20, 4, 3, 3, TX.win(1))
                b.R(5, 4, 3, 3, TX.win(1))
                b.R(17, 4, 3, 3, TX.win(1))
                gable(
                    -6.5,
                    -6.5,
                    22.5,
                    22.5,
                    8.5,
                    11,
                    TX.thatch(C.thatch, 6),
                    TX.plank(C.woodD, 7),
                    'x',
                    1.5
                )
                box(12, -4, 18, 2, 9, 24, plank)
                pyramid(11, -5, 19, 3, 24, 6, TX.thatch(C.thatch, 8))
                flag(15, -1, 30, 9, FC, f, C.gold)
            } else {
                const H = tier === 2 ? 16 : 19,
                    TH = tier === 2 ? 14 : 20,
                    TR = tier === 2 ? 21 : 26
                const b = box(-6, -6, 22, 22, 0, H, st, stTop)
                b.L(11, 0, 6, 9, TX.door(6, 9))
                b.L(4, 7, 1, 4, TX.flat(C.dark))
                b.L(23, 7, 1, 4, TX.flat(C.dark))
                b.R(5, 7, 1, 4, TX.flat(C.dark))
                b.R(22, 7, 1, 4, TX.flat(C.dark))
                b.L(18.5, 6, 3, 7, (u?, v?) =>
                    v === 0 && u !== 1
                        ? -1
                        : u === 1 && v > 2 && v < 5
                          ? C.gold
                          : FC
                )
                b.R(12, 6, 3, 7, (u?, v?) =>
                    v === 0 && u !== 1
                        ? -1
                        : u === 1 && v > 2 && v < 5
                          ? C.gold
                          : FC
                )
                crenRect(-6, -6, 22, 22, H, st)
                for (const [cx, cy] of [
                    [-5, -5],
                    [21, -5],
                    [-5, 21],
                    [21, 21],
                ]) {
                    cyl(cx, cy, 3.6, 0, TR, st, stTop)
                    cyl(cx, cy, 4.3, TR, TR + 2, st2, stTop)
                    if (tier === 3) {
                        cone(cx, cy, 4.8, TR + 2, 8, TX.shingle(FC, 9))
                    } else {
                        for (let k = 0; k < 6; k++) {
                            const a = k * 1.047
                            box(
                                cx + 3.4 * Math.cos(a) - 0.8,
                                cy + 3.4 * Math.sin(a) - 0.8,
                                cx + 3.4 * Math.cos(a) + 0.8,
                                cy + 3.4 * Math.sin(a) + 0.8,
                                TR + 2,
                                TR + 4,
                                st
                            )
                        }
                    }
                }
                const tb = box(1.5, 1.5, 14.5, 14.5, H, H + TH, st, stTop)
                tb.L(3, 4, 3, 4, TX.win(1))
                tb.L(8, 4, 3, 4, TX.win(1))
                tb.R(5, 4, 3, 4, TX.win(1))
                if (tier === 3) {
                    tb.L(5.5, 12, 3, 4, TX.win(1))
                    tb.R(5, 12, 3, 4, TX.win(1))
                }
                box(0.5, 0.5, 15.5, 15.5, H + TH, H + TH + 2, st2, stTop)
                pyramid(
                    1,
                    1,
                    15,
                    15,
                    H + TH + 2,
                    tier === 2 ? 9 : 12,
                    TX.shingle(FC, 10)
                )
                flag(8, 8, H + TH + 2 + (tier === 2 ? 9 : 12), 9, FC, f, C.gold)
            }
            break
        }
        case 'shouse':
        case 'house': {
            const v = t === 'shouse' ? 2 : (o.v || 0) % 2
            shadow(-6, -6, 6, 6)
            if (v === 0) {
                const b = box(-6, -6, 6, 6, 0, 8, TX.timber(C.plas, C.beam, 11))
                b.L(7.5, 0, 3, 6, TX.door(3, 6))
                b.L(2, 4, 3, 3, TX.win(1))
                b.R(4.5, 4, 3, 3, TX.win(0))
                box(2, -5.5, 4.5, -3, 8, 18, TX.brick(C.brick, 12))
                gable(
                    -7.4,
                    -7.4,
                    7.4,
                    7.4,
                    7.5,
                    8.5,
                    TX.thatch(C.thatch, 13),
                    TX.speck(C.plas, 14),
                    'x',
                    1.4
                )
            } else if (v === 1) {
                const b = box(
                    -6,
                    -5.5,
                    6,
                    5.5,
                    0,
                    11,
                    TX.timber(C.plas, C.beam, 15)
                )
                b.R(4, 0, 3, 6, TX.door(3, 6))
                b.L(2, 7, 3, 3, TX.win(1))
                b.L(7.5, 7, 3, 3, TX.win(0))
                b.L(7.5, 1, 3, 3, TX.win(1))
                b.R(1, 7, 2, 3, TX.win(1))
                box(2, -5.5, 4.5, -3, 11, 19.5, TX.brick(C.brick, 12))
                gable(
                    -7.3,
                    -7,
                    7.3,
                    7,
                    10.5,
                    8,
                    TX.shingle(C.clay, 16),
                    TX.timber(C.plas, C.beam, 17),
                    'y',
                    1.5
                )
            } else {
                const b = box(-6.5, -6, 6.5, 6, 0, 8, TX.stone(C.pale, 18))
                b.L(4, 0, 3, 6, TX.door(3, 6))
                b.L(8.5, 4, 3, 3, TX.win(1))
                b.R(4.5, 4, 3, 3, TX.win(1))
                box(2, -5.5, 4.5, -3, 8, 17.5, TX.stone(C.stone2, 12))
                gable(
                    -7.4,
                    -7.4,
                    7.4,
                    7.4,
                    7.5,
                    7.5,
                    TX.shingle(C.slate, 19),
                    TX.stone(C.pale, 18),
                    'x',
                    1.4
                )
            }
            break
        }
        case 'farm': {
            const stg = o.st || 0,
                soil = stg === 3 ? 0xdfe6ea : 0x8a653c
            surf(
                [-7.5, -7.5, 0],
                [1, 0, 0],
                [0, 1, 0],
                31,
                31,
                (u?, v?, nu?, nv?, U?, V?) => {
                    const f = U % 6
                    return tw(
                        soil,
                        (f === 0 ? 0.7 : f === 1 ? 1.1 : f === 5 ? 0.88 : 1) *
                            (hsh(U, V, 20) < 0.12
                                ? 0.86
                                : hsh(U, V, 21) > 0.97
                                  ? 1.15
                                  : 1)
                    )
                },
                1
            )
            const crop = [0x7fb24a, 0x9cc04c, 0xe2bd45][stg],
                ch = [1, 2.5, 4][stg]
            if (stg < 3) {
                for (let x = -6; x < 23; x += 3) {
                    for (let y = -6.5; y < 23; y += SS) {
                        if (x < 4 && y < 5) {
                            continue
                        }
                        const jx = (hsh(x, y * 2, 22) - 0.5) * 0.9,
                            hgt = ch * (0.7 + hsh(x * 3, y * 4, 21) * 0.5),
                            sh = 0.82 + hsh(x, y * 6, 23) * 0.32
                        for (let z = 0; z < hgt; z += SS) {
                            plot(
                                x + jx,
                                y,
                                z,
                                z > hgt - (stg === 2 ? 1.4 : 0.6)
                                    ? stg === 2
                                        ? z > hgt - 0.5
                                            ? 0xf6e08a
                                            : 0xe8c856
                                        : tw(crop, 1.15)
                                    : crop,
                                sh
                            )
                        }
                        if (stg > 0) {
                            plot(
                                x + jx + 0.3,
                                y,
                                hgt * 0.55,
                                tw(crop, 0.82),
                                sh
                            )
                        }
                    }
                }
            }
            const post = TX.flat(C.woodD)
            for (let k = -7.5; k <= 23.5; k += 5.15) {
                box(k - 0.4, 22.9, k + 0.4, 23.7, 0, 3.5, post)
                box(22.9, k - 0.4, 23.7, k + 0.4, 0, 3.5, post)
                box(k - 0.4, -7.9, k + 0.4, -7.1, 0, 3.5, post)
                box(-7.9, k - 0.4, -7.1, k + 0.4, 0, 3.5, post)
            }
            line3([-7.5, 23.3, 2.6], [23.5, 23.3, 2.6], C.wood, LL)
            line3([23.3, -7.5, 2.6], [23.3, 23.5, 2.6], C.wood, LR)
            line3([-7.5, -7.5, 2.6], [23.5, -7.5, 2.6], C.woodD, LL)
            line3([-7.5, -7.5, 2.6], [-7.5, 23.5, 2.6], C.woodD, LR)
            const b = box(-6, -6, 2, 3, 0, 6, plank)
            b.L(2.5, 0, 3, 5, TX.door(3, 5))
            b.R(3, 2, 3, 3, TX.win(0))
            gable(
                -7,
                -7,
                3,
                4,
                5.5,
                5.5,
                TX.thatch(C.thatch, 24),
                plankD,
                'x',
                1
            )
            break
        }
        case 'lumber': {
            shadow(-7, -7, 3, 4)
            const b = box(-6.5, -6.5, 2, 3, 0, 6, logs)
            b.L(3, 0, 3, 5, TX.door(3, 5))
            b.R(3.5, 2, 3, 3, TX.win(0))
            gable(
                -7.5,
                -7.5,
                3,
                4,
                5.5,
                5.5,
                TX.shingle(0x7a5a3a, 25),
                TX.logs(C.woodD),
                'x',
                1
            )
            const logEnd = (u?, v?) => ((u + v) % 3 === 1 ? 0xe2c08c : 0xc49a62)
            const l1 = box(3.5, -4, 7.5, 5, 0, 2.5, TX.hplank(C.wood, 26))
            l1.L(0, 0, 4, 2.5, logEnd)
            const l2 = box(4.2, -3.5, 6.8, 4.5, 2.5, 4.6, TX.hplank(C.wood, 27))
            l2.L(0, 0, 2.6, 2.1, logEnd)
            cyl(-3, 6, 1.4, 0, 2, TX.flat(C.bark), TX.flat(0xd9b782))
            line3([-3, 6, 2], [-1.2, 6, 5.5], 0x6b6f76, 1, 1)
            break
        }
        case 'quarry': {
            shadow(-7, -7, 1, 1)
            const b = box(-7, -7, 0, 0, 0, 5.5, plank)
            b.L(1.5, 0, 4, 4.5, TX.flat(C.dark))
            gable(
                -7.8,
                -7.8,
                0.8,
                0.8,
                5.2,
                3.5,
                TX.shingle(0x7a5a3a, 28),
                plankD,
                'y',
                0.8
            )
            const blk = TX.speck(C.pale, 29),
                cut = TX.stone(C.stone, 30)
            box(1.5, -6, 6.5, -1.5, 0, 4.5, cut, blk)
            box(2.5, -5.2, 5.5, -2.3, 4.5, 7.5, cut, blk)
            box(-5, 2.5, -1, 6, 0, 3, blk)
            box(0.5, 3, 3.5, 6.5, 0, 2.2, blk)
            box(4.5, 1.5, 7, 4, 0, 3.4, cut, blk)
            line3([-2, 1.5, 0], [-0.5, 1.5, 5], C.woodD, 1)
            plot(-0.5, 1.5, 5.6, 0x6b6f76, 1, 0.3)
            plot(0.3, 1.5, 5.2, 0x6b6f76, 1, 0.3)
            break
        }
        case 'fisher': {
            shadow(-6, -6, 4, 4)
            for (const [x, y] of [
                [-5, -5],
                [3, -5],
                [-5, 3],
                [3, 3],
            ]) {
                box(
                    x - 0.5,
                    y - 0.5,
                    x + 0.5,
                    y + 0.5,
                    0,
                    2.5,
                    TX.flat(C.woodD)
                )
            }
            const b = box(-5.5, -5.5, 3.5, 3.5, 2.5, 8.5, plank)
            b.L(5, 0, 3, 5, TX.door(3, 5))
            b.R(3, 2, 3, 3, TX.win(1))
            gable(
                -6.5,
                -6.5,
                4.5,
                4.5,
                8,
                5.5,
                TX.thatch(0xb9a25a, 31),
                plankD,
                'x',
                1
            )
            box(3.5, -2.5, 8, 2.5, 1.2, 2, TX.hplank(C.wood, 32))
            box(-2.5, 3.5, 2.5, 8, 1.2, 2, TX.plank(C.wood, 32))
            line3([6, -3.5, 2], [6, -3.5, 7], C.woodD, 1)
            line3([6, 3.5, 2], [6, 3.5, 7], C.woodD, 1)
            line3([6, -3.5, 6.6], [6, 3.5, 6.6], C.woodD, 1)
            for (let y = -2.5; y <= 2.5; y += 1.6) {
                plot(6, y, 5.6, 0xb9c6cf, 1, 0.4)
                plot(6, y, 4.8, 0x8fa3b0, 1, 0.4)
                plot(6, y, 4, 0xb9c6cf, 1, 0.4)
            }
            break
        }
        case 'well': {
            shadow(-4, -4, 4, 4)
            cyl(0, 0, 3.8, 0, 3.5, st, (u?, v?) =>
                u > 1 && u < 6 && v > 1 && v < 6
                    ? hsh(u, v, 33) < 0.3
                        ? 0x6fb0d0
                        : C.water
                    : tw(C.stone, 0.95)
            )
            box(-4, -0.6, -2.9, 0.6, 3.5, 10, TX.flat(C.woodD))
            box(2.9, -0.6, 4, 0.6, 3.5, 10, TX.flat(C.woodD))
            line3([-3.4, 0, 8.6], [3.4, 0, 8.6], C.wood, 1, 1)
            line3([0, 0, 8.2], [0, 0, 5], 0xcdbb8a, 1)
            box(-0.8, -0.8, 0.8, 0.8, 4, 5.4, TX.flat(C.wood))
            gable(-5, -3.2, 5, 3.2, 10, 3.6, TX.shingle(C.clay, 34), null, 'x')
            break
        }
        case 'market': {
            shadow(-7, -5, 7, 5)
            const b = box(-6, -3, 6, 3, 0, 4, plank, TX.speck(0xb8905a, 35))
            b.L(1, 1, 10, 2, TX.flat(tw(C.wood, 0.8)))
            const goods = [
                [-4.5, C.madder],
                [-2, 0xe0a030],
                [0.6, 0x6fa24a],
                [3.2, 0xd8c9a0],
            ]
            for (const [x, c] of goods) {
                box(x, -1.5, x + 1.8, 1, 4, 5.6, TX.speck(c, 36))
            }
            for (const [x, y] of [
                [-6.5, -4.5],
                [6.5, -4.5],
                [-6.5, 4.5],
                [6.5, 4.5],
            ]) {
                box(
                    x - 0.45,
                    y - 0.45,
                    x + 0.45,
                    y + 0.45,
                    0,
                    11,
                    TX.flat(C.woodD)
                )
            }
            gable(
                -7.5,
                -5.5,
                7.5,
                5.5,
                11,
                4,
                TX.stripe(C.madder, 0xefe3c4),
                null,
                'x'
            )
            cyl(
                5.5,
                6,
                1.5,
                0,
                3.2,
                (u?, v?) => (v === 1 ? 0x4a3828 : C.wood),
                TX.flat(tw(C.wood, 1.1))
            )
            box(-7, 5, -4.5, 7.5, 0, 2.2, TX.plank(0xb48a52, 37))
            break
        }
        case 'mill': {
            shadow(-6, -6, 6, 6)
            cyl(0, 0, 5.4, 0, 8, st)
            cyl(0, 0, 4.4, 8, 19, TX.plank(0xd9c9a0, 38))
            cone(0, 0, 5.4, 19, 6.5, TX.shingle(C.clay, 39))
            surf(
                [-1.5, 5.45, 0],
                [1, 0, 0],
                [0, 0, 1],
                3,
                6,
                TX.door(3, 6),
                LL,
                0.5
            )
            surf([-1, 4.45, 11], [1, 0, 0], [0, 0, 1], 2, 3, TX.win(1), LL, 0.5)
            const hub = [0, 5.2, 16]
            for (let k = 0; k < 4; k++) {
                const a = k * 1.5708 + f * 0.3927,
                    ca = Math.cos(a),
                    sa = Math.sin(a),
                    pa = Math.cos(a + 1.5708),
                    ps = Math.sin(a + 1.5708)
                for (let r = 1; r < 12; r += SS) {
                    plot(hub[0] + ca * r, 6.2, hub[2] + sa * r, C.woodD, 1, 2)
                    if (r > 3) {
                        for (let q = 0.6; q < 3; q += SS) {
                            plot(
                                hub[0] + ca * r + pa * q,
                                6.2,
                                hub[2] + sa * r + ps * q,
                                (r | 0) % 2 ? 0xefe6cc : 0xd9cfae,
                                1,
                                2
                            )
                        }
                    }
                }
            }
            plot(hub[0], 6.3, hub[2], C.dark, 1, 3)
            break
        }
        case 'tavern': {
            shadow(-7.5, -6.5, 7.5, 6.5)
            const b = box(-7, -6, 7, 6, 0, 9, TX.timber(C.plas, C.beam, 40))
            b.L(5.5, 0, 3, 6, TX.door(3, 6))
            b.L(1.5, 4, 3, 3, TX.win(1))
            b.L(10, 4, 3, 3, TX.win(1))
            b.R(2, 4, 3, 3, TX.win(1))
            b.R(7, 4, 3, 3, TX.win(1))
            box(-5.5, -5.5, -2.5, -2.5, 9, 19, TX.brick(C.brick, 41))
            gable(
                -8,
                -7.5,
                8,
                7.5,
                8.5,
                8.5,
                TX.shingle(C.clay, 42),
                TX.timber(C.plas, C.beam, 43),
                'x',
                1.5
            )
            line3([7.1, 3, 9], [9.5, 3, 9], C.woodD, 1)
            surf(
                [8, 3.05, 5.5],
                [1, 0, 0],
                [0, 0, 1],
                3,
                3,
                (u?, v?) => (u === 1 && v === 1 ? C.madder : C.gold),
                LL,
                0.6
            )
            cyl(
                -5,
                7,
                1.3,
                0,
                3,
                (u?, v?) => (v === 1 ? 0x4a3828 : C.wood),
                TX.flat(tw(C.wood, 1.1))
            )
            break
        }
        case 'chapel': {
            shadow(-5, -8, 5, 7)
            const tb = box(-3.2, -8, 3.2, -2.5, 0, 20, st)
            tb.L(2.2, 13, 2, 4, TX.win(1))
            tb.R(1.8, 13, 2, 4, TX.win(1))
            pyramid(-4, -8.8, 4, -1.7, 20, 10, TX.shingle(C.slate, 44))
            line3([0, -5.25, 30], [0, -5.25, 35], C.gold, 1)
            line3([-1.5, -5.25, 33], [1.5, -5.25, 33], C.gold, 1)
            const b = box(-4.2, -2.5, 4.2, 6.5, 0, 9, st)
            b.L(2.7, 0, 3, 6.5, TX.door(3, 7))
            b.R(2, 3, 2, 5, (u?, v?, nu?, nv?) =>
                v === nv - 1
                    ? C.stone2
                    : [0xe9b949, 0x4f8fd0, C.madder][(u + v) % 3]
            )
            b.R(6, 3, 2, 5, (u?, v?, nu?, nv?) =>
                v === nv - 1
                    ? C.stone2
                    : [0x4f8fd0, 0xe9b949, 0x5fae5a][(u + v) % 3]
            )
            gable(-5, -3, 5, 7.3, 8.6, 6, TX.shingle(C.slate, 45), st, 'y', 0.8)
            break
        }
        case 'palisade': {
            const tex = (s?) => (u?, v?) =>
                v === 6
                    ? 0xc9b07a
                    : v === 5
                      ? 0x6a5a3a
                      : tw(
                            C.wood,
                            (u % 2 ? 1 : 0.86) *
                                (hsh(u, v, s) < 0.12 ? 0.88 : 1)
                        )
            const post = (x?, y?) => {
                const k = hsh(Math.round(x * 3), Math.round(y * 3), 46),
                    hh = 9.5 + k * 2
                cyl(x, y, 1.2, 0, hh, tex(x * 7 + y), TX.flat(0xd6b684))
                cone(x, y, 1.2, hh, 2.2, TX.flat(0xdcbf8e))
            }
            const pts = []
            if (m & 8) {
                pts.push([0, -6], [0, -4], [0, -2])
            }
            if (m & 2) {
                pts.push([-6, 0], [-4, 0], [-2, 0])
            }
            if (!m) {
                pts.push([-2.2, 0], [2.2, 0])
            }
            pts.push([0, 0])
            if (m & 1) {
                pts.push([2, 0], [4, 0], [6, 0], [8, 0])
            }
            if (m & 4) {
                pts.push([0, 2], [0, 4], [0, 6], [0, 8])
            }
            for (const p of pts) {
                post(p[0], p[1])
            }
            break
        }
        case 'wall': {
            const H = 12
            if (!m) {
                box(-4, -4, 4, 4, 0, H, st, stTop)
                crenRect(-4, -4, 4, 4, H, st)
                break
            }
            const a = wallArms(m, H, st, stTop, 3)
            box(-3, -3, 3, 3, 0, H, st, stTop)
            if (!(m & 8)) {
                a.mx(-3, 3, -3)
            }
            if (!(m & 4)) {
                a.mx(-3, 3, 1.8)
            }
            if (!(m & 2)) {
                a.my(-3, 3, -3)
            }
            if (!(m & 1)) {
                a.my(-3, 3, 1.8)
            }
            break
        }
        case 'tower': {
            shadow(-6, -6, 6, 6)
            wallArms(m, 12, st, stTop, 4.5)
            cyl(0, 0, 5.6, 0, 19, st, stTop)
            cyl(0, 0, 6.5, 19, 21, st2, stTop)
            for (let k = 0; k < 8; k++) {
                const a = k * 0.7854 + 0.39,
                    x = 5.5 * Math.cos(a),
                    y = 5.5 * Math.sin(a)
                box(x - 0.9, y - 0.9, x + 0.9, y + 0.9, 21, 23.5, st)
            }
            for (let z = 9; z < 13; z += SS) {
                plot(0, 5.7, z, C.dark, 1, 0.5)
                plot(5.7, 0, z, C.dark, 1, 0.5)
                plot(4, 4, z + 5, C.dark, 1, 0.5)
            }
            flag(0, 0, 21, 10, FC, f, C.gold)
            break
        }
        case 'watch': {
            shadow(-5, -5, 5, 5)
            const leg = TX.flat(C.woodD)
            for (const [x, y] of [
                [-4, -4],
                [4, -4],
                [-4, 4],
                [4, 4],
            ]) {
                box(x - 0.6, y - 0.6, x + 0.6, y + 0.6, 0, 13, leg)
            }
            line3([-4, 4, 1], [4, 4, 11], C.wood, LL)
            line3([4, 4, 1], [-4, 4, 11], C.wood, LL)
            line3([4, 4, 1], [4, -4, 11], C.wood, LR)
            line3([4, -4, 1], [4, 4, 11], C.wood, LR)
            box(
                -5.5,
                -5.5,
                5.5,
                5.5,
                13,
                14,
                TX.hplank(C.wood, 47),
                TX.plank(0xa97c4c, 48)
            )
            box(-5.5, 4.8, 5.5, 5.5, 14, 17, plank)
            box(4.8, -5.5, 5.5, 5.5, 14, 17, plank)
            box(-5.5, -5.5, 5.5, -4.8, 14, 17, plankD)
            box(-5.5, -5.5, -4.8, 5.5, 14, 17, plankD)
            for (const [x, y] of [
                [-5, -5],
                [5, -5],
                [-5, 5],
                [5, 5],
            ]) {
                box(x - 0.4, y - 0.4, x + 0.4, y + 0.4, 17, 21, leg)
            }
            pyramid(-6.5, -6.5, 6.5, 6.5, 21, 6, TX.thatch(C.thatch, 49))
            break
        }
        case 'gate': {
            GV.cur.swap = !!o.sw
            shadow(-8, -4, 8, 4)
            surf(
                [-3, -4, 0],
                [1, 0, 0],
                [0, 1, 0],
                6,
                8,
                TX.speck(0xa98f62, 50),
                0.8
            )
            box(-8, -4.5, -3, 4.5, 0, 16, st, stTop)
            box(3, -4.5, 8, 4.5, 0, 16, st, stTop)
            box(-3, -4.5, 3, 4.5, 10, 16, st, stTop)
            surf(
                [-3, 3.2, 0],
                [1, 0, 0],
                [0, 0, 1],
                6,
                10,
                o.op
                    ? (u?, v?) =>
                          v === 9 && (u === 0 || u === 5)
                              ? tw(C.stone, 0.7)
                              : v >= 8
                                ? u % 2
                                    ? 0x3a3f45
                                    : 0x565c66
                                : 0x16141c
                    : (u?, v?) =>
                          v === 9 && (u === 0 || u === 5)
                              ? tw(C.stone, 0.7)
                              : v === 3 || v === 7
                                ? 0x3a3f45
                                : tw(C.woodD, u % 2 ? 1 : 0.78),
                LL,
                0.2
            )
            surf(
                [-1, 4.55, 11.5],
                [1, 0, 0],
                [0, 0, 1],
                2,
                3,
                (u?, v?) => (v === 0 ? C.gold : FC),
                LL,
                0.5
            )
            crenRect(-8, -4.5, 8, 4.5, 16, st)
            GV.cur.swap = false
            break
        }
        case 'bridge': {
            GV.cur.swap = !!o.sw
            box(-1.5, -3, 1.5, 3, 0, 1.5, TX.flat(C.bark))
            if (o.up) {
                box(
                    -8,
                    -3.5,
                    -6.6,
                    3.5,
                    1.5,
                    13,
                    TX.hplank(C.wood, 51),
                    TX.plank(0xa97c4c, 52)
                )
            } else {
                box(
                    -8,
                    -3.5,
                    8,
                    3.5,
                    1.5,
                    2.6,
                    TX.plank(C.wood, 51),
                    TX.plank(0xa97c4c, 52)
                )
            }
            if (!o.up) {
                for (const x of [-7, 0, 7]) {
                    box(x - 0.5, 3, x + 0.5, 3.9, 2.6, 6, TX.flat(C.woodD))
                    box(x - 0.5, -3.9, x + 0.5, -3, 2.6, 6, TX.flat(C.woodD))
                }
            }
            if (!o.up) {
                line3([-8, 3.45, 5.2], [8, 3.45, 5.2], C.wood, LL)
                line3([-8, -3.45, 5.2], [8, -3.45, 5.2], C.woodD, LL)
            }
            GV.cur.swap = false
            break
        }
        case 'stakes': {
            for (let k = 0; k < 9; k++) {
                const x = -5 + (k % 3) * 4.5 + hsh(k, 1, 53) * 1.5,
                    y = -5 + ((k / 3) | 0) * 4.5 + hsh(k, 2, 53) * 1.5,
                    lx = (hsh(k, 3, 53) - 0.5) * 3,
                    ly = 1 + hsh(k, 4, 53) * 2
                line3([x, y, 0], [x + lx, y + ly, 6], C.woodD, 1, 1)
                plot(x + lx, y + ly, 6.8, 0xe6d3a4, 1, 0.4)
            }
            surf(
                [-6, -6, 0],
                [1, 0, 0],
                [0, 1, 0],
                12,
                12,
                (u?, v?) => (hsh(u, v, 54) < 0.3 ? 0x8a6f45 : -1),
                1
            )
            break
        }
        case 'mangonel': {
            shadow(-7, -7, 7, 7)
            box(-6.8, -6.8, 6.8, 6.8, 0, 4, st, stTop)
            crenRect(-6.8, -6.8, 6.8, 6.8, 4, st)
            box(-1, -4.2, 1, -3.2, 4, 11.5, plankD)
            box(-1, 3.2, 1, 4.2, 4, 11.5, plankD)
            line3([0, -3.7, 11], [0, 3.7, 11], C.wood, 1, 1)
            line3([-5, 0, 6], [5.5, 0, 14.5], C.wood, 1, 1)
            box(
                4.5,
                -1.2,
                6.5,
                1.2,
                14,
                15.5,
                TX.flat(C.woodD),
                TX.flat(C.stone2)
            )
            box(-6, -1.6, -3.8, 1.6, 4, 7, TX.stone(C.stone2, 55))
            line3([-3, -3.7, 4], [0, -3.7, 10], C.woodD, LL)
            line3([3, -3.7, 4], [0, -3.7, 10], C.woodD, LL)
            line3([-3, 3.7, 4], [0, 3.7, 10], C.woodD, LL)
            line3([3, 3.7, 4], [0, 3.7, 10], C.woodD, LL)
            break
        }
        case 'barracks': {
            shadow(-7.5, -7.5, 7.5, 7.5)
            const b = box(
                -7,
                -7,
                7,
                7,
                0,
                9,
                st2,
                TX.speck(tw(C.stone2, 0.88), 56)
            )
            b.L(5, 0, 4, 7, TX.door(4, 7))
            b.L(1.5, 4, 1, 3, TX.flat(C.dark))
            b.L(11.5, 4, 1, 3, TX.flat(C.dark))
            b.R(3, 2, 3, 6, (u?, v?) =>
                v === 0 && u !== 1 ? -1 : u === 1 && v === 3 ? C.gold : FC
            )
            b.R(9, 2, 3, 6, (u?, v?) =>
                v === 0 && u !== 1 ? -1 : u === 1 && v === 3 ? C.gold : C.madder
            )
            crenRect(-7, -7, 7, 7, 9, st2)
            box(-4, -4, 2, 2, 9, 13, st2)
            pyramid(-4.8, -4.8, 2.8, 2.8, 13, 5, TX.shingle(C.slate, 57))
            flag(-1, -1, 18, 8, FC, f, C.gold)
            line3([4, 7.6, 0], [5, 7.6, 6], 0xb9c2c8, 1)
            line3([6, 7.6, 0], [5, 7.6, 6], 0xb9c2c8, 1)
            break
        }
        case 'range': {
            shadow(-7.5, -7.5, 7.5, -1)
            box(-7, -7, 7, -2.5, 0, 6, plank).L(
                2,
                0,
                10,
                5,
                TX.flat(tw(C.woodD, 0.7))
            )
            gable(
                -7.8,
                -8,
                7.8,
                -1.5,
                5.6,
                4,
                TX.shingle(0x7a5a3a, 58),
                plankD,
                'x',
                0.8
            )
            const target = (cx?, cy?) => {
                line3([cx - 1.5, cy + 0.4, 0], [cx, cy + 0.4, 5], C.woodD, 1)
                line3([cx + 1.5, cy + 0.4, 0], [cx, cy + 0.4, 5], C.woodD, 1)
                for (let x = -3; x <= 3; x += SS) {
                    for (let z = -3; z <= 3; z += SS) {
                        const r = Math.hypot(x, z)
                        if (r <= 3) {
                            plot(
                                cx + x,
                                cy,
                                5.5 + z,
                                r < 1 ? C.madder : r < 2 ? 0xf1ead6 : C.madder,
                                LL,
                                0.6
                            )
                        }
                    }
                }
            }
            target(-3, 5)
            target(4, 3)
            box(4, -1.5, 7.5, 1, 0, 3, TX.hplank(C.straw, 59))
            break
        }
        case 'smith': {
            shadow(-7, -7, 7, 6)
            const b = box(-6, -6, 6, 5, 0, 7, st)
            b.L(1.5, 0, 6, 5.5, (u?, v?, nu?, nv?) =>
                u === 0 || u === nu - 1 || v === nv - 1
                    ? C.dark
                    : v < 2
                      ? [0xffd24a, 0xff8a2a][(u + v) & 1]
                      : v < 3
                        ? 0xc8501e
                        : 0x3a2a26
            )
            b.R(4, 3, 3, 3, TX.win(1))
            box(1.5, -5.5, 5.2, -2, 7, 19, TX.brick(C.brick, 60))
            gable(-7, -7, 7, 6, 6.6, 5.5, TX.shingle(C.slate, 61), st, 'y', 1)
            box(-2.5, 6, 0.5, 7.6, 0, 1.4, TX.flat(0x4a3828))
            box(
                -3.2,
                5.8,
                1.2,
                7.8,
                1.4,
                2.8,
                TX.flat(0x3a3f47),
                TX.flat(0x565c66)
            )
            break
        }
        case 'outpost': {
            shadow(-5, -5, 5, 5)
            const b = box(-4, -4, 4, 4, 0, 14, st, stTop)
            b.L(2.5, 0, 3, 5, TX.door(3, 5))
            b.L(3.5, 8, 1, 3, TX.flat(C.dark))
            b.R(3.5, 8, 1, 3, TX.flat(C.dark))
            box(-4.8, -4.8, 4.8, 4.8, 14, 16, st2, stTop)
            crenRect(-4.8, -4.8, 4.8, 4.8, 16, st)
            flag(0, 0, 16, 11, FC, f, C.gold)
            break
        }
        case 'brazier': {
            cyl(0, 0, 1.1, 0, 5, st2)
            cyl(0, 0, 2.3, 5, 6.6, TX.flat(0x3a3f47), TX.flat(0x5a2a1a))
            blob(0, 0, 8.2 + f * 0.5, 1.6, 2 + f * 0.4, (u?, v?) =>
                hsh(u, v, 85 + f) < 0.4 ? 0xffe06a : 0xff8a2a
            )
            break
        }
        case 'camp': {
            shadow(-7, -6, 7, 6)
            gable(
                -7,
                -6,
                0,
                1,
                0,
                6,
                TX.speck(0xb9a57a, 86),
                TX.flat(0x3a2c20),
                'x',
                0.4
            )
            gable(
                1.5,
                -3,
                7,
                5,
                0,
                5.5,
                TX.speck(0xa3906a, 87),
                TX.flat(0x3a2c20),
                'y',
                0.4
            )
            cyl(-3, 5, 1.4, 0, 1, TX.flat(0x4a4038))
            blob(-3, 5, 2.4 + f * 0.4, 1, 1.4, (u?, v?) =>
                hsh(u, v, 88 + f) < 0.4 ? 0xffe06a : 0xff8a2a
            )
            flag(4, -5, 0, 13, FC, f, 0x1c1a22)
            break
        }
        case 'ram': {
            GV.cur.swap = !!o.sw
            for (const [x, y] of [
                [-5, -3],
                [5, -3],
                [-5, 3],
                [5, 3],
            ]) {
                box(x - 1, y - 0.5, x + 1, y + 0.5, 0, 2, TX.flat(0x3a2c20))
            }
            box(-6, -2.6, 6, 2.6, 2, 3, plankD)
            for (const [x, y] of [
                [-6, -2.6],
                [5.4, -2.6],
                [-6, 2],
                [5.4, 2],
            ]) {
                box(x, y, x + 0.6, y + 0.6, 3, 7, TX.flat(C.woodD))
            }
            box(-8, -0.9, 8.5, 0.9, 3.6, 5.4, TX.hplank(C.bark, 89))
            box(8.5, -1, 9.6, 1, 3.5, 5.5, TX.flat(0x6d7278))
            gable(
                -6.8,
                -3.6,
                6.8,
                3.6,
                7,
                3.2,
                TX.hplank(0x7a5a3a, 90),
                null,
                'x'
            )
            GV.cur.swap = false
            break
        }
        case 'catapult': {
            GV.cur.swap = !!o.sw
            for (const [x, y] of [
                [-4.5, -3],
                [4.5, -3],
                [-4.5, 3],
                [4.5, 3],
            ]) {
                box(x - 1, y - 0.5, x + 1, y + 0.5, 0, 2, TX.flat(0x3a2c20))
            }
            box(-5.5, -2.8, 5.5, 2.8, 2, 3.2, plank)
            box(-1, -2.8, 0, -2, 3.2, 9, plankD)
            box(-1, 2, 0, 2.8, 3.2, 9, plankD)
            line3([-0.5, -2.4, 8.6], [-0.5, 2.4, 8.6], C.wood, 1, 1)
            line3([-5, 0, 3.5], [5, 0, 12], C.wood, 1, 1)
            box(
                4.2,
                -1.1,
                6.2,
                1.1,
                11.6,
                13,
                TX.flat(C.woodD),
                TX.flat(0x8c8d88)
            )
            box(-6.5, -1.4, -4.5, 1.4, 3.2, 5.6, TX.stone(C.stone2, 91))
            GV.cur.swap = false
            break
        }
        case 'ruin': {
            shadow(-6, -6, 6, 6)
            const moss = (c?, s?) => {
                const base = TX.stone(c, s)
                return (u?, v?, nu?, nv?, U?, V?, NU?, NV?) =>
                    hsh(U >> 1, V >> 1, s + 40) < 0.14
                        ? hsh(U, V, s) < 0.5
                            ? 0x4f7a3c
                            : 0x5f8a45
                        : base(u, v, nu, nv, U, V, NU, NV)
            }
            box(-6.5, -6.5, -4, 2, 0, 8, moss(C.stone, 92))
            box(-4, -6.5, 2, -4, 0, 5.5, moss(C.stone, 93))
            box(2, -6.5, 4.5, -4, 0, 2.5, moss(C.stone2, 94))
            box(3.5, 2.5, 6.5, 6.5, 0, 3.5, moss(C.stone2, 95))
            cyl(2.5, -0.5, 1.4, 0, 10, TX.speck(C.pale, 96))
            cyl(-1, 4.5, 1.4, 0, 3, TX.speck(C.pale, 96))
            blob(5, -1.5, 1, 1.6, 1.4, TX.speck(0xb5b4aa, 82))
            blob(-3, 1, 0.8, 1.3, 1.1, TX.speck(0xb5b4aa, 82))
            break
        }
        case 'stables': {
            shadow(-7, -6, 7, 6)
            const b = box(-6.5, -5, 6.5, 5, 0, 7, TX.plank(C.wood, 110))
            for (const u of [1.2, 5.2, 9.2]) {
                b.L(u, 0, 2.6, 5, (uu?, vv?, nu?, nv?, U?, V?, NU?, NV?) =>
                    V >= NV - 1 || U === 0 || U === NU - 1
                        ? C.dark
                        : V > NV >> 1
                          ? 0x17130e
                          : V === NV >> 1
                            ? C.beam
                            : tw(C.woodD, U % 2 ? 1 : 0.84)
                )
            }
            box(-4.4, 5.05, -3.3, 6.3, 3.3, 4.5, TX.speck(0x5a3a26, 116))
            plot(-3.6, 6.35, 4.2, 0x111111, 1, 0.6)
            box(3.6, 5.05, 4.7, 6.3, 3.3, 4.5, TX.speck(0x8a7e72, 117))
            plot(4.4, 6.35, 4.2, 0x111111, 1, 0.6)
            b.R(2, 2.5, 3, 3, TX.win(0))
            gable(
                -7.5,
                -6,
                7.5,
                6,
                6.6,
                6,
                TX.thatch(C.thatch, 111),
                TX.plank(C.woodD, 112),
                'x',
                1
            )
            box(
                -6.5,
                6,
                -2.5,
                7.4,
                0,
                1.4,
                TX.hplank(C.wood, 113),
                TX.flat(0x2a5670)
            )
            box(
                3,
                -7.6,
                6.4,
                -5.4,
                0,
                2.4,
                TX.thatch(C.straw, 114),
                TX.speck(C.straw, 115)
            )
            flag(-5.5, 0, 12.2, 6, FC, f, C.gold)
            break
        }
        case 'workshop': {
            shadow(-7, -7, 7, 6)
            box(-6.5, -6.5, 6.5, -3.5, 0, 7, TX.plank(C.woodD, 120))
            box(-6.5, -6.5, -5.2, 5.5, 0, 7, TX.plank(C.woodD, 121))
            for (const [x, y] of [
                [5.6, 4.8],
                [0.2, 4.8],
            ]) {
                box(
                    x - 0.45,
                    y - 0.45,
                    x + 0.45,
                    y + 0.45,
                    0,
                    7,
                    TX.flat(C.woodD)
                )
            }
            box(-6.8, -6.8, 6.8, 5.4, 7, 7.6, TX.hplank(C.wood, 122))
            gable(
                -7.2,
                -7.2,
                7.2,
                5.8,
                7.6,
                4.5,
                TX.shingle(0x6a4a30, 123),
                TX.plank(C.woodD, 124),
                'x',
                0.8
            )
            box(-3.4, -2.2, 3.4, 1.6, 0, 0.8, TX.flat(0x3a2c20))
            line3([-4, -0.3, 2.3], [4.6, -0.3, 2.3], C.bark, 1, 1)
            box(4.4, -0.8, 5.5, 0.2, 1.8, 3.1, TX.flat(0x6d7278))
            line3([-3, -1.8, 0.8], [-1, -1.8, 4], C.woodD, 1)
            line3([1, -1.8, 0.8], [-1, -1.8, 4], C.woodD, 1)
            for (let a = 0; a < 6.3; a += 0.08) {
                plot(
                    6.1,
                    2.6 + Math.cos(a) * 1.6,
                    1.7 + Math.sin(a) * 1.6,
                    C.woodD,
                    LR,
                    0.5
                )
            }
            line3([6.1, 1.1, 1.7], [6.1, 4.1, 1.7], C.wood, LR)
            line3([6.1, 2.6, 0.2], [6.1, 2.6, 3.2], C.wood, LR)
            box(
                -4.8,
                2.4,
                -1.4,
                5,
                0,
                1.3,
                TX.hplank(C.bark, 125),
                TX.flat(0xc49a62)
            )
            break
        }
        case 'stones': {
            surf(
                [-5.5, -5.5, 0],
                [1, 0, 0],
                [0, 1, 0],
                11,
                11,
                (u?, v?, nu?, nv?, U?, V?) => {
                    const d = Math.hypot(U - 11, V - 11)
                    return d < 10
                        ? hsh(U, V, 130) < 0.4
                            ? 0x46663a
                            : 0x51703d
                        : -1
                },
                1
            )
            const rs = TX.speck(0x7a7a73, 131),
                rt = TX.speck(0x96968e, 133)
            for (let k = 0; k < 6; k++) {
                const a = k * 1.047 + 0.3,
                    x = Math.cos(a) * 5.4,
                    y = Math.sin(a) * 5.4,
                    h = 4.5 + hsh(k, 1, 132) * 3
                shadow(x - 0.8, y - 0.6, x + 0.8, y + 0.6)
                box(x - 0.8, y - 0.6, x + 0.8, y + 0.6, 0, h, rs, rt)
                for (let z = h * 0.4; z < h * 0.75; z += 0.5) {
                    plot(
                        x + (hsh(k, z * 4, 135) - 0.5) * 0.8,
                        y + 0.65,
                        z,
                        hsh(k, z * 4, 136) < 0.5 ? 0x5fd6c8 : 0x9ff0e4,
                        1.1,
                        0.6
                    )
                }
            }
            box(-1.5, -1, 1.5, 1, 0, 1.6, rs, TX.speck(0x8a8a82, 134))
            plot(0, 0, 1.85, 0x7ee8da, 1.1, 0.4)
            plot(0.25, 0, 1.85, 0x5fd6c8, 1.1, 0.4)
            break
        }
        case 'mine': {
            shadow(-6, -6, 6, 6)
            blob(-1, -1.5, 0, 5.8, 6.4, TX.stone(0x77736a, 140))
            box(-2.4, 3.9, 1.8, 4.3, 0, 4.8, TX.flat(0x0b090c))
            box(-3, 4, -2.2, 4.9, 0, 5.4, TX.flat(C.woodD))
            box(1.6, 4, 2.4, 4.9, 0, 5.4, TX.flat(C.woodD))
            box(-3.2, 4, 2.6, 4.9, 4.9, 5.7, TX.hplank(C.wood, 143))
            line3([-0.6, 4.4, 0.05], [-0.6, 8.5, 0.05], 0x55565a, 1)
            line3([0.6, 4.4, 0.05], [0.6, 8.5, 0.05], 0x55565a, 1)
            box(
                -1.2,
                5.6,
                1.2,
                7.6,
                0.5,
                2.1,
                TX.plank(0x4f4234, 141),
                TX.flat(0xc79a2e)
            )
            for (let k = 0; k < 7; k++) {
                plot(
                    -1 + hsh(k, 1, 142) * 2,
                    5.8 + hsh(k, 2, 142) * 1.6,
                    2.25,
                    k % 2 ? 0xf0d070 : 0xe2b440,
                    1,
                    0.6
                )
            }
            box(
                3.2,
                3.5,
                5.6,
                5.4,
                0,
                1.6,
                TX.speck(0x8a857a, 144),
                TX.speck(0x9a958a, 145)
            )
            break
        }
        case 'hamlet': {
            shadow(-7, -7, 7, 7)
            const hole = (tx?, sd?) => (u?, v?, nu?, nv?, U?, V?, NU?, NV?) =>
                hsh(U >> 1, V >> 1, sd) < 0.38
                    ? -1
                    : tx(u, v, nu, nv, U, V, NU, NV)
            const ivy = (tx?, sd?) => (u?, v?, nu?, nv?, U?, V?, NU?, NV?) =>
                hsh(U, V >> 1, sd) < (V < 6 ? 0.35 : 0.1)
                    ? hsh(U, V, sd + 1) < 0.5
                        ? 0x3c6230
                        : 0x4f7a3a
                    : tx(u, v, nu, nv, U, V, NU, NV)
            const wl = box(
                -6.5,
                -6.5,
                -0.5,
                -1,
                0,
                4,
                ivy(TX.timber(C.plas, C.beam, 150), 156)
            )
            wl.L(2, 0, 2.5, 3.4, TX.flat(0x15120e))
            gable(
                -7.3,
                -7.3,
                0.3,
                -0.2,
                3.8,
                3.6,
                hole(TX.thatch(0x8f7a46, 152), 153),
                TX.timber(C.plas, C.beam, 150),
                'x',
                1
            )
            const w2 = box(
                1,
                1.5,
                6.5,
                6,
                0,
                3.4,
                ivy(TX.stone(C.pale, 151), 157)
            )
            w2.R(1.5, 0, 2, 3.4, TX.flat(0x15120e))
            line3([1, 1.5, 3.4], [6.5, 6, 3.4], C.beam, 1)
            line3([1.5, 4, 3.4], [4.5, 4, 6.5], C.beam, 1)
            line3([4.5, 4, 6.5], [6, 4, 3.4], C.beam, 1)
            for (let k = 0; k < 16; k++) {
                const x = -6 + hsh(k, 1, 154) * 12,
                    y = -6 + hsh(k, 2, 154) * 12
                if (!(x < 0 && y < 0) && !(x > 1 && y > 1)) {
                    for (let z = 0; z < 1 + hsh(k, 3, 154); z += SS) {
                        plot(x, y, z, z > 0.6 ? 0x5f8a45 : 0x45663a, 1, 0.1)
                    }
                }
            }
            break
        }
        case 'banner': {
            box(-1.6, -1.6, 1.6, 1.6, 0, 1.6, st)
            for (let z = 1.6; z < 21; z += SS) {
                plot(0, 0, z, 0x5a4330, 1, 0.2)
            }
            plot(0, 0, 21.4, C.gold, 1, 0.2)
            line3([0, 0.5, 19.5], [6, 0.5, 19.5], 0x5a4330, 1)
            for (let u = 0; u < 5.5; u += SS) {
                for (let v = 0; v < 10; v += SS) {
                    if (v > 8 && Math.abs(u - 2.75) < (v - 8) * 1.4) {
                        continue
                    }
                    const sway = Math.round(
                        Math.sin(v * 0.6 + f * 3.1) * 0.6 * (v / 10)
                    )
                    const cu = u | 0,
                        cv2 = v | 0,
                        c =
                            (cv2 === 3 || cv2 === 4) && cu >= 1 && cu <= 3
                                ? C.gold
                                : cu === 0 || cu === 4
                                  ? tw(FC, 0.8)
                                  : FC
                    plot(0.5 + u + sway, 0.5, 19 - v, c, LL, 0.3)
                }
            }
            break
        }
        case 'statue': {
            shadow(-4, -4, 4, 4)
            box(-3.5, -3.5, 3.5, 3.5, 0, 2, st2)
            box(
                -2.6,
                -2.6,
                2.6,
                2.6,
                2,
                6,
                TX.stone(C.pale, 62),
                TX.flat(C.pale)
            )
            const sc = TX.speck(0xd8d5c8, 63)
            cyl(0, 0, 1.7, 6, 12.5, sc)
            blob(0, 0, 14, 1.6, 1.6, sc)
            line3([1.6, 0.6, 10], [3.2, 0.6, 17.5], 0xc4c1b4, 1)
            line3([-1.8, 0.4, 8], [-1.8, 0.4, 11], 0xc4c1b4, 1, 1)
            break
        }
        case 'garden': {
            const hedge = TX.leaf(0x3d7a36, 64)
            box(-7, -7, 7, -5.5, 0, 2.5, hedge)
            box(-7, -7, -5.5, 7, 0, 2.5, hedge)
            box(-7, 5.5, 2, 7, 0, 2.5, hedge)
            box(5.5, -7, 7, 2, 0, 2.5, hedge)
            surf(
                [-5.5, -5.5, 0],
                [1, 0, 0],
                [0, 1, 0],
                11,
                11,
                (u?, v?) => tw(0x7a5b3a, hsh(u, v, 65) < 0.3 ? 0.88 : 1),
                1
            )
            for (let k = 0; k < 26; k++) {
                const x = -4.8 + hsh(k, 1, 66) * 9.6,
                    y = -4.8 + hsh(k, 2, 66) * 9.6
                const fc = [0xf2f0e4, 0xf2c94c, 0xd2506a, 0x9c6ad0, 0xf08a3c][
                    k % 5
                ]
                for (let z = 0.25; z < 1.25; z += SS) {
                    plot(x, y, z, 0x3f7d36, 1, 0.2)
                }
                plot(x, y, 1.5, fc, 1, 0.3)
                plot(x + 0.25, y, 1.5, tw(fc, 0.85), 1, 0.3)
                plot(x, y, 1.75, tw(fc, 1.12), 1, 0.3)
            }
            blob(0, 0, 3, 2.4, 2.6, TX.leaf(C.leaf, 67))
            blob(0, 0, 3.4, 2.4, 2.6, (u?, v?) =>
                hsh(u, v, 68) < 0.14 ? 0xe2607a : -1
            )
            break
        }
    }
}
export function recipeProp(kind?, v?, se?) {
    if (kind === 1) {
        shadow(-4, -4, 3, 3)
        const AUT = [0xc9772a, 0xd9a02a, 0xb5482a]
        const lf = (c?, s?) =>
            se === 3
                ? (u?, v2?) => (hsh(u, v2, s) < 0.6 ? -1 : 0x7d6c5c)
                : TX.leaf(se === 2 ? AUT[s % 3] : se === 0 ? tw(c, 1.1) : c, s)
        if (v < 2) {
            const c = v ? 0x356f4f : C.pine,
                tx = TX.leaf(c, 70 + v),
                s = v ? 1.12 : 1
            box(-0.9, -0.9, 0.9, 0.9, 0, 5, TX.flat(C.bark))
            cone(0, 0, 5.6 * s, 3.5, 8 * s, tx)
            cone(0, 0, 4.4 * s, 8.5 * s, 7.5 * s, tx)
            cone(0, 0, 3.1 * s, 13.5 * s, 7 * s, tx)
        } else if (se === 3) {
            const bc = v === 3 ? 0xd9d4c4 : C.bark,
                tw2 = v === 3 ? 0x8a8478 : 0x6a5040
            cyl(
                0,
                0,
                v === 3 ? 1 : 1.3,
                0,
                8,
                v === 3
                    ? (u?, v2?) => (v2 % 3 === 1 ? 0x6b6a60 : 0xe4e0d2)
                    : TX.plank(C.bark, 72)
            )
            const br = [
                [-4, 2, 12],
                [4, -1, 13],
                [1, 2, 17],
                [-2, -3, 15],
                [3, 3, 11],
                [0, -1, 18],
            ]
            for (const [x, y, z] of br) {
                line3([0, 0, 7], [x, y, z], bc, 1)
                line3([x, y, z], [x * 1.35, y * 1.35, z + 2.5], tw2, 1)
                line3(
                    [x * 0.6, y * 0.6, z - 2],
                    [x * 0.6 + 1.5, y * 0.6 - 1, z + 1],
                    tw2,
                    1
                )
                plot(x * 1.35, y * 1.35, z + 3, 0xf2f6f9, 1, 0.3)
            }
        } else if (v === 2) {
            cyl(0, 0, 1.3, 0, 7, TX.plank(C.bark, 72))
            const tx = lf(C.leaf, 73)
            blob(0, 0, 12.5, 5.6, 5.2, tx)
            blob(-3, 2, 9.5, 3.6, 3.2, tx)
            blob(3, -1.5, 10.5, 3.9, 3.4, lf(0x4c9a40, 74))
            blob(0.5, 1.5, 16.5, 3.4, 2.8, lf(0x4c9a40, 75))
            if (se === 3) {
                line3([0, 0, 7], [-3, 2, 12], C.bark, 1)
                line3([0, 0, 7], [3, -1, 13], C.bark, 1)
                line3([0, 0, 7], [0.5, 1, 17], C.bark, 1)
            }
        } else {
            cyl(0, 0, 1, 0, 8, (u?, v2?) =>
                v2 % 3 === 1 ? 0x6b6a60 : 0xe4e0d2
            )
            const tx = lf(C.leaf2, 76)
            blob(0, 0, 13, 4.4, 5.6, tx)
            blob(-2, 1, 10, 3, 3, lf(0x6fae44, 77))
            blob(1.5, -0.5, 17, 2.8, 2.6, lf(0x6fae44, 78))
            if (se === 0) {
                blob(0, 0, 13.2, 4.5, 5.7, (u?, v2?) =>
                    hsh(u, v2, 79) < 0.1 ? 0xf6d3de : -1
                )
            }
            if (se === 3) {
                line3([0, 0, 8], [0, 0, 17], 0xe4e0d2, 1)
                line3([0, 0, 10], [-2, 1, 13], 0xe4e0d2, 1)
                line3([0, 0, 11], [2, -1, 15], 0xe4e0d2, 1)
            }
        }
    } else {
        shadow(-5, -5, 5, 5)
        const a = TX.stone(0x8c8b83, 80 + v),
            b2 = TX.speck(0x9a9990, 82)
        if (v === 0) {
            blob(-1.5, -1, 2.5, 4.6, 4.2, a)
            blob(3, 2.5, 1.6, 2.8, 2.6, b2)
            blob(-4.5, 3, 1, 1.8, 1.6, b2)
        } else if (v === 1) {
            box(-4.5, -4, 1, 1.5, 0, 6, a, b2)
            box(-2, -1, 3.5, 4.5, 0, 3.6, a, b2)
            blob(4.5, -2, 1.4, 2.3, 2.2, b2)
        } else {
            blob(0, 0, 3.2, 5.2, 5.4, a)
            blob(-3.6, 3.4, 1.4, 2.4, 2.2, b2)
            blob(4.2, 1, 1.2, 2, 2, a)
        }
    }
}
export const sprCache = new Map()
export function sprite(t?, o?) {
    o = o || {}
    const key =
        t +
        '|' +
        (o.m || 0) +
        '|' +
        (o.v || 0) +
        '|' +
        (o.f || 0) +
        '|' +
        (o.tier || 0) +
        '|' +
        (o.st || 0) +
        '|' +
        (o.sw ? 1 : 0) +
        (o.op ? 1 : 0) +
        (o.up ? 1 : 0) +
        (o.sn ? 1 : 0) +
        '|' +
        (o.c || 0)
    let s = sprCache.get(key)
    if (!s) {
        Sp((DEF[t] && DEF[t].size) || 1)
        GV.cur.snow = !!o.sn
        recipe(t, o)
        s = finish()
        sprCache.set(key, s)
    }
    return s
}
export function propSprite(kind?, v?, se?) {
    const key = 'prop' + kind + '|' + v + '|' + se
    let s = sprCache.get(key)
    if (!s) {
        Sp(1)
        GV.cur.snow = se === 3
        recipeProp(kind, v, se)
        s = finish()
        sprCache.set(key, s)
    }
    return s
}
/* ---------- people sprites ---------- */
export const UP = {
    idle: { tunic: 0x8d7658, legs: 0x4a3e34, hat: 0x4a3324 },
    farmer: { tunic: 0xb48f36, legs: 0x5a4a32, hat: 0xd2b462 },
    woodcutter: { tunic: 0x6a3a2c, legs: 0x3e3a30, hat: 0x34552f },
    mason: { tunic: 0x687c8c, legs: 0x45403a, hat: 0x8e9aa3 },
    fisher: { tunic: 0x3a6f8c, legs: 0x4a4436, hat: 0xc4b98f },
    merchant: { tunic: 0x6f4688, legs: 0x3e3446, hat: 0x4c2f60 },
    sword: { tunic: 0x2a587a, legs: 0x3b3a40, hat: 0xa9b2b8 },
    pike: { tunic: 0x8a7a5a, legs: 0x3b3a40, hat: 0x8f979e },
    archer: { tunic: 0x5e4a30, legs: 0x4a3e30, hat: 0x2a5036 },
    captain: { tunic: 0x2a587a, legs: 0x2f2e36, hat: 0xb9c2c8 },
    knight: { tunic: 0x2a587a, legs: 0x3b3a40, hat: 0xb0b8be },
    scout: { tunic: 0x3b5a3a, legs: 0x4a3e30, hat: 0x2f4a2e },
    shield: { tunic: 0x5e6670, legs: 0x3b3a40, hat: 0x9aa2a8 },
    xbow: { tunic: 0x7a5a3a, legs: 0x4a3e30, hat: 0x6d7278 },
    eng: { tunic: 0x8a6a3a, legs: 0x4a3e30, hat: 0x5a4028 },
    hero: { tunic: 0x2e2a30, legs: 0x26242a, hat: 0xc8ccd0 },
    earcher: { tunic: 0x3e3830, legs: 0x2e2a26, hat: 0x2e2a26 },
    ladder: { tunic: 0x5e5038, legs: 0x3a3228, hat: 0x3e3226 },
    raider: { tunic: 0x342b30, legs: 0x2a2426, hat: 0x4f545a },
    brute: { tunic: 0x6a2822, legs: 0x2a2224, hat: 0x454a50 },
    looter: { tunic: 0x4d4028, legs: 0x2e2a22, hat: 0x2c2628 },
}
export const HAIR = [0x2a1e16, 0x5a3a22, 0x8a4a26, 0xa88a52, 0x6e6a64],
    SKIN = [0xd6aa82, 0xc4946a, 0x9c6e4a, 0xe0b894, 0xb88460]
export const unitCache = new Map()
export function unitSprite(role?, frame?, flip?, fac?, vr?) {
    vr = vr || 0
    const key = role + frame + (flip ? 'f' : '') + (fac || 0) + '.' + vr
    let cv = unitCache.get(key)
    if (cv) {
        return cv
    }
    const mounted = role === 'knight' || role === 'scout',
        big = role === 'brute' || role === 'hero'
    const w = mounted ? 40 : big ? 30 : 24,
        h = mounted ? 38 : big ? 37 : 31,
        P0 = UP[role]
    const civ = !(
        role in
        {
            sword: 1,
            pike: 1,
            archer: 1,
            captain: 1,
            knight: 1,
            shield: 1,
            xbow: 1,
            eng: 1,
            hero: 1,
            earcher: 1,
            raider: 1,
            brute: 1,
            looter: 1,
            ladder: 1,
        }
    )
    const P = civ
        ? Object.assign({}, P0, {
              tunic: tw(P0.tunic, [1, 0.9, 1.08, 0.95, 1.03][vr]),
          })
        : P0
    const trim = fac
        ? FCOL[fac]
        : role in
            {
                sword: 1,
                pike: 1,
                archer: 1,
                captain: 1,
                knight: 1,
                shield: 1,
                xbow: 1,
                eng: 1,
            }
          ? FCOL[0]
          : tw(P.tunic, 0.7)
    const px = new Uint8ClampedArray(w * h * 4)
    const set = (x?, y?, c?) => {
        if (x < 0 || y < 0 || x >= w || y >= h || c < 0) {
            return
        }
        const k = (x + y * w) * 4
        px[k] = (c >> 16) & 255
        px[k + 1] = (c >> 8) & 255
        px[k + 2] = c & 255
        px[k + 3] = 255
    }
    const R = (x?, y?, ww?, hh?, c?) => {
        for (let j = y; j < y + hh; j++) {
            for (let i = x; i < x + ww; i++) {
                set(i, j, c)
            }
        }
    }
    const line = (x0?, y0?, x1?, y1?, c?) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
        for (let k = 0; k <= n; k++) {
            set(
                Math.round(x0 + ((x1 - x0) * k) / n),
                Math.round(y0 + ((y1 - y0) * k) / n),
                c
            )
        }
    }
    const skin = SKIN[vr % 5],
        skinD = tw(skin, 0.82),
        skinL = tw(skin, 1.1),
        hair = HAIR[(vr * 3 + role.length) % 5],
        boot = 0x2a2019
    // ---- horse for mounted roles
    let cx = w >> 1,
        fy = h - 2
    if (mounted) {
        const hc = role === 'knight' ? 0x4a3426 : 0x857a6c,
            hd = tw(hc, 0.72),
            hl = tw(hc, 1.18),
            mane = role === 'knight' ? 0x1e1610 : 0x3a3028,
            by0 = 21,
            by1 = 28
        const legs = frame
            ? [
                  [9, 1],
                  [13, -1],
                  [25, -1],
                  [28, 1],
              ]
            : [
                  [10, 0],
                  [13, 0],
                  [25, 0],
                  [28, 0],
              ]
        for (const [lx, o] of legs) {
            R(lx + o, by1 - 1, 2, 8, hd)
            R(lx + o, by1, 1, 5, hc)
            R(lx + o, by1 + 6, 2, 1, 0x1a1412)
            set(lx + o + 1, by1 + 6, 0x0e0a08)
        }
        for (let y = by0; y <= by1; y++) {
            for (let x = 8; x <= 30; x++) {
                const ex = Math.min(x - 8, 30 - x),
                    ey = Math.min(y - by0, by1 - y)
                if (ex + ey < 2) {
                    continue
                }
                set(
                    x,
                    y,
                    y === by0
                        ? hl
                        : y >= by1 - 1
                          ? hd
                          : hsh(x, y, 501) < 0.1
                            ? tw(hc, 0.92)
                            : hc
                )
            }
        }
        for (let y = 12; y <= by0 + 2; y++) {
            const a0 = Math.round(27 + (by0 + 2 - y) * 0.5),
                a1 = Math.round(31 + (by0 + 2 - y) * 0.4)
            for (let x = a0; x <= a1; x++) {
                set(x, y, x === a1 ? hd : hc)
            }
            set(a0, y, mane)
            if (y % 2) {
                set(a0 - 1, y, mane)
            }
        }
        const head = [
            [10, 33, 35],
            [11, 32, 37],
            [12, 32, 38],
            [13, 33, 38],
            [14, 35, 38],
        ]
        for (const [y, x0, x1] of head) {
            for (let x = x0; x <= x1; x++) {
                set(x, y, y === 14 || x === 38 ? hd : y === 10 ? hl : hc)
            }
        }
        set(34, 11, 0x0c0a0a)
        set(38, 13, 0x0c0a0a)
        set(33, 8, hd)
        set(33, 9, hc)
        set(34, 9, hd)
        set(32, 10, mane)
        line(8, by0 + 1, 5, by0 + 8, mane)
        line(7, by0 + 1, 4, by0 + 7, tw(mane, 1.3))
        set(5, by0 + 9, mane)
        R(31, 12, 1, 3, 0x3a2a1c)
        R(32, 14, 6, 1, 0x3a2a1c)
        if (role === 'knight') {
            for (let y = by0 + 1; y <= by1 + 2; y++) {
                for (let x = 9; x <= 29; x++) {
                    if (y > by1 && (x + (y === by1 + 2 ? 1 : 0)) % 3 === 0) {
                        continue
                    }
                    const ch = ((x >> 1) + (y >> 1)) & 1
                    set(
                        x,
                        y,
                        y >= by1 + 1 ? C.gold : ch ? trim : tw(trim, 0.82)
                    )
                }
            }
            for (let y = 13; y <= by0 + 2; y++) {
                const a0 = Math.round(28 + (by0 + 2 - y) * 0.5),
                    a1 = Math.round(30 + (by0 + 2 - y) * 0.4)
                for (let x = a0; x <= a1; x++) {
                    set(x, y, (x + y) & 1 ? trim : tw(trim, 0.82))
                }
            }
            R(33, 10, 4, 2, 0x8f979e)
            set(33, 10, 0xc8d0d4)
        } else {
            R(14, by0 - 1, 9, 3, 0x6a4a2e)
            R(15, by0 - 1, 7, 1, 0x8a6a42)
            R(16, by0 + 2, 2, 4, 0x5a4028)
        }
        cx = 18
        fy = by0 + 4
    }
    const tW = big ? 10 : 7,
        tH = big ? 11 : 9,
        lH = mounted ? 0 : big ? 7 : 6,
        hS = big ? 7 : 5,
        aW = big ? 3 : 2
    const ty1 = fy - lH,
        ty0 = ty1 - tH,
        tx0 = cx - (tW >> 1),
        tx1 = tx0 + tW - 1
    const hx0 = cx - (hS >> 1),
        hy1 = ty0 - 1,
        hy0 = hy1 - hS + 1,
        sw = frame ? 1 : 0
    const by = ty0 + ((tH * 0.58) | 0)
    if (role === 'captain') {
        R(tx0 - 1, ty0 + 1, tW + 2, tH + 3, 0x6a1c1c)
        for (let y = ty0 + 3; y < ty0 + tH + 3; y += 2) {
            set(tx0 - 1, y, 0x501414)
        }
        R(tx0 - 1, ty0 + tH + 3, tW + 2, 1, 0x4e1414)
    }
    if (role === 'hero') {
        R(tx0 - 1, ty0 + 1, tW + 2, tH + 4, tw(trim, 0.62))
        for (let y = ty0 + 3; y < ty0 + tH + 4; y += 2) {
            set(tx0 - 1, y, tw(trim, 0.5))
        }
    }
    if (role === 'xbow') {
        R(tx0 - 2, ty0, 2, 7, 0x5e3e24)
        set(tx0 - 2, ty0 - 1, 0xd8d0b8)
        set(tx0 - 1, ty0 - 1, 0xd8d0b8)
    }
    if (role === 'scout') {
        R(tx0 - 2, ty0 + 1, tW + 2, tH + 2, 0x2c4a2c)
        R(tx0 - 2, ty0 + tH + 2, tW + 2, 1, 0x223a22)
    }
    if (role === 'archer' || role === 'earcher') {
        R(tx1 - 1, ty0 - 3, 3, 10, 0x5e3e24)
        R(tx1 - 1, ty0 + 2, 3, 1, 0x3e2814)
        R(tx1 - 1, ty0 - 4, 1, 2, 0xe4dcc4)
        R(tx1 + 1, ty0 - 4, 1, 2, 0xe4dcc4)
        set(tx1, ty0 - 5, 0xb83a2a)
    }
    if (!mounted) {
        const lw = big ? 3 : 2,
            lx0 = cx - (big ? 4 : 3),
            lx1 = cx + 1
        const leg = (x?, y0?, hh?) => {
            R(x, y0, lw, hh - 2, P.legs)
            R(x + lw - 1, y0, 1, hh - 2, tw(P.legs, 0.78))
            set(x, y0 + ((hh - 2) >> 1), tw(P.legs, 1.15))
            R(x, y0 + hh - 3, lw + 1, 3, boot)
            R(x, y0 + hh - 3, lw + 1, 1, 0x4a3624)
            set(x + lw, y0 + hh - 1, 0x140e0a)
        }
        if (!frame) {
            leg(lx0, ty1 + 1, lH)
            leg(lx1, ty1 + 1, lH)
        } else {
            leg(lx0 - 1, ty1 + 1, lH - 1)
            leg(lx1 + 1, ty1 + 1, lH)
        }
    } else {
        R(tx0 + 1, ty1, 2, 4, P.legs)
        R(tx0 + 1, ty1 + 3, 3, 2, boot)
    }
    const mail = role in { sword: 1, captain: 1, knight: 1, shield: 1, hero: 1 }
    for (let y = ty0; y <= ty1; y++) {
        for (let x = tx0; x <= tx1; x++) {
            let c = P.tunic
            if (x >= tx1 - 1) {
                c = (x + y) & 1 ? tw(c, 0.72) : tw(c, 0.84)
            } else if (x === tx0) {
                c = tw(c, 1.12)
            }
            if (y === ty0) {
                c = tw(c, 1.08)
            }
            if (y > by && y < ty1 - 1 && (x - tx0) % 3 === 2) {
                c = tw(c, 0.86)
            }
            if (role === 'woodcutter') {
                if ((x - tx0) % 3 === 0 || (y - ty0) % 3 === 0) {
                    c = tw(c, x === tx0 ? 0.95 : 0.75)
                }
                if ((x - tx0) % 3 === 0 && (y - ty0) % 3 === 0) {
                    c = 0x2a1a14
                }
            } else if (role === 'pike') {
                if ((y - ty0) % 2 === 1) {
                    c = tw(c, 0.84)
                }
                if ((x - tx0) % 3 === 1 && (y - ty0) % 2 === 0) {
                    c = tw(c, 1.06)
                }
            } else if (
                role === 'merchant' &&
                (x + y) % 4 === 0 &&
                x > tx0 &&
                x < tx1 - 1
            ) {
                c = tw(C.gold, 0.9)
            } else if (hsh(x, y, 401 + vr) < 0.07) {
                c = tw(c, 0.9)
            }
            set(x, y, c)
        }
    }
    if (mail) {
        for (let y = ty0; y <= ty1; y++) {
            for (const x of [tx0, tx1]) {
                set(x, y, (x + y) & 1 ? 0x8a9096 : 0x5e646a)
            }
        }
    }
    set(cx - 1, ty0, skinD)
    set(cx, ty0, tw(P.tunic, 0.7))
    set(cx - 1, ty0 + 1, tw(P.tunic, 0.7))
    R(tx0, ty1 - 1, tW, 2, tw(trim, 0.95))
    R(tx0, ty1, tW, 1, tw(trim, 0.72))
    R(tx0, by, tW, 1, 0x3a2a1e)
    set(cx - 1, by, C.gold)
    set(cx, by, tw(C.gold, 0.78))
    if (!mail && role !== 'merchant') {
        R(tx1 - 2, by + 1, 2, 2, 0x5a4028)
        set(tx1 - 2, by + 1, 0x7a5a38)
    }
    const ay = ty0 + 1,
        al = tH - 3
    const arm = (x?, dy?, dark?) => {
        for (let y = ay + dy; y < ay + dy + al; y++) {
            for (let i = 0; i < aW; i++) {
                let c = tw(P.tunic, dark ? 0.74 : 0.96)
                if (mail) {
                    c =
                        (x + i + y) & 1
                            ? dark
                                ? 0x6e747a
                                : 0x8f959b
                            : dark
                              ? 0x50565c
                              : 0x70767c
                }
                if (y === ay + dy + al - 1) {
                    c = tw(c, 0.8)
                }
                set(x + i, y, c)
            }
        }
        R(x, ay + dy + al, aW, 2, dark ? skinD : skin)
        if (role === 'archer' && !dark) {
            R(x, ay + dy + al - 2, aW, 2, 0x5a3e24)
        }
    }
    if (!mounted) {
        arm(tx0 - aW, sw, false)
    }
    arm(tx1 + 1, mounted ? 0 : -sw, true)
    R(cx - 1, hy1, 2, 1, skinD)
    for (let y = hy0; y < hy1; y++) {
        for (let x = hx0; x < hx0 + hS; x++) {
            set(x, y, x >= hx0 + hS - 1 ? skinD : skin)
        }
    }
    set(hx0 + 1, hy0 + 1, skinL)
    set(hx0 + hS - 3, hy0 + (hS >> 1), 0x1c1a22)
    set(hx0 + hS - 1, hy0 + (hS >> 1), 0x1c1a22)
    set(hx0 + hS - 2, hy0 + hS - 1, tw(skin, 0.72))
    const hairTop = (c?) => {
        for (let x = hx0; x < hx0 + hS; x++) {
            set(x, hy0 - 1, x % 2 ? c : tw(c, 1.18))
            set(x, hy0, x % 2 ? tw(c, 0.85) : c)
        }
        R(hx0, hy0 + 1, 1, 3, c)
        set(hx0 + 1, hy0 + 1, tw(c, 0.85))
    }
    const coif = () => {
        R(hx0 - 1, hy0, 1, hS, 0x6e747a)
        for (let y = hy0; y < hy1; y++) {
            set(hx0 - 1, y, y & 1 ? 0x8a9096 : 0x5e646a)
        }
    }
    const helm = (c?, nasal?) => {
        R(hx0 - 1, hy0 - 2, hS + 2, 4, c)
        R(hx0, hy0 - 3, hS, 1, tw(c, 1.15))
        R(hx0 - 1, hy0 - 2, hS + 2, 1, tw(c, 1.22))
        set(hx0, hy0 - 1, tw(c, 1.3))
        R(hx0 - 1, hy0 + 2, 1, 3, tw(c, 0.8))
        if (nasal) {
            R(hx0 + hS - 2, hy0 + 2, 1, 2, tw(c, 0.9))
        }
        R(hx0 + hS, hy0 - 1, 1, 3, tw(c, 0.7))
        for (let x = hx0; x < hx0 + hS; x += 2) {
            set(x, hy0 + 1, tw(c, 0.85))
        }
    }
    const hood = (c?) => {
        R(hx0 - 1, hy0 - 2, hS + 2, 3, c)
        R(hx0 - 1, hy0 + 1, 2, hS - 1, c)
        R(hx0 + hS, hy0 + 1, 1, 2, tw(c, 0.75))
        R(hx0, hy0 - 3, hS - 1, 1, tw(c, 1.12))
        for (let x = hx0; x < hx0 + hS; x += 2) {
            set(x, hy0 - 1, tw(c, 0.86))
        }
        set(hx0 - 1, hy0 + hS - 1, tw(c, 0.7))
    }
    const fur = () => {
        for (let x = tx0 - 1; x <= tx1 + 1; x++) {
            for (let y = ty0 - 1; y <= ty0 + 1; y++) {
                const n = hsh(x, y, 520)
                set(x, y, n < 0.33 ? 0x4a3a2a : n < 0.66 ? 0x6a5640 : 0x7e6a50)
            }
        }
    }
    const rx = tx1 + 1 + aW,
        hy = ay + al
    switch (role) {
        case 'idle':
            hairTop(hair)
            break
        case 'farmer':
            for (let x = hx0 - 3; x < hx0 + hS + 3; x++) {
                set(x, hy0, x & 1 ? tw(P.hat, 0.85) : tw(P.hat, 0.96))
            }
            R(hx0 - 2, hy0 - 1, hS + 4, 1, P.hat)
            for (let x = hx0 + 1; x < hx0 + hS - 1; x++) {
                set(x, hy0 - 3, x & 1 ? P.hat : tw(P.hat, 1.1))
                set(x, hy0 - 2, x & 1 ? tw(P.hat, 1.08) : P.hat)
            }
            R(hx0 + 1, hy0 - 1, hS - 2, 1, 0x7a5a2a)
            R(tx0 + 1, by + 1, tW - 2, ty1 - by - 2, 0xc8b88a)
            line(rx, hy + 1, rx + 2, hy0 - 2, 0x6b4a2a)
            R(rx + 1, hy0 - 4, 1, 3, 0x9aa2a8)
            R(rx + 3, hy0 - 4, 1, 3, 0x9aa2a8)
            R(rx + 1, hy0 - 2, 3, 1, 0x9aa2a8)
            break
        case 'woodcutter':
            hood(P.hat)
            line(rx, hy + 2, rx, ay - 4, 0x6b4a2a)
            set(rx, ay, 0x4a3018)
            R(rx, ay - 6, 4, 4, 0x9aa3aa)
            R(rx + 3, ay - 6, 1, 4, 0xdfe6ea)
            R(rx, ay - 6, 4, 1, 0xc4ccd2)
            set(rx + 1, ay - 4, 0x6e767c)
            break
        case 'mason':
            R(hx0, hy0 - 1, hS, 2, P.hat)
            R(hx0 + hS - 1, hy0, 2, 1, tw(P.hat, 0.8))
            set(hx0 + 1, hy0 - 1, tw(P.hat, 1.2))
            R(tx0 + 1, by + 1, tW - 2, ty1 - by - 1, 0xb5a785)
            R(tx0 + 1, by + 1, tW - 2, 1, 0x8c7f62)
            for (let k = 0; k < 4; k++) {
                set(
                    tx0 + 1 + ((hsh(k, 3, 530) * (tW - 2)) | 0),
                    by + 2 + ((hsh(k, 4, 530) * 3) | 0),
                    0xd8d0c0
                )
            }
            line(rx, hy + 1, rx, ay - 2, 0x6b4a2a)
            R(rx - 1, ay - 4, 4, 2, 0x6d7278)
            R(rx - 1, ay - 4, 4, 1, 0x9aa0a6)
            break
        case 'fisher':
            R(hx0 - 2, hy0, hS + 4, 1, tw(P.hat, 0.88))
            R(hx0, hy0 - 2, hS, 2, P.hat)
            hairTop(hair)
            R(hx0 - 2, hy0, hS + 4, 1, tw(P.hat, 0.88))
            R(hx0, hy0 - 2, hS, 2, P.hat)
            line(rx, hy + 1, rx + 5, hy0 - 6, 0x6b4a2a)
            line(rx + 5, hy0 - 6, rx + 5, hy0 + 4, 0xb8c2c8)
            R(rx + 4, hy0 + 5, 3, 2, 0x8fa8b4)
            set(rx + 4, hy0 + 5, 0xc8d8e0)
            break
        case 'merchant':
            R(hx0 - 1, hy0 - 2, hS + 2, 3, P.hat)
            R(hx0 - 1, hy0 + 1, hS + 2, 1, tw(P.hat, 0.75))
            R(hx0 - 1, hy0 - 2, hS + 2, 1, tw(P.hat, 1.2))
            line(hx0 + hS, hy0 - 2, hx0 + hS + 2, hy0 - 6, C.gold)
            set(hx0 + hS + 1, hy0 - 5, tw(C.gold, 1.2))
            line(tx0, ty0, tx1, by, 0x6b4a2a)
            R(tx0 - 4, by - 1, 4, 5, 0xa88f60)
            R(tx0 - 4, by - 1, 4, 1, 0x7c6744)
            set(tx0 - 2, by + 1, C.gold)
            set(tx0 - 3, by + 3, 0x7c6744)
            break
        case 'sword':
        case 'captain':
        case 'knight': {
            if (role === 'knight') {
                R(hx0 - 1, hy0 - 2, hS + 2, hS + 1, P.hat)
                R(hx0 - 1, hy0 - 2, hS + 2, 1, tw(P.hat, 1.25))
                R(hx0, hy0 + 1, hS + 1, 1, 0x101014)
                set(hx0 + hS - 1, hy0 + 3, 0x101014)
                R(hx0 + hS, hy0 - 2, 1, hS + 1, tw(P.hat, 0.72))
                R(hx0 + 1, hy0 - 4, 2, 2, trim)
            } else {
                coif()
                helm(P.hat, true)
            }
            R(cx - 2, ty0 + 1, 4, tH - 2, trim)
            R(cx - 2, ty0 + 1, 1, tH - 2, tw(trim, 1.15))
            set(cx - 1, ty0 + 3, C.gold)
            set(cx, ty0 + 3, C.gold)
            set(cx - 1, ty0 + 4, C.gold)
            set(cx - 1, ty0 + 2, C.gold)
            const sx = tx0 - aW - 4,
                sy = ty0
            R(sx, sy, 6, 9, 0x5a5f66)
            R(sx + 1, sy + 1, 4, 7, trim)
            R(sx + 1, sy + 1, 1, 7, tw(trim, 1.15))
            R(sx + 4, sy + 1, 1, 7, tw(trim, 0.8))
            R(sx + 2, sy + 3, 2, 2, C.gold)
            set(sx + 2, sy + 3, tw(C.gold, 1.25))
            R(sx + 1, sy + 8, 4, 1, 0x5a5f66)
            set(sx + 2, sy + 9, 0x5a5f66)
            set(sx + 3, sy + 9, 0x5a5f66)
            if (role === 'knight') {
                line(rx - 1, hy, rx + 12, hy0 - 10, 0x7a5a36)
                line(rx + 12, hy0 - 10, rx + 14, hy0 - 12, 0xd8e0e4)
                R(rx + 9, hy0 - 9, 3, 2, trim)
            } else {
                line(rx, hy + 1, rx, hy0 - 3, 0xd8e0e4)
                line(rx + 1, hy, rx + 1, hy0 - 2, 0x9aa4ac)
                set(rx, hy0 - 4, 0xffffff)
                R(rx - 1, hy - 1, 4, 1, C.gold)
                R(rx, hy, 1, 3, 0x4a3424)
            }
            if (role === 'captain') {
                R(hx0 + 1, hy0 - 6, 3, 4, 0xb8302a)
                R(hx0 + 2, hy0 - 7, 2, 1, 0xd8483c)
                set(hx0 + 1, hy0 - 6, 0xe0604a)
                R(hx0 - 1, hy0 + 1, hS + 2, 1, C.gold)
                R(tx0, ty0, tW, 1, C.gold)
            }
            break
        }
        case 'shield': {
            coif()
            helm(P.hat, true)
            R(cx - 1, ty0 + 2, 2, tH - 4, trim)
            line(rx, h - 3, rx, hy0 - 6, 0x6b4a2a)
            R(rx - 1, hy0 - 9, 3, 3, 0xc8d0d4)
            set(rx, hy0 - 10, 0xffffff)
            // A tall kite shield covers the whole body.
            const sx = tx0 - aW - 3,
                sy = ty0 - 2
            for (let j = 0; j < 14; j++) {
                const ins = j > 9 ? j - 9 : 0
                for (let i = ins; i < 8 - ins; i++) {
                    const edge = i === ins || i === 7 - ins || j === 0
                    set(
                        sx + i,
                        sy + j,
                        edge ? 0x4a4f56 : i < 4 ? trim : tw(trim, 0.8)
                    )
                }
            }
            R(sx + 3, sy + 2, 2, 9, C.gold)
            R(sx + 1, sy + 5, 6, 2, C.gold)
            set(sx + 3, sy + 2, tw(C.gold, 1.25))
            break
        }
        case 'xbow': {
            R(hx0 - 2, hy0 - 1, hS + 4, 1, tw(P.hat, 0.85))
            R(hx0 - 1, hy0 - 3, hS + 2, 2, P.hat)
            R(hx0, hy0 - 4, hS, 1, tw(P.hat, 1.2))
            R(cx - 1, ty0 + 2, 2, tH - 4, trim)
            // The crossbow, held level across the chest.
            const yb = by - 2
            line(tx0 - 1, yb, rx + 3, yb, 0x6b4a2a)
            line(tx0, yb + 1, rx + 1, yb + 1, 0x4a3018)
            line(rx + 4, yb - 4, rx + 4, yb + 4, 0x8f979e)
            set(rx + 3, yb - 4, 0x6d7278)
            set(rx + 3, yb + 4, 0x6d7278)
            line(rx + 3, yb - 3, rx, yb, 0xd8d0b8)
            line(rx + 3, yb + 3, rx, yb, 0xd8d0b8)
            break
        }
        case 'eng': {
            R(hx0 - 1, hy0 - 2, hS + 2, 3, P.hat)
            R(hx0, hy0 - 3, hS, 1, tw(P.hat, 1.2))
            R(hx0 + hS, hy0, 1, 2, tw(P.hat, 0.75))
            R(tx0 + 1, by + 1, tW - 2, ty1 - by - 1, 0x8c7a5a)
            R(tx0 + 1, by + 1, tW - 2, 1, 0x6a5a40)
            line(rx, hy + 1, rx, ay - 5, 0x6b4a2a)
            line(rx - 3, ay - 6, rx + 3, ay - 4, 0x9aa0a6)
            set(rx - 3, ay - 6, 0xd8e0e4)
            set(rx + 3, ay - 4, 0xd8e0e4)
            break
        }
        case 'hero': {
            R(hx0 - 1, hy0 - 2, hS + 2, hS + 1, P.hat)
            R(hx0 - 1, hy0 - 2, hS + 2, 1, tw(P.hat, 1.25))
            R(hx0, hy0 + 2, hS + 1, 1, 0x101014)
            R(hx0 + hS, hy0 - 2, 1, hS + 1, tw(P.hat, 0.72))
            R(hx0 + 1, hy0 - 6, 3, 4, trim)
            R(hx0 + 2, hy0 - 7, 2, 1, tw(trim, 1.25))
            R(cx - 2, ty0 + 1, 4, tH - 2, trim)
            R(cx - 2, ty0 + 1, 1, tH - 2, tw(trim, 1.15))
            R(cx - 1, ty0 + 3, 2, 2, C.gold)
            line(rx, hy + 1, rx, hy0 - 7, 0xd8e0e4)
            line(rx + 1, hy, rx + 1, hy0 - 6, 0x9aa4ac)
            set(rx, hy0 - 8, 0xffffff)
            R(rx - 2, hy - 1, 5, 1, C.gold)
            R(rx, hy, 1, 3, 0x4a3424)
            break
        }
        case 'pike':
            coif()
            R(hx0 - 2, hy0 - 1, hS + 4, 1, tw(P.hat, 0.9))
            R(hx0, hy0 - 3, hS, 2, P.hat)
            R(hx0, hy0 - 3, hS, 1, tw(P.hat, 1.2))
            set(hx0 - 2, hy0 - 1, tw(P.hat, 0.7))
            R(cx - 1, ty0 + 2, 2, tH - 4, trim)
            line(rx, h - 3, rx, 1, 0x6b4a2a)
            line(rx + 1, h - 4, rx + 1, 3, 0x8a6a42)
            R(rx, 0, 2, 3, 0xc8d0d4)
            set(rx, 0, 0xffffff)
            set(rx + 1, 4, 0xb83a2a)
            break
        case 'scout':
            hood(P.hat)
            line(rx, hy, rx + 2, hy - 4, 0x6b4a2a)
            break
        case 'archer':
        case 'earcher':
            hood(P.hat)
            if (role === 'earcher') {
                R(hx0 - 1, hy0 + 1, hS + 1, 1, trim)
            }
            for (let y = ty0 + 1; y < by; y += 2) {
                set(cx - 2, y, tw(P.tunic, 1.3))
            }
            line(rx + 2, ty0 - 4, rx + 3, ty0 - 2, 0x7a4e28)
            line(rx + 3, ty0 - 2, rx + 3, ty1 - 1, 0x7a4e28)
            line(rx + 3, ty1 - 1, rx + 2, ty1 + 1, 0x7a4e28)
            set(rx + 3, ty0 + 3, 0x4a2e14)
            line(rx + 1, ty0 - 3, rx + 1, ty1, 0xd8d0b8)
            break
        case 'raider':
        case 'brute':
        case 'looter':
        case 'ladder': {
            if (role === 'looter') {
                hood(P.hat)
            } else if (role === 'ladder') {
                hairTop(hair)
            } else {
                fur()
                helm(P.hat, false)
                const hc = 0xe0d6bc
                line(hx0 - 2, hy0, hx0 - 3, hy0 - 4, hc)
                set(hx0 - 2, hy0 - 5, hc)
                set(hx0 - 3, hy0 - 1, 0xb8ae94)
                line(hx0 + hS + 1, hy0, hx0 + hS + 2, hy0 - 4, hc)
                set(hx0 + hS + 1, hy0 - 5, hc)
                set(hx0 + hS + 2, hy0 - 1, 0xb8ae94)
            }
            R(hx0 + hS - 3, hy0 + (hS >> 1) - 1, 3, 1, trim)
            R(cx - 1, ty0 + 2, 2, by - ty0 - 2, trim)
            if (role === 'brute') {
                R(cx - 2, by, 3, 2, 0xd8d0bc)
                set(cx - 1, by + 1, 0x1a1414)
            }
            if (role === 'raider') {
                line(rx, hy + 2, rx, ay - 3, 0x5e4026)
                R(rx, ay - 5, 3, 4, 0x8f979e)
                R(rx + 2, ay - 5, 1, 4, 0xc8d0d4)
                set(rx, ay - 5, 0x6a7278)
            }
            if (role === 'brute') {
                line(rx + 1, hy + 3, rx + 1, hy0 - 4, 0x4f3622)
                R(rx - 1, hy0 - 7, 6, 5, 0x6d7278)
                R(rx + 4, hy0 - 7, 1, 5, 0xb8c0c6)
                R(rx - 1, hy0 - 7, 6, 1, 0x9aa0a6)
                set(rx, hy0 - 4, 0x5a1a14)
                set(rx + 1, hy0 - 3, 0x5a1a14)
            }
            if (role === 'looter') {
                line(rx, hy + 1, rx, ay - 2, 0x5e4026)
                R(rx - 1, ay - 6, 3, 4, 0xff9a2a)
                R(rx, ay - 7, 1, 2, 0xffe06a)
                set(rx, ay - 4, 0xffe06a)
                set(rx - 1, ay - 3, 0xc84a1a)
            }
            if (role === 'ladder') {
                for (const lx of [rx, rx + 4]) {
                    line(lx, 2, lx, h - 6, 0x7a5a36)
                }
                for (let y = 4; y < h - 6; y += 4) {
                    R(rx + 1, y, 3, 1, 0xa88052)
                }
            }
            break
        }
    }
    const out = new Uint8ClampedArray(px)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = x + y * w
            if (px[i * 4 + 3]) {
                const q = grade(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])
                out[i * 4] = q[0]
                out[i * 4 + 1] = q[1]
                out[i * 4 + 2] = q[2]
                continue
            }
            if (
                (x > 0 && px[(i - 1) * 4 + 3]) ||
                (x < w - 1 && px[(i + 1) * 4 + 3]) ||
                (y > 0 && px[(i - w) * 4 + 3]) ||
                (y < h - 1 && px[(i + w) * 4 + 3])
            ) {
                out[i * 4] = 20
                out[i * 4 + 1] = 16
                out[i * 4 + 2] = 24
                out[i * 4 + 3] = 255
            }
        }
    }
    cv = toCanvas(w, h, out)
    if (flip) {
        const c2 = document.createElement('canvas')
        c2.width = w
        c2.height = h
        const g = c2.getContext('2d')
        g.translate(w, 0)
        g.scale(-1, 1)
        g.drawImage(cv, 0, 0)
        cv = c2
    }
    unitCache.set(key, cv)
    return cv
}
