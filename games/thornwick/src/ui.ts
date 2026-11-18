import { alertsHud } from './alerts'
import {
    BCOL,
    MAX_BANNERS,
    bannerById,
    bannerPlace,
    moraleWord,
    plantBanner,
    recallAll,
    removeBanner,
} from './army'
import { demolish, tryPlace, upgradeKeep } from './build'
import { ARMOURED, highAt, noMorale } from './combat'
import {
    $,
    BUILD,
    DEF,
    DF,
    DIFFS,
    DIFF_KEY,
    FIRST_RAID,
    ICON,
    KEEP_CAP,
    KEEP_DMG,
    KEEP_UP,
    KX,
    KY,
    RES,
    SEASONS,
    TIERS,
    cv,
} from './config'
import { farmYield, workMul } from './eco'
import { ecoAct, ecoHow, ecoHowMore, ecoHud, ecoInspect } from './ecoui'
import { pickEvent } from './events'
import {
    afford,
    cap,
    compass,
    garr,
    near,
    pay,
    pop,
    puff,
    toast,
} from './helpers'
import {
    anchor,
    centreCam,
    clampCam,
    lookAt,
    resize,
    setCursor,
    tileAt,
} from './input'
import { POI, baileyOf, costOf } from './land'
import {
    livingAct,
    livingClock,
    livingGone,
    livingHow,
    livingHowMore,
    livingInspect,
    livingInspectB,
    weatherTip,
} from './livingworld'
import { removeB } from './lords'
import { drawMini } from './minimap'
import {
    BIG,
    UNITS,
    costText,
    fireArrows,
    sendScout,
    train,
    warCry,
} from './people'
import { propSprite, sprite } from './sprites'
import {
    addB,
    bAt,
    clampN,
    isNight,
    newGame,
    regAt,
    rivById,
    save,
    season,
    wipeSave,
} from './state'
import { toolText } from './tools'
import { GV } from './vars'

export function costHTML(cost?) {
    return Object.entries<any>(cost)
        .map(
            ([r, n]) =>
                '<span class="c' +
                (GV.S && GV.S.res[r] < n ? ' lack' : '') +
                '" title="' +
                r +
                '">' +
                ICON[r] +
                n +
                '</span>'
        )
        .join('')
}
GV.cards = {}
export function iconFor(t?, g?) {
    g.imageSmoothingEnabled = false
    if (t === 'moat') {
        g.fillStyle = '#3f86b0'
        g.beginPath()
        g.moveTo(48, 24)
        g.lineTo(84, 44)
        g.lineTo(48, 64)
        g.lineTo(12, 44)
        g.closePath()
        g.fill()
        g.strokeStyle = '#7d6442'
        g.lineWidth = 6
        g.stroke()
        g.fillStyle = '#9fd0de'
        g.fillRect(34, 40, 12, 3)
        g.fillRect(52, 48, 12, 3)
        return
    }
    const sp =
        t === 'grove'
            ? propSprite(1, 2, 1)
            : sprite(t, t === 'wall' || t === 'palisade' ? { m: 3 } : {})
    const img = sp.full || sp.parts[0].cv,
        w = img.width,
        h = img.height,
        d = img.getContext('2d').getImageData(0, 0, w, h).data
    let x0 = w,
        y0 = h,
        x1 = 0,
        y1 = 0
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (d[(x + y * w) * 4 + 3] === 255) {
                if (x < x0) {
                    x0 = x
                }
                if (x > x1) {
                    x1 = x
                }
                if (y < y0) {
                    y0 = y
                }
                if (y > y1) {
                    y1 = y
                }
            }
        }
    }
    const bw = x1 - x0 + 1,
        bh = y1 - y0 + 1
    let sc = Math.min(92 / bw, 86 / bh)
    if (sc >= 1) {
        sc = Math.min(2, Math.floor(sc * 2) / 2)
    } else {
        g.imageSmoothingEnabled = true
    }
    g.drawImage(
        img,
        x0,
        y0,
        bw,
        bh,
        Math.round((96 - bw * sc) / 2),
        Math.round(87 - bh * sc),
        bw * sc,
        bh * sc
    )
}
export function buildCards() {
    const wrap = $('#cards')
    wrap.innerHTML = ''
    GV.cards = {}
    for (const t of BUILD) {
        if (DEF[t].tab !== GV.tab) {
            continue
        }
        const el = document.createElement('button')
        el.className = 'card'
        el.type = 'button'
        el.setAttribute('aria-pressed', 'false')
        el.title = DEF[t].tip
        el.innerHTML =
            '<canvas width="96" height="88" aria-hidden="true"></canvas><span><span class="nm">' +
            DEF[t].name +
            '</span><span class="costs"></span></span>'
        iconFor(t, el.querySelector('canvas').getContext('2d'))
        wrap.appendChild(el)
        GV.cards[t] = el
        el.addEventListener('pointerdown', (e?) => {
            el.setPointerCapture(e.pointerId)
            GV.drag = {
                t,
                x: e.clientX,
                y: e.clientY,
                active: false,
                touch: e.pointerType !== 'mouse',
            }
        })
        el.addEventListener('pointermove', (e?) => {
            if (!GV.drag || GV.drag.t !== t) {
                return
            }
            if (
                !GV.drag.active &&
                Math.hypot(e.clientX - GV.drag.x, e.clientY - GV.drag.y) > 8
            ) {
                GV.drag.active = true
                GV.armed = null
                GV.selected = null
            }
            if (GV.drag.active) {
                GV.hover = anchor(
                    t,
                    tileAt(e.clientX, e.clientY - (GV.drag.touch ? 44 : 0))
                )
            }
        })
        el.addEventListener('pointerup', (e?) => {
            if (!GV.drag) {
                return
            }
            if (GV.drag.active) {
                const y = e.clientY - (GV.drag.touch ? 44 : 0)
                if (document.elementFromPoint(e.clientX, y) === cv) {
                    const h = anchor(t, tileAt(e.clientX, y))
                    tryPlace(t, h[0], h[1], true)
                }
                GV.hover = null
            } else {
                arm(t)
            }
            GV.drag = null
        })
        el.addEventListener('pointercancel', () => {
            GV.drag = null
            GV.hover = null
        })
        el.addEventListener('keydown', (e?) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                arm(t)
                if (GV.armed) {
                    cv.focus()
                }
            }
        })
    }
    document
        .querySelectorAll<HTMLElement>('[data-tab]')
        .forEach((b?) =>
            b.setAttribute('aria-pressed', String(+b.dataset.tab === GV.tab))
        )
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(resize)
    }
}
export function arm(t?) {
    GV.armed = GV.armed === t ? null : t
    GV.selected = null
    GV.hoverPick = null
    if (GV.armed) {
        if (!GV.hover) {
            GV.hover = [KX + 1, KY + 3]
        }
        if (t !== 'remove' && t !== 'flag' && DEF[t].tier > GV.keep.lvl) {
            toast(
                'Rebuild the keep as a ' +
                    TIERS[DEF[t].tier - 1].toLowerCase() +
                    ' to unlock this.'
            )
        }
    } else {
        GV.hover = null
    }
    setCursor()
    hud()
}
document.querySelectorAll<HTMLElement>('[data-tab]').forEach((b?) =>
    b.addEventListener('click', () => {
        GV.tab = +b.dataset.tab
        buildCards()
        hud()
    })
)
$('#rm').addEventListener('click', () => {
    arm('remove')
    hud()
})
$('#flagBtn').addEventListener('click', toggleFlag)
$('#flagBtn').title =
    'Plant a war banner (up to four). Tap a banner on the map to set its squad.'
$('#armyBtn').addEventListener('click', () => {
    GV.armed = null
    GV.hover = null
    GV.selected =
        GV.selected && GV.selected.kind === 'army' ? null : { kind: 'army' }
    hud()
})
$('#placingDone').addEventListener('click', () => {
    GV.armed = null
    GV.hover = null
    setCursor()
    hud()
})
export function placingText() {
    const tt = toolText()
    if (tt) {
        return tt
    }
    if (GV.armed === 'remove') {
        return '<b>Removing</b><span> · tap or drag over what to clear</span>'
    }
    if (GV.armed === 'flag') {
        return GV.moveBn
            ? '<b>Move banner ' +
                  GV.moveBn +
                  '</b><span> · tap where its squad should go</span>'
            : '<b>War banner</b><span> · tap where a squad should gather, or on a rival castle</span>' +
                  '<small>Up to four banners. The army splits between them.</small>'
    }
    const d = DEF[GV.armed],
        tip = d.tip ? '<small>' + d.tip + '</small>' : ''
    if (d.tier > GV.keep.lvl) {
        return (
            '<b>' +
            d.name +
            '</b><span> · needs a ' +
            TIERS[d.tier - 1].toLowerCase() +
            '</span>' +
            tip
        )
    }
    if (GV.armed === 'wall') {
        return (
            '<b>Stone wall</b><span> · drag to paint, also over palisades</span>' +
            tip
        )
    }
    return (
        '<b>' +
        d.name +
        '</b><span> · ' +
        (d.paint
            ? 'drag to paint'
            : 'tap the grass to build' +
              (GV.armed === 'tower' || GV.armed === 'gate'
                  ? ', also onto walls'
                  : GV.armed === 'shouse'
                    ? ', also onto cottages'
                    : '')) +
        '</span>' +
        tip
    )
}
export const ENAME = {
    hero: 'Champion',
    scout: 'Scout',
    raider: 'Raider',
    brute: 'Brute',
    looter: 'Looter',
    earcher: 'Archer',
    ladder: 'Ladder crew',
    ram: 'Battering ram',
    catapult: 'Catapult',
}
const UNIT_ORDER = [
    'sword',
    'pike',
    'shield',
    'archer',
    'xbow',
    'knight',
    'pram',
    'pcat',
    'eng',
]
export function unitList(list?) {
    const counts = {}
    for (const s of list) {
        if (s.kind !== 'scout' && s.kind !== 'captain') {
            counts[s.kind] = (counts[s.kind] || 0) + 1
        }
    }
    return UNIT_ORDER.filter((k?) => counts[k]).map(
        (k?) =>
            counts[k] +
            ' ' +
            (counts[k] === 1 ? UNITS[k].name.toLowerCase() : UNITS[k].plural)
    )
}
/* The controls of one war banner: squad size, stance, engineers, find and remove. */
export function bannerBlock(b?, full?) {
    const mem = GV.S.sold.filter((s?) => s.sq === b.id && !s.dead),
        fighters = mem.filter(
            (s?) =>
                s.kind !== 'captain' && s.kind !== 'eng' && !UNITS[s.kind].siege
        ).length,
        auto = b.n === null || b.n === undefined,
        mw = moraleWord(mem)
    let h =
        '<div class="bnr" style="--bc:' +
        BCOL[b.id - 1] +
        '"><div class="row"><b class="tag">' +
        b.id +
        '</b><span class="what">' +
        (full ? '' : 'Banner ' + b.id + ': ') +
        (auto
            ? fighters + (fighters === 1 ? ' soldier' : ' soldiers')
            : fighters +
              ' of ' +
              b.n +
              (b.n === 1 ? ' soldier' : ' soldiers')) +
        (mem.some((s?) => s.kind === 'captain') ? ', with the captain' : '') +
        (mw ? ', ' + mw : '') +
        '</span></div>'
    if (full && mem.length) {
        h += '<p class="note">' + unitList(mem).join(', ') + '.</p>'
    }
    h +=
        '<div class="row"><span class="note lbl">Squad</span><div class="seg"><button class="btn" data-act="bn:less:' +
        b.id +
        '" aria-label="Smaller squad">−</button><button class="btn" data-act="bn:auto:' +
        b.id +
        '" aria-pressed="' +
        auto +
        '">Auto</button><button class="btn" data-act="bn:more:' +
        b.id +
        '" aria-label="Larger squad">+</button></div><div class="seg"><button class="btn" data-act="bn:st:' +
        b.id +
        ':charge" aria-pressed="' +
        (b.st !== 'hold') +
        '">Charge</button><button class="btn" data-act="bn:st:' +
        b.id +
        ':hold" aria-pressed="' +
        (b.st === 'hold') +
        '">Hold</button></div></div>'
    if (b.siege) {
        h +=
            '<div class="row"><span class="note lbl">Engineers</span><div class="seg"><button class="btn" data-act="bn:eng:' +
            b.id +
            ':tower" aria-pressed="' +
            (b.eng !== 'tunnel') +
            '">Siege tower</button><button class="btn" data-act="bn:eng:' +
            b.id +
            ':tunnel" aria-pressed="' +
            (b.eng === 'tunnel') +
            '">Tunnel</button></div></div>'
    }
    h +=
        '<div class="row"><button class="btn" data-act="bn:go:' +
        b.id +
        '">Find</button><button class="btn" data-act="bn:move:' +
        b.id +
        '">Move</button><button class="btn" data-act="bn:rm:' +
        b.id +
        '">Take down</button></div></div>'
    return h
}
export function bannerHTML(close?, b?) {
    return (
        close +
        '<h2>War banner ' +
        b.id +
        '</h2><p>Flies ' +
        bannerPlace(b) +
        '. ' +
        (b.st === 'hold'
            ? 'Its squad holds the ground around it and lets the enemy come.'
            : 'Its squad attacks anything near it' +
              (b.siege ? ', then the castle.' : '.')) +
        '</p>' +
        bannerBlock(b, true) +
        '<p class="note">Auto shares the army out between the banners by the size of the fight at each. With + and − you set this squad to a fixed size; soldiers left over guard home.' +
        (b.siege
            ? ' Rams, catapults and engineers go with the nearest banner on a rival castle. Engineers raise a siege tower your soldiers can climb, or dig a tunnel that brings a stretch of wall down.'
            : '') +
        '</p><div class="row"><button class="btn" data-act="army">Army and orders</button></div>'
    )
}
export function armyHTML(close?) {
    const parts = unitList(GV.S.sold),
        B = GV.S.banners
    let h =
        close +
        '<h2>Army of Thornwick</h2><p>' +
        (parts.length
            ? parts.join(', ') + '. '
            : 'No soldiers yet. Build a barracks to train them. ') +
        (GV.capU
            ? 'Led by the captain, level ' + GV.S.capLvl + '.'
            : 'The captain has fallen and returns in ' +
              fmtTime(GV.S.capDown) +
              '.') +
        '</p>'
    h +=
        '<h3 class="sub">War banners (' +
        B.length +
        ' of ' +
        MAX_BANNERS +
        ')</h3>'
    if (!B.length) {
        h +=
            '<p class="note">Plant a banner to send a squad somewhere. With two or more banners the army splits and fights in several places at once.</p>'
    }
    for (const b of B) {
        h += bannerBlock(b, false)
    }
    h +=
        '<div class="row"><button class="btn primary" data-act="flag"' +
        (B.length >= MAX_BANNERS ? ' disabled' : '') +
        '>Plant a banner</button>' +
        (B.length
            ? '<button class="btn" data-act="recall">Recall all</button>'
            : '') +
        '</div>'
    const home = GV.S.sold.filter(
        (s?) => !s.sq && s.kind !== 'scout' && !s.dead
    ).length
    h +=
        '<h3 class="sub">Home guard</h3><div class="row"><span class="note lbl">' +
        home +
        (home === 1 ? ' soldier' : ' soldiers') +
        '</span><div class="seg"><button class="btn" data-act="stance:charge" aria-pressed="' +
        (GV.S.stance === 'charge') +
        '">Charge</button><button class="btn" data-act="stance:hold" aria-pressed="' +
        (GV.S.stance === 'hold') +
        '">Hold</button></div></div>'
    h +=
        '<p class="note">' +
        (GV.S.stance === 'charge'
            ? 'Soldiers in no squad ride out to meet raiders anywhere on your land.'
            : 'Soldiers in no squad stay close to their barracks and let raiders come to them.') +
        ' Archers man the stone walls.</p>'
    const cs =
        GV.S.cry > 0
            ? 'Sounding'
            : GV.S.cryCd > 0
              ? 'Ready in ' + fmtTime(GV.S.cryCd)
              : GV.capU
                ? 'Ready'
                : 'Needs the captain'
    h +=
        '<div class="row"><button class="btn" data-act="cry"' +
        (GV.S.cryCd > 0 || !GV.capU ? ' disabled' : '') +
        '>War cry</button><span class="note" style="margin:0">' +
        cs +
        '</span></div>'
    const fs =
        GV.S.burnT > 0
            ? 'Burning'
            : GV.S.burnCd > 0
              ? 'Ready in ' + fmtTime(GV.S.burnCd)
              : 'Ready'
    h +=
        '<div class="row"><button class="btn" data-act="fire"' +
        (GV.S.burnCd > 0 || GV.S.res.wood < 20 ? ' disabled' : '') +
        '>Fire arrows</button><span class="costs">' +
        costHTML({ wood: 20 }) +
        '</span><span class="note" style="margin:0">' +
        fs +
        '</span></div>'
    h +=
        '<p class="note">War cry: harder, faster blows and fresh courage for 15 seconds. Fire arrows: towers and archers set raiders and rival thatch alight.</p>'
    return h
}
/* Longer "how it works" text for the inspect panel, with live numbers where they help. */
export const perMin = (amt?, every?) => Math.round((amt * 60) / every)
export const feeds = (foodMin?) => Math.floor(foodMin / 7.5)
export function howHTML(b?) {
    const d = DEF[b.t],
        se = season(),
        v = GV.S.vill.length,
        P = [],
        now = []
    const mine = (t?) => GV.S.b.filter((o?) => o.o === 0 && o.t === t)
    const nearCount = (t?, rad?) =>
        mine(t).filter((o?) => Math.hypot(o.cx - b.cx, o.cy - b.cy) <= rad)
            .length
    switch (b.t) {
        case 'keep': {
            P.push(
                'Every 8 seconds each person, soldiers too, eats 1 food (bread first, for up to half), and every 10 villagers pay 1 gold in tax. A new villager arrives here every 6 seconds while homes have room and there are 20 food and bread in store.'
            )
            P.push(
                'It shoots the nearest raider within 4.5 tiles for ' +
                    KEEP_DMG[b.lvl - 1] +
                    ' damage each second.'
            )
            const p = pop()
            now.push(
                p +
                    ' of ' +
                    cap() +
                    ' places in use.' +
                    (p
                        ? ' With no new food, the stores last about ' +
                          fmtTime(Math.floor(GV.S.res.food / p) * 8) +
                          '.'
                        : '')
            )
            break
        }
        case 'house':
        case 'shouse':
            P.push(
                'Homes set how many people the village can hold. Soldiers need a place too. While there is room and at least 20 food in store, a new villager arrives every 6 seconds: slower in winter, faster with a chapel and content villagers.'
            )
            P.push('Upgrade the keep for more room in the keep itself.')
            now.push(
                'The village has ' + pop() + ' of ' + cap() + ' places in use.'
            )
            break
        case 'farm': {
            const mill = near(b, 'mill', 4.5),
                per = farmYield(b, se, mill),
                fm = Math.round(
                    (b.w || 0) * perMin(per, 6) * workMul({ role: 'farmer' })
                )
            P.push(
                'Each farmer harvests 3 food every 6 seconds. Autumn gives half again, and so does a windmill within 4 tiles (both together: 7 food). In winter the fields give nothing.'
            )
            P.push(
                'One person eats 7.5 food a minute, so one farmer feeds about 4 people in spring and summer.'
            )
            now.push(
                per === 0
                    ? 'Winter: this farm makes no food until spring.'
                    : 'This farm makes about ' +
                          fm +
                          ' food a minute now, enough for ' +
                          feeds(fm) +
                          ' people.'
            )
            break
        }
        case 'fisher': {
            const fm = (b.w || 0) * perMin(se === 3 ? 2 : 4, 5)
            P.push(
                'The fisher brings in 4 food every 5 seconds, and half that in winter. That feeds about 6 people, and unlike a farm it keeps working through the winter.'
            )
            now.push('Makes about ' + fm + ' food a minute now.')
            break
        }
        case 'lumber':
            P.push(
                'Each woodcutter walks to one of the nearest trees on your land, chops for 3 seconds and carries 6 wood home. Most of the time is the walk, so build the camp right next to the trees.'
            )
            P.push(
                'Each tree holds 120 to 180 wood. When it is used up it is gone, and the woodcutters walk on to the next. Plant more with "Plant tree" on the Decor tab (3 wood each), or claim a forest with an outpost.'
            )
            break
        case 'quarry':
            P.push(
                'Each mason walks to one of the nearest rocks on your land, cuts for 4 seconds and carries 5 stone home. Build the quarry right next to the rocks to cut the walk short.'
            )
            P.push(
                'Each rock holds 120 to 200 stone. When it is used up it is gone, and the masons walk on to the next. Claim rocky hills with an outpost for more.'
            )
            break
        case 'well': {
            P.push(
                'Cottages and stone houses within 3 tiles hold 2 more people each.'
            )
            P.push(
                'A fire within 4 tiles burns out more than three times faster and does not spread to the buildings next to it. Keep one near every group of thatched buildings.'
            )
            const n = nearCount('house', 3.2) + nearCount('shouse', 3.2)
            now.push(
                n
                    ? 'Helps ' + n + (n === 1 ? ' home.' : ' homes.')
                    : 'No homes close enough yet.'
            )
            break
        }
        case 'market': {
            const lim = { food: 80, wood: 40, stone: 40 },
                spare = ['food', 'wood', 'stone'].filter(
                    (r?) => GV.S.res[r] > lim[r]
                )
            P.push(
                'Each merchant carries goods to the keep and back. A trip earns 2 gold, or 6 gold when you have spare goods: more than 80 food, 40 wood or 40 stone. Then the merchant sells 3 of whatever you have the most of.'
            )
            P.push('Build it close to the keep: shorter trips mean more gold.')
            now.push(
                spare.length
                    ? 'Spare goods to sell: ' + spare.join(', ') + '.'
                    : 'Nothing spare to sell, so each trip earns only 2 gold.'
            )
            break
        }
        case 'mill': {
            P.push(
                'Farms within 4 tiles harvest 4.5 food per trip instead of 3 (7 in autumn). Build it between several farms.'
            )
            const n = nearCount('farm', 4.5)
            now.push(
                n
                    ? 'Helps ' + n + (n === 1 ? ' farm.' : ' farms.')
                    : 'No farms close enough yet.'
            )
            break
        }
        case 'tavern': {
            const tav = mine('tavern'),
                i = tav.indexOf(b),
                served = Math.max(0, Math.min(12, v - i * 12)),
                g = Math.floor(served / 3)
            P.push(
                'Villagers drink here after work. Every 10 seconds the tavern earns 1 gold for every 3 villagers it serves.'
            )
            P.push(
                'One tavern serves up to 12 villagers, so it earns at most 4 gold every 10 seconds (24 a minute). A second tavern only pays when you have more than 12 villagers. Soldiers do not drink here.'
            )
            now.push(
                served
                    ? 'Serves ' +
                          served +
                          ' of your ' +
                          v +
                          ' villagers and earns ' +
                          g +
                          ' gold every 10 seconds (' +
                          g * 6 +
                          ' a minute).'
                    : 'No villagers left for this tavern to serve. Grow the village first.'
            )
            break
        }
        case 'chapel':
            P.push(
                'While homes have room, a new villager arrives every 3.5 seconds instead of every 6. One chapel is enough; more do not help.'
            )
            P.push('The fever event can no longer strike the village.')
            break
        case 'outpost':
            P.push(
                'Claims the whole region it stands in: its trees and rocks become yours to gather, the map around it is revealed, and any ruins, gold mine, standing stones or hamlet there give their reward.'
            )
            P.push(
                'It shoots raiders within 4 tiles. Some rivals send raiders after outposts, so guard the ones that matter.'
            )
            now.push(
                'The next outpost costs ' +
                    costOf('outpost').gold +
                    ' gold, 25 more for each region you hold.'
            )
            break
        case 'palisade':
        case 'wall':
        case 'gate':
        case 'tower': {
            if (b.t === 'gate') {
                P.push(
                    'Your people and soldiers walk through. Raiders must break it down. When two raiders or a ram are at the door, it pours boiling oil for 45 damage and pushes ladders off the walls nearby, then needs 25 seconds to heat again.'
                )
            }
            if (b.t === 'tower') {
                P.push(
                    'Shoots the nearest raider within 5.5 tiles every second for 12 damage. At night its reach drops by a quarter, unless a brazier is within 4 tiles.'
                )
            }
            if (b.t === 'palisade') {
                P.push(
                    'Raiders must break it or bring ladders to get over. It is cheap but weak, and it burns.'
                )
            }
            if (b.t === 'wall') {
                P.push(
                    'About three and a half times as strong as a palisade, and it does not burn. Archers from an archery range walk up onto stone walls and gates by themselves and shoot from there.'
                )
            }
            P.push(
                'A closed ring of walls, towers and gates makes a bailey. Buildings inside one ring take a fifth less damage, inside two rings two fifths less.'
            )
            break
        }
        case 'watch':
            P.push(
                'Shoots the nearest raider within 4 tiles every second for 7 damage. At night its reach drops by a quarter, unless a brazier is within 4 tiles. Made of timber, so it can burn.'
            )
            break
        case 'mangonel':
            P.push(
                'Throws a stone every 3.2 seconds at raiders up to 8 tiles away. The stone hits every raider within about a tile of where it lands, for 22 damage each, so it is best against groups.'
            )
            P.push(
                'It cannot hit raiders closer than 2.5 tiles. Protect it with walls or soldiers.'
            )
            break
        case 'bridge':
            P.push(
                'Lets your people cross water. When raiders come within 7 tiles it lifts by itself, so they must wade through the water at a third of their speed.'
            )
            break
        case 'stakes':
            P.push(
                'Raiders who cross them move at half speed and take 9 damage a second. The stakes wear down while raiders stand on them and do not repair, so replace them after a fight.'
            )
            break
        case 'barracks':
        case 'range':
        case 'stables':
        case 'workshop': {
            P.push(
                'Training turns one villager into a soldier, an idle one first. Soldiers still eat and still need a place in a home. Tick "Recruit automatically" to train whenever you have the gold and an idle villager.'
            )
            const desc = {
                sword: '70 health, 9 damage. Good all round.',
                pike: '85 health, 7 damage, but 2.6 times the damage against brutes, rams and catapults.',
                shield: '150 health, 5 damage, slow. Takes little harm from arrows and cannot be flanked. Archers next to one take half harm from arrows. Stands in front of its banner and holds the line.',
                archer: '40 health, 6 damage from 3.4 tiles. Goes up onto stone walls by itself.',
                xbow: '55 health, 24 damage from 3.9 tiles, but slow to reload. Bolts go through armour: more damage to brutes, rams and champions, where arrows glance off.',
                knight: '150 health, 13 damage, very fast. Hits hardest at the end of a charge.',
                pram: '320 health. Slow, but batters rival walls and gates.',
                pcat: '180 health. Throws stones up to 7.5 tiles for 42 damage. Best against walls and towers.',
                eng: '60 health, weak in a fight. At a banner on a rival castle, raises a siege tower your soldiers can climb over the wall (16 seconds), or digs a tunnel that brings a stretch of wall down (30 seconds, faster with more engineers).',
            }
            for (const k of d.units) {
                P.push('<b>' + UNITS[k].name + ':</b> ' + desc[k])
            }
            if (b.t !== 'workshop') {
                P.push(
                    'Use the Army button to choose Charge or Hold, and war banners to send squads where you want.'
                )
            }
            break
        }
        case 'smith': {
            const n = mine('smith').length
            P.push(
                'Every soldier deals 2 more damage for each blacksmith you own, up to two (+4). Rams and catapults do not gain from it.'
            )
            now.push(
                n >= 2
                    ? 'You have the full bonus of +4.'
                    : 'Current bonus: +' + 2 * n + '.'
            )
            break
        }
        case 'brazier':
            P.push(
                'At night, towers, watchtowers, outposts and mangonels lose a quarter of their reach. Those within 4 tiles of a brazier keep their full reach.'
            )
            break
        case 'banner':
        case 'statue':
        case 'garden':
            P.push('Only for looks. It has no effect on the game.')
            break
        default:
            if (!livingHow(b, P, now)) {
                ecoHow(b, P, now)
            }
    }
    ecoHowMore(b, P, now)
    livingHowMore(b, P, now)
    if (!P.length && !now.length) {
        return ''
    }
    return (
        '<div class="how"><h3>How it works</h3>' +
        P.map((t?) => '<p>' + t + '</p>').join('') +
        now.map((t?) => '<p class="now">' + t + '</p>').join('') +
        '</div>'
    )
}
export function inspectHTML(sel?) {
    const close =
        '<button class="btn x" data-act="close" aria-label="Close">✕</button>'
    const hpBarH = (f?) =>
        '<div class="hp" title="Condition"><i class="' +
        (f < 0.35 ? 'low' : '') +
        '" style="width:' +
        Math.round(Math.max(0, f) * 100) +
        '%"></i></div>'
    const wh = livingInspect(sel, close)
    if (wh !== null) {
        return wh
    }
    if (sel.kind === 'army') {
        return armyHTML(close)
    }
    if (sel.kind === 'banner') {
        return bannerHTML(close, sel.bn)
    }
    if (sel.kind === 'fog' && !sel.rg.gen) {
        return (
            close +
            '<h2>Beyond the mist</h2><p>No one knows what lies out there. The mist draws back when your scouts or outposts reach the edge of the known land, and other lords may push it back too.</p>'
        )
    }
    if (sel.kind === 'fog') {
        const rg = sel.rg,
            nearKnown = rg.adj.some((a?) => GV.regs[a].disc),
            going = GV.S.sold.some(
                (s?) => s.kind === 'scout' && s.goal === rg.id
            )
        return (
            close +
            '<h2>Unknown land</h2><p>No one from Thornwick has been there. It lies to the ' +
            compass(rg.sx - KX, rg.sy - KY) +
            '.</p>' +
            (going
                ? '<p class="note">A scout is on the way.</p>'
                : nearKnown
                  ? '<div class="row"><button class="btn primary" data-act="scout"' +
                    (GV.S.res.gold < 15 ? ' disabled' : '') +
                    '>Send a scout</button><span class="costs">' +
                    costHTML({ gold: 15 }) +
                    '</span></div><p class="note">Whoever lives there may notice you.</p>'
                  : '<p class="note">Scout or claim the lands closer to home first.</p>')
        )
    }
    if (sel.kind === 'poi') {
        const P = POI[sel.p.poi],
            rg = regAt(sel.p.x, sel.p.y)
        return (
            close +
            '<h2>' +
            P.name +
            '</h2><p>' +
            P.info +
            '</p><p class="note">' +
            (rg.owner === 0
                ? 'This land is yours.'
                : 'Raise an outpost in this land to claim it.') +
            '</p>'
        )
    }
    if (sel.kind === 'unit') {
        const u = sel.u,
            rv = rivById(u.fac),
            mor =
                u.rout > 0
                    ? 'Broken and running.'
                    : noMorale(u)
                      ? ''
                      : u.mor > 70
                        ? 'Steady.'
                        : u.mor > 40
                          ? 'Shaken.'
                          : 'Wavering.'
        return (
            close +
            '<h2>' +
            (u.type === 'hero' && rv ? rv.prof.hero : ENAME[u.type]) +
            '</h2>' +
            hpBarH(u.hp / u.max) +
            '<p>' +
            (u.type === 'hero' && rv
                ? 'Champion of ' +
                  rv.name +
                  '. Strong, and his men take heart from him. Kill him and they waver.'
                : u.type === 'scout'
                  ? 'Rides ahead for ' +
                    (rv ? rv.name : 'a rival lord') +
                    ' to find the weak side of your defences.'
                  : u.fac === 9
                    ? 'An outlaw from the bandit camp.'
                    : 'Fights for ' +
                      (rv ? rv.name : 'a rival lord') +
                      (u.mode === 'guard'
                          ? ', guarding their castle.'
                          : u.mode === 'war' && rivById(u.foe)
                            ? ', marching on ' + rivById(u.foe).name + '.'
                            : u.mode === 'flee'
                              ? ', falling back.'
                              : '.')) +
            (mor ? ' ' + mor : '') +
            '</p>' +
            (BIG[u.type]
                ? '<p class="note">Pikemen deal heavy damage to it.</p>'
                : '') +
            (ARMOURED[u.type]
                ? '<p class="note">Armoured: crossbow bolts hurt it most.</p>'
                : '')
        )
    }
    const b = sel,
        d = DEF[b.t],
        f = b.hp / b.max,
        bar = hpBarH(f)
    if (b.o !== 0) {
        if (b.t === 'camp') {
            return (
                close +
                '<h2>Bandit camp</h2>' +
                bar +
                '<p>Outlaws raid from here. Plant a war banner on it to send a squad and burn it out.</p>' +
                '<div class="row"><button class="btn primary" data-act="siege">Plant a banner here</button></div>'
            )
        }
        const rv = rivById(b.o),
            kind =
                rv.prof.desc +
                ' Holds ' +
                rv.ng +
                (rv.ng === 1 ? ' region.' : ' regions.') +
                (rv.out && rv.foe > 0
                    ? ' At war with ' +
                      (rivById(rv.foe) ? rivById(rv.foe).name : 'a rival') +
                      '.'
                    : '')
        return (
            close +
            '<h2>' +
            (b.t === 'keep'
                ? 'Keep of ' + rv.name
                : d.name + ' of ' + rv.name) +
            '</h2>' +
            bar +
            '<p>' +
            kind +
            (rv.truce > 0
                ? ' You are at truce for ' + fmtTime(rv.truce) + '.'
                : '') +
            '</p>' +
            '<p class="note">Lay siege to plant a war banner here. Rams and catapults from a siege workshop make short work of walls, and engineers can climb or undermine them. ' +
            (b.t === 'keep'
                ? 'When this keep falls, the lord is beaten and the land is yours.'
                : 'Their keep must fall to end them.') +
            '</p>' +
            '<div class="row"><button class="btn primary" data-act="siege">Lay siege here</button></div>'
        )
    }
    let info = d.tip || ''
    if (b === GV.keep) {
        info =
            'Shelters ' +
            KEEP_CAP[b.lvl - 1] +
            ' people and looses arrows at raiders. If it falls, the kingdom is lost.' +
            (b.lvl === 1 ? ' A wooden hall can burn.' : '')
    } else if (d.role) {
        info =
            (b.w || 0) +
            ' of ' +
            d.slots +
            ' ' +
            d.plural +
            ' at work. ' +
            d.tip +
            (b.t === 'farm' && near(b, 'mill', 4.5)
                ? ' The mill is helping.'
                : '') +
            ((b.t === 'lumber' && !GV.myTrees.length) ||
            (b.t === 'quarry' && !GV.myRocks.length)
                ? b.t === 'lumber'
                    ? ' No trees left on your land. Plant trees from the Decor tab, or claim a forest with an outpost.'
                    : ' No rocks left on your land. Claim rocky hills with an outpost.'
                : '')
    } else if (d.garrison) {
        info = garr(b) + ' of ' + d.garrison + ' places filled. ' + d.tip
    } else if (b.t === 'house' || b.t === 'shouse') {
        info =
            'Home for ' +
            ((b.t === 'house' ? 4 : 5) + (near(b, 'well', 3.2) ? 2 : 0)) +
            ' people.' +
            (near(b, 'well', 3.2)
                ? ' The well nearby helps.'
                : ' A well nearby would make room for 2 more.') +
            (b.t === 'house' ? ' Thatch burns.' : '')
    } else if (b.t === 'outpost') {
        info =
            'Holds the ' +
            regAt(b.x, b.y).type +
            ' lands around it for Thornwick. If it falls, the claim is lost.'
    } else if (d.range) {
        info =
            d.tip +
            ' Reach ' +
            d.range +
            ' tiles, less at night without a brazier nearby.' +
            (highAt(b.cx, b.cy)
                ? ' It stands on high ground and reaches one tile further.'
                : '')
    }
    let h =
        close +
        '<h2>' +
        (b === GV.keep ? TIERS[b.lvl - 1] : d.name) +
        '</h2>' +
        bar +
        '<p>' +
        info +
        '</p>' +
        howHTML(b)
    const bl = baileyOf(b)
    if (b.fire > 0) {
        h += '<p class="note" style="color:var(--madder)">On fire.</p>'
    } else if (bl > 0) {
        h +=
            '<p class="note">' +
            (bl >= 2
                ? 'Inside the inner bailey: two rings of wall. Takes two fifths less damage.'
                : 'Inside the outer bailey. Takes a fifth less damage.') +
            '</p>'
    }
    h += ecoInspect(b)
    h += livingInspectB(b)
    if (b.t === 'gate') {
        h +=
            '<div class="row"><button class="btn primary" data-act="shut">' +
            (b.shut ? 'Open the gate' : 'Close the gate') +
            '</button><span class="note" style="margin:0">' +
            (b.oil > 0 ? 'Oil heating' : 'Oil ready') +
            '</span></div><label><input type="checkbox" data-act="auto"' +
            (b.auto ? ' checked' : '') +
            '> Close by itself when raiders are near</label>'
    }
    if (b.t === 'bridge') {
        h +=
            '<div class="row"><button class="btn primary" data-act="lift">' +
            (b.up ? 'Lower the bridge' : 'Raise the bridge') +
            '</button></div><label><input type="checkbox" data-act="auto"' +
            (b.auto ? ' checked' : '') +
            '> Lift by itself when raiders are near</label>'
    }
    if (b.t === 'palisade' || b.t === 'house') {
        const to = b.t === 'palisade' ? 'wall' : 'shouse',
            tier = DEF[to].tier
        if (GV.keep.lvl < tier) {
            h +=
                '<p class="note">A stone keep lets you rebuild this in stone.</p>'
        } else {
            h +=
                '<div class="row"><button class="btn primary" data-act="stone1">Rebuild in stone</button><span class="costs">' +
                costHTML(DEF[to].cost) +
                '</span></div>'
            if (b.t === 'palisade') {
                const n = palLine(b).length
                if (n > 1) {
                    h +=
                        '<div class="row"><button class="btn" data-act="stoneAll">Rebuild the whole line (' +
                        n +
                        ')</button><span class="costs">' +
                        costHTML({ stone: 8 * n }) +
                        '</span></div>'
                }
            }
        }
    }
    if (d.garrison) {
        const tk = b.trainKind || d.units[0]
        for (const k of d.units) {
            const U = UNITS[k]
            h +=
                '<div class="row"><button class="btn' +
                (tk === k ? ' primary' : '') +
                '" data-act="train:' +
                k +
                '"' +
                (garr(b) >= d.garrison ? ' disabled' : '') +
                '>Train ' +
                U.name.toLowerCase() +
                '</button><span class="costs">' +
                costHTML(U.cost) +
                '</span></div>'
        }
        h +=
            '<label><input type="checkbox" data-act="auto"' +
            (b.auto ? ' checked' : '') +
            '> Recruit ' +
            UNITS[tk].plural +
            ' automatically</label>'
    }
    if (b === GV.keep) {
        h +=
            '<div class="row"><button class="btn" data-act="army">Army and orders</button><span class="note" style="margin:0">Difficulty: ' +
            DF().name +
            '</span></div>'
        if (b.lvl < 3) {
            const uc = KEEP_UP[b.lvl - 1]
            h +=
                '<div class="row"><button class="btn primary" data-act="up"' +
                (afford(uc) ? '' : ' disabled') +
                '>Rebuild as ' +
                TIERS[b.lvl].toLowerCase() +
                '</button><span class="costs">' +
                costHTML(uc) +
                '</span></div>' +
                '<p class="note">Opens ' +
                BUILD.filter((t?) => DEF[t].tier === b.lvl + 1)
                    .map((t?) => DEF[t].name.toLowerCase())
                    .join(', ') +
                '.</p>'
        } else {
            h += '<p class="note">The greatest keep in the land.</p>'
        }
    } else {
        h +=
            '<div class="row"><button class="btn" data-act="demo">Demolish</button><span class="note" style="margin:0">Returns half the cost</span></div>'
    }
    return h
}
export function palLine(b?) {
    const out = [b],
        seen = new Set([b])
    for (let i = 0; i < out.length; i++) {
        const c = out[i]
        for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ]) {
            const o = bAt(c.x + dx, c.y + dy)
            if (o && o.o === 0 && o.t === 'palisade' && !seen.has(o)) {
                seen.add(o)
                out.push(o)
            }
        }
    }
    return out
}
export function rebuildStone(b?, all?) {
    const to = b.t === 'palisade' ? 'wall' : 'shouse'
    if (GV.keep.lvl < DEF[to].tier) {
        toast('Rebuild the keep in stone first.')
        return
    }
    const list = all ? palLine(b) : [b],
        cost = {}
    for (const [r, n] of Object.entries<any>(DEF[to].cost)) {
        cost[r] = n * list.length
    }
    if (!afford(cost)) {
        toast('That needs ' + costText(cost) + '.')
        return
    }
    pay(cost)
    let nb = null
    for (const p of list) {
        removeB(p)
        nb = addB(to, p.x, p.y)
        puff(p.x, p.y, 4)
    }
    GV.selected = all ? null : nb
    toast(
        list.length > 1
            ? list.length + ' sections of palisade are rebuilt in stone.'
            : 'Rebuilt in stone.'
    )
    clearTimeout(GV.placeTm)
    GV.placeTm = setTimeout(save, 1500)
}
export function toggleFlag() {
    GV.moveBn = 0
    if (GV.armed === 'flag') {
        GV.armed = null
        GV.hover = null
    } else if (GV.S.banners.length >= MAX_BANNERS) {
        toast(
            'Four banners fly already. Take one down or move one from the Army panel.'
        )
        GV.selected = { kind: 'army' }
    } else {
        GV.selected = null
        arm('flag')
    }
    hud()
}
$('#inspect').addEventListener('click', (e?) => {
    const a = e.target.closest('[data-act]')
    if (!a || !GV.selected) {
        return
    }
    const b = GV.selected,
        act = a.dataset.act
    if (act.startsWith('train:')) {
        const k = act.slice(6)
        b.trainKind = k
        train(b, false, k)
        hud()
        return
    }
    if (act.startsWith('stance:')) {
        GV.S.stance = act.slice(7)
        hud()
        return
    }
    if (act.startsWith('bn:')) {
        bannerAct(act)
        hud()
        return
    }
    if (livingAct(act, b)) {
        hud()
        return
    }
    switch (act) {
        case 'close':
            GV.selected = null
            break
        case 'up':
            upgradeKeep()
            break
        case 'demo':
            demolish(b)
            break
        case 'auto':
            b.auto = a.checked
            break
        case 'shut':
            b.auto = false
            b.shut = !b.shut
            GV.flowDirty = true
            break
        case 'lift':
            b.auto = false
            b.up = !b.up
            GV.flowDirty = true
            break
        case 'stone1':
            rebuildStone(b, false)
            break
        case 'stoneAll':
            rebuildStone(b, true)
            break
        case 'army':
            GV.selected = { kind: 'army' }
            break
        case 'flag':
            toggleFlag()
            return
        case 'recall':
            recallAll()
            toast('The banners come down. Your soldiers return to their posts.')
            break
        case 'cry':
            warCry()
            break
        case 'fire':
            fireArrows()
            break
        case 'scout':
            if (sendScout(b.rg.id)) {
                GV.selected = null
            }
            break
        case 'siege': {
            const bn = plantBanner(clampN(b.cx), clampN(b.cy + b.s))
            if (bn) {
                GV.selected = { kind: 'banner', bn }
                toast(
                    'Banner ' +
                        bn.id +
                        ' flies before ' +
                        (b.t === 'camp'
                            ? 'the bandit camp'
                            : 'the walls of ' + rivById(b.o).name) +
                        '. Its squad marches.'
                )
            }
            break
        }
        default:
            ecoAct(act, b, a)
    }
    hud()
})
$('#event').addEventListener('click', (e?) => {
    const a = e.target.closest('[data-ev]')
    if (a) {
        pickEvent(+a.dataset.ev)
        hud()
    }
})
export function bannerAct(act?) {
    const [, op, idS, arg] = act.split(':'),
        b = bannerById(+idS)
    if (!b) {
        return
    }
    const now = GV.S.sold.filter(
        (s?) =>
            s.sq === b.id &&
            s.kind !== 'captain' &&
            s.kind !== 'eng' &&
            !UNITS[s.kind].siege
    ).length
    switch (op) {
        case 'less':
            b.n = Math.max(
                1,
                (b.n === null || b.n === undefined ? now : b.n) - 1
            )
            break
        case 'more':
            b.n = (b.n === null || b.n === undefined ? now : b.n) + 1
            break
        case 'auto':
            b.n = null
            break
        case 'st':
            b.st = arg === 'hold' ? 'hold' : 'charge'
            break
        case 'eng':
            b.eng = arg === 'tunnel' ? 'tunnel' : 'tower'
            break
        case 'go':
            lookAt(b.x, b.y)
            break
        case 'move':
            GV.selected = null
            arm('flag')
            GV.moveBn = b.id
            break
        case 'rm':
            removeBanner(b.id)
            toast('Banner ' + b.id + ' is taken down. Its squad returns home.')
            break
    }
    GV.sqCd = 0
}
export const fmtTime = (s?) => {
    s = Math.max(0, Math.ceil(s))
    return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0')
}
export function hud() {
    if (!GV.S) {
        return
    }
    for (const r of RES) {
        $('#r-' + r).textContent = Math.floor(GV.S.res[r])
    }
    $('#r-pop').textContent = pop() + '/' + cap()
    $('#r-sold').textContent = GV.S.sold.filter(
        (x?) => x.kind !== 'scout'
    ).length
    $('#r-clock').textContent =
        SEASONS[season()] + ', ' + (isNight() ? 'night' : 'day') + livingClock()
    $('#clock').title = weatherTip()
    const live = GV.S.riv.filter((r?) => r.awake && !r.dead),
        atk = live.filter((r?) => r.out && r.foe === 0)
    alertsHud()
    let p1,
        p2,
        p3,
        soon = false
    if (atk.length) {
        const left =
            GV.S.en.reduce(
                (n?, e?) => n + (e.mode === 'atk' && e.fac < 9 ? 1 : 0),
                0
            ) + atk.reduce((n?, r?) => n + r.q.length, 0)
        p1 = atk[0].name
        p2 = 'Attack'
        p3 = left + (left === 1 ? ' raider left' : ' raiders left')
        soon = true
    } else {
        const next = live
            .filter((r?) => r.truce <= 0 && !r.out && r.nextFoe === 0)
            .sort((a?, b?) => a.atkIn - b.atkIn)[0]
        if (next) {
            p1 = next.name
            p2 = fmtTime(next.atkIn)
            p3 =
                'from the ' +
                (next.atkDir !== null && next.atkDir !== undefined
                    ? compass(Math.cos(next.atkDir), Math.sin(next.atkDir))
                    : compass(next.kx - KX, next.ky - KY))
            soon = next.atkIn < 30
        } else if (live.some((r?) => r.truce > 0)) {
            p1 = 'Truce'
            p2 = fmtTime(
                Math.min(
                    ...live.filter((r?) => r.truce > 0).map((r?) => r.truce)
                )
            )
            p3 = 'peace holds'
        } else if (live.length) {
            p1 = 'Thornwick'
            p2 = 'Calm'
            p3 = 'the lords look elsewhere'
        } else {
            p1 = 'Thornwick'
            p2 = 'Peace'
            p3 = GV.S.won ? 'the realm is yours' : 'no rival in sight'
        }
    }
    $('#p1').textContent = p1
    $('#p2').textContent = p2
    $('#p3').textContent = p3
    $('#pennant').classList.toggle('soon', soon)
    for (const t in GV.cards) {
        const el = GV.cards[t],
            d = DEF[t],
            locked = d.tier > GV.keep.lvl,
            cost = costOf(t)
        el.classList.toggle('locked', locked)
        el.classList.toggle('poor', !locked && !afford(cost))
        el.setAttribute('aria-pressed', String(GV.armed === t))
        const ch = locked
                ? '<span class="c">' + TIERS[d.tier - 1] + '</span>'
                : costHTML(cost),
            co = el.querySelector('.costs')
        if (co._h !== ch) {
            co.innerHTML = ch
            co._h = ch
        }
    }
    $('#rm').setAttribute('aria-pressed', String(GV.armed === 'remove'))
    $('#ringBtn').setAttribute('aria-pressed', String(GV.armed === 'ring'))
    const fb = $('#flagBtn'),
        ft = 'Banner ' + GV.S.banners.length + '/' + MAX_BANNERS
    fb.setAttribute('aria-pressed', String(GV.armed === 'flag'))
    if (fb._t !== ft) {
        fb.textContent = ft
        fb._t = ft
    }
    if (
        GV.selected &&
        ((GV.selected.kind === 'unit' &&
            (GV.selected.u.dead || !GV.S.en.includes(GV.selected.u))) ||
            (GV.selected.kind === 'banner' &&
                !GV.S.banners.includes(GV.selected.bn)) ||
            (GV.selected.kind === 'fog' && GV.selected.rg.disc) ||
            livingGone(GV.selected))
    ) {
        GV.selected = null
    }
    $('#armyBtn').setAttribute(
        'aria-pressed',
        String(!!(GV.selected && GV.selected.kind === 'army'))
    )
    const pl = $('#placing')
    if (GV.armed) {
        const ht = placingText()
        if (pl._h !== ht) {
            $('#placingText').innerHTML = ht
            pl._h = ht
        }
        pl.hidden = false
    } else {
        pl.hidden = true
    }
    const ins = $('#inspect')
    if (GV.selected && !GV.selected.dead) {
        const h = inspectHTML(GV.selected)
        if (h !== GV.lastInspect) {
            ins.innerHTML = h
            GV.lastInspect = h
        }
        ins.hidden = false
    } else {
        ins.hidden = true
        GV.lastInspect = ''
    }
    const evEl = $('#event')
    if (GV.S.ev) {
        const ev = GV.S.ev
        const h =
            '<h2>' +
            ev.title +
            '</h2><p>' +
            ev.text +
            '</p><div class="row">' +
            ev.opts
                .map(
                    (o?, i?) =>
                        '<button class="btn' +
                        (i === 0 ? ' primary' : '') +
                        '" data-ev="' +
                        i +
                        '"' +
                        (o.cost && !afford(o.cost) ? ' disabled' : '') +
                        '>' +
                        o.label +
                        (o.cost
                            ? ' <span class="costs" style="display:inline-flex">' +
                              costHTML(o.cost) +
                              '</span>'
                            : '') +
                        '</button>'
                )
                .join('') +
            '</div>'
        if (h !== GV.lastEvent) {
            evEl.innerHTML = h + '<div class="ttl"></div>'
            GV.lastEvent = h
        }
        const tl = evEl.querySelector('.ttl')
        if (tl) {
            tl.style.width = Math.round((ev.ttl / ev.max) * 100) + '%'
        }
        evEl.hidden = false
    } else {
        evEl.hidden = true
        GV.lastEvent = ''
    }
    document
        .querySelectorAll<HTMLElement>('[data-speed]')
        .forEach((b?) =>
            b.setAttribute(
                'aria-pressed',
                String(+b.dataset.speed === GV.speed)
            )
        )
    ecoHud()
    drawMini()
}
document.querySelectorAll<HTMLElement>('[data-speed]').forEach((b?) =>
    b.addEventListener('click', () => {
        GV.speed = +b.dataset.speed
        hud()
    })
)
export function bindDiff(input?, onPick?) {
    const box = input.closest('.diff')
    input._show = () => {
        const d = DIFFS[+input.value]
        box.querySelector('[data-diff-name]').textContent = d.name
        box.querySelector('[data-diff-note]').textContent = d.note
    }
    input.addEventListener('input', () => {
        input._show()
        if (onPick) {
            onPick(+input.value)
        }
    })
}
export function rememberDiff(d?) {
    GV.nextDiff = d
    try {
        localStorage.setItem(DIFF_KEY, String(d))
    } catch {
        // storage can be blocked (private mode); the game runs without it
    }
}
// In a kingdom that has not started yet, the help sheet can still change its difficulty.
bindDiff($('#helpDiffIn'), (d?) => {
    rememberDiff(d)
    if (GV.S && GV.S.t < 1) {
        GV.S.diff = d
        if (!GV.S.riv[0].out) {
            GV.S.riv[0].atkIn = FIRST_RAID * DF().first
        }
        hud()
    }
})
bindDiff($('#newkDiff'))
export function showHelp(on?) {
    GV.helpOpen = on
    $('#help').hidden = !on
    if (!on) {
        return
    }
    const fresh = !!GV.S && GV.S.t < 1
    $('#helpDiff').hidden = !fresh
    $('#helpDiffNow').hidden = fresh
    if (fresh) {
        $('#helpDiffIn').value = GV.S.diff
        $('#helpDiffIn')._show()
    } else {
        $('#helpDiffNow').textContent =
            'Difficulty: ' +
            DF().name +
            '. You can choose another when you found a new kingdom.'
    }
    $('#helpGo').focus()
}
GV.newOpen = false
export function showNew(on?) {
    GV.newOpen = on
    $('#newk').hidden = !on
    if (!on) {
        return
    }
    const i = $('#newkDiff')
    i.value = GV.nextDiff
    i._show()
    $('#newkWarn').hidden = !GV.S || GV.S.over || GV.S.won
    $('#newkGo').focus()
}
$('#helpBtn').addEventListener('click', () => showHelp(true))
$('#helpGo').addEventListener('click', () => showHelp(false))
$('#newBtn').addEventListener('click', () => showNew(true))
$('#newkGo').addEventListener('click', () => {
    rememberDiff(+$('#newkDiff').value)
    showNew(false)
    restart()
})
$('#newkCancel').addEventListener('click', () => {
    showNew(false)
    if (GV.S && GV.S.over) {
        $('#over').hidden = false
        GV.overOpen = true
    }
})
$('#overGo').addEventListener('click', () => {
    $('#over').hidden = true
    GV.overOpen = false
    showNew(true)
})
$('#overKeep').addEventListener('click', () => {
    $('#over').hidden = true
    GV.overOpen = false
})
export function restart() {
    $('#over').hidden = true
    GV.overOpen = false
    newGame()
    buildCards()
    centreCam()
    clampCam()
    wipeSave()
    hud()
}
