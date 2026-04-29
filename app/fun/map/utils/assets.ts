// Deterministic pseudo-random for stone variation (seed → [0,1))
export const rng = (s: number): number => {
    const x = Math.sin(s * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
}

type Ctx = CanvasRenderingContext2D

// ── Private helpers ────────────────────────────────────────────────────────────

function stoneBricks(
    ctx: Ctx, ox: number, oy: number, W: number, H: number,
    scale: number, ink: string, rowH: number, colW: number, seed0: number
) {
    const lw = Math.max(0.4, 0.65 * scale)
    const rows = Math.ceil(H / rowH) + 1
    const cols = Math.ceil(W / colW) + 2
    for (let r = 0; r < rows; r++) {
        const xo = (r % 2) * colW * 0.52
        for (let c = -1; c < cols; c++) {
            const s = seed0 + r * 37 + c
            const bw = colW * (0.88 + rng(s) * 0.18) - 1
            const bh = rowH * (0.86 + rng(s + 500) * 0.14) - 1
            const bx = ox + c * colW + xo, by = oy + r * rowH
            ctx.fillStyle = `rgba(155,140,120,${(0.04 + rng(s + 200) * 0.08).toFixed(3)})`
            ctx.fillRect(bx, by, bw, bh)
            ctx.fillStyle = `rgba(0,0,0,${(0.05 + rng(s + 300) * 0.07).toFixed(3)})`
            ctx.fillRect(bx, by + bh * 0.75, bw, bh * 0.25)
            ctx.strokeStyle = ink; ctx.lineWidth = lw
            ctx.strokeRect(bx, by, bw, bh)
            if (rng(s + 700) > 0.80) {
                ctx.save()
                ctx.globalAlpha = 0.12 + rng(s + 800) * 0.12
                ctx.lineWidth = Math.max(0.2, 0.3 * scale)
                ctx.beginPath()
                ctx.moveTo(bx + bw * (0.2 + rng(s + 900) * 0.6), by + bh * 0.1)
                ctx.lineTo(bx + bw * (0.15 + rng(s + 950) * 0.7), by + bh * 0.85)
                ctx.stroke()
                ctx.restore()
            }
        }
    }
}

function flame(ctx: Ctx, bx: number, by: number, fw: number, fh: number, seed: number) {
    ctx.fillStyle = 'rgba(210,90,12,0.80)'
    ctx.beginPath()
    ctx.moveTo(bx - fw * 0.52, by)
    ctx.bezierCurveTo(bx - fw * 0.6, by - fh * 0.28, bx - fw * 0.18 + rng(seed) * fw * 0.12, by - fh * 0.68, bx + (rng(seed + 1) - 0.5) * fw * 0.18, by - fh)
    ctx.bezierCurveTo(bx + fw * 0.18 - rng(seed + 2) * fw * 0.1, by - fh * 0.68, bx + fw * 0.6, by - fh * 0.28, bx + fw * 0.52, by)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(250,195,45,0.68)'
    ctx.beginPath()
    ctx.moveTo(bx - fw * 0.3, by)
    ctx.bezierCurveTo(bx - fw * 0.34, by - fh * 0.28, bx - fw * 0.1, by - fh * 0.62, bx + (rng(seed + 4) - 0.5) * fw * 0.12, by - fh * 0.82)
    ctx.bezierCurveTo(bx + fw * 0.1, by - fh * 0.62, bx + fw * 0.34, by - fh * 0.28, bx + fw * 0.3, by)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(255,238,175,0.45)'
    ctx.beginPath()
    ctx.ellipse(bx, by - fh * 0.32, fw * 0.1, fh * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()
}

// ── Walls ──────────────────────────────────────────────────────────────────────

export function drawStoneWallH(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const W = 74 * scale, H = 26 * scale, sw = 16 * scale, sh = 8.5 * scale
    ctx.save()
    ctx.translate(cx - W / 2, cy - H / 2)
    ctx.beginPath(); ctx.rect(0, 0, W, H)
    ctx.fillStyle = fill; ctx.fill(); ctx.clip()
    stoneBricks(ctx, 0, 0, W, H, scale, ink, sh, sw, 1)
    ctx.restore()
    ctx.strokeStyle = ink; ctx.lineWidth = 1.8 * scale
    ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
}

export function drawStoneWallV(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    ctx.save()
    ctx.translate(cx, cy); ctx.rotate(Math.PI / 2); ctx.translate(-cx, -cy)
    drawStoneWallH(ctx, cx, cy, scale, ink, fill)
    ctx.restore()
}

function _cornerNW(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const arm = 26 * scale, len = 48 * scale
    const ox = cx - len / 2, oy = cy - len / 2
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(ox, oy); ctx.lineTo(ox + len, oy); ctx.lineTo(ox + len, oy + arm)
    ctx.lineTo(ox + arm, oy + arm); ctx.lineTo(ox + arm, oy + len)
    ctx.lineTo(ox, oy + len); ctx.closePath()
    ctx.fillStyle = fill; ctx.fill(); ctx.clip()
    stoneBricks(ctx, ox, oy, len, len, scale, ink, 8.5 * scale, 16 * scale, 7)
    ctx.restore()
    ctx.strokeStyle = ink; ctx.lineWidth = 1.8 * scale
    ctx.beginPath()
    ctx.moveTo(ox, oy); ctx.lineTo(ox + len, oy); ctx.lineTo(ox + len, oy + arm)
    ctx.lineTo(ox + arm, oy + arm); ctx.lineTo(ox + arm, oy + len)
    ctx.lineTo(ox, oy + len); ctx.closePath(); ctx.stroke()
}

export function drawWallCornerNW(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    _cornerNW(ctx, cx, cy, scale, ink, fill)
}
export function drawWallCornerNE(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(-1, 1); ctx.translate(-cx, -cy)
    _cornerNW(ctx, cx, cy, scale, ink, fill); ctx.restore()
}
export function drawWallCornerSW(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, -1); ctx.translate(-cx, -cy)
    _cornerNW(ctx, cx, cy, scale, ink, fill); ctx.restore()
}
export function drawWallCornerSE(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(-1, -1); ctx.translate(-cx, -cy)
    _cornerNW(ctx, cx, cy, scale, ink, fill); ctx.restore()
}

export function drawDoorway(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const pw = 11 * scale, ph = 40 * scale, gap = 24 * scale, archH = 18 * scale
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    const pillars: [number, number][] = [[cx - gap / 2 - pw, cy - ph / 2], [cx + gap / 2, cy - ph / 2]]
    pillars.forEach(([px, py]) => {
        ctx.fillRect(px, py, pw, ph); ctx.strokeRect(px, py, pw, ph)
        ctx.fillRect(px - 2 * scale, py, pw + 4 * scale, 5 * scale)
        ctx.strokeRect(px - 2 * scale, py, pw + 4 * scale, 5 * scale)
        ctx.lineWidth = 0.5 * scale
        for (let i = 1; i < 5; i++) {
            ctx.beginPath()
            ctx.moveTo(px, py + 5 * scale + i * (ph - 5 * scale) / 5)
            ctx.lineTo(px + pw, py + 5 * scale + i * (ph - 5 * scale) / 5); ctx.stroke()
        }
        ctx.lineWidth = 1.5 * scale
    })
    const archTop = cy - ph / 2 + 5 * scale
    ctx.fillStyle = 'rgba(0,0,0,0.72)'
    ctx.beginPath()
    ctx.moveTo(cx - gap / 2, cy + ph / 2)
    ctx.lineTo(cx - gap / 2, archTop + archH)
    ctx.bezierCurveTo(cx - gap / 2, archTop, cx - gap * 0.15, archTop - archH * 0.55, cx, archTop - archH * 0.7)
    ctx.bezierCurveTo(cx + gap * 0.15, archTop - archH * 0.55, cx + gap / 2, archTop, cx + gap / 2, archTop + archH)
    ctx.lineTo(cx + gap / 2, cy + ph / 2); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = ink; ctx.lineWidth = 1.8 * scale
    ctx.beginPath()
    ctx.moveTo(cx - gap / 2, archTop + archH)
    ctx.bezierCurveTo(cx - gap / 2, archTop, cx - gap * 0.15, archTop - archH * 0.55, cx, archTop - archH * 0.7)
    ctx.bezierCurveTo(cx + gap * 0.15, archTop - archH * 0.55, cx + gap / 2, archTop, cx + gap / 2, archTop + archH)
    ctx.stroke()
    ctx.lineWidth = 1 * scale
    ctx.beginPath(); ctx.arc(cx - gap / 2 + 4 * scale, cy + 8 * scale, 3 * scale, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx + gap / 2 - 4 * scale, cy + 8 * scale, 3 * scale, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeRect(cx - gap / 2 - 3 * scale, cy + ph / 2, gap + 6 * scale, 4 * scale)
}

export function drawWindow(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const W = 14 * scale, H = 34 * scale, archH = 14 * scale
    ctx.strokeStyle = ink; ctx.lineWidth = 2 * scale; ctx.fillStyle = fill
    ctx.fillRect(cx - W / 2 - 3 * scale, cy - H / 2 - 2 * scale, W + 6 * scale, H + 4 * scale)
    ctx.strokeRect(cx - W / 2 - 3 * scale, cy - H / 2 - 2 * scale, W + 6 * scale, H + 4 * scale)
    ctx.fillStyle = 'rgba(20,30,50,0.78)'
    ctx.beginPath()
    ctx.moveTo(cx - W / 2, cy - H / 2 + archH)
    ctx.quadraticCurveTo(cx - W / 2, cy - H / 2 - 2 * scale, cx, cy - H / 2 - archH * 0.5)
    ctx.quadraticCurveTo(cx + W / 2, cy - H / 2 - 2 * scale, cx + W / 2, cy - H / 2 + archH)
    ctx.lineTo(cx + W / 2, cy + H / 2); ctx.lineTo(cx - W / 2, cy + H / 2); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5 * scale
    ctx.beginPath()
    ctx.moveTo(cx - W / 2, cy - H / 2 + archH)
    ctx.quadraticCurveTo(cx - W / 2, cy - H / 2 - 2 * scale, cx, cy - H / 2 - archH * 0.5)
    ctx.quadraticCurveTo(cx + W / 2, cy - H / 2 - 2 * scale, cx + W / 2, cy - H / 2 + archH)
    ctx.lineTo(cx + W / 2, cy + H / 2); ctx.lineTo(cx - W / 2, cy + H / 2); ctx.closePath(); ctx.stroke()
    ctx.lineWidth = 0.9 * scale
    ctx.beginPath(); ctx.moveTo(cx, cy - H / 2 + archH); ctx.lineTo(cx, cy + H / 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - W / 2, cy - H / 4); ctx.lineTo(cx + W / 2, cy - H / 4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - W / 2, cy + H / 4); ctx.lineTo(cx + W / 2, cy + H / 4); ctx.stroke()
    ctx.fillStyle = 'rgba(140,165,220,0.07)'
    ctx.fillRect(cx - W / 2 + 1 * scale, cy - H / 2 + archH, W - 2 * scale, H / 2 - archH + H / 2 - 1 * scale)
}

export function drawBattlement(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const mW = 13 * scale, mH = 18 * scale, cW = 8 * scale, base = 12 * scale
    const n = 3, unitW = mW + cW, totalW = n * unitW + mW + cW
    const startX = cx - totalW / 2, baseY = cy + mH / 2
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5 * scale
    ctx.save()
    ctx.beginPath(); ctx.rect(cx - totalW / 2, baseY - base, totalW, base); ctx.clip()
    ctx.fillStyle = fill; ctx.fillRect(cx - totalW / 2, baseY - base, totalW, base)
    stoneBricks(ctx, cx - totalW / 2, baseY - base, totalW, base, scale, ink, 6 * scale, 13 * scale, 99)
    ctx.restore()
    ctx.strokeRect(cx - totalW / 2, baseY - base, totalW, base)
    for (let i = 0; i <= n; i++) {
        const mx = startX + i * unitW
        ctx.save()
        ctx.beginPath(); ctx.rect(mx, baseY - base - mH, mW, mH); ctx.clip()
        ctx.fillStyle = fill; ctx.fillRect(mx, baseY - base - mH, mW, mH)
        stoneBricks(ctx, mx, baseY - base - mH, mW, mH, scale, ink, 8 * scale, 13 * scale, 99 + i * 11)
        ctx.restore()
        ctx.strokeRect(mx, baseY - base - mH, mW, mH)
        ctx.lineWidth = 0.5 * scale
        ctx.beginPath()
        ctx.moveTo(mx + 2 * scale, baseY - base - mH * 0.45)
        ctx.lineTo(mx + mW - 2 * scale, baseY - base - mH * 0.45); ctx.stroke()
        ctx.lineWidth = 1.5 * scale
    }
}

// ── Furniture ──────────────────────────────────────────────────────────────────

export function drawLongTable(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const tW = 66 * scale, tH = 18 * scale, bW = 58 * scale, bH = 6 * scale, bOff = 15 * scale
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.2 * scale
    ;[cy - tH / 2 - bOff - bH, cy + tH / 2 + bOff].forEach(by => {
        ctx.fillRect(cx - bW / 2, by, bW, bH); ctx.strokeRect(cx - bW / 2, by, bW, bH)
    })
    ctx.fillRect(cx - tW / 2, cy - tH / 2, tW, tH); ctx.strokeRect(cx - tW / 2, cy - tH / 2, tW, tH)
    ctx.lineWidth = 0.4 * scale; ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    for (let i = 1; i < 4; i++) {
        ctx.beginPath()
        ctx.moveTo(cx - tW / 2 + tW * i / 4, cy - tH / 2 + 1.5 * scale)
        ctx.lineTo(cx - tW / 2 + tW * i / 4, cy + tH / 2 - 1.5 * scale); ctx.stroke()
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 0.8 * scale
    for (let i = 0; i < 4; i++) {
        const px = cx - tW / 2 + 8 * scale + i * 14 * scale
        ctx.beginPath(); ctx.arc(px, cy, 4 * scale, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(px - 1.5 * scale, cy - tH / 2 + 2 * scale)
        ctx.lineTo(px + 1.5 * scale, cy - tH / 2 + 2 * scale)
        ctx.lineTo(px + 1.2 * scale, cy - tH / 2 + 6 * scale)
        ctx.lineTo(px - 1.2 * scale, cy - tH / 2 + 6 * scale)
        ctx.closePath(); ctx.stroke()
    }
}

export function drawLongTableV(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    ctx.save()
    ctx.translate(cx, cy); ctx.rotate(Math.PI / 2); ctx.translate(-cx, -cy)
    drawLongTable(ctx, cx, cy, scale, ink, fill)
    ctx.restore()
}

export function drawRoundTable(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const R = 22 * scale, cR = 4 * scale
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.lineWidth = 0.45 * scale; ctx.strokeStyle = 'rgba(0,0,0,0.22)'
    for (const r of [0.4, 0.65, 0.82]) {
        ctx.beginPath(); ctx.arc(cx, cy, R * r, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 0.7 * scale
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.2, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 1 * scale
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2
        const chX = cx + Math.cos(a) * (R + 12 * scale), chY = cy + Math.sin(a) * (R + 12 * scale)
        ctx.save()
        ctx.translate(chX, chY); ctx.rotate(a + Math.PI / 2)
        ctx.fillStyle = fill
        ctx.fillRect(-5 * scale, -4 * scale, 10 * scale, 8 * scale); ctx.strokeRect(-5 * scale, -4 * scale, 10 * scale, 8 * scale)
        ctx.fillRect(-4.5 * scale, -8 * scale, 9 * scale, 4 * scale); ctx.strokeRect(-4.5 * scale, -8 * scale, 9 * scale, 4 * scale)
        ctx.lineWidth = 0.5 * scale
        ctx.beginPath(); ctx.moveTo(-2 * scale, -8 * scale); ctx.lineTo(-2 * scale, -4 * scale); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(2 * scale, -8 * scale); ctx.lineTo(2 * scale, -4 * scale); ctx.stroke()
        ctx.lineWidth = 1 * scale
        ctx.restore()
    }
    ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.beginPath(); ctx.arc(cx, cy, cR, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
}

export function drawCauldron(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const R = 20 * scale
    flame(ctx, cx - R * 0.3, cy + R * 0.92, R * 0.35, R * 0.55, 10)
    flame(ctx, cx, cy + R * 0.96, R * 0.42, R * 0.62, 20)
    flame(ctx, cx + R * 0.3, cy + R * 0.92, R * 0.34, R * 0.52, 30)
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5 * scale
    ctx.beginPath()
    ctx.moveTo(cx - R * 0.72, cy - R * 0.18)
    ctx.bezierCurveTo(cx - R * 0.95, cy + R * 0.12, cx - R * 0.68, cy + R * 0.95, cx, cy + R * 0.95)
    ctx.bezierCurveTo(cx + R * 0.68, cy + R * 0.95, cx + R * 0.95, cy + R * 0.12, cx + R * 0.72, cy - R * 0.18)
    ctx.closePath()
    ctx.fillStyle = fill; ctx.fill(); ctx.stroke()
    ctx.lineWidth = 1.2 * scale
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI * 0.8
        const fx = cx + Math.cos(a) * R * 0.52
        ctx.beginPath()
        ctx.moveTo(fx, cy + R * 0.96)
        ctx.lineTo(fx + Math.cos(a) * R * 0.22, cy + R * 1.24)
        ctx.lineTo(fx + Math.cos(a + 0.4) * R * 0.18, cy + R * 1.24); ctx.stroke()
    }
    ctx.lineWidth = 1.2 * scale
    ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.18, R * 0.72, R * 0.22, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = 'rgba(35,190,75,0.22)'
    ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.18, R * 0.64, R * 0.18, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = ink; ctx.lineWidth = 0.7 * scale
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 0.38, cy - R * 0.18 + Math.sin(a) * R * 0.12, R * 0.055, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.lineWidth = 1.2 * scale
    ctx.beginPath(); ctx.arc(cx - R * 0.85, cy + R * 0.1, R * 0.22, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx + R * 0.85, cy + R * 0.1, R * 0.22, -Math.PI * 0.45, Math.PI * 0.45); ctx.stroke()
    ctx.lineWidth = 0.9 * scale
    for (let i = 0; i < 3; i++) {
        const sx = cx + (i - 1) * R * 0.38
        ctx.globalAlpha = 0.22
        ctx.beginPath()
        ctx.moveTo(sx, cy - R * 0.38)
        ctx.quadraticCurveTo(sx + R * 0.2, cy - R * 0.75, sx - R * 0.05, cy - R * 1.08)
        ctx.quadraticCurveTo(sx - R * 0.22, cy - R * 1.4, sx + R * 0.08, cy - R * 1.7)
        ctx.stroke()
        ctx.globalAlpha = 1
    }
}

export function drawFireplace(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const W = 60 * scale, H = 54 * scale, oW = 32 * scale, oH = 30 * scale
    ctx.save()
    ctx.beginPath(); ctx.rect(cx - W / 2, cy - H / 2, W, H); ctx.clip()
    ctx.fillStyle = fill; ctx.fillRect(cx - W / 2 - 1, cy - H / 2 - 1, W + 2, H + 2)
    stoneBricks(ctx, cx - W / 2, cy - H / 2, W, H, scale, ink, 8 * scale, 14 * scale, 55)
    ctx.restore()
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5 * scale
    ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
    ctx.fillStyle = fill
    ctx.fillRect(cx - W / 2 - 5 * scale, cy - H / 2 - 8 * scale, W + 10 * scale, 8 * scale)
    ctx.strokeRect(cx - W / 2 - 5 * scale, cy - H / 2 - 8 * scale, W + 10 * scale, 8 * scale)
    ctx.lineWidth = 0.6 * scale
    ctx.beginPath(); ctx.moveTo(cx - W / 2, cy - H / 2 - 5 * scale); ctx.lineTo(cx + W / 2, cy - H / 2 - 5 * scale); ctx.stroke()
    ctx.lineWidth = 1.5 * scale
    for (const px of [cx - W / 2, cx + W / 2 - 9 * scale]) {
        ctx.fillRect(px, cy - H / 2, 9 * scale, H); ctx.strokeRect(px, cy - H / 2, 9 * scale, H)
        ctx.fillRect(px - 1 * scale, cy - H / 2, 11 * scale, 5 * scale); ctx.strokeRect(px - 1 * scale, cy - H / 2, 11 * scale, 5 * scale)
        ctx.fillRect(px - 1 * scale, cy + H / 2 - 5 * scale, 11 * scale, 5 * scale); ctx.strokeRect(px - 1 * scale, cy + H / 2 - 5 * scale, 11 * scale, 5 * scale)
    }
    const openX = cx - oW / 2, openTop = cy - H / 2 + 8 * scale
    ctx.fillStyle = 'rgba(0,0,0,0.78)'
    ctx.beginPath()
    ctx.moveTo(openX, cy + H / 2 - 4 * scale); ctx.lineTo(openX, openTop + oH * 0.42)
    ctx.bezierCurveTo(openX, openTop, cx - oW * 0.12, openTop - oH * 0.35, cx, openTop - oH * 0.46)
    ctx.bezierCurveTo(cx + oW * 0.12, openTop - oH * 0.35, openX + oW, openTop, openX + oW, openTop + oH * 0.42)
    ctx.lineTo(openX + oW, cy + H / 2 - 4 * scale); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5 * scale
    ctx.beginPath()
    ctx.moveTo(openX, openTop + oH * 0.42)
    ctx.bezierCurveTo(openX, openTop, cx - oW * 0.12, openTop - oH * 0.35, cx, openTop - oH * 0.46)
    ctx.bezierCurveTo(cx + oW * 0.12, openTop - oH * 0.35, openX + oW, openTop, openX + oW, openTop + oH * 0.42)
    ctx.stroke()
    const floorY = cy + H / 2 - 5 * scale
    flame(ctx, cx - oW * 0.25, floorY, oW * 0.38, oH * 0.65, 40)
    flame(ctx, cx, floorY, oW * 0.44, oH * 0.82, 50)
    flame(ctx, cx + oW * 0.25, floorY, oW * 0.36, oH * 0.60, 60)
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2 * scale
    ctx.beginPath()
    ctx.moveTo(cx - oW * 0.35, floorY - 1 * scale); ctx.lineTo(cx + oW * 0.35, floorY - 1 * scale)
    ctx.moveTo(cx - oW * 0.22, floorY - 4 * scale); ctx.lineTo(cx + oW * 0.22, floorY - 4 * scale)
    ctx.stroke()
    ctx.lineWidth = 1.5 * scale
    for (const ax of [cx - oW * 0.28, cx + oW * 0.28]) {
        ctx.beginPath(); ctx.arc(ax, floorY - 5 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(ax, floorY - 2.5 * scale); ctx.lineTo(ax, cy + H / 2 - 2 * scale); ctx.stroke()
    }
}

export function drawBookshelf(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const W = 55 * scale, H = 48 * scale, n = 3
    const spineColors = ['#8a3828', '#5a3870', '#2a6050', '#703820', '#4a5428', '#6a2848', '#3a5870']
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.fillRect(cx - W / 2, cy - H / 2, W, H); ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
    ctx.lineWidth = 0.6 * scale
    for (const px of [cx - W / 2 + 2.5 * scale, cx + W / 2 - 4 * scale]) {
        ctx.beginPath(); ctx.moveTo(px, cy - H / 2 + 2 * scale); ctx.lineTo(px, cy + H / 2 - 2 * scale); ctx.stroke()
    }
    ctx.lineWidth = 1.3 * scale
    for (let i = 1; i < n; i++) {
        const sy = cy - H / 2 + i * H / n
        ctx.beginPath(); ctx.moveTo(cx - W / 2 + 2.5 * scale, sy); ctx.lineTo(cx + W / 2 - 2.5 * scale, sy); ctx.stroke()
    }
    for (let shelf = 0; shelf < n; shelf++) {
        const shelfY = cy - H / 2 + shelf * H / n
        const sH = H / n - 1 * scale
        let bx = cx - W / 2 + 3 * scale, bookIdx = 0
        while (bx < cx + W / 2 - 6 * scale) {
            const s = shelf * 20 + bookIdx
            const bw = (3.5 + rng(s) * 5) * scale
            const bh = sH * (0.55 + rng(s + 77) * 0.35)
            const lean = bookIdx % 5 === 4 ? 1.5 * scale : 0
            ctx.fillStyle = spineColors[bookIdx % spineColors.length]
            ctx.fillRect(bx + lean, shelfY + sH - bh, bw - lean, bh)
            ctx.strokeStyle = ink; ctx.lineWidth = 0.35 * scale
            ctx.strokeRect(bx + lean, shelfY + sH - bh, bw - lean, bh)
            if (bw > 4 * scale) {
                ctx.beginPath()
                ctx.moveTo(bx + lean + 1 * scale, shelfY + sH - bh + 3.5 * scale)
                ctx.lineTo(bx + bw - 1 * scale, shelfY + sH - bh + 3.5 * scale); ctx.stroke()
            }
            bx += bw + 0.8 * scale; bookIdx++
        }
        ctx.fillStyle = fill; ctx.strokeStyle = ink; ctx.lineWidth = 1 * scale
        ctx.fillRect(cx + W / 2 - 7 * scale, shelfY + sH * 0.28, 4 * scale, sH * 0.72)
        ctx.strokeRect(cx + W / 2 - 7 * scale, shelfY + sH * 0.28, 4 * scale, sH * 0.72)
    }
    ctx.lineWidth = 1.5 * scale; ctx.strokeStyle = ink
    ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
}

export function drawBookshelfTall(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const W = 44 * scale, H = 72 * scale, n = 4
    const spineColors = ['#8a3828', '#5a3870', '#2a6050', '#703820', '#4a5428', '#6a2848', '#3a5870', '#5a2020']
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.fillRect(cx - W / 2, cy - H / 2, W, H); ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
    ctx.lineWidth = 0.6 * scale
    for (const px of [cx - W / 2 + 2.5 * scale, cx + W / 2 - 4 * scale]) {
        ctx.beginPath(); ctx.moveTo(px, cy - H / 2 + 2 * scale); ctx.lineTo(px, cy + H / 2 - 2 * scale); ctx.stroke()
    }
    ctx.lineWidth = 1.3 * scale
    for (let i = 1; i < n; i++) {
        const sy = cy - H / 2 + i * H / n
        ctx.beginPath(); ctx.moveTo(cx - W / 2 + 2.5 * scale, sy); ctx.lineTo(cx + W / 2 - 2.5 * scale, sy); ctx.stroke()
    }
    for (let shelf = 0; shelf < n; shelf++) {
        const shelfY = cy - H / 2 + shelf * H / n
        const sH = H / n - 1 * scale
        let bx = cx - W / 2 + 3 * scale, bookIdx = 0
        while (bx < cx + W / 2 - 5 * scale) {
            const s = (shelf + 10) * 20 + bookIdx
            const bw = (3 + rng(s) * 4) * scale
            const bh = sH * (0.52 + rng(s + 77) * 0.38)
            ctx.fillStyle = spineColors[bookIdx % spineColors.length]
            ctx.fillRect(bx, shelfY + sH - bh, bw, bh)
            ctx.strokeStyle = ink; ctx.lineWidth = 0.3 * scale
            ctx.strokeRect(bx, shelfY + sH - bh, bw, bh)
            bx += bw + 0.7 * scale; bookIdx++
        }
        ctx.fillStyle = fill; ctx.strokeStyle = ink; ctx.lineWidth = 0.9 * scale
        ctx.fillRect(cx + W / 2 - 6 * scale, shelfY + sH * 0.32, 3.5 * scale, sH * 0.68)
        ctx.strokeRect(cx + W / 2 - 6 * scale, shelfY + sH * 0.32, 3.5 * scale, sH * 0.68)
    }
    ctx.lineWidth = 1.5 * scale; ctx.strokeStyle = ink
    ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
}

export function drawLectern(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const bW = 20 * scale, bH = 5 * scale, pW = 5 * scale, pH = 22 * scale
    const tW = 36 * scale, tH = 20 * scale
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.fillRect(cx - bW / 2, cy + pH / 2 + 1 * scale, bW, bH)
    ctx.strokeRect(cx - bW / 2, cy + pH / 2 + 1 * scale, bW, bH)
    for (const fx of [cx - bW / 2 + 2 * scale, cx + bW / 2 - 6 * scale]) {
        ctx.lineWidth = 1 * scale
        ctx.beginPath(); ctx.moveTo(fx, cy + pH / 2 + bH + 1 * scale); ctx.lineTo(fx - 2 * scale, cy + pH / 2 + bH + 5 * scale); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(fx + 4 * scale, cy + pH / 2 + bH + 1 * scale); ctx.lineTo(fx + 6 * scale, cy + pH / 2 + bH + 5 * scale); ctx.stroke()
    }
    ctx.lineWidth = 1.5 * scale
    ctx.fillRect(cx - pW / 2, cy - pH / 2, pW, pH); ctx.strokeRect(cx - pW / 2, cy - pH / 2, pW, pH)
    const topY = cy - pH / 2
    ctx.beginPath()
    ctx.moveTo(cx - tW / 2, topY); ctx.lineTo(cx + tW / 2, topY - tH * 0.28)
    ctx.lineTo(cx + tW / 2, topY - tH * 0.28 + tH * 0.22); ctx.lineTo(cx - tW / 2, topY + tH * 0.22)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.lineWidth = 1.2 * scale
    ctx.beginPath()
    ctx.moveTo(cx - tW / 2 + 1 * scale, topY + tH * 0.2)
    ctx.lineTo(cx + tW / 2 - 1 * scale, topY - tH * 0.28 + tH * 0.2); ctx.stroke()
    ctx.fillStyle = 'rgba(240,225,175,0.88)'
    ctx.fillRect(cx - 12 * scale, topY - tH * 0.28 + tH * 0.03, 24 * scale, 12 * scale)
    ctx.strokeStyle = ink; ctx.lineWidth = 0.6 * scale
    ctx.strokeRect(cx - 12 * scale, topY - tH * 0.28 + tH * 0.03, 24 * scale, 12 * scale)
    ctx.beginPath(); ctx.moveTo(cx, topY - tH * 0.28 + tH * 0.03); ctx.lineTo(cx, topY - tH * 0.28 + tH * 0.03 + 12 * scale); ctx.stroke()
    for (let i = 0; i < 4; i++) {
        const ly = topY - tH * 0.28 + tH * 0.03 + 2.2 * scale + i * 2.2 * scale
        ctx.beginPath(); ctx.moveTo(cx - 10 * scale, ly); ctx.lineTo(cx - 1.5 * scale, ly); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx + 1.5 * scale, ly); ctx.lineTo(cx + 10 * scale, ly); ctx.stroke()
    }
}

// ── Decorations ────────────────────────────────────────────────────────────────

export function drawTorch(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    ctx.strokeStyle = ink; ctx.lineWidth = 1.8 * scale
    ctx.beginPath()
    ctx.moveTo(cx - 9 * scale, cy + 8 * scale)
    ctx.bezierCurveTo(cx - 9 * scale, cy + 2 * scale, cx - 4 * scale, cy + 2 * scale, cx, cy + 4 * scale)
    ctx.stroke()
    ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.beginPath(); ctx.arc(cx - 9 * scale, cy + 8 * scale, 2 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    const bodyH = 22 * scale, bodyW = 5 * scale, bodyTop = cy - 18 * scale
    ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH); ctx.strokeRect(cx - bodyW / 2, bodyTop, bodyW, bodyH)
    ctx.lineWidth = 0.5 * scale
    for (let i = 1; i <= 5; i++) {
        ctx.beginPath()
        ctx.moveTo(cx - bodyW / 2, bodyTop + i * bodyH / 6)
        ctx.lineTo(cx + bodyW / 2, bodyTop + i * bodyH / 6); ctx.stroke()
    }
    ctx.lineWidth = 1.3 * scale; ctx.fillStyle = fill
    ctx.fillRect(cx - 4 * scale, bodyTop - 3 * scale, 8 * scale, 5 * scale)
    ctx.strokeRect(cx - 4 * scale, bodyTop - 3 * scale, 8 * scale, 5 * scale)
    flame(ctx, cx, bodyTop - 3 * scale, 10 * scale, 20 * scale, 70)
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.fillStyle = 'rgba(255,180,40,1)'
    ctx.beginPath(); ctx.arc(cx, bodyTop - 11 * scale, 16 * scale, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
}

export function drawChandelier(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const R = 28 * scale, n = 8
    ctx.save()
    ctx.globalAlpha = 0.05
    ctx.fillStyle = 'rgba(255,200,80,1)'
    ctx.beginPath(); ctx.arc(cx, cy, R + 14 * scale, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    ctx.strokeStyle = ink; ctx.lineWidth = 0.9 * scale
    ctx.setLineDash([2.5 * scale, 2 * scale])
    ctx.beginPath(); ctx.moveTo(cx, cy - R - 12 * scale); ctx.lineTo(cx, cy - R * 0.4); ctx.stroke()
    ctx.setLineDash([])
    ctx.lineWidth = 1.8 * scale; ctx.fillStyle = fill
    ctx.beginPath(); ctx.arc(cx, cy, 6 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.lineWidth = 0.7 * scale
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * 3 * scale, cy + Math.sin(a) * 3 * scale)
        ctx.lineTo(cx + Math.cos(a) * 6 * scale, cy + Math.sin(a) * 6 * scale); ctx.stroke()
    }
    ctx.lineWidth = 1.8 * scale
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        const ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R
        ctx.lineWidth = 0.8 * scale
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 6 * scale, cy + Math.sin(a) * 6 * scale); ctx.lineTo(ex, ey); ctx.stroke()
        ctx.fillStyle = fill; ctx.lineWidth = 1.2 * scale
        ctx.fillRect(ex - 2.5 * scale, ey - 2 * scale, 5 * scale, 3 * scale); ctx.strokeRect(ex - 2.5 * scale, ey - 2 * scale, 5 * scale, 3 * scale)
        ctx.fillRect(ex - 2 * scale, ey - 10 * scale, 4 * scale, 8 * scale); ctx.strokeRect(ex - 2 * scale, ey - 10 * scale, 4 * scale, 8 * scale)
        ctx.lineWidth = 0.5 * scale
        ctx.beginPath(); ctx.moveTo(ex - 1 * scale, ey - 2 * scale); ctx.bezierCurveTo(ex - 1.5 * scale, ey, ex - 0.5 * scale, ey + 2 * scale, ex + 0.5 * scale, ey + 1.5 * scale); ctx.stroke()
        ctx.lineWidth = 0.6 * scale
        ctx.beginPath(); ctx.moveTo(ex, ey - 10 * scale); ctx.lineTo(ex, ey - 12 * scale); ctx.stroke()
        ctx.fillStyle = 'rgba(220,155,28,0.78)'
        ctx.beginPath()
        ctx.moveTo(ex - 2.5 * scale, ey - 12 * scale)
        ctx.quadraticCurveTo(ex, ey - 18 * scale, ex + 2.5 * scale, ey - 12 * scale)
        ctx.closePath(); ctx.fill()
    }
}

export function drawArmorStand(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    const top = cy - 30 * scale
    ctx.beginPath()
    ctx.arc(cx, top + 9 * scale, 9 * scale, Math.PI, 0, false)
    ctx.lineTo(cx + 9 * scale, top + 14 * scale); ctx.lineTo(cx - 9 * scale, top + 14 * scale)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.lineWidth = 0.7 * scale
    ctx.beginPath(); ctx.moveTo(cx - 5 * scale, top + 10 * scale); ctx.lineTo(cx + 5 * scale, top + 10 * scale); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - 4 * scale, top + 12.5 * scale); ctx.lineTo(cx + 4 * scale, top + 12.5 * scale); ctx.stroke()
    ctx.lineWidth = 1 * scale
    ctx.beginPath(); ctx.moveTo(cx - 4 * scale, top); ctx.quadraticCurveTo(cx, top - 5 * scale, cx + 4 * scale, top); ctx.stroke()
    ctx.lineWidth = 1.5 * scale
    ctx.fillRect(cx - 6 * scale, top + 14 * scale, 12 * scale, 6 * scale); ctx.strokeRect(cx - 6 * scale, top + 14 * scale, 12 * scale, 6 * scale)
    ctx.beginPath()
    ctx.moveTo(cx - 10 * scale, top + 20 * scale); ctx.lineTo(cx - 12 * scale, top + 44 * scale)
    ctx.lineTo(cx + 12 * scale, top + 44 * scale); ctx.lineTo(cx + 10 * scale, top + 20 * scale)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.lineWidth = 0.7 * scale
    ctx.beginPath(); ctx.moveTo(cx, top + 20 * scale); ctx.lineTo(cx, top + 44 * scale); ctx.stroke()
    for (let i = 1; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(cx - 11 * scale + i * scale, top + 20 * scale + i * 8 * scale)
        ctx.lineTo(cx + 11 * scale - i * scale, top + 20 * scale + i * 8 * scale); ctx.stroke()
    }
    ctx.lineWidth = 1.4 * scale
    ctx.beginPath(); ctx.moveTo(cx - 10 * scale, top + 24 * scale); ctx.lineTo(cx - 20 * scale, top + 36 * scale); ctx.lineTo(cx - 17 * scale, top + 46 * scale); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx + 10 * scale, top + 24 * scale); ctx.lineTo(cx + 20 * scale, top + 36 * scale); ctx.lineTo(cx + 17 * scale, top + 46 * scale); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 6 * scale, top + 44 * scale); ctx.lineTo(cx - 7 * scale, top + 68 * scale)
    ctx.moveTo(cx + 6 * scale, top + 44 * scale); ctx.lineTo(cx + 7 * scale, top + 68 * scale); ctx.stroke()
    ctx.fillRect(cx - 12 * scale, top + 64 * scale, 10 * scale, 6 * scale); ctx.strokeRect(cx - 12 * scale, top + 64 * scale, 10 * scale, 6 * scale)
    ctx.fillRect(cx + 2 * scale, top + 64 * scale, 10 * scale, 6 * scale); ctx.strokeRect(cx + 2 * scale, top + 64 * scale, 10 * scale, 6 * scale)
    ctx.lineWidth = 1 * scale
    ctx.beginPath(); ctx.moveTo(cx - 14 * scale, top + 70 * scale); ctx.lineTo(cx + 14 * scale, top + 70 * scale); ctx.stroke()
    // Shield
    const sx = cx + 22 * scale, sy = cy - 8 * scale
    ctx.lineWidth = 1.2 * scale; ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(sx, sy - 14 * scale); ctx.lineTo(sx + 9 * scale, sy - 10 * scale)
    ctx.lineTo(sx + 9 * scale, sy + 4 * scale)
    ctx.quadraticCurveTo(sx, sy + 16 * scale, sx - 9 * scale, sy + 4 * scale)
    ctx.lineTo(sx - 9 * scale, sy - 10 * scale); ctx.closePath()
    ctx.fill(); ctx.stroke()
    ctx.lineWidth = 0.5 * scale
    ctx.beginPath(); ctx.moveTo(sx, sy - 14 * scale); ctx.lineTo(sx, sy + 14 * scale); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(sx - 9 * scale, sy - 3 * scale); ctx.lineTo(sx + 9 * scale, sy - 3 * scale); ctx.stroke()
}

export function drawSpiralStairs(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const R = 27 * scale
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5 * scale; ctx.fillStyle = fill
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    const steps = 12
    ctx.lineWidth = 0.7 * scale
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2 - Math.PI / 2
        const r = 5 * scale + (R - 6 * scale) * (i / steps)
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * 5 * scale, cy + Math.sin(a) * 5 * scale)
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke()
    }
    ctx.lineWidth = 1.4 * scale
    ctx.beginPath()
    for (let i = 0; i <= 120; i++) {
        const t = i / 120
        const a = t * Math.PI * 2.6 - Math.PI / 2
        const r = 5 * scale + (R - 10 * scale) * t
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.fillStyle = ink
    ctx.beginPath(); ctx.arc(cx, cy, 4 * scale, 0, Math.PI * 2); ctx.fill()
    ctx.lineWidth = 1.5 * scale; ctx.strokeStyle = ink
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
}

export function drawCarpet(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, _fill: string) {
    const W = 70 * scale, H = 22 * scale, b = 4 * scale
    ctx.fillStyle = '#6e2020'
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2 * scale
    ctx.fillRect(cx - W / 2, cy - H / 2, W, H); ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
    ctx.strokeStyle = '#b89030'; ctx.lineWidth = 0.9 * scale
    ctx.strokeRect(cx - W / 2 + b, cy - H / 2 + b, W - 2 * b, H - 2 * b)
    ctx.beginPath()
    ctx.moveTo(cx, cy - H / 2 + b + 2 * scale); ctx.lineTo(cx + 10 * scale, cy)
    ctx.lineTo(cx, cy + H / 2 - b - 2 * scale); ctx.lineTo(cx - 10 * scale, cy)
    ctx.closePath(); ctx.stroke()
    const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    corners.forEach(([sx, sy]) => {
        ctx.beginPath(); ctx.arc(cx + sx * (W / 2 - b - 3 * scale), cy + sy * (H / 2 - b - 3 * scale), 2 * scale, 0, Math.PI * 2); ctx.stroke()
    })
    ctx.strokeStyle = ink; ctx.lineWidth = 0.7 * scale
    for (let i = 0; i < 10; i++) {
        const fx = cx - W / 2 + (i + 0.5) * W / 10
        ctx.beginPath(); ctx.moveTo(fx, cy - H / 2); ctx.lineTo(fx - 1 * scale, cy - H / 2 - 6 * scale); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(fx, cy + H / 2); ctx.lineTo(fx + 1 * scale, cy + H / 2 + 6 * scale); ctx.stroke()
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2 * scale
    ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
}

export function drawFountain(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const R1 = 27 * scale, R2 = 16 * scale, R3 = 5 * scale
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5 * scale; ctx.fillStyle = fill
    ctx.beginPath(); ctx.arc(cx, cy, R1, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'rgba(80,145,210,0.18)'
    ctx.beginPath(); ctx.arc(cx, cy, R2, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = ink; ctx.stroke()
    ctx.strokeStyle = 'rgba(100,165,220,0.35)'; ctx.lineWidth = 0.6 * scale
    for (const r of [0.35, 0.65]) {
        ctx.beginPath(); ctx.arc(cx, cy, R2 * r, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.beginPath(); ctx.arc(cx, cy, R3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = 'rgba(120,185,230,0.7)'; ctx.lineWidth = 1 * scale
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * R3, cy + Math.sin(a) * R3)
        ctx.quadraticCurveTo(cx + Math.cos(a) * R2 * 0.45, cy + Math.sin(a) * R2 * 0.45 - 10 * scale, cx + Math.cos(a) * R2 * 0.88, cy + Math.sin(a) * R2 * 0.88)
        ctx.stroke()
    }
}

export function drawPotionsShelf(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const W = 56 * scale, H = 44 * scale, n = 2
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.fillRect(cx - W / 2, cy - H / 2, W, H); ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
    ctx.lineWidth = 1.2 * scale
    const sy = cy
    ctx.beginPath(); ctx.moveTo(cx - W / 2 + 2 * scale, sy); ctx.lineTo(cx + W / 2 - 2 * scale, sy); ctx.stroke()

    const bottleColors = [
        'rgba(180,40,40,0.72)', 'rgba(40,140,60,0.72)', 'rgba(60,80,200,0.72)',
        'rgba(160,100,20,0.72)', 'rgba(120,40,160,0.72)', 'rgba(20,140,140,0.72)',
        'rgba(200,160,30,0.72)', 'rgba(100,30,30,0.72)'
    ]
    for (let shelf = 0; shelf < n; shelf++) {
        const shelfTop = cy - H / 2 + shelf * H / n
        const sH = H / n
        let bx = cx - W / 2 + 4 * scale, bottleIdx = 0
        while (bx < cx + W / 2 - 8 * scale) {
            const s = shelf * 30 + bottleIdx
            const bw = (5 + rng(s) * 3) * scale
            const bh = sH * (0.45 + rng(s + 10) * 0.3)
            const by = shelfTop + sH - 2 * scale - bh
            ctx.fillStyle = bottleColors[bottleIdx % bottleColors.length]
            // Bottle body
            ctx.beginPath()
            ctx.roundRect(bx, by + bh * 0.35, bw, bh * 0.65, 2 * scale)
            ctx.fill()
            ctx.strokeStyle = ink; ctx.lineWidth = 0.5 * scale
            ctx.stroke()
            // Neck
            ctx.beginPath()
            ctx.rect(bx + bw * 0.3, by, bw * 0.4, bh * 0.38)
            ctx.fill(); ctx.stroke()
            // Stopper
            ctx.fillStyle = ink
            ctx.fillRect(bx + bw * 0.25, by - 2 * scale, bw * 0.5, 2 * scale)
            // Shine
            ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.4 * scale
            ctx.beginPath()
            ctx.moveTo(bx + bw * 0.2, by + bh * 0.45); ctx.lineTo(bx + bw * 0.2, by + bh * 0.75); ctx.stroke()
            bx += bw + (2 + rng(s + 50) * 3) * scale
            bottleIdx++
        }
    }
    ctx.lineWidth = 1.5 * scale; ctx.strokeStyle = ink
    ctx.strokeRect(cx - W / 2, cy - H / 2, W, H)
}

export function drawMirrorOrnate(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const fW = 32 * scale, fH = 48 * scale, fw = 5 * scale
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    // Outer frame
    ctx.fillRect(cx - fW / 2, cy - fH / 2, fW, fH); ctx.strokeRect(cx - fW / 2, cy - fH / 2, fW, fH)
    // Inner mirror (dark reflective)
    ctx.fillStyle = 'rgba(30,35,45,0.85)'
    const iW = fW - 2 * fw, iH = fH - 2 * fw
    const iX = cx - iW / 2, iY = cy - iH / 2
    // Pointed arch top
    ctx.beginPath()
    ctx.moveTo(iX, iY + 10 * scale)
    ctx.quadraticCurveTo(iX, iY - 2 * scale, cx, iY - 8 * scale)
    ctx.quadraticCurveTo(iX + iW, iY - 2 * scale, iX + iW, iY + 10 * scale)
    ctx.lineTo(iX + iW, iY + iH); ctx.lineTo(iX, iY + iH); ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = ink; ctx.stroke()
    // Reflection shimmer lines
    ctx.strokeStyle = 'rgba(180,200,220,0.12)'; ctx.lineWidth = 0.5 * scale
    for (let i = 0; i < 3; i++) {
        const lx = iX + iW * (0.2 + i * 0.22)
        ctx.beginPath(); ctx.moveTo(lx, iY + 12 * scale); ctx.lineTo(lx - 2 * scale, iY + iH - 4 * scale); ctx.stroke()
    }
    // Frame scroll decorations
    ctx.strokeStyle = ink; ctx.lineWidth = 0.8 * scale
    for (const fy of [cy - fH / 2 + fw * 0.5, cy + fH / 2 - fw * 0.5]) {
        ctx.beginPath()
        ctx.moveTo(cx - fW / 2 + fw, fy)
        ctx.bezierCurveTo(cx - fW / 4, fy - 4 * scale, cx + fW / 4, fy + 4 * scale, cx + fW / 2 - fw, fy)
        ctx.stroke()
    }
    // Top finial
    ctx.lineWidth = 1.2 * scale; ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(cx - 6 * scale, cy - fH / 2)
    ctx.lineTo(cx, cy - fH / 2 - 10 * scale)
    ctx.lineTo(cx + 6 * scale, cy - fH / 2); ctx.closePath()
    ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy - fH / 2 - 10 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
}

export function drawDungeonChain(ctx: Ctx, cx: number, cy: number, scale: number, ink: string, fill: string) {
    const chainL = 50 * scale
    ctx.strokeStyle = ink; ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    // Wall mount
    ctx.fillRect(cx - 6 * scale, cy - chainL / 2 - 4 * scale, 12 * scale, 7 * scale)
    ctx.strokeRect(cx - 6 * scale, cy - chainL / 2 - 4 * scale, 12 * scale, 7 * scale)
    ctx.beginPath(); ctx.arc(cx, cy - chainL / 2 + 1 * scale, 2.5 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    // Chain links
    const links = 8
    ctx.lineWidth = 1.2 * scale
    for (let i = 0; i < links; i++) {
        const ly = cy - chainL / 2 + (i + 0.5) * chainL / links
        const isH = i % 2 === 0
        ctx.beginPath()
        if (isH) {
            ctx.ellipse(cx, ly, 4.5 * scale, 2.8 * scale, 0, 0, Math.PI * 2)
        } else {
            ctx.ellipse(cx, ly, 2.8 * scale, 4.5 * scale, 0, 0, Math.PI * 2)
        }
        ctx.fillStyle = fill; ctx.fill(); ctx.stroke()
        // Link cross-bar
        ctx.lineWidth = 0.5 * scale
        ctx.beginPath()
        if (isH) {
            ctx.moveTo(cx, ly - 2.8 * scale); ctx.lineTo(cx, ly + 2.8 * scale)
        } else {
            ctx.moveTo(cx - 2.8 * scale, ly); ctx.lineTo(cx + 2.8 * scale, ly)
        }
        ctx.stroke()
        ctx.lineWidth = 1.2 * scale
    }
    // Shackle at bottom
    ctx.fillStyle = fill; ctx.lineWidth = 1.5 * scale
    ctx.beginPath(); ctx.arc(cx, cy + chainL / 2 - 6 * scale, 6 * scale, Math.PI, 0); ctx.stroke()
    ctx.fillRect(cx - 8 * scale, cy + chainL / 2 - 6 * scale, 4 * scale, 8 * scale)
    ctx.strokeRect(cx - 8 * scale, cy + chainL / 2 - 6 * scale, 4 * scale, 8 * scale)
    ctx.fillRect(cx + 4 * scale, cy + chainL / 2 - 6 * scale, 4 * scale, 8 * scale)
    ctx.strokeRect(cx + 4 * scale, cy + chainL / 2 - 6 * scale, 4 * scale, 8 * scale)
}

// ── Asset catalog ─────────────────────────────────────────────────────────────

export type AssetCategory = 'walls' | 'furniture' | 'decorations'

export interface AssetDef {
    id: string
    name: string
    cat: AssetCategory
    hw: number
    hh: number
    fnName: string
    draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, ink: string, fill: string) => void
}

export const ASSETS: AssetDef[] = [
    { id: 'wall-h',          name: 'Stone Wall H',      cat: 'walls',        hw: 37, hh: 13, fnName: 'drawStoneWallH',    draw: drawStoneWallH },
    { id: 'wall-v',          name: 'Stone Wall V',      cat: 'walls',        hw: 13, hh: 37, fnName: 'drawStoneWallV',    draw: drawStoneWallV },
    { id: 'wall-corner-nw',  name: 'Corner NW',         cat: 'walls',        hw: 24, hh: 24, fnName: 'drawWallCornerNW',  draw: drawWallCornerNW },
    { id: 'wall-corner-ne',  name: 'Corner NE',         cat: 'walls',        hw: 24, hh: 24, fnName: 'drawWallCornerNE',  draw: drawWallCornerNE },
    { id: 'wall-corner-sw',  name: 'Corner SW',         cat: 'walls',        hw: 24, hh: 24, fnName: 'drawWallCornerSW',  draw: drawWallCornerSW },
    { id: 'wall-corner-se',  name: 'Corner SE',         cat: 'walls',        hw: 24, hh: 24, fnName: 'drawWallCornerSE',  draw: drawWallCornerSE },
    { id: 'doorway',         name: 'Doorway',           cat: 'walls',        hw: 23, hh: 24, fnName: 'drawDoorway',       draw: drawDoorway },
    { id: 'window',          name: 'Window',            cat: 'walls',        hw: 10, hh: 22, fnName: 'drawWindow',        draw: drawWindow },
    { id: 'battlement',      name: 'Battlement',        cat: 'walls',        hw: 43, hh: 21, fnName: 'drawBattlement',    draw: drawBattlement },
    { id: 'table-long',      name: 'Long Table',        cat: 'furniture',    hw: 33, hh: 33, fnName: 'drawLongTable',     draw: drawLongTable },
    { id: 'table-long-v',   name: 'Long Table V',      cat: 'furniture',    hw: 33, hh: 33, fnName: 'drawLongTableV',    draw: drawLongTableV },
    { id: 'table-round',     name: 'Round Table',       cat: 'furniture',    hw: 41, hh: 41, fnName: 'drawRoundTable',    draw: drawRoundTable },
    { id: 'cauldron',        name: 'Cauldron',          cat: 'furniture',    hw: 20, hh: 30, fnName: 'drawCauldron',      draw: drawCauldron },
    { id: 'fireplace',       name: 'Fireplace',         cat: 'furniture',    hw: 35, hh: 35, fnName: 'drawFireplace',     draw: drawFireplace },
    { id: 'bookshelf',       name: 'Bookshelf',         cat: 'furniture',    hw: 28, hh: 24, fnName: 'drawBookshelf',     draw: drawBookshelf },
    { id: 'bookshelf-tall',  name: 'Bookshelf Tall',    cat: 'furniture',    hw: 22, hh: 36, fnName: 'drawBookshelfTall', draw: drawBookshelfTall },
    { id: 'lectern',         name: 'Lectern',           cat: 'furniture',    hw: 18, hh: 17, fnName: 'drawLectern',       draw: drawLectern },
    { id: 'potions-shelf',   name: 'Potions Shelf',     cat: 'furniture',    hw: 28, hh: 22, fnName: 'drawPotionsShelf',  draw: drawPotionsShelf },
    { id: 'torch',           name: 'Wall Torch',        cat: 'decorations',  hw: 9,  hh: 35, fnName: 'drawTorch',         draw: drawTorch },
    { id: 'chandelier',      name: 'Chandelier',        cat: 'decorations',  hw: 30, hh: 40, fnName: 'drawChandelier',    draw: drawChandelier },
    { id: 'armor',           name: 'Suit of Armor',     cat: 'decorations',  hw: 25, hh: 40, fnName: 'drawArmorStand',    draw: drawArmorStand },
    { id: 'stairs',          name: 'Spiral Stairs',     cat: 'decorations',  hw: 27, hh: 27, fnName: 'drawSpiralStairs',  draw: drawSpiralStairs },
    { id: 'carpet',          name: 'Carpet Runner',     cat: 'decorations',  hw: 36, hh: 17, fnName: 'drawCarpet',        draw: drawCarpet },
    { id: 'fountain',        name: 'Fountain',          cat: 'decorations',  hw: 27, hh: 27, fnName: 'drawFountain',      draw: drawFountain },
    { id: 'mirror-ornate',   name: 'Ornate Mirror',     cat: 'decorations',  hw: 16, hh: 24, fnName: 'drawMirrorOrnate',  draw: drawMirrorOrnate },
    { id: 'dungeon-chain',   name: 'Dungeon Chain',     cat: 'decorations',  hw: 8,  hh: 28, fnName: 'drawDungeonChain',  draw: drawDungeonChain },
]
