/*
 * What makes each realm its own and how its story is told:
 * - Boons: at the start of a realm you choose one gift out of three.
 * - The chronicle: the great moments of the realm, with the day they came.
 * - Renown: a score for the realm, shown with the chronicle at the end.
 */
import { $, DAYLEN, DIFF_KEY, KX, KY, SEASONLEN, SEASONS } from './config'
import { pop, puff } from './helpers'
import { GV } from './vars'

export type Boon = { id: string; name: string; text: string }

/* Each boon is checked where its rule lives: GV.S.boon === id. */
export const BOONS: Boon[] = [
    {
        id: 'fertile',
        name: 'Fertile valley',
        text: 'Farms harvest a fifth more.',
    },
    {
        id: 'iron',
        name: 'Iron hills',
        text: 'Iron mines dig 1 more ore each trip, and you start with 10 tools.',
    },
    {
        id: 'hands',
        name: 'Many hands',
        text: 'New villagers come a quarter faster.',
    },
    {
        id: 'masons',
        name: "Masons' guild",
        text: 'Walls, towers and gatehouses take a sixth less damage.',
    },
    {
        id: 'merchants',
        name: 'Market town',
        text: 'Markets earn a third more gold.',
    },
    {
        id: 'warriors',
        name: 'Warrior blood',
        text: 'Soldiers have a fifth more health.',
    },
    {
        id: 'treasury',
        name: 'Old treasury',
        text: 'Start with 150 more gold, 100 more stone and 100 more wood.',
    },
]
export const boonOf = (id?: string) => BOONS.find((b) => b.id === id) || null

/* ---------- the chronicle ---------- */
function when(t: number) {
    return (
        'Day ' +
        (((t / DAYLEN) | 0) + 1) +
        ', ' +
        SEASONS[((t / SEASONLEN) | 0) % 4].toLowerCase()
    )
}
export function chron(text: string) {
    if (!GV.S) {
        return
    }
    GV.S.chron = GV.S.chron || []
    GV.S.chron.push({ t: GV.S.t, text })
}
GV.chron = chron

/* Milestones that no single event marks: the size of the village and of the land. */
const POP_MARKS = [25, 50, 100],
    LAND_MARKS = [3, 6, 10, 15]
export function chronTick() {
    const S = GV.S
    if (!S || S.over || !S.boon) {
        return
    }
    S.marks = S.marks || {}
    const p = pop()
    for (const m of POP_MARKS) {
        if (p >= m && !S.marks['p' + m]) {
            S.marks['p' + m] = 1
            chron(m + ' people now lived in Thornwick.')
        }
    }
    const lands = GV.regs.reduce((n, rg) => n + (rg.owner === 0 ? 1 : 0), 0)
    for (const m of LAND_MARKS) {
        if (lands >= m && !S.marks['l' + m]) {
            S.marks['l' + m] = 1
            chron('The banner of Thornwick flew over ' + m + ' lands.')
        }
    }
}

/* ---------- renown ---------- */
const DIFF_MUL = [0.6, 0.8, 1, 1.25, 1.5]
export function renown() {
    const S = GV.S
    if (!S) {
        return 0
    }
    const deeds = Object.keys(S.deeds || {}).length,
        lands = GV.regs.reduce((n, rg) => n + (rg.owner === 0 ? 1 : 0), 0),
        cath = S.b.find((b) => b.o === 0 && b.t === 'cathedral' && !b.dead),
        raw =
            20 * deeds +
            15 * S.wave +
            100 * (S.taken || 0) +
            10 * lands +
            Math.floor(pop() / 2) +
            40 * ((GV.keep ? GV.keep.lvl : 1) - 1) +
            60 * (cath ? cath.stage || 0 : 0) +
            (S.won ? 300 : 0)
    return Math.round(raw * (DIFF_MUL[S.diff] ?? 1))
}
const BEST_KEY = DIFF_KEY + '.best'
function bestRenown(now: number) {
    let best = 0
    try {
        best = +(localStorage.getItem(BEST_KEY) || 0)
        if (now > best) {
            localStorage.setItem(BEST_KEY, String(now))
        }
    } catch {
        // storage can be blocked (private mode); the score still shows
    }
    return best
}

export function chronicleHTML(final?: boolean) {
    const S = GV.S,
        list = (S && S.chron) || [],
        r = renown(),
        best = final ? bestRenown(r) : 0,
        b = boonOf(S && S.boon)
    return (
        '<p class="renown"><b>Renown ' +
        r.toLocaleString('en') +
        '</b>' +
        (final
            ? best && best >= r
                ? '<span class="note"> Your best: ' +
                  best.toLocaleString('en') +
                  '</span>'
                : best
                  ? '<span class="note"> A new best! Before: ' +
                    best.toLocaleString('en') +
                    '</span>'
                  : ''
            : '<span class="note"> so far</span>') +
        '</p>' +
        (b
            ? '<p class="note">Boon of the realm: ' +
              b.name.toLowerCase() +
              '.</p>'
            : '') +
        '<ol class="chron">' +
        (list.length
            ? list
                  .map(
                      (e) =>
                          '<li><time>' +
                          when(e.t) +
                          '</time><span>' +
                          e.text +
                          '</span></li>'
                  )
                  .join('')
            : '<li class="empty">Nothing is written yet.</li>') +
        '</ol>'
    )
}
/* The chronicle under the last words of a realm. */
GV.renderChronicle = () => {
    const el = $('#overChron')
    if (el) {
        el.innerHTML =
            '<h3>The chronicle of Thornwick</h3>' + chronicleHTML(true)
    }
}

/* ---------- choosing a boon ---------- */
GV.boonOpen = false
export function showBoons() {
    const S = GV.S
    if (!S || S.boon) {
        return
    }
    // Three different boons, drawn at random for this realm.
    const pool = BOONS.slice()
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    const pick = pool.slice(0, 3)
    $('#boonCards').innerHTML = pick
        .map(
            (b) =>
                '<button class="boon" type="button" data-boon="' +
                b.id +
                '"><b>' +
                b.name +
                '</b><span>' +
                b.text +
                '</span></button>'
        )
        .join('')
    GV.boonOpen = true
    $('#boon').hidden = false
    ;($('#boonCards').querySelector('button') as HTMLElement)?.focus()
}
export function applyBoon(id: string) {
    const S = GV.S,
        b = boonOf(id)
    if (!S || !b) {
        return
    }
    S.boon = id
    if (id === 'iron') {
        S.res.tools = (S.res.tools || 0) + 10
    } else if (id === 'treasury') {
        S.res.gold += 150
        S.res.stone += 100
        S.res.wood += 100
    }
    chron('Thornwick was founded, blessed with ' + b.name.toLowerCase() + '.')
    puff(KX + 0.5, KY + 0.5, 12, '#e0b23a')
    GV.boonOpen = false
    $('#boon').hidden = true
    GV.hud?.()
}
$('#boonCards').addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('[data-boon]')
    if (c) {
        applyBoon(c.dataset.boon)
    }
})
