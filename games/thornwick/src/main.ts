import { placeErr, tryPlace, upgradeKeep } from './build'
import {
    $,
    BACKUP_SAVE_KEY,
    DEF,
    LEGACY_SAVE_KEYS,
    N,
    SAVE_KEY,
    STEP,
} from './config'
import * as ECO from './eco'
import { closeRealm, openRealm } from './ecoui'
import { EVENTS, pickEvent, startEvent } from './events'
import { groundInit } from './ground'
import { toast } from './helpers'
import { lookAt, pick, readTheme, resize } from './input'
import { refreshOwn } from './land'
import { chooseFoe, countRivals, damageB, ignite, launch, power } from './lords'
import { recomputePaths } from './path'
import { UNITS, fireArrows, sendScout, train, warCry } from './people'
import { cam, render } from './render'
import { tick } from './sim'
import { propSprite, sprite, unitSprite } from './sprites'
import {
    bmap,
    flow,
    loadFrom,
    newGame,
    reg,
    save,
    seenAt,
    snapshot,
    store,
    terrain,
    wx,
    wy,
} from './state'
import {
    buildCards,
    hud,
    inspectHTML,
    palLine,
    rebuildStone,
    showHelp,
} from './ui'
import { GV } from './vars'

GV.last = 0
GV.acc = 0
GV.hudT = 0
export const SMOKE = {
    house: [7, -20],
    shouse: [7, -19],
    tavern: [0, -24],
    smith: [7, -20],
    camp: [-8, -4],
    bakery: [-3, -26],
    brewery: [-3, -26],
}
export function step(real?) {
    GV.animT += real
    if (GV.S && GV.ownDirty) {
        refreshOwn()
    }
    if (GV.S && GV.pathsDirty) {
        recomputePaths()
    }
    const run =
        GV.S &&
        !GV.S.over &&
        GV.speed > 0 &&
        !GV.helpOpen &&
        !GV.overOpen &&
        !GV.newOpen &&
        !GV.realmOpen
    if (run) {
        GV.acc += real * GV.speed
        let n = 0
        while (GV.acc >= STEP && n++ < 12) {
            tick(STEP)
            GV.acc -= STEP
            if (GV.S.over) {
                break
            }
        }
        if (GV.acc > STEP * 12) {
            GV.acc = 0
        }
    }
    if (GV.S) {
        for (const b of GV.S.b) {
            if (b.drop > 0) {
                b.drop = Math.max(0, b.drop - real * 5)
            }
            if (!run || !seenAt(b.cx, b.cy)) {
                continue
            }
            if (b.fire > 0) {
                if (Math.random() < real * 16) {
                    GV.parts.push({
                        x: wx(b.cx, b.cy) + (Math.random() - 0.5) * 18 * b.s,
                        y: wy(b.cx, b.cy) - 4 - Math.random() * 16,
                        vx: (Math.random() - 0.5) * 6,
                        vy: -16 - Math.random() * 14,
                        t: 0,
                        life: 0.45 + Math.random() * 0.4,
                        c: ['#ffe06a', '#ff9a2a', '#e0481e'][
                            (Math.random() * 3) | 0
                        ],
                        s: 1,
                    })
                }
                if (Math.random() < real * 4) {
                    GV.parts.push({
                        x: wx(b.cx, b.cy) + (Math.random() - 0.5) * 10,
                        y: wy(b.cx, b.cy) - 20,
                        vx: 3 + Math.random() * 3,
                        vy: -9 - Math.random() * 5,
                        t: 0,
                        life: 1.6 + Math.random(),
                        c: '#4a4a50',
                        s: 1.5,
                    })
                }
            } else if (SMOKE[b.t] && Math.random() < real * 1.6) {
                const off = SMOKE[b.t]
                GV.parts.push({
                    x: wx(b.x, b.y) + off[0],
                    y: wy(b.x, b.y) + off[1],
                    vx: 2 + Math.random() * 3,
                    vy: -7 - Math.random() * 4,
                    t: 0,
                    life: 1.6 + Math.random(),
                    c: b.t === 'smith' ? '#6a6a70' : '#d8d8d2',
                    s: 1,
                })
            }
        }
        for (const p of GV.parts) {
            p.t += real
            p.x += p.vx * real
            p.y += p.vy * real
        }
        if (GV.parts.length) {
            GV.parts = GV.parts.filter((p?) => p.t < p.life)
        }
    }
}
export function frame(now?) {
    const real = Math.min(0.1, (now - GV.last) / 1000 || 0)
    GV.last = now
    step(real)
    if ((GV.hudT -= real) <= 0) {
        GV.hudT = 0.25
        hud()
    }
    render()
    requestAnimationFrame(frame)
}
export async function boot() {
    await new Promise((r?) => setTimeout(r, 40))
    groundInit()
    readTheme()
    let loaded = false
    if (store) {
        // The current key first, then keys of older versions.
        for (const key of [SAVE_KEY, ...LEGACY_SAVE_KEYS]) {
            let raw = null
            try {
                const r = await Promise.race([
                    store.get(key, false),
                    new Promise((_?, rej?) =>
                        setTimeout(() => rej(new Error('slow')), 3000)
                    ),
                ])
                raw = r && r.value
            } catch {
                // storage can be blocked (private mode); the game runs without it
            }
            if (!raw) {
                continue
            }
            try {
                loadFrom(JSON.parse(raw))
                loaded = true
                if (key !== SAVE_KEY) {
                    await store.set(SAVE_KEY, raw, false)
                    await store.delete(key, false)
                }
            } catch {
                // Keep a copy of a save this version cannot read, instead of losing it.
                try {
                    await store.set(BACKUP_SAVE_KEY, raw, false)
                    await store.delete(key, false)
                } catch {
                    // nothing more to do without storage
                }
                toast(
                    'Your earlier kingdom could not be loaded in this version. A copy of it is kept, and a new realm begins.'
                )
            }
            break
        }
    }
    if (!loaded) {
        newGame()
        showHelp(true)
    }
    buildCards()
    resize()
    hud()
    $('#loading').hidden = true
    if (window.ResizeObserver) {
        new ResizeObserver(resize).observe($('#palette'))
    }
    setInterval(save, 20000)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            save()
        }
    })
    window.addEventListener('pagehide', save)
    requestAnimationFrame(frame)
}
;(window as any).__thornwick = {
    get S() {
        return GV.S
    },
    tick,
    damageB,
    chooseFoe,
    power,
    countRivals,
    step,
    tryPlace,
    newGame,
    snapshot,
    loadFrom,
    render,
    hud,
    sprite,
    propSprite,
    unitSprite,
    upgradeKeep,
    cam,
    DEF,
    resize,
    lookAt,
    launch,
    startEvent,
    pickEvent,
    ignite,
    EVENTS,
    get regs() {
        return GV.regs
    },
    get riv() {
        return GV.S.riv
    },
    setK(k?) {
        GV.K = k
    },
    showHelp,
    markOwn() {
        GV.ownDirty = true
    },
    placeErr,
    train,
    sendScout,
    warCry,
    fireArrows,
    rebuildStone,
    palLine,
    pick,
    UNITS,
    get capU() {
        return GV.capU
    },
    inspectHTML,
    flowAt(x?, y?) {
        return flow[x + y * N]
    },
    get terrAt() {
        return (x?, y?) => terrain[x + y * N]
    },
    get keep() {
        return GV.keep
    },
    terrain,
    bmap,
    reg,
    eco: ECO,
    select(b?) {
        GV.selected = b
        hud()
    },
    openRealm,
    closeRealm,
}
boot()
