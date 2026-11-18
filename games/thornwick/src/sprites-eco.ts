/* Sprites for the buildings of the deeper economy, and the trade caravan.
   Composed from the same primitives as the other buildings in sprites.ts. */
import { C, hsh, tw } from './noise'
import {
    LL,
    LR,
    TX,
    blob,
    box,
    cone,
    cyl,
    gable,
    line3,
    plot,
    shadow,
    surf,
} from './sprites'
import { lodgeRecipe } from './sprites-wild'

/* A barrel standing up, with dark hoops. */
function barrel(x?, y?, z0?, r?, h?) {
    cyl(
        x,
        y,
        r,
        z0,
        z0 + h,
        (u?, v?, nu?, nv?, U?, V?) =>
            V === 1 || V === ((h * 2 - 2) | 0)
                ? 0x3a3f47
                : tw(C.wood, U % 3 ? 1 : 0.84),
        TX.flat(tw(C.wood, 1.12))
    )
}
/* A sheep: woolly body, dark head and legs. sn: in winter coat. */
function sheepAt(x?, y?, k?, face?) {
    const wool = (u?, v?) => (hsh(u, v, 160 + k) < 0.25 ? 0xd9d2c0 : 0xf1ece0)
    for (const [a, b] of [
        [-0.7, -0.5],
        [0.7, -0.5],
        [-0.7, 0.5],
        [0.7, 0.5],
    ]) {
        line3([x + a, y + b, 0], [x + a, y + b, 1.2], 0x2a2420, 1)
    }
    blob(x, y, 1.9, 1.6, 1.05, wool)
    blob(x + 1.6 * face, y + 0.3, 2.4, 0.6, 0.55, TX.flat(0x2e2622))
    plot(x + 1.9 * face, y + 0.6, 2.5, 0x1a1412, 1, 0.4)
}
/* A wheel standing in the x-z plane at height r. f turns the spokes. */
function wheel(x?, y?, r?, f?) {
    for (let a = 0; a < 6.283; a += 0.18) {
        plot(x + Math.cos(a) * r, y, r + Math.sin(a) * r, 0x3a2a1c, LL, 0.6)
        plot(
            x + Math.cos(a) * (r - 0.3),
            y,
            r + Math.sin(a) * (r - 0.3),
            0x5a4028,
            LL,
            0.6
        )
    }
    for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3 + (f ? Math.PI / 6 : 0)
        line3(
            [x - Math.cos(a) * r, y, r - Math.sin(a) * r],
            [x + Math.cos(a) * r, y, r + Math.sin(a) * r],
            0x6b4a2a,
            LL
        )
    }
    plot(x, y + 0.1, r, 0x2a2018, LL, 0.8)
}
export function ecoRecipe(t?, o?) {
    if (t === 'lodge') {
        return lodgeRecipe()
    }
    const st = TX.stone(C.stone, 1),
        plank = TX.plank(C.wood, 4),
        plankD = TX.plank(C.woodD, 5),
        f = o.f || 0
    switch (t) {
        case 'ironmine': {
            shadow(-7, -7, 6, 6)
            const rock = TX.stone(0x6f6a64, 170)
            blob(-1.5, -2, 0, 6.2, 7, rock)
            blob(4, -4.5, 0, 2.6, 2.6, TX.speck(0x7c7770, 171))
            box(-2.6, 3.9, 1.6, 4.4, 0, 5, TX.flat(0x0b090c))
            box(-3.2, 4, -2.4, 4.9, 0, 5.6, TX.flat(C.woodD))
            box(1.4, 4, 2.2, 4.9, 0, 5.6, TX.flat(C.woodD))
            box(-3.4, 4, 2.4, 4.9, 5.1, 5.9, TX.hplank(C.wood, 172))
            plot(-0.6, 4.95, 4.6, 0xffd24a, 1, 0.6)
            plot(-0.6, 4.95, 4.2, 0xff8a2a, 1, 0.6)
            line3([-1.2, 4.4, 0.05], [-1.2, 8.5, 0.05], 0x55565a, 1)
            line3([0.2, 4.4, 0.05], [0.2, 8.5, 0.05], 0x55565a, 1)
            box(
                -1.8,
                5.6,
                0.8,
                7.8,
                0.5,
                2.2,
                TX.plank(0x4f4234, 173),
                TX.flat(0x4a3a36)
            )
            for (let k = 0; k < 8; k++) {
                plot(
                    -1.6 + hsh(k, 1, 174) * 2.2,
                    5.8 + hsh(k, 2, 174) * 1.8,
                    2.35,
                    k % 3 ? 0x7a5048 : 0x9a6a52,
                    1,
                    0.6
                )
            }
            // A heap of ore by the door.
            blob(4.5, 4, 0, 2.4, 1.6, (u?, v?) =>
                hsh(u, v, 175) < 0.35 ? 0x8a5a48 : 0x5a4a46
            )
            line3([5.5, -1, 0], [5.5, -1, 8], C.woodD, 1)
            line3([5.5, -1, 8], [2.5, -1, 8], C.woodD, 1)
            line3([2.5, -1, 8], [2.5, -1, 5.5], 0xb8a878, 1)
            break
        }
        case 'sheep': {
            const sn = !!o.sn
            surf(
                [-7.5, -7.5, 0],
                [1, 0, 0],
                [0, 1, 0],
                31,
                31,
                (u?, v?, nu?, nv?, U?, V?) => {
                    const h = hsh(U, V, 176)
                    return sn
                        ? h < 0.2
                            ? 0xd3dde6
                            : 0xe6edf2
                        : tw(0x6a9a46, h < 0.18 ? 0.86 : h > 0.93 ? 1.12 : 1)
                },
                1
            )
            const post = TX.flat(C.woodD)
            for (let k = -7.5; k <= 23.5; k += 5.15) {
                box(k - 0.4, 22.9, k + 0.4, 23.7, 0, 3.5, post)
                box(22.9, k - 0.4, 23.7, k + 0.4, 0, 3.5, post)
                box(k - 0.4, -7.9, k + 0.4, -7.1, 0, 3.5, post)
                box(-7.9, k - 0.4, -7.1, k + 0.4, 0, 3.5, post)
            }
            for (const z of [1.4, 2.8]) {
                line3([-7.5, 23.3, z], [23.5, 23.3, z], C.wood, LL)
                line3([23.3, -7.5, z], [23.3, 23.5, z], C.wood, LR)
                line3([-7.5, -7.5, z], [23.5, -7.5, z], C.woodD, LL)
                line3([-7.5, -7.5, z], [-7.5, 23.5, z], C.woodD, LR)
            }
            // A shed for the shepherd and the shearing.
            const b = box(-6.5, -6.5, 3, 2, 0, 6, plank)
            b.L(2.5, 0, 3, 5, TX.door(3, 5))
            b.R(2.5, 2, 3, 3, TX.win(0))
            gable(
                -7.5,
                -7.5,
                4,
                3,
                5.5,
                5,
                TX.thatch(C.thatch, 177),
                plankD,
                'x',
                1
            )
            box(4.5, -5.5, 7.5, -2.5, 0, 2.6, TX.speck(0xe9e2cf, 178))
            const flock = [
                [9, 3, 1],
                [15, -1, -1],
                [18, 8, 1],
                [7, 12, -1],
                [13, 16, 1],
                [19, 17, -1],
                [2, 18, 1],
            ]
            flock.forEach(([x, y, fc], k) => sheepAt(x, y, k, fc))
            break
        }
        case 'weaver': {
            shadow(-6, -6, 6, 6)
            const b = box(-6, -6, 4, 4, 0, 8, TX.timber(C.plas, C.beam, 180))
            b.L(6, 0, 3, 6, TX.door(3, 6))
            b.L(1.5, 4, 3, 3, TX.win(1))
            b.R(5, 4, 3, 3, TX.win(1))
            gable(
                -7.2,
                -7.2,
                5.2,
                5.2,
                7.5,
                7,
                TX.shingle(C.clay, 181),
                TX.speck(C.plas, 182),
                'y',
                1.2
            )
            // A drying rack with lengths of dyed cloth.
            line3([5.5, -5, 0], [5.5, -5, 8], C.woodD, 1)
            line3([5.5, 5.5, 0], [5.5, 5.5, 8], C.woodD, 1)
            line3([5.5, -5, 7.8], [5.5, 5.5, 7.8], C.wood, LR)
            const cols = [C.madder, C.woad, 0xd9a521]
            cols.forEach((c, k) => {
                const y0 = -4 + k * 3.2
                surf(
                    [5.6, y0 + 2.4, 2.5],
                    [0, -1, 0],
                    [0, 0, 1],
                    2.4,
                    5.2,
                    (u?, v?, nu?, nv?, U?, V?) =>
                        tw(c, V % 4 === 0 ? 0.82 : U % 2 ? 1 : 1.08),
                    LR,
                    0.5
                )
            })
            box(-4.5, 4.6, -1.5, 7.2, 0, 2.2, TX.speck(0xeee6d2, 183))
            break
        }
        case 'bakery': {
            shadow(-6.5, -6.5, 6.5, 6.5)
            const b = box(-6, -6, 3.5, 4, 0, 4, st)
            const up = box(-6, -6, 3.5, 4, 4, 9, TX.timber(C.plas, C.beam, 184))
            b.L(5.5, 0, 3, 4, TX.door(3, 6))
            up.L(1.5, 1.5, 3, 3, TX.win(1))
            up.R(4, 1.5, 3, 3, TX.win(1))
            gable(
                -7,
                -7,
                4.5,
                5,
                8.6,
                6.5,
                TX.shingle(C.clay, 185),
                TX.speck(C.plas, 186),
                'x',
                1.2
            )
            box(-4.5, -5, -2, -2.5, 9, 17.5, TX.brick(C.brick, 187))
            // The bread oven, a brick dome with a glowing mouth.
            blob(5.5, 0, 0, 2.6, 3.4, TX.brick(0xa05a3e, 188))
            surf(
                [7.95, 0.9, 0.3],
                [0, -1, 0],
                [0, 0, 1],
                1.8,
                1.6,
                (u?, v?, nu?, nv?, U?, V?) =>
                    V < 1 ? 0xff8a2a : U === 1 || U === 2 ? 0xffd24a : 0xc8501e,
                LR,
                0.6
            )
            box(-3.5, 5.2, 1.5, 7.4, 0, 2.6, TX.plank(0x9a7448, 189))
            for (let k = 0; k < 4; k++) {
                blob(-2.6 + k * 1.25, 6.3, 2.95, 0.55, 0.38, TX.flat(0xc98a3c))
            }
            break
        }
        case 'brewery': {
            shadow(-7, -7, 6.5, 6.5)
            const b = box(-6.5, -6.5, 3.5, 3.5, 0, 10, plank)
            b.L(5.5, 0, 3, 6, TX.door(3, 6))
            b.L(1.5, 6, 2.5, 2.5, TX.win(1))
            b.R(3, 5, 3, 3, TX.win(0))
            gable(
                -7.5,
                -7.5,
                4.5,
                4.5,
                9.6,
                6,
                TX.shingle(0x7a5a3a, 190),
                plankD,
                'y',
                1
            )
            // A hood over the brewing copper.
            box(-4.2, -4.2, -1.8, -1.8, 13, 17, TX.plank(0x6b4f34, 191))
            gable(-5, -5, -1, -1, 17, 2, TX.shingle(0x7a5a3a, 192), null, 'x')
            barrel(5.5, 4.5, 0, 1.4, 3)
            barrel(5.5, 1.2, 0, 1.4, 3)
            barrel(2.2, 5.8, 0, 1.4, 3)
            barrel(5.5, 2.9, 3, 1.4, 3)
            line3([7.2, -5, 0], [7.2, -5, 9], 0x5f7a3a, 1)
            for (let z = 2; z < 9; z += 1.5) {
                plot(7.4, -5, z, 0x8ab04a, 1, 0.4)
            }
            break
        }
        case 'scriptorium': {
            shadow(-6.5, -7, 6.5, 6.5)
            const pale = TX.stone(C.pale, 193)
            const b = box(-6, -4, 4.5, 5, 0, 10, pale)
            b.L(4, 0, 3, 6.5, TX.door(3, 7))
            b.L(1, 4, 2, 4.5, TX.win(1))
            b.L(8, 4, 2, 4.5, TX.win(1))
            b.R(2, 4, 2, 4.5, TX.win(1))
            b.R(6, 4, 2, 4.5, TX.win(0))
            gable(
                -7,
                -5,
                5.5,
                6,
                9.6,
                7,
                TX.shingle(C.slate, 194),
                pale,
                'x',
                1
            )
            // A round stair turret with a pointed roof.
            cyl(-4, -5.5, 2.4, 0, 18, TX.stone(C.stone2, 195))
            surf(
                [-4.6, -3.05, 12],
                [1, 0, 0],
                [0, 0, 1],
                1.2,
                2.4,
                TX.win(1),
                LL,
                0.6
            )
            cone(-4, -5.5, 3, 18, 8, TX.shingle(C.slate, 196))
            line3([-4, -5.5, 26], [-4, -5.5, 29], C.gold, 1)
            // A lectern and a stack of books outside.
            box(5.2, -2, 7.4, 0.2, 0, 2.4, TX.flat(0x7a2a24), TX.flat(0xe8dcc0))
            box(5.4, 2, 6.8, 3.4, 0, 1.2, TX.flat(C.woad), TX.flat(0xe8dcc0))
            box(
                5.6,
                2.2,
                6.6,
                3.2,
                1.2,
                2,
                TX.flat(C.madder),
                TX.flat(0xe8dcc0)
            )
            break
        }
        case 'caravan': {
            // A covered wagon pulled by a horse, facing +x (or -x when o.v).
            const s = o.v ? -1 : 1
            shadow(-6, -3, 6, 3)
            for (const x of [-3.2, 3.2]) {
                wheel(x, -2.6, 1.6, f)
                wheel(x, 2.7, 1.6, f)
            }
            box(-4.8, -2.2, 4.8, 2.2, 1.6, 3, TX.plank(C.wood, 197))
            gable(
                -4.4,
                -2.6,
                4.4,
                2.6,
                3,
                4.2,
                (u?, v?, nu?, nv?, U?, V?) =>
                    tw(
                        0xe8dcc0,
                        V % 6 === 0 ? 0.84 : hsh(U, V, 198) < 0.1 ? 0.94 : 1
                    ),
                TX.speck(0xd8ccae, 199),
                'x',
                0.3
            )
            // Bales and a barrel peeking out at the back.
            box(
                -5.6 * s - 0.6,
                -1.2,
                -5.6 * s + 0.6,
                1.2,
                3,
                4.2,
                TX.speck(C.madder, 200)
            )
            // The horse.
            const hx = 7.6 * s,
                hc = 0x6a4a32
            line3([4.8 * s, -0.6, 2.6], [hx - 2.2 * s, -0.6, 3.6], C.woodD, 1)
            line3([4.8 * s, 0.6, 2.6], [hx - 2.2 * s, 0.6, 3.6], C.woodD, 1)
            for (const [a, b2] of [
                [-1.4, -0.5],
                [-1.4, 0.5],
                [1.4, -0.5],
                [1.4, 0.5],
            ]) {
                const lift = f && a * b2 > 0 ? 0.5 : 0
                line3(
                    [hx + a * s, b2, lift],
                    [hx + a * s, b2, 2.8],
                    tw(hc, 0.7),
                    1
                )
            }
            blob(hx, 0, 3.6, 2.2, 1.2, TX.flat(hc))
            blob(hx + 2.4 * s, 0, 5.4, 0.7, 1.2, TX.flat(hc))
            blob(hx + 3 * s, 0, 5.6, 0.75, 0.55, TX.flat(tw(hc, 0.9)))
            line3([hx + 1.6 * s, 0, 5], [hx + 1.9 * s, 0, 6.2], 0x2a1e16, 1)
            line3([hx - 2.2 * s, 0, 3.8], [hx - 2.8 * s, 0, 2], 0x2a1e16, 1)
            break
        }
    }
}
export const ECO_SPRITES = {
    ironmine: 1,
    sheep: 1,
    weaver: 1,
    bakery: 1,
    brewery: 1,
    scriptorium: 1,
    caravan: 1,
    lodge: 1,
}
