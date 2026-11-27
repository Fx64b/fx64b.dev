/*
 * Stress test for Thornwick: a late game with 550+ of your buildings, a wall
 * ring, 400 villagers and 1100 soldiers, then a war (two banners and a raid of
 * 150). It times the main thread per frame (one sim step of 1/60 s and one
 * render) at each zoom, while panning, and in the war at 1x and 3x speed.
 *
 * The browser draws the canvas after each frame, outside the timer, as a
 * browser with a GPU does. Without a GPU (headless in a container), add
 * --raster to time the drawing too, in a tight loop: much slower there.
 *
 * Run the game, then the test:
 *   pnpm dev:game
 *   node games/thornwick/perf/stress.mjs [--budget 33] [--raster] [--url ...]
 * Needs Playwright with Chromium (pnpm add -D playwright && pnpm exec playwright install chromium).
 * Exits with 1 when the p95 frame of any phase is over the budget (ms).
 */
/* global console, process, window, document, performance, setTimeout */
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d)
const url = opt('--url', 'http://localhost:5174/games/thornwick/')
const budget = +opt('--budget', 33)
const raster = args.includes('--raster')
const NB = +opt('--buildings', 550),
    NS = +opt('--soldiers', 1100)

const browser = await chromium.launch()
const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
})
// The same world each run.
await page.addInitScript(() => {
    let a = 3
    Math.random = () => {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
})
page.on('pageerror', (e) => console.log('page error:', e.message))
await page.goto(url)
await page.waitForFunction(
    () => window.__thornwick?.S && document.querySelector('#loading').hidden,
    null,
    { timeout: 60000 }
)
const start = page.getByRole('button', { name: 'Start building' })
if (await start.isVisible().catch(() => false)) {
    await start.click()
}
const boon = page.locator('#boonCards > *').first()
if (await boon.isVisible().catch(() => false)) {
    await boon.click()
}
// The test drives the frames itself.
await page.evaluate(() => {
    window.requestAnimationFrame = () => 0
})

const made = await page.evaluate(
    ({ NB, NS }) => {
        const T = window.__thornwick,
            GV = T.GV,
            S = T.S,
            N = 315,
            KX = 157,
            KY = 157
        S.res.gold = S.res.wood = S.res.stone = S.res.food = 1e6
        for (const rg of GV.regs) {
            if (Math.hypot(rg.sx - KX, rg.sy - KY) < 60 && rg.owner === -1) {
                S.conq[rg.id] = 1
            }
            S.disc[rg.id] = 1
        }
        T.markOwn()
        T.step(0)
        T.upgradeKeep()
        T.upgradeKeep()
        const types =
            'house house house shouse shouse farm farm lumber quarry well market mill bakery brewery tavern chapel barracks range stables workshop smith tower watch garden statue brazier banner weaver sheep scriptorium'.split(
                ' '
            )
        const free = (x, y, s) => {
            for (let j = 0; j < s; j++) {
                for (let i = 0; i < s; i++) {
                    const k = x + i + (y + j) * N
                    if (x + i >= N - 1 || y + j >= N - 1 || T.bmap[k]) {
                        return false
                    }
                    if (T.terrain[k] === 3 || T.terrain[k] >= 4) {
                        return false
                    }
                    if (T.regs[T.reg[k]].owner !== 0) {
                        return false
                    }
                }
            }
            return true
        }
        // Rings round the keep, every third row and column left as a road.
        let placed = 0
        for (let r = 3; r < 60 && placed < NB; r++) {
            for (let y = KY - r; y <= KY + r && placed < NB; y++) {
                for (let x = KX - r; x <= KX + r && placed < NB; x++) {
                    if (Math.max(Math.abs(x - KX), Math.abs(y - KY)) !== r) {
                        continue
                    }
                    if (x % 3 === 0 || y % 3 === 0) {
                        continue
                    }
                    const t = types[(x * 7 + y * 13) % types.length]
                    if (free(x, y, T.DEF[t].size || 1)) {
                        T.addB(t, x, y, true, 0)
                        placed++
                    }
                }
            }
        }
        for (let a = 0; a < 360; a += 1.2) {
            const x = Math.round(KX + Math.cos(a / 57.3) * 32),
                y = Math.round(KY + Math.sin(a / 57.3) * 32)
            if (free(x, y, 1)) {
                T.addB(a % 30 < 1.2 ? 'tower' : 'wall', x, y, true, 0)
            }
        }
        for (let i = 0; i < 400; i++) {
            T.spawnVillager(false)
        }
        const kinds =
            'sword sword pike archer archer knight shield xbow pram pcat eng'.split(
                ' '
            )
        for (let i = 0; i < NS; i++) {
            const a = Math.random() * 6.28,
                d = 4 + Math.random() * 25
            T.addSoldier(
                T.keep,
                KX + Math.cos(a) * d,
                KY + Math.sin(a) * d,
                kinds[i % kinds.length]
            )
        }
        GV.ownDirty = GV.pathsDirty = true
        for (let i = 0; i < 300; i++) {
            T.step(1 / 30)
        }
        return {
            buildings: S.b.filter((b) => b.o === 0).length,
            soldiers: S.sold.length,
            villagers: S.vill.length,
        }
    },
    { NB, NS }
)
console.log('world:', JSON.stringify(made))

async function phase(label, setup, move) {
    return page.evaluate(
        async ({ label, setup, move, raster }) => {
            const T = window.__thornwick,
                GV = T.GV,
                cam = T.cam
            new Function('T', 'GV', 'cam', setup)(T, GV, cam)
            const mv = new Function('T', 'GV', 'cam', move)
            const sim = [],
                all = []
            for (let i = 0; i < 180; i++) {
                mv(T, GV, cam)
                const a = performance.now()
                T.step(1 / 60)
                const b = performance.now()
                if (i % 15 === 0) {
                    T.hud()
                }
                T.render()
                const c = performance.now()
                if (i >= 30) {
                    sim.push(b - a)
                    all.push(c - a)
                }
                if (!raster) {
                    await new Promise((r) => setTimeout(r, 0))
                }
            }
            const st = (v) => {
                v.sort((p, q) => p - q)
                return {
                    avg: v.reduce((p, q) => p + q, 0) / v.length,
                    p95: v[Math.floor(v.length * 0.95)],
                }
            }
            return { label, sim: st(sim), frame: st(all) }
        },
        { label, setup, move, raster }
    )
}

const res = []
const at = (K, x, y) => `GV.speed = 1; GV.K = ${K}; T.lookAt(${x}, ${y})`
for (const K of [1, 2, 3, 4]) {
    res.push(await phase('zoom ' + K, at(K, 157, 157), ''))
}
res.push(
    await phase('pan, zoomed out', at(1, 157, 157), 'cam.x -= 30; cam.y -= 9')
)
res.push(
    await phase('pan, zoom 2', at(2, 130, 130), 'cam.x -= 25; cam.y -= 12')
)
await page.evaluate(() => {
    const T = window.__thornwick,
        S = T.S
    const rv = S.riv.find((r) => !r.dead)
    T.plantBanner(rv.kx, rv.ky)
    T.plantBanner(177, 177)
    for (let i = 0; i < 150; i++) {
        T.spawnEnemy(
            rv.id,
            i % 5 ? 'sword' : 'archer',
            0,
            10,
            185 + Math.random() * 6,
            147 + Math.random() * 6,
            'atk'
        )
    }
})
res.push(await phase('war, zoomed out', at(1, 170, 160), ''))
res.push(await phase('war, zoom 2, 3x', at(2, 170, 160) + '; GV.speed = 3', ''))
await browser.close()

let bad = 0
console.log(
    '\nms per frame' +
        (raster ? ' (drawing included)' : '') +
        ', budget p95 <= ' +
        budget
)
console.log('phase'.padEnd(18) + 'sim avg  sim p95  frame avg  frame p95')
for (const r of res) {
    const over = r.frame.p95 > budget
    bad += over ? 1 : 0
    console.log(
        r.label.padEnd(18) +
            r.sim.avg.toFixed(1).padStart(7) +
            r.sim.p95.toFixed(1).padStart(9) +
            r.frame.avg.toFixed(1).padStart(11) +
            r.frame.p95.toFixed(1).padStart(11) +
            (over ? '  over budget' : '')
    )
}
process.exit(bad ? 1 : 0)
