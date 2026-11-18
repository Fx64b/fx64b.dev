import { placeErr } from './build'
import { DEF, LIT, N, OX, OY, ctx, cv } from './config'
import { caravans } from './eco'
import { GOOD } from './goods'
import {
    CH,
    CW,
    PAD,
    VCH,
    VPAD,
    eachChunk,
    groundChunk,
    makeVeil,
    prefetchChunks,
    trimChunks,
} from './ground'
import { afford, wet } from './helpers'
import { samePick } from './input'
import { costOf } from './land'
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
import { GV } from './vars'

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
export function drawFlag(c?, x?, y?, col?) {
    const w = reduceMotion ? 0 : ((GV.animT * 4) | 0) % 2
    c.fillStyle = '#1c1a22'
    c.fillRect(x - 1, y - 25, 3, 26)
    c.fillStyle = '#e6d3a4'
    c.fillRect(x, y - 24, 1, 24)
    c.fillStyle = '#1c1a22'
    c.fillRect(x + 1, y - 25 + w, 11, 9)
    c.fillStyle = col
    c.fillRect(x + 1, y - 24 + w, 10, 7)
    c.fillStyle = '#e6b83e'
    c.fillRect(x + 1, y - 21 + w, 10, 2)
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
export const blit = (c?, img?, x?, y?) =>
    c.drawImage(img, x, y, img.width / R, img.height / R)
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
    c.imageSmoothingEnabled = GV.K < R
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
        budget = { left: () => performance.now() - t0 < 6 }
    const gx0 = -cam.x / z,
        gy0 = -cam.y / z,
        gx1 = (GV.W - cam.x) / z,
        gy1 = (GV.H - cam.y) / z
    eachChunk(gx0, gy0, gx1, gy1, (i?, j?) => {
        const ch = groundChunk(i, j, budget)
        if (!ch.empty) {
            c.drawImage(ch.cv, PAD, PAD, CH, CH, i * VCH, j * VCH, VCH, VCH)
        }
    })
    prefetchChunks(gx0, gy0, gx1, gy1, budget)
    trimChunks()
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
        for (let y = 1; y < N - 1; y++) {
            for (let x = 1; x < N - 1; x++) {
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
            }
        }
    }
    eachChunk(gx0, gy0, gx1, gy1, (i?, j?) => {
        const g = GV.gcv.get(i + j * CW)
        if (!g || g.empty) {
            return
        }
        let v = GV.vcv.get(i + j * CW)
        if (!v || v.gen !== GV.veilGen) {
            v = makeVeil(i, j)
        }
        c.drawImage(v.cv, VPAD, VPAD, VCH, VCH, i * VCH, j * VCH, VCH, VCH)
    })
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
                const d = DEF[sel.t]
                if (d.range || sel.t === 'keep') {
                    ring(c, sel.cx, sel.cy, sel.t === 'keep' ? 4.5 : d.range)
                }
            }
        } else if (sel.kind === 'army') {
            if (faint && sel.u) {
                selRing(sel.u, false, col)
            } else {
                for (const s of GV.S.sold) {
                    if (s.kind !== 'scout' && vis(s.x, s.y)) {
                        selRing(s, false, col)
                    }
                }
            }
        } else if (sel.kind === 'unit') {
            selRing(sel.u, true, col)
        } else if (sel.kind === 'poi') {
            c.strokeStyle = col
            c.lineWidth = faint ? 0.75 : 1
            diamondPath(c, sel.p.x, sel.p.y, 1)
            c.stroke()
        }
    }
    drawSel(GV.selected, '#f2c84a', false)
    if (GV.hoverPick && !GV.armed && !samePick(GV.hoverPick, GV.selected)) {
        drawSel(GV.hoverPick, 'rgba(255,248,220,.6)', true)
    }

    const list = []
    for (const p of GV.props) {
        if (vis(p.x, p.y)) {
            list.push([p.x + p.y, 0, p])
        }
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
        if (vis(u.x, u.y)) {
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
    if (GV.S.flag && vis(GV.S.flag[0], GV.S.flag[1])) {
        list.push([GV.S.flag[0] + GV.S.flag[1] + 0.03, 5])
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
            drawFlag(
                c,
                wx(GV.S.flag[0], GV.S.flag[1]),
                wy(GV.S.flag[0], GV.S.flag[1]),
                '#2f6a86'
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
            const lift = u.onWall ? 12 : en && tb && tb.ladder > 0 ? 11 : 0
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
                c.fillStyle = 'rgba(190,220,232,.75)'
                c.fillRect(px + 2.5, py + ih - 2.5, iw - 5, 0.5)
                c.fillRect(px + 1.5, py + ih - 2, 1, 0.5)
                c.fillRect(px + iw - 2.5, py + ih - 2, 1, 0.5)
            } else {
                if (!lift) {
                    c.fillStyle = 'rgba(10,16,22,.32)'
                    c.fillRect(px + iw * 0.22, py + ih - 1.5, iw * 0.56, 1)
                    c.fillRect(px + iw * 0.32, py + ih - 0.5, iw * 0.36, 0.5)
                }
                blit(c, img, px, py)
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
                          : '#d4a537'
                c.fillRect(bx + 0.5, by + 0.5, 4, 3.5)
                c.fillStyle = 'rgba(255,255,255,.25)'
                c.fillRect(bx + 0.5, by + 0.5, 4, 0.5)
            }
            if (u.max && u.hp < u.max - 0.5) {
                hpBar(
                    c,
                    px + iw / 2,
                    py - 3,
                    u.hp / u.max,
                    role === 'captain' ? 14 : 10
                )
            } else if (role === 'captain') {
                c.fillStyle = '#d4a537'
                c.fillRect(px + iw / 2 - 1, py - 4, 2.5, 1.5)
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
    if (ghostT && GV.hover && inMap(GV.hover[0], GV.hover[1])) {
        const [x, y] = GV.hover
        if (ghostT === 'flag') {
            c.fillStyle = seenAt(x, y)
                ? 'rgba(240,210,90,.4)'
                : 'rgba(220,70,60,.45)'
            diamondPath(c, x, y, 1)
            c.fill()
            c.globalAlpha = 0.75
            drawFlag(c, wx(x, y), wy(x, y), '#2f6a86')
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
            if (d.range) {
                ring(c, x, y, d.range)
            }
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
