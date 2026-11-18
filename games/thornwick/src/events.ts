import { HOME, KX, KY, N } from './config'
import { afford, cap, compass, flam, pay, pop, toast } from './helpers'
import { lookAt } from './input'
import { ignite, setTerr } from './lords'
import { addSoldier, spawnVillager } from './people'
import { addB, bmap, reg, season, terrain } from './state'
import { GV } from './vars'

export const EVENTS = {
    merchant() {
        const want = GV.S.res.stone < GV.S.res.wood ? 'stone' : 'wood'
        return {
            title: 'A travelling merchant',
            text: 'A trader has pulled his cart up to the gate and lays out his goods.',
            opts: [
                {
                    label: 'Buy 60 ' + want,
                    cost: { gold: 40 },
                    act() {
                        GV.S.res[want] += 60
                        toast('The merchant unloads 60 ' + want + '.')
                    },
                },
                {
                    label: 'Buy 10 weapons',
                    cost: { gold: 45 },
                    act() {
                        GV.S.res.weapons += 10
                        toast('The merchant unloads 10 weapons.')
                    },
                },
                {
                    label: 'Sell 80 food',
                    cost: { food: 80 },
                    act() {
                        GV.S.res.gold += 35
                        toast('The merchant pays 35 gold for the food.')
                    },
                },
                { label: 'Send him on' },
            ],
        }
    },
    mercs() {
        const g = 70 + 8 * GV.S.wave
        return {
            title: 'Swords for hire',
            text: 'Three hard-eyed swordsmen offer to fight under your banner.',
            opts: [
                {
                    label: 'Hire them',
                    cost: { gold: g },
                    act() {
                        for (let i = 0; i < 3; i++) {
                            addSoldier(
                                GV.keep,
                                KX + 0.5 + i * 0.3,
                                KY + 2.6,
                                'sword'
                            )
                        }
                        toast('Three mercenaries join your garrison.')
                    },
                },
                { label: 'Turn them away' },
            ],
        }
    },
    plague() {
        if (GV.S.vill.length < 8) {
            return null
        }
        if (
            GV.S.b.some((b?) => b.t === 'chapel' && b.o === 0) ||
            GV.S.tech.herbal
        ) {
            toast(
                'Fever is going round the valley, but the care of your ' +
                    (GV.S.tech.herbal ? 'herbalists' : 'chapel') +
                    ' spares the village.'
            )
            return null
        }
        const lose = () => {
            for (let i = 0; i < 2 && GV.S.vill.length > 2; i++) {
                GV.S.vill.pop()
            }
            toast('The fever takes two villagers before it passes.')
        }
        return {
            title: 'Fever in the village',
            text: 'Several villagers have taken ill. A healer is passing through and names her price.',
            expire: lose,
            opts: [
                {
                    label: 'Pay the healer',
                    cost: { gold: 30 },
                    act() {
                        toast('The healer tends the sick and the fever breaks.')
                    },
                },
                { label: 'Let it pass', act: lose },
            ],
        }
    },
    bandits() {
        const cand = GV.regs.filter(
            (rg?) => rg.disc && rg.owner <= 0 && rg.id !== HOME
        )
        if (!cand.length || GV.S.b.some((b?) => b.t === 'camp')) {
            return null
        }
        const rg = cand[(Math.random() * cand.length) | 0]
        for (let k = 0; k < 30; k++) {
            const x = Math.round(rg.sx + (Math.random() - 0.5) * 8),
                y = Math.round(rg.sy + (Math.random() - 0.5) * 8)
            if (
                x < 2 ||
                y < 2 ||
                x > N - 3 ||
                y > N - 3 ||
                reg[x + y * N] !== rg.id ||
                bmap[x + y * N] ||
                terrain[x + y * N] >= 3 ||
                Math.hypot(x - KX, y - KY) < 9
            ) {
                continue
            }
            if (terrain[x + y * N]) {
                setTerr(x, y, 0, true)
            }
            const b = addB('camp', x, y, false, 9)
            b.cd = 25
            return {
                title: 'Bandits in the wild',
                text:
                    'Outlaws have pitched a camp to the ' +
                    compass(x - KX, y - KY) +
                    '. They will raid your village until the camp is burned out.',
                opts: [
                    {
                        label: 'Show me',
                        act() {
                            lookAt(x, y)
                        },
                    },
                    { label: 'Noted' },
                ],
            }
        }
        return null
    },
    truce() {
        const rv = GV.S.riv.filter(
            (r?) => r.awake && !r.dead && r.truce <= 0 && !r.out
        )[0]
        if (!rv) {
            return null
        }
        const g = 40 + 25 * rv.tier
        return {
            title: 'An envoy from ' + rv.name,
            text: '"Pay tribute, and my lord will stay his hand for a season."',
            expire() {
                rv.atkIn = Math.min(rv.atkIn, 40)
            },
            opts: [
                {
                    label: 'Pay tribute',
                    cost: { gold: g },
                    act() {
                        rv.truce = 240
                        toast(rv.name + ' agrees to four minutes of peace.')
                    },
                },
                {
                    label: 'Refuse',
                    act() {
                        rv.atkIn = Math.min(rv.atkIn, 40)
                        toast(
                            'The envoy leaves in anger. ' +
                                rv.name +
                                ' will come sooner.'
                        )
                    },
                },
            ],
        }
    },
    settlers() {
        if (pop() + 3 > cap()) {
            return null
        }
        for (let i = 0; i < 3; i++) {
            spawnVillager(false)
        }
        toast(
            'A family of settlers has heard of Thornwick and joins the village.'
        )
        return null
    },
    lightning() {
        if (season() === 3) {
            return null
        }
        const c = GV.S.b.filter((b?) => b.o === 0 && flam(b) && b !== GV.keep)
        if (!c.length) {
            return null
        }
        ignite(c[(Math.random() * c.length) | 0])
        toast('A summer storm. Lightning has set a roof alight.')
        return null
    },
    harvest() {
        if (
            season() !== 2 ||
            !GV.S.b.some((b?) => b.t === 'farm' && b.o === 0)
        ) {
            return null
        }
        GV.S.res.food += 50
        toast('A fine harvest. The barns take in 50 extra food.')
        return null
    },
}
export function startEvent() {
    const ids = [
        'merchant',
        'merchant',
        'mercs',
        'plague',
        'bandits',
        'truce',
        'settlers',
        'lightning',
        'harvest',
    ]
    for (let k = 0; k < 4; k++) {
        const ev = EVENTS[ids[(Math.random() * ids.length) | 0]]()
        if (ev) {
            ev.ttl = ev.max = 45
            GV.S.ev = ev
            GV.lastEvent = ''
            return
        }
        if (k === 0) {
            return
        }
    }
}
export function pickEvent(i?) {
    const ev = GV.S.ev
    if (!ev) {
        return
    }
    const o = ev.opts[i]
    if (!o) {
        return
    }
    if (o.cost) {
        if (!afford(o.cost)) {
            toast('You cannot afford that.')
            return
        }
        pay(o.cost)
    }
    GV.S.ev = null
    if (o.act) {
        o.act()
    }
}
