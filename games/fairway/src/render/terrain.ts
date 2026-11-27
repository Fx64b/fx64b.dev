/*
 * Terrain: one smooth mesh from the heightfield (extended past the bounds
 * into soft wooded hills), a fine patch for the green, and a splat shader
 * that blends the surfaces with soft, organic edges.
 */
import * as THREE from 'three'

import { type HoleData, SURFACE_IDS, type Tree } from '../shared/hole'
import { type HeightSampler, fieldRect } from './height'
import { clamp, fbm, smoothstep } from './noise'

export type Quality = 'high' | 'low'

export interface TerrainUniforms {
    uSplatA: { value: THREE.Texture }
    uSplatB: { value: THREE.Texture }
    uNoise: { value: THREE.Texture }
    uSplatRect: { value: THREE.Vector4 }
    uBounds: { value: THREE.Vector4 }
    uGreenRect: { value: THREE.Vector4 }
    /** x, z of the real shadow area and its radius. */
    uShadowArea: { value: THREE.Vector3 }
    /** Horizontal direction toward the sun, for the green slope shade. */
    uSunXZ: { value: THREE.Vector2 }
}

export interface Terrain {
    group: THREE.Group
    uniforms: TerrainUniforms
    /** Ground height anywhere, also outside the bounds. */
    ground: HeightSampler
    dispose(): void
}

// ---------------------------------------------------------------------
// Splat textures

function blur(
    src: Float32Array,
    w: number,
    h: number,
    sigma: number
): Float32Array {
    const radius = Math.max(1, Math.ceil(sigma * 2.5))
    const kernel: number[] = []
    let sum = 0
    for (let i = -radius; i <= radius; i++) {
        const k = Math.exp(-(i * i) / (2 * sigma * sigma))
        kernel.push(k)
        sum += k
    }
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum
    }
    const tmp = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
        const row = y * w
        for (let x = 0; x < w; x++) {
            let acc = 0
            for (let k = -radius; k <= radius; k++) {
                const xx = x + k < 0 ? 0 : x + k >= w ? w - 1 : x + k
                acc += src[row + xx] * kernel[k + radius]
            }
            tmp[row + x] = acc
        }
    }
    const out = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let acc = 0
            for (let k = -radius; k <= radius; k++) {
                const yy = y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k
                acc += tmp[yy * w + x] * kernel[k + radius]
            }
            out[y * w + x] = acc
        }
    }
    return out
}

/** Bakes soft, long tree shadows for the whole hole into one channel. */
function bakeTreeShadows(
    trees: readonly Tree[],
    sunDir: THREE.Vector3,
    originX: number,
    originZ: number,
    texel: number,
    w: number,
    h: number
): Uint8ClampedArray {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    const hyp = Math.hypot(sunDir.x, sunDir.z) || 1
    const reach = hyp / Math.max(sunDir.y, 0.1) // shadow length per metre
    const dx = -sunDir.x / hyp
    const dz = -sunDir.z / hyp
    const angle = Math.atan2(dz, dx)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.55, 'rgba(255,255,255,0.8)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    for (const t of trees) {
        const pine = t.kind === 'pine'
        const centre = (pine ? 0.55 : 0.66) * t.height
        const vr = (pine ? 0.42 : 0.3) * t.height
        const bx = (t.x - originX) / texel
        const bz = (t.z - originZ) / texel
        const cx = bx + (dx * reach * centre) / texel
        const cz = bz + (dz * reach * centre) / texel
        const margin = (t.radius + vr * reach) / texel
        if (
            Math.max(bx, cx) < -margin ||
            Math.min(bx, cx) > w + margin ||
            Math.max(bz, cz) < -margin ||
            Math.min(bz, cz) > h + margin
        ) {
            continue
        }
        // Trunk.
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = Math.max(1.5, (t.radius * 0.16) / texel)
        ctx.beginPath()
        ctx.moveTo(bx, bz)
        ctx.lineTo(cx, cz)
        ctx.stroke()
        // Canopy.
        const along = Math.hypot(t.radius, vr * reach) * 1.12
        const across = t.radius * (pine ? 0.9 : 1.12)
        ctx.save()
        ctx.translate(cx, cz)
        ctx.rotate(angle)
        ctx.scale(along / texel, across / texel)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(0, 0, 1, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }
    return ctx.getImageData(0, 0, w, h).data
}

interface Splat {
    texA: THREE.DataTexture
    texB: THREE.DataTexture
    rect: THREE.Vector4
}

function buildSplat(
    hole: HoleData,
    ground: HeightSampler,
    shadowTrees: readonly Tree[],
    sunDir: THREE.Vector3
): Splat {
    const g = hole.surfaces
    const scale = g.cols * 2 <= 2048 && g.rows * 2 <= 2048 ? 2 : 1
    const w = g.cols * scale
    const h = g.rows * scale
    const count = w * h
    // 0 first cut or shorter, 1 fairway or shorter, 2 green, 3 tee,
    // 4 bunker, 5 water
    const masks: Float32Array[] = []
    for (let i = 0; i < 6; i++) {
        masks.push(new Float32Array(count))
    }
    const member: number[][] = SURFACE_IDS.map((id) => {
        switch (id) {
            case 'firstCut':
                return [0]
            case 'fairway':
                return [0, 1]
            case 'green':
                return [0, 1, 2]
            case 'tee':
                return [0, 1, 3]
            case 'bunker':
                return [4]
            case 'water':
                return [5]
            default:
                return []
        }
    })
    for (let y = 0; y < h; y++) {
        const row = Math.floor(y / scale) * g.cols
        for (let x = 0; x < w; x++) {
            const id = g.data[row + Math.floor(x / scale)]
            const m = member[id]
            if (!m) {
                continue
            }
            for (let k = 0; k < m.length; k++) {
                masks[m[k]][y * w + x] = 1
            }
        }
    }
    const sigma = 0.85 * scale
    const b = masks.map((m, i) => blur(m, w, h, i === 5 ? sigma * 1.6 : sigma))

    const texel = g.cellSize / scale
    // Water depth (0 at the shore, 255 at 1.6 m or deeper), for the colour
    // of the water and of the bed under it.
    let depth: Uint8Array | null = null
    if (hole.water.length > 0) {
        depth = new Uint8Array(count)
        const centres = hole.water.map((body) => {
            let cx = 0
            let cz = 0
            for (const p of body.outline) {
                cx += p.x
                cz += p.z
            }
            const n = Math.max(1, body.outline.length)
            return { x: cx / n, z: cz / n, level: body.level }
        })
        const wet = b[5]
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x
                if (wet[i] < 0.02) {
                    continue
                }
                const px = g.originX + (x + 0.5) * texel
                const pz = g.originZ + (y + 0.5) * texel
                let level = centres[0].level
                let best = Infinity
                for (const c of centres) {
                    const d = (c.x - px) ** 2 + (c.z - pz) ** 2
                    if (d < best) {
                        best = d
                        level = c.level
                    }
                }
                const d = (level - ground(px, pz)) / 1.6
                depth[i] = Math.round(clamp(d, 0, 1) * 255)
            }
        }
    }
    const shadow = bakeTreeShadows(
        shadowTrees,
        sunDir,
        g.originX,
        g.originZ,
        texel,
        w,
        h
    )

    const a = new Uint8Array(count * 4)
    const bb = new Uint8Array(count * 4)
    for (let i = 0; i < count; i++) {
        a[i * 4] = b[0][i] * 255
        a[i * 4 + 1] = b[1][i] * 255
        a[i * 4 + 2] = b[2][i] * 255
        a[i * 4 + 3] = b[3][i] * 255
        bb[i * 4] = b[4][i] * 255
        bb[i * 4 + 1] = b[5][i] * 255
        bb[i * 4 + 2] = depth ? depth[i] : 0
        bb[i * 4 + 3] = shadow[i * 4]
    }
    const make = (data: Uint8Array) => {
        const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
        t.magFilter = THREE.LinearFilter
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.generateMipmaps = true
        t.needsUpdate = true
        return t
    }
    return {
        texA: make(a),
        texB: make(bb),
        rect: new THREE.Vector4(
            g.originX,
            g.originZ,
            1 / (g.cols * g.cellSize),
            1 / (g.rows * g.cellSize)
        ),
    }
}

// ---------------------------------------------------------------------
// Shader

const sRGB = (hex: number) => new THREE.Color(hex)

const PALETTE = {
    uRough: sRGB(0x4e7133),
    uCut: sRGB(0x67933e),
    uFair: sRGB(0x86b24e),
    uGreen: sRGB(0xa3d064),
    uSand: sRGB(0xe9d8ab),
    uEarth: sRGB(0x5a4a2c),
    uBed: sRGB(0x2c3f36),
    uForest: sRGB(0x3a5228),
    uCanopy: sRGB(0x5d8a3c),
    uShallow: sRGB(0x7d8a5c),
}

const FRAG_PARS = /* glsl */ `
uniform sampler2D uSplatA;
uniform sampler2D uSplatB;
uniform sampler2D uNoise;
uniform vec4 uSplatRect;
uniform vec4 uBounds;
uniform vec4 uGreenRect;
uniform vec3 uShadowArea;
uniform vec2 uSunXZ;
uniform vec3 uRough;
uniform vec3 uCut;
uniform vec3 uFair;
uniform vec3 uGreen;
uniform vec3 uSand;
uniform vec3 uEarth;
uniform vec3 uBed;
uniform vec3 uForest;
uniform vec3 uCanopy;
uniform vec3 uShallow;
varying vec3 vFwPos;
varying vec3 vFwNormal;
float fwBakedLit = 1.0;
float fwBakedK = 1.0;

// Soft mowing stripes that fade out before they alias.
float fwStripes(vec2 p, vec2 dir, float width) {
    float ph = dot(p, dir) * (3.14159265 / width);
    float fw = fwidth(ph);
    float st = smoothstep(-0.4, 0.4, sin(ph));
    return mix(0.5, st, 1.0 - smoothstep(0.5, 1.7, fw));
}
`

const FRAG_COLOR = /* glsl */ `
{
    vec2 p = vFwPos.xz;
    #ifdef FW_MAIN
    // Inset a little: the fine patch overlaps the edge, so no pixel is lost.
    if (p.x > uGreenRect.x + 0.06 && p.x < uGreenRect.z - 0.06 && p.y > uGreenRect.y + 0.06 && p.y < uGreenRect.w - 0.06) discard;
    #endif
    vec2 suv = (p - uSplatRect.xy) * uSplatRect.zw;
    vec4 sa = texture2D(uSplatA, suv);
    vec4 sb = texture2D(uSplatB, suv);
    float nFine = texture2D(uNoise, p * 0.23).r;
    float nMed = texture2D(uNoise, p * 0.041).g;
    float nLarge = texture2D(uNoise, p * 0.0077).b;
    // Broad patches, 15 to 40 m across, so big areas are not one flat tone.
    float nPatch = texture2D(uNoise, p * 0.0131 + 0.37).r;
    float nGrain = texture2D(uNoise, p * 0.9).a;
    float camDist = length(vFwPos - cameraPosition);
    float nearK = 1.0 - smoothstep(6.0, 60.0, camDist);

    float jit = (nMed - 0.5) * 0.1;
    float wCut = smoothstep(0.44, 0.56, sa.r + jit);
    float wFair = smoothstep(0.46, 0.54, sa.g + jit * 0.5);
    float wGreen = smoothstep(0.47, 0.53, sa.b);
    float wTee = smoothstep(0.46, 0.54, sa.a);
    float wSand = smoothstep(0.47, 0.53, sb.r + (nMed - 0.5) * 0.03);
    float wWater = smoothstep(0.42, 0.62, sb.g);

    vec2 dOut = max(max(uBounds.xy - p, p - uBounds.zw), 0.0);
    float outD = length(dOut);
    // Baked shadows fade out just past the bounds instead of on a line.
    float inRect = 1.0 - smoothstep(0.0, 14.0, outD + (nMed - 0.5) * 8.0);
    // The forest floor starts at an uneven line near the bounds, not on
    // the straight edge of the hole. It may reach a little into the rough.
    vec2 dIn = min(p - uBounds.xy, uBounds.zw - p);
    float edgeD = outD > 0.0 ? outD : -min(dIn.x, dIn.y);
    float wForest = smoothstep(-4.0, 20.0, edgeD + (nLarge - 0.5) * 30.0 + (nMed - 0.5) * 12.0);

    // Rough: darker, mottled at several scales, a little grain up close.
    vec3 col = uRough * (0.8 + 0.4 * nMed) * (0.9 + 0.2 * nLarge);
    col *= 1.0 + (nFine - 0.5) * 0.22 + (nGrain - 0.5) * 0.3 * nearK;
    col = mix(col, col * vec3(1.12, 1.04, 0.8), smoothstep(0.55, 0.8, nLarge) * 0.35);
    // Drier, lighter patches and lusher, darker ones.
    col *= mix(vec3(0.9, 0.95, 0.96), vec3(1.1, 1.06, 0.92), smoothstep(0.3, 0.72, nPatch));

    // First cut.
    vec3 cCut = uCut * (0.93 + 0.14 * nMed) * (1.0 + (nGrain - 0.5) * 0.16 * nearK);
    col = mix(col, cCut, wCut);

    // Fairway with broad diagonal stripes.
    float stF = fwStripes(p, vec2(0.7071, 0.7071), 5.5);
    vec3 cFair = uFair * (0.93 + 0.14 * stF) * (0.96 + 0.08 * nLarge);
    cFair *= mix(vec3(0.955, 0.975, 0.97), vec3(1.045, 1.03, 0.96), smoothstep(0.3, 0.72, nPatch));
    cFair *= 1.0 + (nGrain - 0.5) * 0.1 * nearK;
    col = mix(col, cFair, wFair);

    // Tee box: fairway turf, cut a little finer.
    float stT = fwStripes(p, vec2(1.0, 0.0), 1.6);
    vec3 cTee = uFair * 1.04 * (0.96 + 0.08 * stT);
    col = mix(col, cTee, wTee);

    // Green: smooth and bright with fine stripes.
    float stG = fwStripes(p, vec2(0.7071, -0.7071), 1.5);
    vec3 cGreen = uGreen * (0.965 + 0.07 * stG) * (0.98 + 0.04 * nLarge);
    // The fringe: a ring of short, even turf about a metre wide around the
    // putting surface, with a thin seam where the two cuts meet.
    float fringe = smoothstep(0.1, 0.26, sa.b) * (1.0 - wGreen);
    vec3 cFringe = mix(uFair, uGreen, 0.38) * 0.95 * (0.98 + 0.04 * nMed);
    col = mix(col, cFringe, fringe * (1.0 - wSand) * 0.9);
    float seam = smoothstep(0.38, 0.47, sa.b) * (1.0 - wGreen);
    col = mix(col, col * 0.86, seam * 0.6);
    // Putting slopes are only a few percent, so plain lighting hardly shows
    // them. Shade the green a little by how it tilts toward the sun.
    float tilt = dot(normalize(vFwNormal).xz, uSunXZ);
    cGreen *= 1.0 + clamp(tilt * 5.0, -0.16, 0.16);
    col = mix(col, cGreen, wGreen);

    // Bunker: a dark lip of earth, then warm sand.
    float lip = smoothstep(0.26, 0.46, sb.r) * (1.0 - wSand);
    col = mix(col, uEarth, lip * 0.75);
    vec3 cSand = uSand * (0.95 + 0.08 * nMed) * (1.0 + (nGrain - 0.5) * 0.1 * nearK);
    cSand *= mix(0.84, 1.0, smoothstep(0.5, 0.9, sb.r));
    // Soft rake lines, gently wavy, gone before they could shimmer.
    float rakePh = (dot(p, vec2(0.83, 0.56)) + (nMed - 0.5) * 1.6) * (6.2832 / 0.42);
    float rake = sin(rakePh) * (1.0 - smoothstep(0.35, 1.3, fwidth(rakePh)));
    cSand *= 1.0 + 0.035 * rake;
    cSand *= mix(vec3(0.97, 0.965, 0.95), vec3(1.03, 1.02, 0.99), nPatch);
    col = mix(col, cSand, wSand);

    // Water: damp earth at the shore, a dark bed below.
    col = mix(col, uEarth * 0.9, smoothstep(0.3, 0.5, sb.g) * 0.6);
    // Under water: a pale shelf at the shore, a dark bed further in.
    col = mix(col, mix(uShallow, uBed, smoothstep(0.0, 0.55, sb.b)), wWater);

    // Beyond the bounds: forest floor.
    // Far outside, past the last trees, the land reads as tree tops.
    // Two scales at different angles, soft and low in contrast, so no
    // repeat shows from high up.
    vec2 q = vec2(p.x * 0.8 + p.y * 0.6, p.y * 0.8 - p.x * 0.6);
    float crown = texture2D(uNoise, p * 0.043 + 0.11).g * 0.55
        + texture2D(uNoise, q * 0.0173 + 0.53).r * 0.45;
    vec3 cFar = mix(uForest * 1.12, uCanopy * 0.93, smoothstep(0.1, 0.9, crown)) * (0.9 + 0.2 * nLarge);
    // Under the backdrop trees the floor is in shade.
    vec3 cNear = uForest * (0.5 + 0.3 * nMed);
    vec3 cForest = mix(cNear, cFar, smoothstep(50.0, 140.0, outD + (nLarge - 0.5) * 50.0));
    col = mix(col, cForest, wForest * (outD > 0.0 ? 1.0 : 1.0 - wCut));

    diffuseColor.rgb = col;

    fwBakedLit = 1.0 - sb.a * inRect * 0.88;
    #ifdef FW_REAL_SHADOWS
    fwBakedK = smoothstep(uShadowArea.z * 0.72, uShadowArea.z * 0.96, distance(p, uShadowArea.xy));
    #endif
}
`

/** Patches the stock lights chunk so the sun uses baked shadows far away. */
function lightsChunk(): string {
    let chunk = THREE.ShaderChunk.lights_fragment_begin
    const re =
        /directLight\.color \*= (\( directLight\.visible && receiveShadow \) \? getShadow\( directionalShadowMap\[ i \][^;]*);/
    if (re.test(chunk)) {
        chunk = chunk.replace(
            re,
            'directLight.color *= mix( $1, fwBakedLit, fwBakedK );'
        )
    }
    chunk = chunk.replace(
        'getDirectionalLightInfo( directionalLight, directLight );',
        /* glsl */ `getDirectionalLightInfo( directionalLight, directLight );
        #if !defined( USE_SHADOWMAP ) || ( NUM_DIR_LIGHT_SHADOWS == 0 )
        directLight.color *= fwBakedLit;
        #endif`
    )
    return chunk
}

function createMaterial(
    uniforms: TerrainUniforms,
    main: boolean,
    realShadows: boolean
): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const colors: Record<string, { value: THREE.Color }> = {}
    for (const [k, v] of Object.entries(PALETTE)) {
        colors[k] = { value: v }
    }
    mat.defines = {}
    if (main) {
        mat.defines.FW_MAIN = ''
    }
    if (realShadows) {
        mat.defines.FW_REAL_SHADOWS = ''
    }
    mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms, colors)
        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                '#include <common>\nvarying vec3 vFwPos;\nvarying vec3 vFwNormal;'
            )
            .replace(
                '#include <begin_vertex>',
                '#include <begin_vertex>\nvFwPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvFwNormal = normal;'
            )
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
            .replace('#include <map_fragment>', FRAG_COLOR)
            .replace('#include <lights_fragment_begin>', lightsChunk())
    }
    mat.customProgramCacheKey = () =>
        `fw-terrain-${main ? 1 : 0}-${realShadows ? 1 : 0}`
    return mat
}

// ---------------------------------------------------------------------
// Geometry

function gridGeometry(
    xs: number[],
    zs: number[],
    height: (x: number, z: number, ix: number, iz: number) => number,
    normalAt: (x: number, z: number, out: THREE.Vector3) => void
): THREE.BufferGeometry {
    const nx = xs.length
    const nz = zs.length
    const pos = new Float32Array(nx * nz * 3)
    const nor = new Float32Array(nx * nz * 3)
    const n = new THREE.Vector3()
    let k = 0
    for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
            const x = xs[i]
            const z = zs[j]
            pos[k] = x
            pos[k + 1] = height(x, z, i, j)
            pos[k + 2] = z
            normalAt(x, z, n)
            nor[k] = n.x
            nor[k + 1] = n.y
            nor[k + 2] = n.z
            k += 3
        }
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6)
    k = 0
    for (let j = 0; j < nz - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
            const a = j * nx + i
            const b = a + 1
            const c = a + nx
            const d = c + 1
            idx[k++] = a
            idx[k++] = c
            idx[k++] = b
            idx[k++] = b
            idx[k++] = c
            idx[k++] = d
        }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
    geo.setIndex(new THREE.BufferAttribute(idx, 1))
    geo.computeBoundingSphere()
    geo.computeBoundingBox()
    return geo
}

/** Inner coordinates at a step, with rings of growing cells around them. */
function axis(
    min: number,
    max: number,
    step: number,
    rings: number,
    growth: number
): number[] {
    const out: number[] = []
    for (let v = min; v < max - 1e-6; v += step) {
        out.push(v)
    }
    out.push(max)
    let s = step * 2
    let lo = min
    let hi = max
    for (let i = 0; i < rings; i++) {
        lo -= s
        hi += s
        out.unshift(lo)
        out.push(hi)
        s *= growth
    }
    return out
}

/**
 * Ground height anywhere. Past the terrain edge the land rolls up into low
 * hills, so the horizon is a soft wooded ridge instead of an edge.
 */
export function createGround(
    hole: HoleData,
    sampler: HeightSampler
): HeightSampler {
    const tr = fieldRect(hole.terrain)
    return (x, z) => {
        const ox = Math.max(tr.minX - x, 0, x - tr.maxX)
        const oz = Math.max(tr.minZ - z, 0, z - tr.maxZ)
        if (ox === 0 && oz === 0) {
            return sampler(x, z)
        }
        const d = Math.hypot(ox, oz)
        const edge = sampler(
            clamp(x, tr.minX, tr.maxX),
            clamp(z, tr.minZ, tr.maxZ)
        )
        const roll =
            (fbm(x / 70, z / 70, 2, 3) - 0.5) * 5 * smoothstep(0, 40, d)
        const hills =
            smoothstep(25, 380, d) *
            (6 + 46 * fbm(x / 330 + 5.3, z / 330 + 9.1, 3, 7))
        return edge + roll + hills
    }
}

export function createTerrain(
    hole: HoleData,
    sampler: HeightSampler,
    ground: HeightSampler,
    quality: Quality,
    noise: THREE.Texture,
    sunDir: THREE.Vector3,
    shadowTrees: readonly Tree[],
    realShadows: boolean
): Terrain {
    const tr = fieldRect(hole.terrain)
    const gr = fieldRect(hole.greenField)
    const hasGreen = hole.greenField.cols > 1 && hole.greenField.rows > 1

    const normalAt =
        (e: number) => (x: number, z: number, out: THREE.Vector3) => {
            const hx = ground(x + e, z) - ground(x - e, z)
            const hz = ground(x, z + e) - ground(x, z - e)
            out.set(-hx, 2 * e, -hz).normalize()
        }

    const splat = buildSplat(hole, sampler, shadowTrees, sunDir)
    const b = hole.bounds
    const uniforms: TerrainUniforms = {
        uSplatA: { value: splat.texA },
        uSplatB: { value: splat.texB },
        uNoise: { value: noise },
        uSplatRect: { value: splat.rect },
        uBounds: { value: new THREE.Vector4(b.minX, b.minZ, b.maxX, b.maxZ) },
        uGreenRect: {
            value: hasGreen
                ? new THREE.Vector4(gr.minX, gr.minZ, gr.maxX, gr.maxZ)
                : new THREE.Vector4(1, 1, 0, 0),
        },
        uShadowArea: { value: new THREE.Vector3(0, 0, 1) },
        uSunXZ: {
            value: new THREE.Vector2(sunDir.x, sunDir.z).normalize(),
        },
    }

    const group = new THREE.Group()
    const high = quality === 'high'
    const cell = hole.terrain.cellSize
    const step = cell * (high ? 1 : 2)
    const xs = axis(tr.minX, tr.maxX, step, high ? 24 : 15, high ? 1.22 : 1.38)
    const zs = axis(tr.minZ, tr.maxZ, step, high ? 24 : 15, high ? 1.22 : 1.38)
    const inner = normalAt(Math.max(cell, 0.5))
    const outer = normalAt(6)
    const mainGeo = gridGeometry(
        xs,
        zs,
        (x, z) => ground(x, z),
        (x, z, out) => {
            const inside =
                x >= tr.minX && x <= tr.maxX && z >= tr.minZ && z <= tr.maxZ
            if (inside) {
                inner(x, z, out)
            } else {
                outer(x, z, out)
            }
        }
    )
    const mainMat = createMaterial(uniforms, true, realShadows)
    const main = new THREE.Mesh(mainGeo, mainMat)
    main.receiveShadow = true
    main.frustumCulled = false
    group.add(main)

    let patchGeo: THREE.BufferGeometry | null = null
    let patchMat: THREE.Material | null = null
    if (hasGreen) {
        // The green at fine resolution, with a short skirt that hides any
        // hairline gap to the coarse mesh.
        const g = hole.greenField
        const gs = high ? 2 : 4
        const line = (count: number, origin: number) => {
            const v: number[] = []
            for (let i = 0; i < count - 1; i += gs) {
                v.push(origin + i * g.cellSize)
            }
            v.push(origin + (count - 1) * g.cellSize)
            return [v[0], ...v, v[v.length - 1]]
        }
        const pxs = line(g.cols, g.originX)
        const pzs = line(g.rows, g.originZ)
        const fine = normalAt(Math.max(g.cellSize * 2, 0.4))
        patchGeo = gridGeometry(
            pxs,
            pzs,
            (x, z, i, j) => {
                const skirt =
                    i === 0 ||
                    j === 0 ||
                    i === pxs.length - 1 ||
                    j === pzs.length - 1
                return sampler(x, z) - (skirt ? 0.4 : 0)
            },
            (x, z, out) => {
                // Stay inside the field so the normals use the fine data.
                const e = g.cellSize * 2
                fine(
                    clamp(x, gr.minX + e, gr.maxX - e),
                    clamp(z, gr.minZ + e, gr.maxZ - e),
                    out
                )
            }
        )
        patchMat = createMaterial(uniforms, false, realShadows)
        const patch = new THREE.Mesh(patchGeo, patchMat)
        patch.receiveShadow = true
        group.add(patch)
    }

    return {
        group,
        uniforms,
        ground,
        dispose() {
            mainGeo.dispose()
            mainMat.dispose()
            patchGeo?.dispose()
            patchMat?.dispose()
            splat.texA.dispose()
            splat.texB.dispose()
        },
    }
}
