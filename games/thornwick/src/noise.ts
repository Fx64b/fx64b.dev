export function mulberry(a?) {
    return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
export function hsh(x?, y?, s?) {
    let h =
        (Math.imul(x | 0, 374761393) +
            Math.imul(y | 0, 668265263) +
            Math.imul((s | 0) + 7, 1274126177)) |
        0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
export function vnoise(x?, y?, s?) {
    const xi = Math.floor(x),
        yi = Math.floor(y)
    let fx = x - xi,
        fy = y - yi
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    const a = hsh(xi, yi, s),
        b = hsh(xi + 1, yi, s),
        c = hsh(xi, yi + 1, s),
        d = hsh(xi + 1, yi + 1, s)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
export const tw = (c?, f?) =>
    (Math.min(255, ((c >> 16) & 255) * f) << 16) |
    (Math.min(255, ((c >> 8) & 255) * f) << 8) |
    Math.min(255, (c & 255) * f) |
    0
export const mix = (a?, b?, t?) =>
    ((((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t) << 16) |
    ((((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t) << 8) |
    (((a & 255) * (1 - t) + (b & 255) * t) | 0)
export const C = {
    stone: 0x9d9b92,
    stone2: 0x7f8083,
    pale: 0xbdb9ab,
    plas: 0xdccdaa,
    beam: 0x45301f,
    wood: 0x86603a,
    woodD: 0x5f4128,
    bark: 0x4f3b2a,
    thatch: 0xbf9545,
    clay: 0xa24a33,
    slate: 0x47606f,
    woad: 0x2a587a,
    gold: 0xdcae3a,
    madder: 0x9e3129,
    brick: 0x8a4f3e,
    dark: 0x1d2029,
    straw: 0xcdb060,
    leaf: 0x37763c,
    leaf2: 0x4f8a3a,
    pine: 0x255c40,
    water: 0x34769a,
}
export function grade(r?, g?, b?) {
    const L = 0.3 * r + 0.59 * g + 0.11 * b
    return [
        (r * 0.86 + L * 0.14) * 0.9,
        (g * 0.86 + L * 0.14) * 0.91,
        (b * 0.86 + L * 0.14) * 0.98,
    ]
}
