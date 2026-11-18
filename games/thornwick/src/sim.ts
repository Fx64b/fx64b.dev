import { assignSquads, nearOwnBanner } from './army'
import { buildGrid, highAt, inWood, moraleTick } from './combat'
import { DEF, KEEP_DMG, KX, KY } from './config'
import { startEvent } from './events'
import { tintAll } from './ground'
import {
    cap,
    flam,
    gain,
    near,
    nearest,
    nearestSold,
    pop,
    puff,
    toast,
} from './helpers'
import { refreshOwn } from './land'
import { damageB, eUpdate, hitEnemy, ignite, rivalsTick } from './lords'
import { computeFlow } from './path'
import {
    addSoldier,
    assignJobs,
    hitSold,
    sUpdate,
    spawnVillager,
    train,
    vUpdate,
} from './people'
import { bAt, clampN, isNight, season, wx, wy } from './state'
import { GV } from './vars'

export function tick(dt?) {
    GV.S.t += dt
    const se = season()
    if (se !== GV.curSeason) {
        if (GV.curSeason >= 0) {
            toast(
                [
                    'Spring returns. The fields are sown again.',
                    'Summer. The roads are dry and armies march in strength.',
                    'Autumn. The harvest is rich, so fill the stores before the snow.',
                    'Winter has come. Farms lie fallow until spring.',
                ][se]
            )
        }
        GV.curSeason = se
        if (GV.gcv) {
            tintAll()
        }
    }
    if (GV.ownDirty) {
        refreshOwn()
    }
    if (GV.flowDirty) {
        computeFlow()
    }
    if ((GV.jobCd -= dt) <= 0) {
        GV.jobCd = 1
        assignJobs()
    }

    if ((GV.S.growCd -= dt) <= 0) {
        GV.S.growCd =
            (GV.S.b.some((b?) => b.t === 'chapel' && b.o === 0) ? 3.5 : 6) *
            (se === 3 ? 1.6 : 1)
        if (pop() < cap() && GV.S.res.food >= 20) {
            spawnVillager(false)
        }
    }
    if ((GV.S.eatCd -= dt) <= 0) {
        GV.S.eatCd = 8
        const need = pop()
        GV.S.res.gold += Math.floor(GV.S.vill.length / 10)
        const mines = GV.regs.reduce(
            (n?, rg?) => n + (rg.owner === 0 && rg.poi === 'mine' ? 1 : 0),
            0
        )
        if (mines) {
            gain('gold', 4 * mines, KX + 0.5, KY + 0.5)
        }
        if (GV.S.res.food >= need) {
            GV.S.res.food -= need
            GV.S.hungry = 0
        } else {
            GV.S.res.food = 0
            if (++GV.S.hungry >= 2 && GV.S.vill.length > 1) {
                const u =
                    GV.S.vill.find((u?) => !u.job) ||
                    GV.S.vill[GV.S.vill.length - 1]
                GV.S.vill.splice(GV.S.vill.indexOf(u), 1)
                GV.S.hungry = 0
                toast(
                    'The stores are empty. A villager has left.' +
                        (se === 3
                            ? ' Winter is hard without a full granary.'
                            : ' Build more farms.')
                )
            } else if (GV.S.hungry === 1) {
                toast(
                    'Food has run out. Villagers will leave unless they are fed.'
                )
            }
        }
    }
    if ((GV.S.tavCd -= dt) <= 0) {
        GV.S.tavCd = 10
        let left = GV.S.vill.length
        for (const b of GV.S.b) {
            if (b.t === 'tavern' && b.o === 0 && left > 0) {
                const g = Math.floor(Math.min(left, 12) / 3)
                left -= 12
                if (g > 0) {
                    gain('gold', g, b.x, b.y)
                }
            }
        }
    }
    if ((GV.trainCd -= dt) <= 0) {
        GV.trainCd = 2
        for (const b of GV.S.b) {
            if (b.o === 0 && DEF[b.t].garrison && b.auto) {
                train(b, true)
            }
        }
    }
    GV.S.cry = Math.max(0, GV.S.cry - dt)
    GV.S.cryCd = Math.max(0, GV.S.cryCd - dt)
    GV.S.burnT = Math.max(0, GV.S.burnT - dt)
    GV.S.burnCd = Math.max(0, GV.S.burnCd - dt)
    if (!GV.capU && GV.S.capDown > 0 && (GV.S.capDown -= dt) <= 0) {
        addSoldier(GV.keep, KX + 0.5, KY + 2.6, 'captain')
        toast('A new captain takes up the banner of Thornwick.')
    }
    if (GV.S.ev) {
        if ((GV.S.ev.ttl -= dt) <= 0) {
            const ev = GV.S.ev
            GV.S.ev = null
            if (ev.expire) {
                ev.expire()
            }
        }
    } else if ((GV.S.evCd -= dt) <= 0) {
        GV.S.evCd = 130 + Math.random() * 80
        startEvent()
    }
    rivalsTick(dt)

    if ((GV.gateCd -= dt) <= 0) {
        GV.gateCd = 0.5
        for (const b of GV.S.b) {
            if (b.o !== 0 || (b.t !== 'gate' && b.t !== 'bridge')) {
                continue
            }
            let n = 0,
                close = 0,
                ram = false
            for (const e of GV.S.en) {
                if (e.mode !== 'atk') {
                    continue
                }
                const d = Math.hypot(e.x - b.x, e.y - b.y)
                if (d < 7) {
                    n++
                }
                if (d < 1.8) {
                    close++
                    if (e.type === 'ram') {
                        ram = true
                    }
                }
            }
            if (b.auto) {
                if (b.t === 'gate') {
                    if (b.shut !== n > 0) {
                        b.shut = n > 0
                        GV.flowDirty = true
                    }
                } else if (b.up !== n > 0) {
                    b.up = n > 0
                    GV.flowDirty = true
                }
            }
            if (b.t === 'gate') {
                if (b.oil > 0) {
                    b.oil -= 0.5
                } else if (close >= 2 || ram) {
                    b.oil = 25
                    for (const e of GV.S.en) {
                        if (Math.hypot(e.x - b.x, e.y - b.y) < 1.9) {
                            hitEnemy(e, 45)
                        }
                    }
                    for (const o of GV.S.b) {
                        if (
                            o.ladder > 0 &&
                            Math.hypot(o.x - b.x, o.y - b.y) < 2.2
                        ) {
                            o.ladder = 0
                            GV.flowDirty = true
                        }
                    }
                    for (let i = 0; i < 16; i++) {
                        GV.parts.push({
                            x: wx(b.x, b.y) + (Math.random() - 0.5) * 30,
                            y: wy(b.x, b.y) - 16 + Math.random() * 6,
                            vx: (Math.random() - 0.5) * 20,
                            vy: 14 + Math.random() * 14,
                            t: 0,
                            life: 0.6 + Math.random() * 0.4,
                            c: i % 2 ? '#ffb02e' : '#ffe06a',
                            s: 1,
                        })
                    }
                }
            }
        }
    }

    for (const u of GV.S.vill) {
        vUpdate(u, dt)
    }
    buildGrid()
    if ((GV.sqCd -= dt) <= 0) {
        GV.sqCd = 1
        assignSquads()
    }
    for (const s of GV.S.sold) {
        if (!s.dead) {
            moraleTick(s, dt, nearOwnBanner)
            sUpdate(s, dt)
        }
    }
    for (const e of GV.S.en.slice()) {
        if (!e.dead) {
            moraleTick(e, dt)
            eUpdate(e, dt)
        }
        if (GV.S.over) {
            return
        }
    }

    const calm = !GV.S.en.some((e?) => e.mode === 'atk'),
        night = isNight()
    for (const b of GV.S.b.slice()) {
        if (b.dead) {
            continue
        }
        if (b.hit > 0) {
            b.hit -= dt
        }
        if (b.ladder > 0) {
            b.ladder -= dt * (nearestSold(b.x, b.y, 1.6, true) ? 5 : 1)
            if (b.ladder <= 0) {
                b.ladder = 0
                GV.flowDirty = true
            }
        }
        if (b.hp < b.max && b.t !== 'stakes' && !(b.fire > 0)) {
            if (b.o === 0) {
                if (calm) {
                    b.hp = Math.min(b.max, b.hp + b.max * 0.02 * dt)
                }
            } else if (!nearestSold(b.cx, b.cy, 9, true)) {
                b.hp = Math.min(b.max, b.hp + b.max * 0.01 * dt)
            }
        }
        const d = DEF[b.t],
            isKeep = b.t === 'keep'
        if (d.range || isKeep) {
            b.cd -= dt
            const targets =
                b.o === 0
                    ? GV.S.en
                    : GV.S.en.some((x?) => x.mode === 'war' && x.foe === b.o)
                      ? GV.S.sold.concat(
                            GV.S.en.filter(
                                (x?) => x.mode === 'war' && x.foe === b.o
                            )
                        )
                      : GV.S.sold
            if (b.cd <= 0 && targets.length) {
                let range = isKeep ? 4.5 : d.range
                if (night && b.o === 0 && !isKeep && !near(b, 'brazier', 4.5)) {
                    range *= 0.75
                }
                if (!isKeep && highAt(b.cx, b.cy)) {
                    range += 1
                }
                let e = nearest(targets, b.cx, b.cy, range)
                const mang = b.t === 'mangonel' && b.o === 0
                if (e && mang && Math.hypot(e.x - b.cx, e.y - b.cy) < 2.5) {
                    e = null
                    let bd = range
                    for (const o of GV.S.en) {
                        const dd = Math.hypot(o.x - b.cx, o.y - b.cy)
                        if (dd >= 2.5 && dd < bd) {
                            bd = dd
                            e = o
                        }
                    }
                }
                if (e) {
                    if (mang) {
                        b.cd = d.rate
                        GV.S.shots.push({
                            x: b.cx,
                            y: b.cy,
                            z: 16,
                            tx: e.x,
                            ty: e.y,
                            t: 0,
                            dur: Math.max(
                                0.6,
                                Math.hypot(e.x - b.cx, e.y - b.cy) / 6
                            ),
                            dmg: d.dmg,
                            stone: 1,
                        })
                    } else {
                        b.cd = isKeep ? 1 : d.rate
                        GV.S.shots.push({
                            x: b.cx,
                            y: b.cy,
                            z: isKeep
                                ? 30 + b.lvl * 8
                                : b.t === 'tower'
                                  ? 24
                                  : 18,
                            e,
                            t: 0,
                            dur: 0.28,
                            by: b.o,
                            burn: b.o === 0 && GV.S.burnT > 0,
                            dmg: isKeep
                                ? KEEP_DMG[b.lvl - 1]
                                : b.t === 'mangonel'
                                  ? 14
                                  : d.dmg,
                        })
                    }
                } else {
                    b.cd = 0.25
                }
            } else if (b.cd <= 0) {
                b.cd = 0.25
            }
        }
        if (b.fire > 0) {
            const wellNear = near(b, 'well', 4.6)
            b.fire -= dt * (wellNear ? 3.5 : 1)
            damageB(b, 4.2 * dt, true)
            if (GV.S.over) {
                return
            }
            if (b.dead) {
                continue
            }
            if ((b.spread -= dt) <= 0) {
                b.spread = 1.5
                if (!wellNear) {
                    for (const o of GV.S.b) {
                        if (
                            o !== b &&
                            !o.fire &&
                            flam(o) &&
                            Math.hypot(o.cx - b.cx, o.cy - b.cy) < 1.9 &&
                            Math.random() < 0.3
                        ) {
                            ignite(o)
                        }
                    }
                }
            }
            if (b.fire <= 0) {
                b.fire = 0
            }
        }
    }
    for (const a of GV.S.shots) {
        a.t += dt
        if (a.t < a.dur) {
            continue
        }
        a.done = true
        if (a.stone) {
            const hb = bAt(clampN(a.tx), clampN(a.ty))
            if (a.war) {
                if (hb && hb.o === a.war) {
                    damageB(hb, a.dmg * (a.dmgB || 1), false, a.by)
                    if (!hb.dead && Math.random() < 0.3) {
                        ignite(hb)
                    }
                }
                for (const e of GV.S.en) {
                    if (
                        e.fac === a.war &&
                        Math.hypot(e.x - a.tx, e.y - a.ty) <= 1.4
                    ) {
                        hitEnemy(e, 12, a.by)
                    }
                }
            } else if (a.side) {
                if (hb && hb.o === 0) {
                    damageB(hb, a.dmg)
                    if (!hb.dead && Math.random() < 0.35) {
                        ignite(hb)
                    }
                }
                for (const s of GV.S.sold) {
                    if (Math.hypot(s.x - a.tx, s.y - a.ty) <= 1.3) {
                        hitSold(s, 12, 'stone')
                    }
                }
            } else {
                for (const e of GV.S.en) {
                    if (Math.hypot(e.x - a.tx, e.y - a.ty) <= 1.4) {
                        hitEnemy(e, a.dmg)
                    }
                }
                if (hb && hb.o !== 0) {
                    damageB(hb, a.dmg)
                    if (!hb.dead && Math.random() < 0.3) {
                        ignite(hb)
                    }
                }
            }
            puff(a.tx, a.ty, 8, '#a89f8c')
            if (GV.S.over) {
                return
            }
        } else if (a.b) {
            if (!a.b.dead) {
                damageB(a.b, a.dmg)
                if (
                    a.burn &&
                    !a.b.dead &&
                    a.b.o !== 0 &&
                    Math.random() < 0.25
                ) {
                    ignite(a.b)
                }
            }
        } else if (a.e && !a.e.dead) {
            // Trees catch many of the arrows shot at those standing among them.
            if (inWood(a.e.x, a.e.y) && Math.random() < 0.35) {
                continue
            }
            if (a.e.side) {
                hitEnemy(a.e, a.dmg, a.by)
                if (a.burn) {
                    a.e.burn = 4
                }
            } else {
                hitSold(a.e, a.dmg, 'arrow')
            }
        }
    }
    GV.S.shots = GV.S.shots.filter((a?) => !a.done)
    GV.S.en = GV.S.en.filter((e?) => !e.dead)
    GV.S.sold = GV.S.sold.filter((s?) => !s.dead)
    for (const f of GV.S.floats) {
        f.t += dt
    }
    GV.S.floats = GV.S.floats.filter((f?) => f.t < 1.2)
}
