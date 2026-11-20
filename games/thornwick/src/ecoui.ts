/* Screens for the deeper economy: the goods row in the top bar, the realm
   sheet (overview, charts, needs, trade), and the parts of the inspect panel
   for workshops, the scriptorium and the market. */
import { $, DEF, ICON } from './config'
import {
    BIG_TOWN,
    CHAPEL_R,
    CRAFT,
    RESEARCH,
    RESERVE,
    RES_BY,
    ROUTE_COST,
    TRADE_GOODS,
    buyPrice,
    capOf,
    closeRoute,
    estimate,
    foodReserve,
    growMul,
    hostile,
    known,
    mineYield,
    moodWord,
    myMarkets,
    openRoute,
    scholars,
    sellPrice,
    siteLeft,
    specOf,
    startResearch,
    toolBonus,
} from './eco'
import { GOOD, GOODS, amountText } from './goods'
import { pop } from './helpers'
import { moodBonus } from './livingworld'
import { power } from './lords'
import { rivById } from './state'
import { costHTML, fmtTime, hud } from './ui'
import { GV } from './vars'

const pct = (f?) => Math.round(f * 100) + '%'
const lower = (g?) => GOOD[g].name.toLowerCase()
const list = (a?) =>
    a.length < 2
        ? a.join('')
        : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]

/* ---------- the goods row ---------- */
const MAKER = {
    iron: 'ironmine',
    tools: 'smith',
    weapons: 'smith',
    flour: 'mill',
    bread: 'bakery',
    ale: 'brewery',
    wool: 'sheep',
    cloth: 'weaver',
    meat: 'lodge',
}
GV.goodsEls = null
function goodsRow() {
    const ul = $('#goods')
    ul.innerHTML = GOODS.map(
        (g?) =>
            '<li class="pill soft" title="' +
            GOOD[g].name +
            '" hidden>' +
            ICON[g] +
            '<span id="g-' +
            g +
            '">0</span></li>'
    ).join('')
    $('#g-moodic').innerHTML = (ICON as any).mood
    GV.goodsEls = GOODS.map((g?) => [g, $('#g-' + g), $('#g-' + g).parentNode])
    $('#moodBtn').addEventListener('click', () => openRealm('people'))
}
export function ecoHud() {
    if (!GV.goodsEls) {
        goodsRow()
    }
    const S = GV.S,
        have = {}
    for (const b of S.b) {
        if (b.o === 0) {
            have[b.t] = 1
        }
    }
    for (const [g, el, li] of GV.goodsEls) {
        const n = Math.floor(S.res[g])
        const show = n > 0 || !!have[MAKER[g]] || g === 'weapons'
        if (li.hidden === show) {
            li.hidden = !show
        }
        if (el._n !== n) {
            el.textContent = n
            el._n = n
        }
    }
    const m = moodWord(S.need.sat) + ' ' + pct(S.need.sat)
    const me = $('#g-mood')
    if (me._t !== m) {
        me.textContent = m
        me._t = m
    }
}

/* ---------- inspect panel parts ---------- */
const PRODUCER = {
    ironmine: 1,
    sheep: 1,
    weaver: 1,
    mill: 1,
    bakery: 1,
    brewery: 1,
    smith: 1,
    scriptorium: 1,
}
export function ecoInspect(b?) {
    const d = DEF[b.t]
    let h = ''
    if (b.o !== 0) {
        return h
    }
    if (PRODUCER[b.t] && (b.w || 0) > 0) {
        const lk = b.lack
        h +=
            '<p class="note">' +
            (b.off
                ? 'Work has stopped here.'
                : !lk
                  ? 'At work.'
                  : lk === 'plan'
                    ? 'Choose something to study below.'
                    : lk === 'food' && (b.t === 'mill' || b.t === 'brewery')
                      ? 'Waiting for spare food: it leaves ' +
                        foodReserve() +
                        ' food in store for the people.'
                      : 'Waiting for ' + lower(lk) + '.') +
            '</p>'
    }
    if (b.t === 'smith') {
        const mk = b.mk || 'both'
        h +=
            '<div class="row"><span class="note" style="margin:0">Forge</span><div class="seg">' +
            [
                ['weapons', 'Weapons'],
                ['tools', 'Tools'],
                ['both', 'Both'],
            ]
                .map(
                    ([k, l]) =>
                        '<button class="btn" data-act="mk:' +
                        k +
                        '" aria-pressed="' +
                        (mk === k) +
                        '">' +
                        l +
                        '</button>'
                )
                .join('') +
            '</div></div>'
    }
    if (b.t === 'scriptorium') {
        h += researchHTML()
    }
    if (b.t === 'market') {
        h +=
            '<div class="row"><button class="btn primary" data-act="trade">Trade routes</button><span class="note" style="margin:0">' +
            GV.S.trade.length +
            ' of ' +
            myMarkets().length +
            ' in use</span></div>'
    }
    if (d.role) {
        h +=
            '<label><input type="checkbox" data-act="off"' +
            (b.off ? '' : ' checked') +
            '> Villagers work here</label>'
    }
    return h
}
export function researchHTML() {
    const S = GV.S,
        n = scholars()
    let h = '<div class="how"><h3>Studies</h3>'
    if (S.rs) {
        const R = RES_BY[S.rs.id],
            f = Math.min(1, S.rs.p / R.time)
        h +=
            '<p><b>' +
            R.name +
            '</b> ' +
            pct(f) +
            '</p><div class="hp prog"><i style="width:' +
            pct(f) +
            '"></i></div><p class="note">' +
            (n
                ? 'About ' + fmtTime((R.time - S.rs.p) / n) + ' left.'
                : 'No scholar at work, so the study waits.') +
            '</p>'
    }
    for (const R of RESEARCH) {
        const done = S.tech[R.id],
            now = S.rs && S.rs.id === R.id
        if (now) {
            continue
        }
        h +=
            '<div class="rsi' +
            (done ? ' done' : '') +
            '"><p><b>' +
            R.name +
            '</b>' +
            (done ? ' <span class="note">Known</span>' : '') +
            '<br><span class="note">' +
            R.eff +
            '</span></p>' +
            (done
                ? ''
                : '<div class="row"><button class="btn" data-act="rs:' +
                  R.id +
                  '"' +
                  (S.rs ? ' disabled' : '') +
                  '>Study</button><span class="costs">' +
                  costHTML(R.cost) +
                  '<span class="c" title="Time to study">' +
                  fmtTime(R.time) +
                  ' study' +
                  '</span></span></div>') +
            '</div>'
    }
    return h + '</div>'
}
/** Handles the inspect panel's economy buttons. True when it did something. */
export function ecoAct(act?, b?, el?) {
    if (act === 'off') {
        b.off = !el.checked
        GV.jobCd = 0
        return true
    }
    if (act.startsWith('mk:')) {
        b.mk = act.slice(3)
        return true
    }
    if (act.startsWith('rs:')) {
        startResearch(act.slice(3))
        return true
    }
    if (act === 'trade') {
        openRealm('trade')
        return true
    }
    return false
}

/* ---------- how it works ---------- */
const per = (n?, every?) => Math.round((n * 60) / every)
/** "How it works" text for the economy's buildings. */
export function ecoHow(b?, P?, now?) {
    const R = foodReserve()
    switch (b.t) {
        case 'ironmine': {
            const y = mineYield(b)
            P.push(
                'Each miner digs 2 iron every 8 seconds, 3 in hill country, and 1 more with deep mining. The blacksmith forges it into weapons and tools.'
            )
            P.push(
                'It must touch rocks or stand in hill country, but it does not use the rocks up.'
            )
            now.push(
                'Digs ' +
                    y +
                    ' iron a trip: about ' +
                    (b.w || 0) * per(y, CRAFT.miner) +
                    ' a minute with ' +
                    (b.w || 0) +
                    ' at work, a little more with tools.'
            )
            break
        }
        case 'sheep':
            P.push(
                'The shepherd shears 3 wool every 10 seconds, 18 a minute. That is just what one weaver needs.'
            )
            break
        case 'weaver':
            P.push(
                'The weaver turns 3 wool into 2 cloth every 10 seconds: 12 cloth a minute from 18 wool.'
            )
            P.push(
                'Every 10 seconds the village uses 1 cloth for each 20 villagers, so one weaver clothes about 40 people. Cloth is one of their four needs.'
            )
            break
        case 'bakery':
            P.push(
                'The baker bakes 4 flour and 1 wood into 8 bread every 8 seconds: 60 bread a minute from 30 flour, which the windmill grinds from 30 food.'
            )
            P.push(
                'At each meal people eat bread first, up to half of what they eat, then food. Bread stretches your stores and puts a second dish on the table.'
            )
            break
        case 'brewery':
            P.push(
                'The brewer brews 4 food into 4 ale every 10 seconds (24 a minute), but only while more than ' +
                    R +
                    ' food is in store, so no one goes hungry for it.'
            )
            P.push(
                'A tavern pours 1 ale for every 4 villagers it serves every 10 seconds, 3 for a full tavern, and then earns half as much gold again.'
            )
            break
        case 'scriptorium': {
            P.push(
                'The scholar studies the upgrade you choose, one at a time. Each takes 90 to 150 seconds of study, less when villagers are content. A second scriptorium doubles the pace.'
            )
            P.push('You pay for a study when it begins.')
            break
        }
    }
}
/** Extra lines for buildings that the economy changes. */
export function ecoHowMore(b?, P?, now?) {
    const S = GV.S
    switch (b.t) {
        case 'farm':
            P.push(
                'Crop rotation adds a quarter to every harvest, and the heavy plough lets farms work in winter at a third. Tools and content villagers make farmers faster.'
            )
            break
        case 'lumber':
        case 'quarry': {
            const tree = b.t === 'lumber',
                sites = tree ? GV.myTrees : GV.myRocks
            let n = 0
            for (const p of sites) {
                n += siteLeft(p[0], p[1])
            }
            now.push(
                sites.length +
                    (tree ? ' trees' : ' rocks') +
                    ' left on your land, with about ' +
                    n +
                    (tree ? ' wood.' : ' stone.')
            )
            break
        }
        case 'mill':
            P.push(
                'The miller grinds 5 food into 5 flour every 8 seconds (about 37 a minute), but only while more than ' +
                    foodReserve() +
                    ' food is in store. A bakery bakes the flour into bread.'
            )
            break
        case 'smith':
            P.push(
                'Each smith forges 2 iron and 1 wood into 1 weapon or 1 tool every 10 seconds, so two smiths make 12 a minute. Choose what to forge below.'
            )
            P.push(
                'Swordsmen, pikemen, archers and knights each need a weapon to train. Tools make farmers, fishers, woodcutters, masons, miners and shepherds ' +
                    Math.round(toolBonus() * 100) +
                    '% faster while you have any. They wear out slowly.'
            )
            break
        case 'tavern':
            P.push(
                'With ale in store a tavern pours 1 ale for every 4 villagers it serves and earns 1 gold for every 2 of them: up to 6 gold every 10 seconds. Ale is one of the villagers’ needs.'
            )
            now.push('Ale in store: ' + Math.floor(S.res.ale) + '.')
            break
        case 'chapel':
            P.push(
                'Homes within ' +
                    CHAPEL_R +
                    ' tiles of a chapel have one nearby, which is one of the villagers’ four needs.'
            )
            break
        case 'market':
            P.push(
                'A market can also run one trade route to a lord who is not at war with you. Caravans carry your goods out and bring back what you choose.'
            )
            break
    }
}

/* ---------- the realm sheet ---------- */
GV.realmOpen = false
GV.realmTab = 'over'
export function openRealm(tab?) {
    GV.realmTab = tab || GV.realmTab
    GV.realmOpen = true
    $('#realm').hidden = false
    renderRealm()
    $('#realmGo').focus()
}
export function closeRealm() {
    GV.realmOpen = false
    $('#realm').hidden = true
    hud()
}
function renderRealm() {
    document
        .querySelectorAll<HTMLElement>('[data-rtab]')
        .forEach((b?) =>
            b.setAttribute(
                'aria-pressed',
                String(b.dataset.rtab === GV.realmTab)
            )
        )
    const body = $('#realmBody')
    const t = GV.realmTab
    body.innerHTML =
        t === 'charts'
            ? chartsHTML()
            : t === 'people'
              ? peopleHTML()
              : t === 'trade'
                ? tradeHTML()
                : overHTML()
    if (t === 'charts') {
        drawCharts()
    }
}
function stanceOf(rv?) {
    if (rv.dead) {
        return ['Fallen', '']
    }
    if (hostile(rv)) {
        return ['At war with you', 'hostile']
    }
    if (rv.truce > 0) {
        return ['Truce for ' + fmtTime(rv.truce), '']
    }
    if (rv.out && rv.foe > 0) {
        const f = rivById(rv.foe)
        return [
            'At war with ' + (f && known(f) ? f.name : 'a distant lord'),
            '',
        ]
    }
    if (rv.awake && rv.nextFoe === 0) {
        return ['At peace, but plans to march on you', '']
    }
    return ['At peace', '']
}
function overHTML() {
    const S = GV.S,
        land = GV.regs.filter((rg?) => rg.owner === 0).length,
        sold = S.sold.filter((s?) => s.kind !== 'scout').length
    let h =
        '<table class="tbl"><thead><tr><th>Lord</th><th>Regions</th><th>Strength</th><th>Standing</th></tr></thead><tbody>'
    h +=
        '<tr class="me"><td>Thornwick (you)</td><td>' +
        land +
        '</td><td>' +
        power(0).toFixed(1) +
        '</td><td>' +
        pop() +
        ' people, ' +
        sold +
        (sold === 1 ? ' soldier' : ' soldiers') +
        '</td></tr>'
    let unknown = 0
    for (const rv of S.riv) {
        if (!known(rv)) {
            unknown++
            continue
        }
        const [st, cls] = stanceOf(rv),
            trading = S.trade.some((r?) => r.r === rv.id)
        h +=
            '<tr><td>' +
            rv.name +
            '</td><td>' +
            (rv.dead ? '-' : rv.ng) +
            '</td><td>' +
            (rv.dead ? '-' : power(rv.id).toFixed(1)) +
            '</td><td' +
            (cls ? ' class="' + cls + '"' : '') +
            '>' +
            st +
            (trading ? '. Trading' : '') +
            '</td></tr>'
    }
    h += '</tbody></table>'
    h +=
        '<p class="note">' +
        (unknown
            ? unknown +
              (unknown === 1 ? ' lord lives' : ' lords live') +
              ' in lands you have not found yet. '
            : '') +
        'Strength counts land, soldiers, castle and people. A lord who grows far stronger than the rest draws them all against him.</p>'
    const known2 = RESEARCH.filter((R?) => S.tech[R.id]).map((R?) => R.name)
    h +=
        '<h3>Your realm</h3><ul class="facts"><li>Your villagers: ' +
        moodWord(S.need.sat).toLowerCase() +
        ', ' +
        pct(S.need.sat) +
        ' of their needs met.</li><li>' +
        (S.rs
            ? 'Studying ' +
              RES_BY[S.rs.id].name.toLowerCase() +
              ', ' +
              pct(S.rs.p / RES_BY[S.rs.id].time) +
              ' done.'
            : 'Nothing under study.') +
        (known2.length ? ' Known: ' + list(known2).toLowerCase() + '.' : '') +
        '</li><li>' +
        S.trade.length +
        (S.trade.length === 1 ? ' trade route' : ' trade routes') +
        ', ' +
        myMarkets().length +
        (myMarkets().length === 1 ? ' market.' : ' markets.') +
        '</li></ul>'
    return h
}
function needRow(name?, f?, how?) {
    return (
        '<div class="need"><div class="nh"><b>' +
        name +
        '</b><span>' +
        pct(f) +
        '</span></div><div class="hp prog"><i style="width:' +
        pct(f) +
        '"></i></div><p class="note">' +
        how +
        '</p></div>'
    )
}
function peopleHTML() {
    const S = GV.S,
        n = S.need,
        fish = S.b.some((b?) => b.o === 0 && b.t === 'fisher' && b.w > 0),
        kinds = [
            S.res.food > 0 ? 'grain' : '',
            fish ? 'fish' : '',
            S.ateBread ? 'bread' : '',
            S.ateMeat ? 'meat' : '',
        ].filter(Boolean)
    const wm = 0.25 * n.sat,
        gm = growMul()
    let h =
        '<p class="lead"><b>' +
        moodWord(n.sat) +
        '</b>: ' +
        pct(n.sat) +
        ' of their needs are met.</p>'
    h += needRow(
        'Food on the table',
        n.food,
        'Grain from farms, fish, bread and meat from a hunter&#39;s lodge: any three fill the table. ' +
            (kinds.length ? 'Now: ' + list(kinds) + '.' : 'Now: nothing.')
    )
    h += needRow(
        'Ale',
        n.ale,
        'Villagers served ale at a tavern. A brewery brews it from spare food.'
    )
    h += needRow(
        'Cloth',
        n.cloth,
        '1 cloth for every 20 villagers every 10 seconds. A sheep farm and a weaver make it. In store: ' +
            Math.floor(S.res.cloth) +
            '.'
    )
    h += needRow(
        'A chapel nearby',
        n.chapel,
        'Homes within ' + CHAPEL_R + ' tiles of a chapel.'
    )
    const mb = moodBonus()
    if (mb) {
        h +=
            '<p class="note">' +
            (mb > 0
                ? 'Merrymaking (a minstrel or a feast) adds '
                : 'Gloom over a bad omen takes away ') +
            pct(Math.abs(mb)) +
            ' for a while.</p>'
    }
    h +=
        '<h3>What it does</h3><ul class="facts"><li>Workers are ' +
        Math.round(wm * 100) +
        '% faster (up to 25% when every need is met).</li><li>' +
        (gm < 1
            ? 'Settlers arrive ' + Math.round((1 - gm) * 100) + '% faster.'
            : gm > 1
              ? 'Settlers arrive ' +
                Math.round((gm - 1) * 100) +
                '% slower: a town of ' +
                BIG_TOWN +
                ' or more expects more.'
              : 'Settlers arrive at the usual pace.') +
        '</li><li>Tools make farmers, fishers, woodcutters, masons, miners and shepherds ' +
        Math.round(toolBonus() * 100) +
        '% faster on top, while you have any (' +
        Math.floor(S.res.tools) +
        ' in store).</li></ul><p class="note">A village never grows slower for unmet needs until it holds ' +
        BIG_TOWN +
        ' people. From then on, while less than 40% of their needs are met, settlers come more slowly.</p>'
    return h
}
function goodOpts(sel?) {
    return TRADE_GOODS.map(
        (g?) =>
            '<option value="' +
            g +
            '"' +
            (g === sel ? ' selected' : '') +
            '>' +
            GOOD[g].name +
            '</option>'
    ).join('')
}
function tradeHTML() {
    const S = GV.S,
        ms = myMarkets().length
    let h =
        '<p class="note" style="margin-top:0">Caravans leave your market, sell what you send at the lord’s keep and bring back what you ask for. Each market runs one route; opening one costs ' +
        ROUTE_COST +
        ' gold. Bandits and raiders rob caravans they meet on the road. Routes pause while a lord is at war with you. A truce counts as peace.</p><p><b>Markets: ' +
        ms +
        '. Routes: ' +
        S.trade.length +
        ' of ' +
        ms +
        '.</b></p>'
    const lords = S.riv.filter((rv?) => !rv.dead && known(rv))
    if (!lords.length) {
        h += '<p>You know no other lord yet. Scout the fog to find them.</p>'
    }
    for (const rv of lords) {
        const rt = S.trade.find((r?) => r.r === rv.id),
            [st, cls] = stanceOf(rv),
            spec = specOf(rv).map(lower)
        h +=
            '<div class="lord"><div class="nh"><b>' +
            rv.name +
            '</b><span class="' +
            cls +
            '">' +
            st +
            '</span></div><p class="note">Sells ' +
            list(spec) +
            ' cheaply.</p>'
        if (rt) {
            const e = estimate(rt)
            const status = rt.c
                ? rt.st === 'trade'
                    ? 'The caravan is trading at their keep.'
                    : rt.c.back
                      ? 'The caravan is on the way home' +
                        (rt.c.cargo
                            ? ' with ' + amountText(rt.c.cargo.g, rt.c.cargo.n)
                            : '') +
                        '.'
                      : 'The caravan is on the road with ' +
                        amountText(rt.c.cargo.g, rt.c.cargo.n) +
                        '.'
                : rt.note || 'The next caravan sets out soon.'
            h +=
                '<div class="row"><label>Send <select data-rt="' +
                rv.id +
                '" data-k="s">' +
                goodOpts(rt.s) +
                '</select></label><label>Bring back <select data-rt="' +
                rv.id +
                '" data-k="b">' +
                goodOpts(rt.b) +
                '</select></label></div><p class="note">Each caravan takes up to ' +
                capOf(rt.s) +
                ' ' +
                lower(rt.s) +
                (RESERVE[rt.s]
                    ? ' and keeps ' + RESERVE[rt.s] + ' at home'
                    : '') +
                '. They pay ' +
                sellPrice(rv, rt.s).toFixed(2) +
                ' gold each' +
                (rt.b !== 'gold'
                    ? ' and ask ' +
                      buyPrice(rv, rt.b).toFixed(2) +
                      ' gold for each ' +
                      GOOD[rt.b].one
                    : '') +
                '. ' +
                (e.n >= 5
                    ? 'Now: ' +
                      amountText(rt.s, e.n) +
                      ' out, about ' +
                      amountText(rt.b, e.back) +
                      ' back.'
                    : '') +
                '</p><p>' +
                status +
                (rt.last ? ' ' + rt.last : '') +
                '</p><div class="row"><button class="btn" data-close="' +
                rv.id +
                '">Close route</button></div>'
        } else {
            const can = !hostile(rv) && S.trade.length < ms
            h +=
                '<div class="row"><button class="btn primary" data-open="' +
                rv.id +
                '"' +
                (can && S.res.gold >= ROUTE_COST ? '' : ' disabled') +
                '>Open a route</button><span class="costs">' +
                costHTML({ gold: ROUTE_COST }) +
                '</span>' +
                (S.trade.length >= ms
                    ? '<span class="note" style="margin:0">' +
                      (ms ? 'Every market is in use.' : 'Needs a market.') +
                      '</span>'
                    : '') +
                '</div>'
        }
        h += '</div>'
    }
    return h
}

/* ---------- charts ---------- */
const SERIES = [
    ['Food', 0],
    ['Wood', 1],
    ['Stone', 2],
    ['Gold', 3],
    ['Goods', 4],
    ['People', 5],
]
function chartsHTML() {
    const n = GV.S.hist.length
    if (n < 2) {
        return '<p>The chronicle begins a few moments into your reign. Come back soon.</p>'
    }
    return (
        '<p class="note" style="margin-top:0">The last ' +
        Math.max(1, Math.round((n - 1) / 6)) +
        ' minutes, one mark every 10 seconds. Goods counts iron, tools, weapons, flour, bread, ale, wool and cloth together. Move over a chart to read it.</p><div class="charts">' +
        SERIES.map(
            ([name], k) =>
                '<figure class="chart"><figcaption><span>' +
                name +
                '</span><b data-cv="' +
                k +
                '"></b></figcaption><canvas data-ch="' +
                k +
                '" role="img" aria-label="' +
                name +
                ' over time"></canvas></figure>'
        ).join('') +
        '</div>'
    )
}
function drawChart(cv?, k?, hover?) {
    const H = GV.S.hist,
        n = H.length,
        dpr = Math.min(3, window.devicePixelRatio || 1),
        w = cv.clientWidth || 160,
        h = cv.clientHeight || 64
    if (cv.width !== Math.round(w * dpr)) {
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
    }
    const g = cv.getContext('2d'),
        css = getComputedStyle(document.documentElement),
        ink = css.getPropertyValue('--primary').trim() || '#1f4a5e',
        grid = css.getPropertyValue('--line').trim() || '#bfb69c',
        muted = css.getPropertyValue('--muted').trim() || '#56666c'
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)
    let max = 1
    for (const r of H) {
        max = Math.max(max, r[k])
    }
    const nice = Math.pow(10, Math.floor(Math.log10(max))),
        top = Math.ceil(max / nice) * nice
    const X = (i?) => 2 + ((w - 4) * i) / (n - 1),
        Y = (v?) => h - 2 - ((h - 14) * v) / top
    g.strokeStyle = grid
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(0, Math.round(Y(0)) + 0.5)
    g.lineTo(w, Math.round(Y(0)) + 0.5)
    g.stroke()
    g.fillStyle = muted
    g.font = '11px Georgia, serif'
    g.textAlign = 'left'
    g.fillText(String(top), 2, 10)
    g.beginPath()
    for (let i = 0; i < n; i++) {
        const x = X(i),
            y = Y(H[i][k])
        if (i) {
            g.lineTo(x, y)
        } else {
            g.moveTo(x, y)
        }
    }
    g.lineTo(X(n - 1), Y(0))
    g.lineTo(X(0), Y(0))
    g.closePath()
    g.globalAlpha = 0.14
    g.fillStyle = ink
    g.fill()
    g.globalAlpha = 1
    g.beginPath()
    for (let i = 0; i < n; i++) {
        const x = X(i),
            y = Y(H[i][k])
        if (i) {
            g.lineTo(x, y)
        } else {
            g.moveTo(x, y)
        }
    }
    g.strokeStyle = ink
    g.lineWidth = 2
    g.lineJoin = 'round'
    g.stroke()
    const i = hover === undefined ? n - 1 : hover
    g.fillStyle = ink
    g.beginPath()
    g.arc(X(i), Y(H[i][k]), 3, 0, 7)
    g.fill()
    if (hover !== undefined) {
        g.strokeStyle = muted
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(Math.round(X(i)) + 0.5, 12)
        g.lineTo(Math.round(X(i)) + 0.5, h)
        g.stroke()
    }
    const lab = cv.parentNode.querySelector('[data-cv]'),
        ago = (n - 1 - i) * 10
    lab.textContent = H[i][k] + (ago ? ' · ' + fmtTime(ago) + ' ago' : ' now')
}
function drawCharts() {
    document.querySelectorAll<any>('[data-ch]').forEach((cv?) => {
        drawChart(cv, +cv.dataset.ch)
        if (!cv._bound) {
            cv._bound = true
            const at = (e?) => {
                const r = cv.getBoundingClientRect(),
                    n = GV.S.hist.length
                return Math.max(
                    0,
                    Math.min(
                        n - 1,
                        Math.round(
                            ((e.clientX - r.left - 2) / (r.width - 4)) * (n - 1)
                        )
                    )
                )
            }
            cv.addEventListener('pointermove', (e?) =>
                drawChart(cv, +cv.dataset.ch, at(e))
            )
            cv.addEventListener('pointerleave', () =>
                drawChart(cv, +cv.dataset.ch)
            )
        }
    })
}

/* ---------- wiring ---------- */
$('#realmBtn').addEventListener('click', () => openRealm())
$('#realmGo').addEventListener('click', closeRealm)
document.querySelectorAll<HTMLElement>('[data-rtab]').forEach((b?) =>
    b.addEventListener('click', () => {
        GV.realmTab = b.dataset.rtab
        renderRealm()
    })
)
$('#realmBody').addEventListener('click', (e?) => {
    const o = e.target.closest('[data-open]'),
        c = e.target.closest('[data-close]')
    if (o) {
        openRoute(+o.dataset.open)
        renderRealm()
        hud()
    } else if (c) {
        closeRoute(+c.dataset.close)
        renderRealm()
        hud()
    }
})
$('#realmBody').addEventListener('change', (e?) => {
    const s = e.target.closest('[data-rt]')
    if (!s) {
        return
    }
    const rt = GV.S.trade.find((r?) => r.r === +s.dataset.rt)
    if (rt && TRADE_GOODS.includes(s.value)) {
        rt[s.dataset.k] = s.value
        renderRealm()
    }
})
window.addEventListener('keydown', (e?) => {
    if (e.key === 'Escape' && GV.realmOpen) {
        closeRealm()
    }
})
