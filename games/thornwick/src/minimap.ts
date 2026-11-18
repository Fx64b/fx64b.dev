import { BCOL } from './army'
import { $, FCOL, N, OX, OY } from './config'
import { lookAt } from './input'
import { Z, cam } from './render'
import { bmap, clampN, fcol, reg, seenAt, terrain } from './state'
import { GV } from './vars'
import { fogHides } from './weather'

export const mcv = $('#mini'),
    mctx = mcv.getContext('2d')
GV.mim = null
/* The small map shows a square round the open land, so it stays useful while the
   world is still small. GV.mm is that square: its corner and its side in tiles. */
function miniFrame() {
    const b = GV.wb,
        M = Math.min(N, Math.max(b.x1 - b.x0, b.y1 - b.y0) + 9),
        x0 = Math.round((b.x0 + b.x1 - M) / 2),
        y0 = Math.round((b.y0 + b.y1 - M) / 2)
    if (!GV.mm || GV.mm.M !== M) {
        mcv.width = 2 * M
        mcv.height = M
        GV.mim = null
    }
    GV.mm = { x0, y0, M }
    return GV.mm
}
export function drawMini() {
    if (!GV.S) {
        return
    }
    const { x0: mx0, y0: my0, M } = miniFrame()
    if (!GV.mim) {
        GV.mim = mctx.createImageData(2 * M, M)
    }
    const d = GV.mim.data
    d.fill(0)
    const set = (x?, y?, r?, g?, b?) => {
        const px = M + (x - mx0 - (y - my0)),
            py = (x - mx0 + (y - my0)) >> 1
        if (px < 0 || px > 2 * M - 2 || py < 0 || py > M - 1) {
            return
        }
        for (let k = 0; k < 2; k++) {
            const j = (px + k + py * 2 * M) * 4
            d[j] = r
            d[j + 1] = g
            d[j + 2] = b
            d[j + 3] = 255
        }
    }
    const winter = GV.curSeason === 3
    for (let y = Math.max(0, my0); y < Math.min(N, my0 + M); y++) {
        for (let x = Math.max(0, mx0); x < Math.min(N, mx0 + M); x++) {
            const i = x + y * N,
                rg = GV.regs[reg[i]]
            if (!rg.disc) {
                if (rg.gen) {
                    set(x, y, 30, 40, 54)
                } else {
                    set(x, y, 104, 114, 126)
                }
                continue
            }
            const t = terrain[i],
                b = bmap[i],
                own = rg.owner === 0
            if (b) {
                if (b.o === 0) {
                    set(x, y, 244, 236, 204)
                } else {
                    const c = FCOL[fcol(b.o)]
                    set(
                        x,
                        y,
                        Math.min(255, ((c >> 16) & 255) + 40),
                        Math.min(255, ((c >> 8) & 255) + 40),
                        Math.min(255, (c & 255) + 40)
                    )
                }
            } else if (t === 3) {
                set(x, y, 63, 134, 176)
            } else if (t === 1) {
                set(
                    x,
                    y,
                    winter ? 150 : 47,
                    winter ? 170 : 111,
                    winter ? 160 : 69
                )
            } else if (t === 2 || t === 4) {
                set(x, y, 150, 150, 140)
            } else if (winter) {
                set(x, y, own ? 232 : 180, own ? 238 : 188, own ? 242 : 196)
            } else {
                set(x, y, own ? 118 : 74, own ? 180 : 122, own ? 78 : 60)
            }
        }
    }
    for (const p of GV.props) {
        if (p.k === 4 && seenAt(p.x, p.y)) {
            set(p.x, p.y, 236, 196, 80)
        }
    }
    for (const e of GV.S.en) {
        if (fogHides(e)) {
            continue
        }
        if (
            seenAt(e.x, e.y) &&
            (e.mode === 'atk' || e.mode === 'war' || e.mode === 'scout')
        ) {
            if (e.mode !== 'war') {
                set(clampN(e.x), clampN(e.y), 240, 60, 50)
            } else {
                const c = FCOL[fcol(e.fac)]
                set(
                    clampN(e.x),
                    clampN(e.y),
                    (c >> 16) & 255,
                    (c >> 8) & 255,
                    c & 255
                )
            }
        }
    }
    for (const s of GV.S.sold) {
        set(clampN(s.x), clampN(s.y), 90, 190, 250)
    }
    for (const bn of GV.S.banners) {
        const c = parseInt(BCOL[bn.id - 1].slice(1), 16)
        for (const [a, b] of [
            [0, 0],
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
        ]) {
            set(bn.x + a, bn.y + b, 255, 220, 60)
        }
        set(bn.x, bn.y, (c >> 16) & 255, (c >> 8) & 255, c & 255)
    }
    mctx.putImageData(GV.mim, 0, 0)
    // Rings where an attack or a fire has just started.
    for (const p of GV.pings) {
        const age = GV.animT - p.t
        if (age > 6 || age < 0) {
            continue
        }
        const px = M + (p.x - mx0 - (p.y - my0)),
            py = (p.x - mx0 + (p.y - my0)) / 2
        mctx.globalAlpha = Math.max(0, 1 - age / 6)
        mctx.strokeStyle = p.kind === 'fire' ? '#ff9a2a' : '#ff3c30'
        mctx.lineWidth = 3
        for (const r of [6 + ((age * 14) % 28), 4]) {
            mctx.beginPath()
            mctx.arc(px, py, r, 0, 7)
            mctx.stroke()
        }
    }
    mctx.globalAlpha = 1
    const z = Z(),
        c0 = [(GV.W / 2 - cam.x) / z - OX, (GV.H / 2 - cam.y) / z - OY],
        gx = (c0[0] / 16 + c0[1] / 8) / 2,
        gy = (c0[1] / 8 - c0[0] / 16) / 2
    const vw = GV.W / z / 16,
        vh = GV.H / z / 16
    mctx.strokeStyle = '#fff'
    mctx.lineWidth = 3
    mctx.strokeRect(
        Math.round(M + (gx - mx0 - (gy - my0)) - vw / 2) + 0.5,
        Math.round((gx - mx0 + (gy - my0)) / 2 - vh / 2) + 0.5,
        Math.round(vw),
        Math.round(vh)
    )
}
export function miniGo(e?) {
    const r = mcv.getBoundingClientRect(),
        f = GV.mm || { x0: 0, y0: 0, M: N },
        px = ((e.clientX - r.left) / r.width) * 2 * f.M - f.M,
        py = ((e.clientY - r.top) / r.height) * f.M * 2
    lookAt((px + py) / 2 + f.x0, (py - px) / 2 + f.y0)
}
mcv.addEventListener('pointerdown', (e?) => {
    mcv.setPointerCapture(e.pointerId)
    mcv._d = true
    miniGo(e)
})
mcv.addEventListener('pointermove', (e?) => {
    if (mcv._d) {
        miniGo(e)
    }
})
mcv.addEventListener('pointerup', () => {
    mcv._d = false
})
mcv.addEventListener('pointercancel', () => {
    mcv._d = false
})
