import { DEF, KX, KY, N, NN } from './config'
import { groundTileChanged } from './ground'
import { computeBailey } from './land'
import { hsh } from './noise'
import { bmap, flow, inMap, pathMap, terrain } from './state'
import { GV } from './vars'

export const dist = new Float32Array(NN),
    prev = new Int32Array(NN),
    hI = new Int32Array(NN * 4),
    hC = new Float32Array(NN * 4)
export function search(srcs?, tgt?, enter?, rev?) {
    dist.fill(Infinity)
    let hn = 0
    const push = (i?, c?) => {
        let k = hn++
        while (k > 0) {
            const p = (k - 1) >> 1
            if (hC[p] <= c) {
                break
            }
            hC[k] = hC[p]
            hI[k] = hI[p]
            k = p
        }
        hC[k] = c
        hI[k] = i
    }
    const popMin = () => {
        const top = hI[0]
        hn--
        const c = hC[hn],
            i = hI[hn]
        let k = 0
        for (;;) {
            let ch = 2 * k + 1
            if (ch >= hn) {
                break
            }
            if (ch + 1 < hn && hC[ch + 1] < hC[ch]) {
                ch++
            }
            if (hC[ch] >= c) {
                break
            }
            hC[k] = hC[ch]
            hI[k] = hI[ch]
            k = ch
        }
        hC[k] = c
        hI[k] = i
        return top
    }
    for (const s of srcs) {
        dist[s] = 0
        prev[s] = s
        push(s, 0)
    }
    while (hn) {
        const dTop = hC[0],
            m = popMin()
        if (dTop > dist[m]) {
            continue
        }
        if (m === tgt) {
            return true
        }
        const x = m % N,
            y = (m / N) | 0,
            em = rev ? enter(m) : 0
        for (let k = 0; k < 4; k++) {
            const nx = x + +(k === 0) - +(k === 1),
                ny = y + +(k === 2) - +(k === 3)
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) {
                continue
            }
            const n = nx + ny * N,
                c = dTop + (rev ? em : n === tgt ? 1 : enter(n))
            if (c < dist[n]) {
                dist[n] = c
                prev[n] = m
                if (hn < hC.length) {
                    push(n, c)
                }
            }
        }
    }
    return tgt < 0
}
export function trace(s?, t?) {
    const out = []
    for (let c = t; c !== s; c = prev[c]) {
        out.push(c)
    }
    return out.reverse()
}
export const terrCost = (i?, b?) => {
    const t = terrain[i]
    return t === 3
        ? b && b.t === 'bridge' && !b.up
            ? 0.6
            : 5
        : t >= 4
          ? Infinity
          : pathMap[i]
            ? 0.55
            : t === 1
              ? 2.2
              : t === 2
                ? 3
                : 1
}
export const walkCost = (i?) => {
    const b = bmap[i]
    if (b && (b.o !== 0 || !DEF[b.t].walk)) {
        return Infinity
    }
    return terrCost(i, b)
}
export const rivBlock = (b?) => b.o !== 0 && (!DEF[b.t].walk || b.t === 'gate')
export const siegeCost = (i?) => {
    const b = bmap[i]
    if (b && rivBlock(b)) {
        return b.t === 'keep' ? 1 : 3 + b.hp / 12
    }
    if (b && b.o === 0 && !DEF[b.t].walk) {
        return Infinity
    }
    return terrCost(i, b)
}
export const rivWalk = (i?) => {
    const b = bmap[i]
    if (b && (b.o === 0 || !DEF[b.t].walk)) {
        return Infinity
    }
    return terrCost(i, b)
}
export const planCost = (i?) => {
    const b = bmap[i]
    if (b && (b.o !== 0 || !DEF[b.t].walk)) {
        return Infinity
    }
    const t = terrain[i]
    if (t === 3) {
        return b ? 0.5 : 14
    }
    if (t >= 4) {
        return Infinity
    }
    if (pathMap[i]) {
        return 0.3
    }
    return (t === 1 ? 2.6 : t === 2 ? 4 : 1) + hsh(i % N, (i / N) | 0, 93) * 1.3
}
export const blocks = (b?) =>
    !DEF[b.t].soft && !(b.t === 'gate' && !b.shut) && !(b.ladder > 0)
export const enemyCost = (i?) => {
    const b = bmap[i],
        t = terrain[i]
    // Land that has not opened yet (terrain 5) cannot be crossed at all.
    if (t >= 4) {
        return t === 4 ? 1e6 : Infinity
    }
    let c =
        1 +
        (t === 1
            ? 0.5
            : t === 2
              ? 1
              : t === 3
                ? b && b.t === 'bridge' && !b.up
                    ? 0
                    : 3
                : 0)
    if (b) {
        if (b.o !== 0) {
            return DEF[b.t].walk ? c : 1e6
        }
        if (b === GV.keep) {
            return c
        }
        if (b.t === 'stakes') {
            c += 2.5
        } else if (b.ladder > 0) {
            c += 3
        } else if (blocks(b)) {
            c += b.hp / 10
        }
    }
    return c
}
export const frontTile = (b?) => b.x + ((b.s - 1) >> 1) + (b.y + b.s - 1) * N
export const door = (b?) =>
    b.s === 1 ? [b.x + 0.42, b.y + 0.48] : [b.x + 0.5, b.y + b.s - 0.5 + 0.1]
export function recomputePaths(skipDraw?) {
    GV.pathsDirty = false
    const old = pathMap.slice()
    pathMap.fill(0)
    const hub = KX + (KY + 2) * N
    const mark = (s?, t?) => {
        if (!search([s], t, planCost)) {
            return
        }
        for (const i of trace(s, t)) {
            if (terrain[i] !== 3 && !(bmap[i] && bmap[i].t !== 'gate')) {
                pathMap[i] = 1
            }
        }
    }
    if (!bmap[hub] && !terrain[hub]) {
        pathMap[hub] = 1
    }
    for (const b of GV.S.b) {
        if (b.o !== 0 || !DEF[b.t].path) {
            continue
        }
        mark(frontTile(b), hub)
        const list =
            b.t === 'lumber' ? GV.myTrees : b.t === 'quarry' ? GV.myRocks : null
        if (list && list.length) {
            let best = null,
                bd = 1e9
            for (const p of list) {
                const d = Math.hypot(p[0] - b.x, p[1] - b.y)
                if (d < bd) {
                    bd = d
                    best = p
                }
            }
            if (bd < 16) {
                mark(frontTile(b), best[0] + best[1] * N)
            }
        }
    }
    for (let i = 0; i < NN; i++) {
        if (terrain[i] === 1 || terrain[i] === 2 || terrain[i] >= 4) {
            pathMap[i] = 0
        }
    }
    if (skipDraw || !GV.gcv) {
        return
    }
    const dirty = new Set<number>()
    for (let i = 0; i < NN; i++) {
        if (old[i] !== pathMap[i]) {
            const x = i % N,
                y = (i / N) | 0
            for (const [a, b] of [
                [0, 0],
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]) {
                if (inMap(x + a, y + b)) {
                    dirty.add(x + a + (y + b) * N)
                }
            }
        }
    }
    for (const i of dirty) {
        groundTileChanged(i % N, (i / N) | 0)
    }
}
export function computeFlow() {
    GV.flowDirty = false
    search(
        [
            KX + KY * N,
            KX + 1 + KY * N,
            KX + (KY + 1) * N,
            KX + 1 + (KY + 1) * N,
        ],
        -1,
        enemyCost,
        true
    )
    flow.set(dist)
    computeBailey()
}
