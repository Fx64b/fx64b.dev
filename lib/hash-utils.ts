/**
 * MD5 implementation per RFC 1321.
 *
 * The T table is derived from the formula T[i] = floor(abs(sin(i+1)) × 2^32),
 * as defined in RFC 1321 §3.4. Using Math.sin avoids hardcoding 64 opaque
 * integer constants.
 *
 * The per-round left-rotation shift amounts (S) are also from RFC 1321 §3.4.
 *
 * Initial state A=0x67452301 B=0xEFCDAB89 C=0x98BADCFE D=0x10325476
 * comes from RFC 1321 §3.3 (magic constants whose hex digits spell out
 * patterns used historically to verify correct parsing).
 */

// T[i] = floor(abs(sin(i+1)) × 2^32) cast to signed 32-bit integer
const MD5_T = Array.from({ length: 64 }, (_, i) =>
    Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) | 0
)

// Per-round left-rotation shift amounts from RFC 1321 §3.4
const MD5_S = [
    // Round 1
    7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
    // Round 2
    5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
    // Round 3
    4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
    // Round 4
    6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,
]

function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff)
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xffff)
}

function rotateLeft(n: number, s: number): number {
    return (n << s) | (n >>> (32 - s))
}

function toWords(s: string): number[] {
    const nblk = ((s.length + 8) >> 6) + 1
    const blks = new Array(nblk * 16).fill(0)
    for (let i = 0; i < s.length; i++) {
        blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8)
    }
    blks[s.length >> 2] |= 0x80 << ((s.length % 4) * 8)
    blks[nblk * 16 - 2] = s.length * 8
    return blks
}

function wordsToHex(words: number[]): string {
    const hex = '0123456789abcdef'
    let out = ''
    for (let i = 0; i < words.length * 4; i++) {
        const byte = (words[i >> 2] >> ((i % 4) * 8)) & 0xff
        out += hex[byte >> 4] + hex[byte & 0xf]
    }
    return out
}

/**
 * Compute the MD5 digest of a UTF-8 string.
 * Returns a 32-character lowercase hex string.
 */
export function md5(input: string): string {
    // UTF-8 encode to latin1 byte sequence for the block function
    const encoded = unescape(encodeURIComponent(input))
    const x = toWords(encoded)

    // RFC 1321 §3.3 initial state (little-endian 32-bit words)
    let a = 0x67452301 | 0
    let b = 0xefcdab89 | 0
    let c = 0x98badcfe | 0
    let d = 0x10325476 | 0

    for (let i = 0; i < x.length; i += 16) {
        const aa = a, bb = b, cc = c, dd = d

        for (let j = 0; j < 64; j++) {
            let f: number, g: number
            if (j < 16) {
                // FF round: F(b,c,d) = (b & c) | (~b & d)
                f = (b & c) | (~b & d); g = j
            } else if (j < 32) {
                // GG round: G(b,c,d) = (d & b) | (~d & c)
                f = (d & b) | (~d & c); g = (5 * j + 1) % 16
            } else if (j < 48) {
                // HH round: H(b,c,d) = b ^ c ^ d
                f = b ^ c ^ d; g = (3 * j + 5) % 16
            } else {
                // II round: I(b,c,d) = c ^ (b | ~d)
                f = c ^ (b | ~d); g = (7 * j) % 16
            }
            const tmp = d
            d = c
            c = b
            b = safeAdd(
                b,
                rotateLeft(
                    safeAdd(safeAdd(a, f), safeAdd(x[i + g], MD5_T[j])),
                    MD5_S[j]
                )
            )
            a = tmp
        }

        a = safeAdd(a, aa)
        b = safeAdd(b, bb)
        c = safeAdd(c, cc)
        d = safeAdd(d, dd)
    }

    return wordsToHex([a, b, c, d])
}

/**
 * Compute a SHA digest using the browser's Web Crypto API.
 * algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
 * Returns a lowercase hex string.
 */
export async function sha(algorithm: string, input: string): Promise<string> {
    const data = new TextEncoder().encode(input)
    const buf = await crypto.subtle.digest(algorithm, data)
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
}
