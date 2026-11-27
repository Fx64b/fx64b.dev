import * as THREE from 'three'

import { fbm } from './noise'

/**
 * A tiling RGBA noise texture. Each channel is an independent fractal noise:
 * r and g are soft, b is softer, a is grainy. Shaders sample it at several
 * world scales for grass mottling, clouds and water ripples.
 */
export function createNoiseTexture(size = 256): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4)
    const freq = [8, 8, 4, 32]
    const oct = [4, 4, 3, 3]
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4
            for (let c = 0; c < 4; c++) {
                const f = freq[c]
                const v = fbm(
                    (x / size) * f,
                    (y / size) * f,
                    oct[c],
                    101 + c * 31,
                    f
                )
                // Stretch the contrast: fbm sits close to 0.5.
                const s = (v - 0.5) * 1.9 + 0.5
                data[i + c] = Math.max(0, Math.min(255, Math.round(s * 255)))
            }
        }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.generateMipmaps = true
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
}

/** A soft round spot, white with alpha falling to the edge. */
export function createSpotTexture(size = 64): THREE.CanvasTexture {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
    )
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(c)
}

/** A bump map of small dots in a staggered grid, for the golf ball. */
export function createDimpleTexture(): THREE.CanvasTexture {
    const w = 256
    const h = 128
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    const cols = 32
    const rows = 16
    for (let r = 0; r < rows; r++) {
        for (let q = 0; q < cols; q++) {
            const x = ((q + (r % 2) * 0.5) / cols) * w
            const y = ((r + 0.5) / rows) * h
            const g = ctx.createRadialGradient(x, y, 0, x, y, 3.4)
            g.addColorStop(0, 'rgba(90,90,90,1)')
            g.addColorStop(1, 'rgba(255,255,255,0)')
            ctx.fillStyle = g
            ctx.fillRect(x - 4, y - 4, 8, 8)
        }
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = THREE.RepeatWrapping
    return tex
}
