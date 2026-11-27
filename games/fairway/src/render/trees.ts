/*
 * Trees: instanced, with a shape for each kind. Canopies are groups of
 * soft, lumpy ellipsoids with smoothed normals, so they shade like rounded
 * foliage and not like facets. There are two detail levels (near and far)
 * and a cheap backdrop forest outside the bounds.
 */
import * as THREE from 'three'

import type { HoleData, Tree, TreeKind } from '../shared/hole'
import type { HeightSampler } from './height'
import { fbm, hash2, lerp, mulberry32 } from './noise'
import type { Quality } from './terrain'

const KINDS: readonly TreeKind[] = ['broadleaf', 'pine', 'birch']

interface Acc {
    pos: number[]
    nor: number[]
    col: number[]
    /** The true surface normal of a canopy lump (zero for other parts). */
    edge: number[]
    /** 1 at the loose outer rim of a conifer branch layer, else 0. */
    rim: number[]
}

const lin = (hex: number) => new THREE.Color(hex)

const FOLIAGE: Record<TreeKind, { top: THREE.Color; low: THREE.Color }> = {
    broadleaf: { top: lin(0x86aa4a), low: lin(0x3c602c) },
    pine: { top: lin(0x5d8550), low: lin(0x2c4c33) },
    birch: { top: lin(0xa0bc58), low: lin(0x55783a) },
}
const BARK: Record<TreeKind, THREE.Color> = {
    broadleaf: lin(0x5f5446),
    pine: lin(0x64503f),
    birch: lin(0xe6e2d6),
}

const tmpC = new THREE.Color()

/** A lumpy ellipsoid. Units: canopy radius 1 in x/z, tree height 1 in y. */
function addBlob(
    acc: Acc,
    kind: TreeKind,
    c: [number, number, number],
    r: [number, number, number],
    detail: number,
    seed: number,
    canopy: { y: number; ry: number },
    lump: number
) {
    const g = new THREE.IcosahedronGeometry(1, detail)
    const p = g.attributes.position
    const { top, low } = FOLIAGE[kind]
    const s = seed * 1.7
    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i)
        const y = p.getY(i)
        const z = p.getZ(i)
        // Lumps at two scales, so no two sides look the same.
        const d =
            1 +
            lump *
                0.5 *
                (Math.sin(3.1 * x + s) +
                    Math.sin(3.4 * y + 1.7 * s) +
                    Math.sin(2.9 * z + 2.3 * s)) +
            lump *
                0.45 *
                Math.sin(6.3 * x + 5.1 * z + s) *
                Math.sin(5.7 * y + 0.6 * s) +
            lump * 0.3 * Math.sin(11 * x + 2 * s) * Math.sin(9 * z + 13 * y)
        const px = c[0] + r[0] * x * d
        const py = c[1] + r[1] * y * d
        const pz = c[2] + r[2] * z * d
        acc.pos.push(px, py, pz)
        // Shading normal: mostly the direction from the middle of the whole
        // canopy, a little of the lump's own normal. The tree then shades
        // as one soft round mass, not as separate balls.
        let nx = x / r[0]
        let ny = y / r[1]
        let nz = z / r[2]
        let l = Math.hypot(nx, ny, nz)
        nx /= l
        ny /= l
        nz /= l
        acc.edge.push(nx, ny, nz)
        acc.rim.push(0)
        let cx = px
        let cy = (py - canopy.y) / (canopy.ry * canopy.ry)
        let cz = pz
        l = Math.hypot(cx, cy, cz) || 1
        cx /= l
        cy /= l
        cz /= l
        nx = nx * 0.16 + cx * 0.84
        ny = ny * 0.16 + cy * 0.84
        nz = nz * 0.16 + cz * 0.84
        l = Math.hypot(nx, ny, nz) || 1
        acc.nor.push(nx / l, ny / l, nz / l)
        // Colour: darker low and inside, lighter on top and outside.
        const t = Math.min(
            1,
            Math.max(0, (py - (canopy.y - canopy.ry)) / (2 * canopy.ry))
        )
        const out = Math.min(1, Math.hypot(px, pz))
        const k = Math.min(1, t * 0.6 + out * out * 0.45)
        tmpC.copy(low).lerp(top, k * k * (3 - 2 * k))
        const tint =
            0.96 + 0.06 * Math.sin(px * 7 + seed) * Math.sin(pz * 6 + py * 9)
        acc.col.push(tmpC.r * tint, tmpC.g * tint, tmpC.b * tint)
    }
    g.dispose()
}

function addTrunk(
    acc: Acc,
    kind: TreeKind,
    height: number,
    rBottom: number,
    rTop: number,
    segments: number
) {
    const g = new THREE.CylinderGeometry(
        rTop,
        rBottom,
        height,
        segments,
        kind === 'birch' ? 6 : 1,
        true
    ).toNonIndexed()
    const p = g.attributes.position
    const n = g.attributes.normal
    const bark = BARK[kind]
    for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) + height / 2
        // A little flare at the foot.
        const flare = 1 + 0.5 * Math.max(0, 1 - y / (height * 0.25)) ** 2
        acc.pos.push(p.getX(i) * flare, y, p.getZ(i) * flare)
        acc.nor.push(n.getX(i), n.getY(i), n.getZ(i))
        acc.edge.push(0, 0, 0)
        acc.rim.push(0)
        let k = 0.8 + 0.25 * (y / height)
        if (kind === 'birch') {
            // Dark bands on the white bark.
            const band = hash2(Math.round(y * 40), 3, 5)
            k = band > 0.7 ? 0.45 : 1
        }
        acc.col.push(bark.r * k, bark.g * k, bark.b * k)
    }
    g.dispose()
}

/**
 * A leafy tree: a core and a shell of lumps placed on a spiral, each one
 * a little different.
 */
function addCanopy(
    acc: Acc,
    kind: TreeKind,
    level: Level,
    seed: number,
    shape: {
        y: number
        ry: number
        ring: number
        size: number
        lobes: number
        lump: number
    }
) {
    const rnd = mulberry32(seed * 7919 + 13)
    const canopy = { y: shape.y, ry: shape.ry }
    const detail = level === 'near' ? 2 : 1
    const core = shape.ring * 1.25
    addBlob(
        acc,
        kind,
        [0, shape.y + 0.02, 0],
        [core, shape.ry * 0.8, core],
        level === 'near' || level === 'far' ? 2 : 1,
        seed,
        canopy,
        shape.lump
    )
    const n =
        level === 'near'
            ? shape.lobes
            : level === 'backdrop'
              ? 1
              : Math.ceil(shape.lobes * 0.34)
    const start = rnd() * 6.28
    for (let i = 0; i < n; i++) {
        const v = lerp(-0.72, 0.86, (i + 0.5) / n) + (rnd() - 0.5) * 0.2
        const a = start + i * 2.4 + (rnd() - 0.5) * 0.7
        const ring = Math.sqrt(Math.max(0, 1 - v * v)) * shape.ring
        const size =
            shape.size *
            lerp(1.12, 0.8, Math.abs(v)) *
            (0.82 + 0.36 * rnd()) *
            (level === 'near' ? 1 : 1.4)
        addBlob(
            acc,
            kind,
            [
                Math.cos(a) * ring,
                shape.y + v * shape.ry * 0.68,
                Math.sin(a) * ring,
            ],
            [size, size * shape.ry * (0.95 + 0.3 * rnd()), size],
            detail,
            seed * 3 + i,
            canopy,
            shape.lump
        )
    }
}

/**
 * A conifer: many thin, drooping branch layers of uneven size with a loose,
 * irregular rim. Not a stack of equal cones.
 */
function addConifer(acc: Acc, level: Level, seed: number) {
    const rnd = mulberry32(seed * 104729 + 7)
    const layers =
        level === 'near' ? 13 : level === 'far' ? 7 : level === 'low' ? 5 : 4
    const seg = level === 'near' ? 14 : level === 'far' ? 8 : 6
    const { top, low } = FOLIAGE.pine
    const y0 = level === 'backdrop' ? 0.1 : 0.17
    const span = 0.95 - y0
    const dy = (span / layers) * 2.3
    // In unit space y is squeezed by about height / radius, so a real
    // normal that leans 45 degrees up has a large y here.
    const ny = 3.6
    const ring = (a: number, r: number, y: number, rim: number, k: number) => {
        const c = Math.cos(a)
        const s = Math.sin(a)
        acc.pos.push(c * r, y, s * r)
        const l = Math.hypot(1, ny)
        acc.nor.push(c / l, ny / l, s / l)
        acc.edge.push(0, 0, 0)
        acc.rim.push(rim)
        tmpC.copy(low).lerp(top, k)
        acc.col.push(tmpC.r, tmpC.g, tmpC.b)
    }
    for (let i = 0; i < layers; i++) {
        const f = i / (layers - 1)
        const yTop = y0 + span * (0.12 + 0.88 * f) + (rnd() - 0.5) * 0.02
        const taper = lerp(1, 0.24, Math.pow(f, 1.2))
        const R = taper * (0.8 + 0.4 * rnd())
        const ph1 = rnd() * 6.28
        const ph2 = rnd() * 6.28
        const turn = rnd() * 6.28
        const shade = 0.85 + 0.3 * rnd()
        const rimR: number[] = []
        const rimY: number[] = []
        for (let j = 0; j <= seg; j++) {
            const a = (j / seg) * Math.PI * 2
            const w =
                1 +
                0.2 * Math.sin(a * 3 + ph1) +
                0.14 * Math.sin(a * 5 + ph2) +
                (j % 2 === 0 ? 0.1 : -0.08)
            rimR.push(R * w)
            rimY.push(yTop - dy * (0.8 + 0.25 * Math.sin(a * 2 + ph2)))
        }
        rimR[seg] = rimR[0]
        rimY[seg] = rimY[0]
        for (let j = 0; j < seg; j++) {
            const a0 = turn + (j / seg) * Math.PI * 2
            const a1 = turn + ((j + 1) / seg) * Math.PI * 2
            const mid0 = rimR[j] * 0.58
            const mid1 = rimR[j + 1] * 0.58
            const ym0 = yTop - (yTop - rimY[j]) * 0.4
            const ym1 = yTop - (yTop - rimY[j + 1]) * 0.4
            const kIn = 0.12 * shade
            const kMid = 0.5 * shade
            const kOut = Math.min(1, 0.95 * shade)
            // Inner fan.
            ring(a0, 0.02, yTop, 0, kIn)
            ring(a1, mid1, ym1, 0, kMid)
            ring(a0, mid0, ym0, 0, kMid)
            // Outer band.
            ring(a0, mid0, ym0, 0, kMid)
            ring(a1, mid1, ym1, 0, kMid)
            ring(a0, rimR[j], rimY[j], 1, kOut)
            ring(a0, rimR[j], rimY[j], 1, kOut)
            ring(a1, mid1, ym1, 0, kMid)
            ring(a1, rimR[j + 1], rimY[j + 1], 1, kOut)
        }
    }
    // The leader at the top.
    for (let j = 0; j < 5; j++) {
        const a0 = (j / 5) * Math.PI * 2
        const a1 = ((j + 1) / 5) * Math.PI * 2
        ring(a0, 0.1, 0.9, 0, 0.7)
        ring(0, 0.001, 0.995, 0, 0.9)
        ring(a1, 0.1, 0.9, 0, 0.7)
    }
}

function finish(acc: Acc): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nor, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(acc.col, 3))
    geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(acc.edge, 3))
    geo.setAttribute('aRim', new THREE.Float32BufferAttribute(acc.rim, 1))
    return geo
}

type Level = 'near' | 'far' | 'low' | 'backdrop'
const VARIANTS = 2

function buildGeometry(
    kind: TreeKind,
    level: Level,
    variant: number
): THREE.BufferGeometry {
    const acc: Acc = { pos: [], nor: [], col: [], edge: [], rim: [] }
    const seg = level === 'near' ? 9 : 6
    const seed = variant + 1
    if (kind === 'pine') {
        if (level !== 'backdrop') {
            addTrunk(acc, kind, 0.9, 0.075, 0.012, seg)
        }
        addConifer(acc, level, seed)
    } else if (kind === 'broadleaf') {
        if (level !== 'backdrop') {
            addTrunk(acc, kind, 0.42, 0.065, 0.04, seg)
        }
        addCanopy(acc, kind, level, seed, {
            y: 0.62,
            ry: 0.38,
            ring: 0.5,
            size: 0.4,
            lobes: variant === 0 ? 9 : 10,
            lump: 0.2,
        })
    } else {
        // Birch: a slim white trunk and a lighter, upright, open canopy.
        if (level !== 'backdrop') {
            addTrunk(acc, kind, 0.6, 0.05, 0.022, seg)
        }
        addCanopy(acc, kind, level, seed + 20, {
            y: 0.66,
            ry: 0.36,
            ring: 0.44,
            size: 0.34,
            lobes: 8,
            lump: 0.26,
        })
    }
    return finish(acc)
}

function createMaterial(
    time: { value: number },
    noise: THREE.Texture
): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
    })
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = time
        shader.uniforms.uNoise = { value: noise }
        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                /* glsl */ `#include <common>
                uniform sampler2D uNoise;
                varying vec3 vTreePos;
                varying vec3 vEdgeN;
                varying float vRim;`
            )
            .replace(
                '#include <color_fragment>',
                /* glsl */ `#include <color_fragment>
                {
                    float a = texture2D(uNoise, vTreePos.xz * 0.31 + vTreePos.y * 0.17).g;
                    float b = texture2D(uNoise, vTreePos.xy * 0.09 + vTreePos.z * 0.06).r;
                    float leaf = texture2D(uNoise, vTreePos.xz * 0.11 + vTreePos.y * 0.071).a;
                    // A ragged, leafy outline: foliage dissolves where the
                    // surface turns away from the eye, and at the loose rim
                    // of conifer branches.
                    float isLeaf = step(1e-9, dot(vEdgeN, vEdgeN));
                    float facing = abs(dot(normalize(vEdgeN + 1e-5), normalize(vViewPosition)));
                    float edge = max(isLeaf * (1.0 - facing), vRim * 0.92);
                    float cut = mix(0.8, 0.995, leaf * 0.6 + a * 0.4);
                    if (edge > cut) discard;
                    // Inner faces seen through the gaps are in shade.
                    if (!gl_FrontFacing) diffuseColor.rgb *= mix(1.0, 0.55, isLeaf);
                    // Soft leaf mottling.
                    diffuseColor.rgb *= 0.82 + 0.34 * mix(b, a, 0.55);
                }`
            )
        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                /* glsl */ `#include <common>
                uniform float uTime;
                attribute vec3 aEdge;
                attribute float aRim;
                varying vec3 vTreePos;
                varying vec3 vEdgeN;
                varying float vRim;`
            )
            .replace(
                '#include <begin_vertex>',
                /* glsl */ `#include <begin_vertex>
                vRim = aRim;
                vec3 fwEdge = aEdge;
                #ifdef USE_INSTANCING
                {
                    // A slow, small sway of the upper canopy.
                    float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
                    float sw = sin(uTime * 1.1 + ph) + 0.5 * sin(uTime * 2.3 + ph * 1.7);
                    float k = transformed.y * transformed.y * 0.012;
                    transformed.x += sw * k;
                    transformed.z += sw * k * 0.6;
                    vTreePos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
                    mat3 fwIm = mat3(instanceMatrix);
                    fwEdge /= vec3(dot(fwIm[0], fwIm[0]), dot(fwIm[1], fwIm[1]), dot(fwIm[2], fwIm[2]));
                    fwEdge = fwIm * fwEdge;
                }
                #endif
                vEdgeN = normalMatrix * fwEdge;`
            )
    }
    mat.customProgramCacheKey = () => 'fw-tree'
    return mat
}

const m4 = new THREE.Matrix4()
const quat = new THREE.Quaternion()
const scl = new THREE.Vector3()
const posv = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)
const lean = new THREE.Vector3()
const quat2 = new THREE.Quaternion()

function variantOf(t: Tree): number {
    return Math.floor(
        hash2(Math.round(t.x * 13), Math.round(t.z * 13), 37) * VARIANTS
    )
}
const tint = new THREE.Color()

function writeInstance(mesh: THREE.InstancedMesh, i: number, t: Tree) {
    const ix = Math.round(t.x * 13)
    const iz = Math.round(t.z * 13)
    // A random turn and a slight lean.
    quat.setFromAxisAngle(up, hash2(ix, iz, 31) * Math.PI * 2)
    lean.set(hash2(ix, iz, 34) - 0.5, 0, hash2(ix, iz, 35) - 0.5).normalize()
    quat.premultiply(
        quat2.setFromAxisAngle(lean, (hash2(ix, iz, 36) - 0.5) * 0.12)
    )
    posv.set(t.x, t.y - 0.1, t.z)
    scl.set(t.radius, t.height, t.radius)
    m4.compose(posv, quat, scl)
    mesh.setMatrixAt(i, m4)
    const a = hash2(ix, iz, 32)
    const b = hash2(ix, iz, 33)
    tint.setRGB(0.86 + 0.26 * a, 0.9 + 0.16 * b, 0.82 + 0.3 * (1 - a))
    mesh.setColorAt(i, tint)
}

/** Extra trees outside the bounds, so the hole sits in a forest. */
export function createBackdropTrees(
    hole: HoleData,
    ground: HeightSampler,
    quality: Quality
): Tree[] {
    const out: Tree[] = []
    const b = hole.bounds
    const band = quality === 'high' ? 115 : 90
    const spacing = quality === 'high' ? 11 : 13
    for (let z = b.minZ - band; z < b.maxZ + band; z += spacing) {
        for (let x = b.minX - band; x < b.maxX + band; x += spacing) {
            const ix = Math.round(x * 2)
            const iz = Math.round(z * 2)
            const px = x + (hash2(ix, iz, 41) - 0.5) * spacing * 0.9
            const pz = z + (hash2(ix, iz, 42) - 0.5) * spacing * 0.9
            const ox = Math.max(b.minX - px, 0, px - b.maxX)
            const oz = Math.max(b.minZ - pz, 0, pz - b.maxZ)
            const d = Math.hypot(ox, oz)
            if (d < 1.5 || d > band) {
                continue
            }
            if (hash2(ix, iz, 43) > lerp(0.95, 0.45, d / band)) {
                continue
            }
            const k = fbm(px / 80, pz / 80, 2, 9)
            const m = hash2(ix, iz, 44)
            let kind: TreeKind = 'broadleaf'
            if (k < 0.42) {
                kind = m < 0.8 ? 'pine' : 'broadleaf'
            } else if (k > 0.62 && m < 0.35) {
                kind = 'birch'
            }
            const u = hash2(ix, iz, 45)
            const grow = 1 + 0.5 * (d / band)
            const height =
                (kind === 'pine' ? lerp(15, 23, u) : lerp(12, 18, u)) * grow
            const radius =
                height *
                (kind === 'pine' ? 0.2 : kind === 'birch' ? 0.26 : 0.36)
            out.push({ x: px, z: pz, y: ground(px, pz), height, radius, kind })
        }
    }
    return out
}

export interface Trees {
    group: THREE.Group
    /** Sorts trees into the near and far detail levels around a point. */
    regroup(x: number, z: number): void
    /** Far trees cast shadows only when the shadow area is large. */
    setFarShadows(on: boolean): void
    dispose(): void
}

export function createTrees(
    trees: readonly Tree[],
    backdrop: readonly Tree[],
    quality: Quality,
    time: { value: number },
    noise: THREE.Texture,
    castShadows: boolean
): Trees {
    const group = new THREE.Group()
    const material = createMaterial(time, noise)
    const geometries: THREE.BufferGeometry[] = []
    const high = quality === 'high'
    const nearRadius = 85

    interface Set {
        list: Tree[]
        near: THREE.InstancedMesh | null
        far: THREE.InstancedMesh
    }
    const sets: Set[] = []
    for (const kind of KINDS) {
        for (let variant = 0; variant < VARIANTS; variant++) {
            const list = trees.filter(
                (t) => t.kind === kind && variantOf(t) === variant
            )
            if (list.length === 0) {
                continue
            }
            const farGeo = buildGeometry(kind, high ? 'far' : 'low', variant)
            geometries.push(farGeo)
            const far = new THREE.InstancedMesh(farGeo, material, list.length)
            far.castShadow = false
            far.frustumCulled = false
            group.add(far)
            let near: THREE.InstancedMesh | null = null
            if (high) {
                const nearGeo = buildGeometry(kind, 'near', variant)
                geometries.push(nearGeo)
                near = new THREE.InstancedMesh(nearGeo, material, list.length)
                near.castShadow = castShadows
                near.frustumCulled = false
                near.count = 0
                group.add(near)
            }
            list.forEach((t, i) => writeInstance(far, i, t))
            sets.push({ list, near, far })
        }
        const back = backdrop.filter((t) => t.kind === kind)
        if (back.length > 0) {
            const geo = buildGeometry(kind, 'backdrop', 0)
            geometries.push(geo)
            const mesh = new THREE.InstancedMesh(geo, material, back.length)
            mesh.frustumCulled = false
            back.forEach((t, i) => writeInstance(mesh, i, t))
            group.add(mesh)
        }
    }

    let lastX = Infinity
    let lastZ = Infinity
    return {
        group,
        regroup(x, z) {
            if (!high) {
                return
            }
            if (Math.hypot(x - lastX, z - lastZ) < 6) {
                return
            }
            lastX = x
            lastZ = z
            for (const s of sets) {
                if (!s.near) {
                    continue
                }
                let n = 0
                let f = 0
                for (const t of s.list) {
                    const d = Math.hypot(t.x - x, t.z - z)
                    if (d < nearRadius) {
                        writeInstance(s.near, n++, t)
                    } else {
                        writeInstance(s.far, f++, t)
                    }
                }
                s.near.count = n
                s.far.count = f
                s.near.instanceMatrix.needsUpdate = true
                s.far.instanceMatrix.needsUpdate = true
                if (s.near.instanceColor) {
                    s.near.instanceColor.needsUpdate = true
                }
                if (s.far.instanceColor) {
                    s.far.instanceColor.needsUpdate = true
                }
            }
        },
        setFarShadows(on) {
            for (const s of sets) {
                s.far.castShadow = castShadows && on
            }
        },
        dispose() {
            for (const g of geometries) {
                g.dispose()
            }
            material.dispose()
            group.traverse((o) => {
                if (o instanceof THREE.InstancedMesh) {
                    o.dispose()
                }
            })
        },
    }
}
