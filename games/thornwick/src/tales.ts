/* Stories of the living world: new random events with choices that matter.
   events.ts picks them next to its own; delayed results live in S.wld.later. */
import { KX, KY } from './config'
import { cap, compass, flam, pop, puff, toast } from './helpers'
import { ignite } from './lords'
import { addSoldier, spawnVillager } from './people'
import { rivById, season } from './state'
import { GV } from './vars'
import { startWeather, wxIs } from './weather'

const W = () => GV.S.wld
const knownLords = () =>
    GV.S.riv.filter(
        (r?) => !r.dead && r.keepB && !r.keepB.dead && GV.regs[r.r].disc
    )
const pickOne = (a?) => a[(Math.random() * a.length) | 0]
/** Villagers are merrier (or gloomier) for a while: added to their needs. */
export function cheer(amt?, secs?) {
    const w = W()
    if (amt >= 0) {
        w.joy = Math.max(w.joyT > 0 ? w.joy : 0, amt)
        w.joyT = Math.max(w.joyT, secs)
    } else {
        w.gloom = Math.max(w.gloomT > 0 ? w.gloom : 0, -amt)
        w.gloomT = Math.max(w.gloomT, secs)
    }
}
function settlers(n?) {
    let k = 0
    for (; k < n && pop() < cap(); k++) {
        spawnVillager(false)
    }
    return k
}
const later = (secs?, k?, id?) => W().later.push({ t: GV.S.t + secs, k, id })

export const TALES = {
    heir() {
        const rv = pickOne(knownLords().filter((r?) => r.truce <= 0))
        if (!rv) {
            return null
        }
        return {
            title: 'An heir in flight',
            text:
                'A young heir of ' +
                rv.name +
                ' has fled a quarrel at court and begs for shelter at your gate.',
            opts: [
                {
                    label: 'Shelter him',
                    cost: { food: 20 },
                    act() {
                        rv.atkIn = Math.min(rv.atkIn, 70)
                        rv.nextFoe = 0
                        later(240, 'heir', rv.id)
                        toast(
                            'The heir stays at Thornwick. ' +
                                rv.name +
                                ' is angry and will march on you sooner.'
                        )
                    },
                },
                {
                    label: 'Send him back',
                    act() {
                        rv.truce = Math.max(rv.truce, 300)
                        GV.S.res.gold += 40
                        toast(
                            rv.name +
                                ' pays 40 gold for the heir and agrees to five minutes of peace.'
                        )
                    },
                },
                { label: 'Turn him away' },
            ],
        }
    },
    comet() {
        const ch = GV.S.b.some((b?) => b.o === 0 && b.t === 'chapel')
        return {
            title: 'A comet in the sky',
            text: 'A star with a burning tail hangs over the valley at night. The village whispers of omens.',
            expire() {
                cheer(-0.1, 120)
            },
            opts: [
                {
                    label: 'Hold a feast',
                    cost: { food: 40 },
                    act() {
                        cheer(0.12, 150)
                        toast(
                            'The village feasts under the comet. People are merrier for a while.'
                        )
                    },
                },
                {
                    label: ch ? 'Ask the chapel' : 'Ask a wandering priest',
                    cost: { gold: 25 },
                    act() {
                        W().bountyT = Math.max(W().bountyT, 150)
                        toast(
                            'The priest names the comet a sign of plenty. The farmers take heart: harvests are a third richer for a while.'
                        )
                    },
                },
                {
                    label: 'Pay it no heed',
                    act() {
                        cheer(-0.1, 120)
                        toast(
                            'Fear of the omen spreads. The villagers are glum for a while.'
                        )
                    },
                },
            ],
        }
    },
    revolt() {
        const rv = pickOne(knownLords().filter((r?) => r.awake))
        if (!rv) {
            return null
        }
        return {
            title: 'Revolt in a rival land',
            text:
                'The peasants of ' +
                rv.name +
                ' have risen against heavy taxes. Both sides would welcome a friend.',
            opts: [
                {
                    label: 'Arm the rebels',
                    cost: { gold: 50, weapons: 5 },
                    act() {
                        rv.wealth = Math.max(0, rv.wealth - 250)
                        if (!rv.out) {
                            rv.atkIn += 150
                        }
                        toast(
                            'The revolt drags on. ' +
                                rv.name +
                                ' loses gold and has no men to spare for a while.'
                        )
                    },
                },
                {
                    label: 'Help the lord',
                    cost: { gold: 30 },
                    act() {
                        rv.truce = Math.max(rv.truce, 360)
                        toast(
                            rv.name +
                                ' puts down the revolt and agrees to six minutes of peace.'
                        )
                    },
                },
                {
                    label: 'Stay out of it',
                    act() {
                        rv.wealth = Math.max(0, rv.wealth - 100)
                    },
                },
            ],
        }
    },
    bounty() {
        const se = season()
        if (
            (se !== 0 && se !== 1) ||
            !GV.S.b.some((b?) => b.o === 0 && b.t === 'farm') ||
            wxIs('drought')
        ) {
            return null
        }
        return {
            title: 'A bountiful season',
            text: 'Sun and rain have come at the right times. The fields stand thick and golden.',
            opts: [
                {
                    label: 'Bring in every hand',
                    act() {
                        W().bountyT = Math.max(W().bountyT, 150)
                        toast(
                            'Everyone helps in the fields. Harvests are a third richer for a while.'
                        )
                    },
                },
                {
                    label: 'Hold a harvest fair',
                    cost: { food: 30 },
                    act() {
                        cheer(0.12, 120)
                        GV.S.res.gold += 30
                        toast(
                            'Traders come to the harvest fair and leave 30 gold. The villagers are merrier for a while.'
                        )
                    },
                },
            ],
        }
    },
    healer() {
        const herbs = !GV.S.tech.herbal,
            opts: any[] = [
                {
                    label: 'Tend the wounded',
                    cost: { gold: 20 },
                    act() {
                        for (const s of GV.S.sold) {
                            s.hp = s.max
                        }
                        toast(
                            'The healer tends your soldiers. Every wound is closed.'
                        )
                    },
                },
            ]
        if (herbs) {
            opts.push({
                label: 'Buy her herb lore',
                cost: { gold: 70 },
                act() {
                    GV.S.tech.herbal = 1
                    if (GV.S.rs && GV.S.rs.id === 'herbal') {
                        GV.S.rs = null
                    }
                    toast(
                        'You learn herbal lore from the healer. Fires burn out faster, and fever passes the village by.'
                    )
                },
            })
        } else {
            opts.push({
                label: 'Ask her to settle',
                cost: { gold: 30 },
                act() {
                    const n = settlers(2)
                    toast(
                        n
                            ? 'The healer and her family settle in Thornwick.'
                            : 'The healer would stay, but there is no free home for her.'
                    )
                },
            })
        }
        opts.push({ label: 'Send her on' })
        return {
            title: 'A travelling healer',
            text: 'A woman with a satchel of herbs and a cart of jars asks for a night by the fire.',
            opts,
        }
    },
    wedding() {
        if (GV.S.vill.length < 6) {
            return null
        }
        return {
            title: 'A wedding in the village',
            text: 'Two of your villagers are to marry. They hope their lord will bless the day.',
            expire() {
                cheer(-0.05, 60)
            },
            opts: [
                {
                    label: 'Pay for a feast',
                    cost: { food: 30, gold: 15 },
                    act() {
                        cheer(0.15, 150)
                        const n = settlers(2)
                        toast(
                            'The whole village dances at the wedding.' +
                                (n
                                    ? ' Relatives come for the feast and stay on.'
                                    : '')
                        )
                    },
                },
                {
                    label: 'Send a small gift',
                    cost: { gold: 10 },
                    act() {
                        cheer(0.06, 90)
                    },
                },
                {
                    label: 'No feast this time',
                    act() {
                        cheer(-0.05, 60)
                    },
                },
            ],
        }
    },
    rivalFire() {
        const rv = pickOne(
            knownLords().filter((r?) =>
                GV.S.b.some((b?) => b.o === r.id && flam(b) && !(b.fire > 0))
            )
        )
        if (!rv) {
            return null
        }
        const c = GV.S.b.filter((b?) => b.o === rv.id && flam(b))
        for (let k = 0; k < 3 && c.length; k++) {
            ignite(c.splice((Math.random() * c.length) | 0, 1)[0])
        }
        return {
            title: 'Fire in a rival town',
            text:
                'Smoke rises to the ' +
                compass(rv.kx - KX, rv.ky - KY) +
                ': a fire is raging through the town of ' +
                rv.name +
                '.',
            opts: [
                {
                    label: 'Send wood and hands',
                    cost: { wood: 40 },
                    act() {
                        rv.truce = Math.max(rv.truce, 300)
                        for (const b of GV.S.b) {
                            if (b.o === rv.id) {
                                b.fire = 0
                            }
                        }
                        toast(
                            'Your people help put out the fire. ' +
                                rv.name +
                                ' is grateful and keeps the peace for five minutes.'
                        )
                    },
                },
                {
                    label: 'Raid while they burn',
                    act() {
                        const g = 40 + 15 * rv.tier
                        GV.S.res.gold += g
                        rv.wealth = Math.max(0, rv.wealth - g * 2)
                        rv.atkIn = Math.min(rv.atkIn, 60)
                        rv.nextFoe = 0
                        toast(
                            'Your riders carry off ' +
                                g +
                                ' gold in the smoke. ' +
                                rv.name +
                                ' swears revenge and will come sooner.'
                        )
                    },
                },
                { label: 'Watch from afar' },
            ],
        }
    },
    /* The old lightning event now brings a storm, which may strike a roof. */
    lightning() {
        if (season() !== 3 && wxIs('clear')) {
            startWeather('storm')
        }
        return null
    },
}
/** Results that come later: the sheltered heir repays you. */
export function talesTick() {
    const w = W()
    for (const q of w.later.slice()) {
        if (GV.S.t < q.t) {
            continue
        }
        w.later.splice(w.later.indexOf(q), 1)
        if (q.k === 'heir') {
            const rv = rivById(q.id)
            if (rv && !rv.dead) {
                GV.S.res.gold += 100
                addSoldier(GV.keep, KX + 0.5, KY + 2.6, 'knight')
                toast(
                    'Friends of the heir you sheltered send 100 gold, and a knight rides in to serve you.'
                )
            } else {
                GV.S.res.gold += 150
                toast(
                    'The heir you sheltered thanks you with 150 gold before he leaves to rebuild his house.'
                )
            }
            puff(KX + 0.5, KY + 2, 6, '#e8c45a')
        }
    }
}
