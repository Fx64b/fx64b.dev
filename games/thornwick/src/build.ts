import { plantBanner } from './army'
import { DEF, KEEP_POP, KEEP_UP, KX, KY, N, TIERS } from './config'
import { resetSite } from './eco'
import { gwPlaceErr } from './greatwork'
import {
    adjWater,
    afford,
    compass,
    gain,
    pay,
    pop,
    puff,
    toast,
} from './helpers'
import { costOf } from './land'
import { removeB, setTerr } from './lords'
import {
    addB,
    baseTerr,
    bmap,
    inMap,
    ownedT,
    reg,
    regAt,
    rivById,
    seenAt,
    terrain,
} from './state'
import { isTool, placeTool } from './tools'
import { buildCards } from './ui'
import { GV } from './vars'

export const UPG = {
    wall: ['palisade'],
    tower: ['palisade', 'wall'],
    gate: ['palisade', 'wall'],
    shouse: ['house'],
}
/** Rocks on or next to the tile, or hill country: where iron is found. */
export function rockyAt(x?, y?) {
    if (regAt(x, y).type === 'hills') {
        return true
    }
    for (let b = -1; b <= 1; b++) {
        for (let a = -1; a <= 1; a++) {
            if (inMap(x + a, y + b) && terrain[x + a + (y + b) * N] === 2) {
                return true
            }
        }
    }
    return false
}
export function placeErr(t?, x?, y?) {
    const ue = gwPlaceErr(t)
    if (ue) {
        return ue
    }
    const d = DEF[t],
        s = d.size || 1
    for (let j = 0; j < s; j++) {
        for (let i = 0; i < s; i++) {
            const X = x + i,
                Y = y + j
            if (X < 1 || Y < 1 || X > N - 2 || Y > N - 2) {
                return 'Leave the map edge clear.'
            }
            const k = X + Y * N,
                tr = terrain[k],
                rg = GV.regs[reg[k]]
            if (!rg.disc) {
                return 'That land is unknown. Claim the regions next to it first.'
            }
            if (t === 'outpost') {
                if (rg.owner === 0) {
                    return 'This land is already yours. Raise outposts on the dim land past your border.'
                }
                if (rg.owner > 0) {
                    return (
                        'That land belongs to ' +
                        rivById(rg.owner).name +
                        '. Take their keep to win it.'
                    )
                }
                let nearOwn = false
                for (let b = -3; b <= 3 && !nearOwn; b++) {
                    for (let a = -3; a <= 3; a++) {
                        if (ownedT(X + a, Y + b)) {
                            nearOwn = true
                            break
                        }
                    }
                }
                if (!nearOwn) {
                    return 'Too far from home. Raise the outpost within 3 tiles of your border.'
                }
            } else if (rg.owner !== 0) {
                return rg.owner > 0
                    ? 'That land belongs to ' + rivById(rg.owner).name + '.'
                    : 'That land is not yours yet. Raise an outpost there to claim it.'
            }
            if (bmap[k]) {
                const ob = bmap[k]
                if (!(
                    s === 1 &&
                    ob.o === 0 &&
                    UPG[t] &&
                    UPG[t].includes(ob.t)
                )) {
                    return 'Something is already built there.'
                }
                continue
            }
            if (d.onWater) {
                if (tr !== 3) {
                    return 'A drawbridge needs water under it.'
                }
            } else if (tr === 3) {
                return 'That is water. Lay a drawbridge to cross it.'
            } else if (tr === 1) {
                return 'Trees are in the way. Clear them with Remove.'
            } else if (tr === 2) {
                return 'Rocks are in the way. Clear them with Remove.'
            } else if (tr === 4) {
                return 'Old ruins stand here.'
            }
        }
    }
    if (d.water && !adjWater(x, y)) {
        return "A fisher's hut must touch water."
    }
    if (d.rock && !rockyAt(x, y)) {
        return 'An iron mine must touch rocks, or stand in hill country.'
    }
    return ''
}
export function removeAt(x?, y?, loud?) {
    if (!inMap(x, y)) {
        return false
    }
    const i = x + y * N,
        b = bmap[i]
    if (b) {
        if (b.o !== 0) {
            if (loud) {
                toast(
                    'That is not yours to remove. Plant a war banner on it to send your army.'
                )
            }
            return false
        }
        if (b === GV.keep) {
            if (loud) {
                toast('The keep cannot be removed.')
            }
            return false
        }
        demolish(b)
        return true
    }
    if (x < 1 || y < 1 || x > N - 2 || y > N - 2 || !ownedT(x, y)) {
        return false
    }
    if (terrain[i] === 1) {
        resetSite(i)
        setTerr(x, y, 0, true)
        gain('wood', 4, x, y)
        puff(x, y, 5, '#6c9a4a')
        return true
    }
    if (terrain[i] === 2) {
        resetSite(i)
        setTerr(x, y, 0, true)
        gain('stone', 4, x, y)
        puff(x, y, 5, '#b5b4aa')
        return true
    }
    if (terrain[i] === 3) {
        if (baseTerr[i] === 3) {
            if (loud) {
                toast('A lake cannot be filled in. Bridge it instead.')
            }
            return false
        }
        setTerr(x, y, 0, true)
        puff(x, y, 5, '#9a7b52')
        return true
    }
    return false
}
export function tryPlace(t?, x?, y?, loud?) {
    if (GV.S.over) {
        return false
    }
    if (isTool(t)) {
        return placeTool(t, x, y)
    }
    if (t === 'flag') {
        if (!inMap(x, y) || !seenAt(x, y)) {
            if (loud) {
                toast('Your soldiers will not march into the unknown.')
            }
            return false
        }
        const bn = plantBanner(x, y, GV.moveBn)
        GV.moveBn = 0
        GV.armed = null
        GV.hover = null
        if (!bn) {
            return false
        }
        const rg = regAt(x, y)
        toast(
            rg.owner > 0
                ? 'Banner ' +
                      bn.id +
                      ' flies in the lands of ' +
                      rivById(rg.owner).name +
                      '. Its squad marches.'
                : 'Banner ' + bn.id + ' is planted. Its squad gathers there.'
        )
        return true
    }
    if (t === 'remove') {
        return removeAt(x, y, loud)
    }
    const d = DEF[t]
    if (d.tier > GV.keep.lvl) {
        if (loud) {
            toast(
                'Rebuild the keep as a ' +
                    TIERS[d.tier - 1].toLowerCase() +
                    ' to unlock this.'
            )
        }
        return false
    }
    const err = placeErr(t, x, y)
    if (err) {
        if (loud) {
            toast(err)
        }
        return false
    }
    const cost = costOf(t)
    if (!afford(cost)) {
        const r = Object.keys(cost).find((r?) => GV.S.res[r] < cost[r])
        toast('Not enough ' + r + ' for that.')
        return false
    }
    pay(cost)
    if (t === 'moat') {
        setTerr(x, y, 3, true)
        puff(x, y, 5, '#9a7b52')
    } else if (t === 'grove') {
        resetSite(x + y * N)
        setTerr(x, y, 1, true)
        puff(x, y, 4, '#6c9a4a')
    } else {
        const old = bmap[x + y * N]
        if (old && old.o === 0) {
            removeB(old)
        }
        const b = addB(t, x, y)
        puff(b.cx, b.cy, b.s === 2 ? 14 : 7)
        if (t === 'outpost') {
            const rg = regAt(x, y)
            toast(
                'The ' +
                    rg.type +
                    ' lands to the ' +
                    compass(rg.sx - KX, rg.sy - KY) +
                    ' are claimed for Thornwick.'
            )
        }
    }
    return true
}
export function upgradeKeep() {
    if (GV.keep.lvl >= 3) {
        return
    }
    const c = KEEP_UP[GV.keep.lvl - 1],
        need = KEEP_POP[GV.keep.lvl - 1]
    if (pop() < need) {
        toast(
            'The keep can only be rebuilt when ' + need + ' people live here.'
        )
        return
    }
    if (!afford(c)) {
        toast('Not enough stores to rebuild the keep.')
        return
    }
    pay(c)
    GV.keep.lvl++
    GV.keep.fire = 0
    const m = DEF.keep.hp[GV.keep.lvl - 1]
    GV.keep.hp += m - GV.keep.max
    GV.keep.max = m
    GV.keep.drop = 1
    puff(GV.keep.cx, GV.keep.cy, 20)
    toast(
        'The keep is now a ' +
            TIERS[GV.keep.lvl - 1].toLowerCase() +
            '. New buildings are open.' +
            (GV.keep.lvl === 3
                ? ' The royal court sits at Thornwick, and the tax is doubled.'
                : '')
    )
    buildCards()
    GV.chron?.(
        'The keep was rebuilt as a ' +
            TIERS[GV.keep.lvl - 1].toLowerCase() +
            '.'
    )
}
export function demolish(b?) {
    if (b === GV.keep || b.o !== 0) {
        return
    }
    if (DEF[b.t].cost) {
        for (const [r, n] of Object.entries<any>(DEF[b.t].cost)) {
            GV.S.res[r] += Math.floor(n / 2)
        }
    }
    puff(b.cx, b.cy, 6)
    removeB(b)
}
