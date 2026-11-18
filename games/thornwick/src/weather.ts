/* Weather: rain and storms, droughts, deep snow and fog. It comes and goes with the
   seasons. Other modules ask a few small questions: moveMul(), rangeMul(), harvestMul()
   and fogHides(). Drawing is cheap: a few hundred screen-space strokes at most. */
import { DEF, DF, N } from './config'
import { flam, toast } from './helpers'
import { ignite } from './lords'
import { bmap, clampN, inMap, pathMap, reduceMotion, season } from './state'
import { GV } from './vars'

export const WX = {
    clear: { name: 'Clear' },
    rain: { name: 'Rain', len: [50, 90] },
    storm: { name: 'Storm', len: [35, 60] },
    drought: { name: 'Drought', len: [90, 140] },
    snow: { name: 'Deep snow', len: [70, 120] },
    fog: { name: 'Fog', len: [45, 80] },
}
/* Chances when the sky changes, by season. What is left over stays clear. */
const ODDS = [
    { rain: 0.35, storm: 0.12, fog: 0.23 },
    { drought: 0.28, storm: 0.25, rain: 0.1 },
    { fog: 0.3, rain: 0.3, storm: 0.1 },
    { snow: 0.5, fog: 0.15 },
]
const SEASON_OK = {
    rain: [0, 1, 2],
    storm: [0, 1, 2],
    drought: [1],
    snow: [3],
    fog: [0, 1, 2, 3],
}
export const wxNew = () => ({ k: 'clear', t: 0, cd: 120, hits: 0, st: 10 })
const W = () => GV.S.wld.wx
export const wxIs = (k?) => !!GV.S && !!GV.S.wld && W().k === k
/** How hard the weather bites on this difficulty, at most full strength. */
const bite = () => Math.min(1, DF().wx)

/** Speed on a tile: deep snow slows everyone who leaves the roads, a storm a little. */
export function moveMul(x?, y?) {
    if (!GV.S || !GV.S.wld) {
        return 1
    }
    const k = W().k
    if (k === 'snow') {
        const road = inMap(x, y) && pathMap[x + y * N]
        return road ? 1 - 0.12 * bite() : 1 - 0.38 * bite()
    }
    if (k === 'storm') {
        return 1 - 0.1 * bite()
    }
    return 1
}
/** Reach of towers and archers: fog and the wind of a storm shorten it. */
export function rangeMul() {
    if (!GV.S || !GV.S.wld) {
        return 1
    }
    const k = W().k
    return k === 'fog'
        ? 1 - 0.35 * bite()
        : k === 'storm'
          ? 1 - 0.15 * bite()
          : 1
}
/** Farm harvest: a drought withers it, rain helps a little, a bountiful season more. */
export function harvestMul() {
    if (!GV.S || !GV.S.wld) {
        return 1
    }
    const k = W().k,
        m = k === 'drought' ? 1 - 0.45 * bite() : k === 'rain' ? 1.1 : 1
    return m * (GV.S.wld.bountyT > 0 ? 1.3 : 1)
}
/** In fog, raiders and wolves stay hidden until they come close to your people or walls. */
export const fogHides = (e?) => !!e.fogHid && wxIs('fog')
export const weatherName = () =>
    GV.S && GV.S.wld && W().k !== 'clear' ? WX[W().k].name : ''
export const weatherLeft = () => (GV.S && GV.S.wld ? W().t : 0)

const MSG = {
    rain: 'Rain sweeps over the valley. The crops drink, and flames die down sooner.',
    storm: 'A storm rolls in. Lightning may strike thatched roofs, and the wind cuts the reach of towers and archers.',
    drought:
        'A drought. The fields wither, and farms bring in less until the rain returns.',
    snow: 'Deep snow lies on the land. Everyone wades slowly off the roads, raiders too.',
    fog: 'Fog rolls in. Towers and archers see less far, and raiders stay hidden until they are close.',
}
const END = {
    drought: 'The drought breaks. The fields green again.',
    snow: 'The deep snow melts away.',
}
export function startWeather(k?, len?) {
    const w = W(),
        L = WX[k]
    w.k = k
    w.t = len || L.len[0] + Math.random() * (L.len[1] - L.len[0])
    w.st = 6 + Math.random() * 8
    // A storm on Normal may set one roof alight; gentler kingdoms less often.
    w.hits =
        k === 'storm'
            ? (Math.random() < DF().wx ? 1 : 0) + (DF().wx > 1.2 ? 1 : 0)
            : 0
    toast(MSG[k])
}
function endWeather(quiet?) {
    const w = W()
    if (!quiet && END[w.k]) {
        toast(END[w.k])
    }
    w.k = 'clear'
    w.t = 0
    w.cd = 30 + Math.random() * 50
}
function roll() {
    const se = season(),
        o = ODDS[se]
    let q = Math.random()
    for (const k in o) {
        // The first year brings only rain and snow, so a young village meets its first raids as before.
        if (GV.S.t < 600 && k !== 'rain' && k !== 'snow') {
            continue
        }
        if ((q -= o[k]) < 0) {
            startWeather(k)
            return
        }
    }
    W().cd = 40 + Math.random() * 60
}
/* A lightning strike somewhere in view of the realm. Now and then it finds thatch. */
function strike() {
    const w = W()
    GV.flashT = GV.animT
    if (w.hits <= 0 || Math.random() > 0.45) {
        return
    }
    const c = GV.S.b.filter(
        (b?) => b.o === 0 && flam(b) && b !== GV.keep && !(b.fire > 0)
    )
    if (!c.length) {
        return
    }
    const b = c[(Math.random() * c.length) | 0]
    w.hits--
    ignite(b)
    toast(
        'Lightning strikes the ' +
            DEF[b.t].name.toLowerCase() +
            '. The thatch is burning.'
    )
}
GV.fogCd = 0
GV.flashT = -9
export function weatherTick(dt?) {
    const w = W(),
        se = season()
    if (w.k !== 'clear') {
        if (!SEASON_OK[w.k].includes(se) || (w.t -= dt) <= 0) {
            endWeather(false)
        }
    } else if (GV.S.t > 90 && (w.cd -= dt) <= 0) {
        roll()
    }
    if (w.k === 'storm' && (w.st -= dt) <= 0) {
        w.st = 8 + Math.random() * 12
        strike()
    }
    if ((GV.fogCd -= dt) <= 0) {
        GV.fogCd = 0.5
        if (w.k === 'rain' || w.k === 'storm') {
            // Rain helps put fires out.
            for (const b of GV.S.b) {
                if (b.fire > 0) {
                    b.fire = Math.max(0.01, b.fire - 0.6)
                }
            }
        }
        if (w.k === 'fog') {
            for (const e of GV.S.en) {
                e.fogHid = e.mode !== 'guard' && !ownNear(e.x, e.y)
            }
        }
    }
}
/* Anything of yours within 4 tiles: a soldier, a villager or a building. */
function ownNear(x?, y?) {
    for (const s of GV.S.sold) {
        if (Math.abs(s.x - x) < 4.5 && Math.abs(s.y - y) < 4.5) {
            return true
        }
    }
    const cx = clampN(x),
        cy = clampN(y)
    for (let j = -4; j <= 4; j++) {
        for (let i = -4; i <= 4; i++) {
            if (inMap(cx + i, cy + j)) {
                const b = bmap[cx + i + (cy + j) * N]
                if (b && b.o === 0) {
                    return true
                }
            }
        }
    }
    return false
}

/* ---------- drawing ---------- */
const hs = (i?, k?) => {
    const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
    return v - Math.floor(v)
}
GV.fogCv = null
function fogTile() {
    if (GV.fogCv) {
        return GV.fogCv
    }
    const cv = document.createElement('canvas')
    cv.width = cv.height = 256
    const g = cv.getContext('2d')
    for (let i = 0; i < 26; i++) {
        const x = hs(i, 1) * 256,
            y = hs(i, 2) * 256,
            r = 40 + hs(i, 3) * 70
        for (const [ox, oy] of [
            [0, 0],
            [256, 0],
            [-256, 0],
            [0, 256],
            [0, -256],
        ]) {
            const gr = g.createRadialGradient(
                x + ox,
                y + oy,
                0,
                x + ox,
                y + oy,
                r
            )
            gr.addColorStop(0, 'rgba(226,230,232,.55)')
            gr.addColorStop(1, 'rgba(226,230,232,0)')
            g.fillStyle = gr
            g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2)
        }
    }
    GV.fogCv = cv
    return cv
}
/** Draw the weather over the map, in screen pixels (the context is scaled to CSS pixels). */
export function drawWeather(c?, w?, h?) {
    if (!GV.S || !GV.S.wld) {
        return
    }
    const k = W().k,
        t = GV.animT
    if (k === 'clear') {
        return
    }
    if (k === 'rain' || k === 'storm') {
        c.fillStyle =
            k === 'storm' ? 'rgba(18,26,44,.24)' : 'rgba(40,58,78,.13)'
        c.fillRect(0, 0, w, h)
        if (!reduceMotion) {
            const n = k === 'storm' ? 170 : 110,
                sl = k === 'storm' ? 5 : 2,
                len = k === 'storm' ? 13 : 10
            c.strokeStyle = 'rgba(196,214,232,.38)'
            c.lineWidth = 1
            c.beginPath()
            for (let i = 0; i < n; i++) {
                const sp = 380 + hs(i, 4) * 220,
                    x = (hs(i, 1) * (w + 60) + t * sl * 18) % (w + 60),
                    y = (hs(i, 2) * (h + 40) + t * sp) % (h + 40)
                c.moveTo(x - 30, y - 20)
                c.lineTo(x - 30 - sl, y - 20 + len)
            }
            c.stroke()
        }
        if (k === 'storm' && !reduceMotion) {
            const f = 1 - (t - GV.flashT) / 0.35
            if (f > 0) {
                c.fillStyle = 'rgba(236,242,255,' + (0.55 * f).toFixed(3) + ')'
                c.fillRect(0, 0, w, h)
            }
        }
    } else if (k === 'snow') {
        c.fillStyle = 'rgba(236,242,250,.14)'
        c.fillRect(0, 0, w, h)
        if (!reduceMotion) {
            c.fillStyle = 'rgba(255,255,255,.9)'
            for (let i = 0; i < 150; i++) {
                const sp = 30 + hs(i, 3) * 40,
                    s = hs(i, 5) < 0.3 ? 3 : 2
                c.fillRect(
                    (hs(i, 1) * w + Math.sin(t * 0.8 + i) * 16 + t * 14) % w,
                    (hs(i, 2) * h + t * sp) % h,
                    s,
                    s
                )
            }
        }
    } else if (k === 'fog') {
        c.fillStyle = 'rgba(214,220,224,.22)'
        c.fillRect(0, 0, w, h)
        const img = fogTile(),
            ox = reduceMotion ? 0 : (t * 7) % 1024,
            oy = reduceMotion ? 0 : (t * 2) % 1024
        c.globalAlpha = 0.8
        for (let y = -1024 + oy; y < h; y += 1024) {
            for (let x = -1024 + ox; x < w; x += 1024) {
                c.drawImage(img, x, y, 1024, 1024)
            }
        }
        c.globalAlpha = 1
    } else if (k === 'drought') {
        c.fillStyle = 'rgba(222,160,60,.11)'
        c.fillRect(0, 0, w, h)
    }
}
