import { $, FCOL, N, OX, OY } from './config'
import { lookAt } from './input'
import { Z, cam } from './render'
import { bmap, clampN, fcol, reg, seenAt, terrain } from './state'
import { GV } from './vars'

export const mcv = $('#mini'),
    mctx = mcv.getContext('2d')
GV.mim = null
export function drawMini() {
    if (!GV.S) {
        return
    }
    if (!GV.mim) {
        GV.mim = mctx.createImageData(2 * N, N)
    }
    const d = GV.mim.data
    d.fill(0)
    const set = (x?, y?, r?, g?, b?) => {
        const px = N + (x - y),
            py = (x + y) >> 1
        if (px < 0 || px > 2 * N - 2 || py < 0 || py > N - 1) {
            return
        }
        for (let k = 0; k < 2; k++) {
            const j = (px + k + py * 2 * N) * 4
            d[j] = r
            d[j + 1] = g
            d[j + 2] = b
            d[j + 3] = 255
        }
    }
    const winter = GV.curSeason === 3
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const i = x + y * N,
                rg = GV.regs[reg[i]]
            if (!rg.disc) {
                set(x, y, 30, 40, 54)
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
        if (seenAt(e.x, e.y) && (e.mode === 'atk' || e.mode === 'war')) {
            if (e.mode === 'atk') {
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
    if (GV.S.flag) {
        set(GV.S.flag[0], GV.S.flag[1], 255, 220, 60)
    }
    mctx.putImageData(GV.mim, 0, 0)
    const z = Z(),
        c0 = [(GV.W / 2 - cam.x) / z - OX, (GV.H / 2 - cam.y) / z - OY],
        gx = (c0[0] / 16 + c0[1] / 8) / 2,
        gy = (c0[1] / 8 - c0[0] / 16) / 2
    const vw = GV.W / z / 16,
        vh = GV.H / z / 16
    mctx.strokeStyle = '#fff'
    mctx.lineWidth = 3
    mctx.strokeRect(
        Math.round(N + (gx - gy) - vw / 2) + 0.5,
        Math.round((gx + gy) / 2 - vh / 2) + 0.5,
        Math.round(vw),
        Math.round(vh)
    )
}
export function miniGo(e?) {
    const r = mcv.getBoundingClientRect(),
        px = ((e.clientX - r.left) / r.width) * 2 * N - N,
        py = ((e.clientY - r.top) / r.height) * N * 2
    lookAt((px + py) / 2, (py - px) / 2)
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
