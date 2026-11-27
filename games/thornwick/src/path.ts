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
/* Generation marks: a cell's dist is valid only when its mark is the current
   generation, so a search to one target does not clear the whole map first. */
const mark = new Int32Array(NN)
let gen = 0
/*
 * Cheapest path from srcs to tgt with the entry cost `enter`. With tgt < 0 it
 * fills `dist` for the whole map (flow fields). To one target it is A* with a
 * heuristic of `hw` per tile: it must not be more than the cheapest step of
 * `enter`, so the path stays the cheapest one. `cap` limits the cells it opens.
 */
export function search(srcs?, tgt?, enter?, rev?, hw?, cap?) {
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
    if (tgt >= 0 && !rev) {
        return aStar(srcs, tgt, enter, hw === undefined ? 0.3 : hw, cap || 0, push, popMin, () => hn)
    }
    if (tgt < 0 && rev) {
        return flood(srcs, enter, hw || 0.3, push, popMin, () => hn)
    }
    dist.fill(Infinity)
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
/*
 * The cost from every tile to the nearest of srcs, into `dist` (a step from n
 * into m costs enter(m)). A bucket queue (Dial): bucket k holds the tiles at a
 * cost from k*w up to (k+1)*w. With w no more than the cheapest step, a bucket
 * is final when it is taken, so the result is the same as with a heap, only
 * much faster. Steps far beyond the ring of buckets wait in the heap.
 */
const RS = 4096,
    head = new Int32Array(RS),
    done = new Uint8Array(NN),
    pNode = new Int32Array(NN * 4),
    pNext = new Int32Array(NN * 4)
function flood(srcs?, enter?, w?, push?, popMin?, size?) {
    dist.fill(Infinity)
    head.fill(-1)
    done.fill(0)
    let used = 0,
        inRing = 0,
        cur = 0
    const put = (n?) => {
        // Never into a bucket already taken, even when floats round down.
        const k = Math.max(cur, Math.floor(dist[n] / w))
        if (k >= cur + RS || used >= pNode.length) {
            if (size() < hC.length) {
                push(n, dist[n])
            }
            return
        }
        const r = k % RS
        pNode[used] = n
        pNext[used] = head[r]
        head[r] = used++
        inRing++
    }
    for (const s of srcs) {
        dist[s] = 0
        put(s)
    }
    while (inRing || size()) {
        if (!inRing) {
            cur = Math.floor(hC[0] / w)
        }
        // Bring in from the heap what now fits in the ring.
        while (size() && Math.floor(hC[0] / w) < cur + RS) {
            const key = hC[0],
                n = popMin()
            if (dist[n] === key && !done[n]) {
                put(n)
            }
        }
        const r = cur % RS
        while (head[r] >= 0) {
            const e = head[r]
            head[r] = pNext[e]
            inRing--
            const m = pNode[e]
            // Each tile is final the first time it is taken.
            if (done[m]) {
                continue
            }
            done[m] = 1
            const em = enter(m)
            if (em === Infinity) {
                continue
            }
            const c = dist[m] + em,
                x = m % N,
                y = (m / N) | 0
            if (x > 0 && c < dist[m - 1]) {
                dist[m - 1] = c
                put(m - 1)
            }
            if (x < N - 1 && c < dist[m + 1]) {
                dist[m + 1] = c
                put(m + 1)
            }
            if (y > 0 && c < dist[m - N]) {
                dist[m - N] = c
                put(m - N)
            }
            if (y < N - 1 && c < dist[m + N]) {
                dist[m + N] = c
                put(m + N)
            }
        }
        cur++
    }
    return true
}
function aStar(srcs?, tgt?, enter?, hw?, cap?, push?, popMin?, size?) {
    if (++gen > 2e9) {
        gen = 1
        mark.fill(0)
    }
    const tx = tgt % N,
        ty = (tgt / N) | 0
    for (const s of srcs) {
        mark[s] = gen
        dist[s] = 0
        prev[s] = s
        push(s, hw * (Math.abs((s % N) - tx) + Math.abs(((s / N) | 0) - ty)))
    }
    let open = 0
    while (size()) {
        const f = hC[0],
            m = popMin(),
            x = m % N,
            y = (m / N) | 0,
            g = dist[m]
        // A stale entry: a cheaper way to this cell was found after it was queued.
        // The heap holds 32-bit floats, so allow for their rounding. Opening a
        // cell again does no harm: it uses the best cost found so far.
        if (f > g + hw * (Math.abs(x - tx) + Math.abs(y - ty)) + 0.01) {
            continue
        }
        if (m === tgt) {
            return true
        }
        if (cap && ++open > cap) {
            return false
        }
        for (let k = 0; k < 4; k++) {
            const nx = x + +(k === 0) - +(k === 1),
                ny = y + +(k === 2) - +(k === 3)
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) {
                continue
            }
            const n = nx + ny * N,
                c = g + (n === tgt ? 1 : enter(n))
            if (c === Infinity) {
                continue
            }
            if (mark[n] !== gen || c < dist[n]) {
                mark[n] = gen
                dist[n] = c
                prev[n] = m
                if (size() < hC.length) {
                    push(n, c + hw * (Math.abs(nx - tx) + Math.abs(ny - ty)))
                }
            }
        }
    }
    return false
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
        true,
        // The cheapest step of enemyCost is 1.
        1
    )
    flow.set(dist)
    computeBailey()
}
