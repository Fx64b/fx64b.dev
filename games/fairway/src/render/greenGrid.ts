/*
 * A reading aid for putting: a faint 1 m grid draped on the green, and a few
 * slow dots that drift downhill, faster where the slope is steeper. Both are
 * drawn only on the putting surface and fade in while the ball is on it.
 */
import * as THREE from 'three'

import type { HoleData } from '../shared/hole'
import { type HeightSampler, fieldRect } from './height'
import { mulberry32 } from './noise'
import type { Quality, TerrainUniforms } from './terrain'

export interface GreenGrid {
    group: THREE.Group
    /** Fade toward shown or hidden. */
    setShown(on: boolean): void
    /** pixelsPerRadian: drawing buffer height / (2 tan(fov / 2)). */
    update(dt: number, pixelsPerRadian: number): void
    dispose(): void
}

/** Lift above the green, against z-fighting. */
const LIFT = 0.022
/** Dot speed in m/s for a slope of 1 (so 2% gives about 0.13 m/s). */
const DRIFT = 6.5

export function createGreenGrid(
    hole: HoleData,
    ground: HeightSampler,
    isGreen: (x: number, z: number) => boolean,
    terrain: TerrainUniforms,
    quality: Quality
): GreenGrid {
    const group = new THREE.Group()
    const g = hole.greenField
    if (g.cols < 2 || g.rows < 2) {
        return { group, setShown() {}, update() {}, dispose() {} }
    }
    const high = quality === 'high'
    const rect = fieldRect(g)
    const opacity = { value: 0 }

    const slopeAt = (x: number, z: number, out: { x: number; z: number }) => {
        const e = 0.4
        out.x = (ground(x + e, z) - ground(x - e, z)) / (2 * e)
        out.z = (ground(x, z + e) - ground(x, z - e)) / (2 * e)
    }
    const grad = { x: 0, z: 0 }

    // --- The sheet that carries the grid lines. Only cells on or next to
    // the green are built.
    const step = high ? 0.5 : 1
    const nx = Math.floor((rect.maxX - rect.minX) / step) + 1
    const nz = Math.floor((rect.maxZ - rect.minZ) / step) + 1
    const on = new Uint8Array(nx * nz)
    for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
            if (isGreen(rect.minX + i * step, rect.minZ + j * step)) {
                on[j * nx + i] = 1
            }
        }
    }
    const reach = Math.ceil(1.5 / step)
    const near = (i: number, j: number) => {
        for (let b = -reach; b <= reach; b++) {
            for (let a = -reach; a <= reach; a++) {
                const ii = i + a
                const jj = j + b
                if (
                    ii >= 0 &&
                    jj >= 0 &&
                    ii < nx &&
                    jj < nz &&
                    on[jj * nx + ii]
                ) {
                    return true
                }
            }
        }
        return false
    }
    const pos = new Float32Array(nx * nz * 3)
    const slope = new Float32Array(nx * nz)
    const used = new Uint8Array(nx * nz)
    for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
            const k = j * nx + i
            used[k] = near(i, j) ? 1 : 0
            const x = rect.minX + i * step
            const z = rect.minZ + j * step
            pos[k * 3] = x
            pos[k * 3 + 1] = ground(x, z) + LIFT
            pos[k * 3 + 2] = z
            slopeAt(x, z, grad)
            slope[k] = Math.hypot(grad.x, grad.z)
        }
    }
    const idx: number[] = []
    for (let j = 0; j < nz - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
            const a = j * nx + i
            const b = a + 1
            const c = a + nx
            const d = c + 1
            if (used[a] && used[b] && used[c] && used[d]) {
                idx.push(a, c, b, b, c, d)
            }
        }
    }
    const sheetGeo = new THREE.BufferGeometry()
    sheetGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    sheetGeo.setAttribute('aSlope', new THREE.BufferAttribute(slope, 1))
    sheetGeo.setIndex(idx)
    const sheetMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        uniforms: {
            uSplatA: terrain.uSplatA,
            uSplatRect: terrain.uSplatRect,
            uOpacity: opacity,
        },
        vertexShader: /* glsl */ `
            attribute float aSlope;
            varying vec3 vP;
            varying float vSlope;
            void main() {
                vP = position;
                vSlope = aSlope;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform sampler2D uSplatA;
            uniform vec4 uSplatRect;
            uniform float uOpacity;
            varying vec3 vP;
            varying float vSlope;
            void main() {
                // Distance to the nearest whole metre, on both axes.
                vec2 d = abs(fract(vP.xz - 0.5) - 0.5);
                vec2 fw = fwidth(vP.xz);
                vec2 l = 1.0 - smoothstep(vec2(0.008), vec2(0.008) + fw * 1.25, d);
                // Lines that run almost edge-on would shimmer: fade them.
                l *= 1.0 - smoothstep(0.22, 0.6, fw);
                float line = max(l.x, l.y);
                float onGreen = smoothstep(0.52, 0.8,
                    texture2D(uSplatA, (vP.xz - uSplatRect.xy) * uSplatRect.zw).b);
                float dist = length(vP - cameraPosition);
                float fade = 1.0 - smoothstep(12.0, 34.0, dist);
                // A little stronger where the green is steeper.
                float steep = 0.6 + min(vSlope * 16.0, 0.55);
                float a = line * onGreen * fade * steep * uOpacity * 0.2;
                if (a < 0.004) discard;
                gl_FragColor = vec4(1.0, 1.0, 0.97, a);
            }
        `,
    })
    const sheet = new THREE.Mesh(sheetGeo, sheetMat)
    sheet.renderOrder = 2
    sheet.frustumCulled = false
    group.add(sheet)

    // --- Drifting dots.
    const count = high ? 150 : 60
    const rnd = mulberry32(977)
    const dotPos = new Float32Array(count * 3)
    const dotAlpha = new Float32Array(count)
    const age = new Float32Array(count)
    const life = new Float32Array(count)
    const spawn = (i: number, fresh: boolean) => {
        for (let tries = 0; tries < 12; tries++) {
            const x = rect.minX + rnd() * (rect.maxX - rect.minX)
            const z = rect.minZ + rnd() * (rect.maxZ - rect.minZ)
            if (isGreen(x, z)) {
                dotPos[i * 3] = x
                dotPos[i * 3 + 2] = z
                break
            }
        }
        life[i] = 5 + rnd() * 5
        age[i] = fresh ? 0 : rnd() * life[i]
    }
    for (let i = 0; i < count; i++) {
        dotPos[i * 3] = hole.pin.x
        dotPos[i * 3 + 2] = hole.pin.z
        spawn(i, false)
    }
    const dotGeo = new THREE.BufferGeometry()
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3))
    dotGeo.setAttribute('aAlpha', new THREE.BufferAttribute(dotAlpha, 1))
    const scale = { value: 600 }
    const dotMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uOpacity: opacity, uScale: scale },
        vertexShader: /* glsl */ `
            attribute float aAlpha;
            uniform float uScale;
            varying float vAlpha;
            void main() {
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                float dist = -mv.z;
                vAlpha = aAlpha * (1.0 - smoothstep(14.0, 36.0, dist));
                gl_PointSize = clamp(0.06 * uScale / dist, 1.6, 12.0);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uOpacity;
            varying float vAlpha;
            void main() {
                float r = length(gl_PointCoord - 0.5) * 2.0;
                float a = (1.0 - smoothstep(0.45, 1.0, r)) * vAlpha * uOpacity;
                if (a < 0.004) discard;
                gl_FragColor = vec4(1.0, 1.0, 0.97, a);
            }
        `,
    })
    // A short tail behind each dot, pointing uphill: the fall line reads
    // even in a still frame, and longer tails mean a steeper slope.
    const tailPos = new Float32Array(count * 6)
    const tailAlpha = new Float32Array(count * 2)
    const tailGeo = new THREE.BufferGeometry()
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPos, 3))
    tailGeo.setAttribute('aAlpha', new THREE.BufferAttribute(tailAlpha, 1))
    const tailMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uOpacity: opacity },
        vertexShader: /* glsl */ `
            attribute float aAlpha;
            varying float vAlpha;
            void main() {
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vAlpha = aAlpha * (1.0 - smoothstep(14.0, 36.0, -mv.z));
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uOpacity;
            varying float vAlpha;
            void main() {
                gl_FragColor = vec4(1.0, 1.0, 0.97, vAlpha * uOpacity);
            }
        `,
    })
    const tails = new THREE.LineSegments(tailGeo, tailMat)
    tails.renderOrder = 3
    tails.frustumCulled = false
    group.add(tails)
    const dots = new THREE.Points(dotGeo, dotMat)
    dots.renderOrder = 3
    dots.frustumCulled = false
    group.add(dots)

    let shown = false
    group.visible = false
    return {
        group,
        setShown(on) {
            shown = on
        },
        update(dt, pixelsPerRadian) {
            const target = shown ? 1 : 0
            const k = 1 - Math.exp(-dt * (shown ? 2.2 : 3.5))
            opacity.value += (target - opacity.value) * k
            if (!shown && opacity.value < 0.01) {
                opacity.value = 0
            }
            group.visible = opacity.value > 0
            if (!group.visible) {
                return
            }
            scale.value = pixelsPerRadian
            for (let i = 0; i < count; i++) {
                age[i] += dt
                let x = dotPos[i * 3]
                let z = dotPos[i * 3 + 2]
                if (age[i] > life[i] || !isGreen(x, z)) {
                    spawn(i, true)
                    x = dotPos[i * 3]
                    z = dotPos[i * 3 + 2]
                }
                // Downhill is against the gradient.
                slopeAt(x, z, grad)
                x -= grad.x * DRIFT * dt
                z -= grad.z * DRIFT * dt
                dotPos[i * 3] = x
                dotPos[i * 3 + 1] = ground(x, z) + LIFT + 0.01
                dotPos[i * 3 + 2] = z
                // Fade in and out over the life of the dot. Dots on flat
                // ground stay very faint: they would not move anyway.
                const t = age[i] / life[i]
                const env = Math.min(1, t * 5) * Math.min(1, (1 - t) * 3.5)
                const steep = Math.min(1, Math.hypot(grad.x, grad.z) * 55)
                const alpha = Math.max(0, env) * (0.12 + 0.88 * steep)
                dotAlpha[i] = alpha * 0.75
                const len = Math.min(0.8, 0.1 + Math.hypot(grad.x, grad.z) * 24)
                const gl = Math.hypot(grad.x, grad.z) || 1
                const tx = x + (grad.x / gl) * len
                const tz = z + (grad.z / gl) * len
                tailPos[i * 6] = x
                tailPos[i * 6 + 1] = dotPos[i * 3 + 1]
                tailPos[i * 6 + 2] = z
                tailPos[i * 6 + 3] = tx
                tailPos[i * 6 + 4] = ground(tx, tz) + LIFT + 0.01
                tailPos[i * 6 + 5] = tz
                tailAlpha[i * 2] = alpha * 0.85
                tailAlpha[i * 2 + 1] = 0
            }
            dotGeo.attributes.position.needsUpdate = true
            dotGeo.attributes.aAlpha.needsUpdate = true
            tailGeo.attributes.position.needsUpdate = true
            tailGeo.attributes.aAlpha.needsUpdate = true
        },
        dispose() {
            sheetGeo.dispose()
            sheetMat.dispose()
            dotGeo.dispose()
            dotMat.dispose()
            tailGeo.dispose()
            tailMat.dispose()
        },
    }
}
