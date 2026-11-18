/* Sprites for the living world: deer, boar and wolves, the hunter's lodge, and the
   looks of hunters and travellers (borrowed from the villager and soldier sprites). */
import { C, grade, hsh, tw } from './noise'
import {
    TX,
    blob,
    box,
    cyl,
    gable,
    line3,
    plot,
    shadow,
    toCanvas,
} from './sprites'

export function lodgeRecipe() {
    shadow(-7, -7, 4, 4)
    const b = box(-6.5, -6.5, 2, 2.5, 0, 5.5, TX.logs(C.wood))
    b.L(3, 0, 3, 5, TX.door(3, 5))
    b.R(3.5, 2, 3, 3, TX.win(0))
    gable(
        -7.5,
        -7.5,
        3,
        3.5,
        5,
        5,
        TX.thatch(tw(C.thatch, 0.85), 211),
        TX.logs(C.woodD),
        'x',
        1
    )
    // Antlers over the door.
    line3([-2.5, 3.6, 7.2], [-3.6, 3.6, 8.6], 0xe8dcc0, 1)
    line3([-2.5, 3.6, 7.2], [-1.4, 3.6, 8.6], 0xe8dcc0, 1)
    plot(-3.9, 3.6, 8.9, 0xe8dcc0, 1, 0.4)
    plot(-1.1, 3.6, 8.9, 0xe8dcc0, 1, 0.4)
    // A drying rack with meat, and a hide stretched on a frame.
    for (const y of [-4, 2]) {
        line3([5, y, 0], [5, y, 4.5], C.woodD, 1)
    }
    line3([5, -4, 4.5], [5, 2, 4.5], C.woodD, 1)
    for (let k = 0; k < 4; k++) {
        line3([5, -3 + k * 1.4, 4.4], [5, -3 + k * 1.4, 2.6], 0xa84a38, 1)
    }
    box(-6, 4, -2.6, 4.4, 0.4, 3.6, (u?, v?) =>
        hsh(u, v, 212) < 0.2 ? 0x9a7a52 : 0xb89060
    )
    cyl(0.8, 5.5, 0.9, 0, 0.6, TX.flat(0x3a2a1c), TX.flat(0x5a4028))
    blob(0.8, 5.5, 0.8, 0.5, 0.4, TX.flat(0xe07a2a))
}

/* ---------- animals: small hand-made pixel sprites ---------- */
const LOOK = {
    deer: {
        body: 0x9a6a3e,
        belly: 0xd9b88a,
        dark: 0x5e3e24,
        rx: 6,
        ry: 2.6,
        by: 8,
        leg: 6,
    },
    boar: {
        body: 0x4e3e34,
        belly: 0x6e5a4a,
        dark: 0x2a201a,
        rx: 6.2,
        ry: 3.4,
        by: 10,
        leg: 4,
    },
    wolf: {
        body: 0x7c7a76,
        belly: 0xbab6ae,
        dark: 0x45433f,
        rx: 6.2,
        ry: 2.4,
        by: 9,
        leg: 4,
    },
}
const cache = new Map()
/** frame 0 or 1: walking; 2: lying dead. */
export function animalSprite(k?, frame?, flip?) {
    const key = k + frame + (flip ? 'f' : '')
    let cv = cache.get(key)
    if (cv) {
        return cv
    }
    const w = 26,
        h = 20,
        L = LOOK[k],
        px = new Uint8ClampedArray(w * h * 4)
    const set = (x?, y?, c?) => {
        x = Math.round(x)
        y = Math.round(y)
        if (x < 0 || y < 0 || x >= w || y >= h) {
            return
        }
        const i = (x + y * w) * 4
        px[i] = (c >> 16) & 255
        px[i + 1] = (c >> 8) & 255
        px[i + 2] = c & 255
        px[i + 3] = 255
    }
    const line = (x0?, y0?, x1?, y1?, c?) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
        for (let s = 0; s <= n; s++) {
            set(x0 + ((x1 - x0) * s) / n, y0 + ((y1 - y0) * s) / n, c)
        }
    }
    const dead = frame === 2,
        cx = 12,
        by = dead ? h - 4 : L.by,
        ry = dead ? L.ry * 0.8 : L.ry
    if (!dead) {
        const sw = frame ? 1 : 0,
            gy = by + L.leg + 1
        for (const [lx, o] of [
            [cx - 4, sw],
            [cx - 2, -sw],
            [cx + 3, -sw],
            [cx + 5, sw],
        ]) {
            line(lx, by + 1, lx + o, gy, L.dark)
            set(lx + o, gy, 0x1a1412)
        }
    }
    for (let y = -ry; y <= ry; y++) {
        for (let x = -L.rx; x <= L.rx; x++) {
            if ((x / L.rx) ** 2 + (y / ry) ** 2 > 1) {
                continue
            }
            let c = y > ry * 0.35 ? L.belly : L.body
            if (y < -ry * 0.5) {
                c = tw(c, 1.12)
            }
            if (k === 'boar' && y < 0 && hsh(x, y, 301) < 0.3) {
                c = L.dark
            }
            set(cx + x, by + y, c)
        }
    }
    const hx = cx + L.rx,
        hy = by - (k === 'deer' ? 4 : k === 'wolf' ? 2 : 0)
    if (k === 'deer') {
        // Neck, head, ears and small antlers, and a white tail.
        line(hx - 1, by - 1, hx + 1, hy, L.body)
        line(hx - 2, by - 1, hx, hy, L.body)
        for (let x = 0; x < 4; x++) {
            set(hx + x, hy, L.body)
            set(hx + x, hy + 1, x > 2 ? L.dark : L.body)
        }
        set(hx + 4, hy + 1, 0x1a1412)
        set(hx, hy - 1, L.dark)
        line(hx + 1, hy - 1, hx, hy - 4, 0xd8c8a0)
        line(hx + 1, hy - 3, hx + 3, hy - 5, 0xd8c8a0)
        set(cx - L.rx, by - 1, 0xf2ece0)
        set(cx - L.rx - 1, by - 1, 0xf2ece0)
    } else if (k === 'boar') {
        for (let y = -2; y <= 2; y++) {
            for (let x = 0; x < 4 - Math.abs(y) * 0.5; x++) {
                set(hx + x, hy + y, y > 0 ? L.belly : L.body)
            }
        }
        set(hx + 4, hy + 1, 0x3a2a24)
        set(hx + 2, hy - 1, 0x0e0a08)
        set(hx + 3, hy + 2, 0xf2ece0)
        set(hx, hy - 3, L.dark)
        line(cx - L.rx, by - 1, cx - L.rx - 2, by + 1, L.dark)
    } else {
        // Wolf: long snout, pointed ears, bushy tail.
        for (let x = 0; x < 3; x++) {
            set(hx + x, hy, L.body)
            set(hx + x, hy + 1, L.belly)
        }
        for (let x = 3; x < 6; x++) {
            set(hx + x, hy + 1, L.body)
        }
        set(hx + 6, hy + 1, 0x0e0a08)
        set(hx + 2, hy, 0xe8c050)
        set(hx, hy - 1, L.dark)
        set(hx, hy - 2, L.dark)
        set(hx + 1, hy - 1, L.body)
        line(cx - L.rx, by - 1, cx - L.rx - 4, by + 2, L.body)
        line(cx - L.rx, by, cx - L.rx - 4, by + 3, L.dark)
    }
    if (dead) {
        set(cx, by - ry, 0x8a2a20)
        set(cx + 1, by - ry, 0x8a2a20)
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
            } else if (
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
    cache.set(key, cv)
    return cv
}
