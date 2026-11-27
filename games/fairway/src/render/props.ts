/*
 * Small objects: flagstick and flag, cup, tee markers, ball, ball shadow,
 * the aim ring and the path preview dots.
 */
import * as THREE from 'three'

import type { HoleData, Vec3 } from '../shared/hole'
import type { HeightSampler } from './height'
import { createDimpleTexture, createSpotTexture } from './textures'

export const BALL_RADIUS = 0.021335

export interface Props {
    group: THREE.Group
    setBall(pos: Vec3, visible: boolean): void
    setAimRing(pos: Vec3 | null): void
    /** Faint dots along the start of the predicted path. null hides them.
     *  Points are ball bottoms, as for setBall. */
    setPathPreview(points: Vec3[] | null): void
    /** Per-frame work: keeps small things readable at a distance. */
    update(camera: THREE.PerspectiveCamera, viewportHeight: number): void
    dispose(): void
}

const RING_SEGMENTS = 56
const PATH_DOTS = 16
/** Dot radius on screen, in px, at the start and at the end of the path. */
const PATH_DOT_PX_START = 2.6
const PATH_DOT_PX_END = 1.2

export function createProps(
    hole: HoleData,
    ground: HeightSampler,
    sunDir: THREE.Vector3,
    time: { value: number },
    castShadows: boolean
): Props {
    const group = new THREE.Group()
    const disposables: { dispose(): void }[] = []
    const keep = <T extends { dispose(): void }>(x: T): T => {
        disposables.push(x)
        return x
    }

    // --- Flagstick and flag.
    const flag = new THREE.Group()
    flag.position.set(hole.pin.x, hole.pin.y, hole.pin.z)
    const poleH = 2.15
    const pole = new THREE.Mesh(
        keep(new THREE.CylinderGeometry(0.014, 0.014, poleH, 8)),
        keep(new THREE.MeshLambertMaterial({ color: 0xf2efe4 }))
    )
    pole.position.y = poleH / 2
    pole.castShadow = castShadows
    flag.add(pole)

    const fw = 0.62
    const fh = 0.4
    const clothGeo = keep(new THREE.PlaneGeometry(fw, fh, 14, 6))
    clothGeo.translate(fw / 2, 0, 0)
    const wind = hole.conditions.windSpeed
    const clothMat = keep(
        new THREE.MeshLambertMaterial({
            color: 0xe8472c,
            // A little glow, so the flag reads in shade and from far away.
            emissive: 0x5a1408,
            side: THREE.DoubleSide,
        })
    )
    clothMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = time
        shader.uniforms.uWind = { value: Math.min(1, 0.35 + wind / 8) }
        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                '#include <common>\nuniform float uTime;\nuniform float uWind;'
            )
            .replace(
                '#include <begin_vertex>',
                /* glsl */ `#include <begin_vertex>
                {
                    float k = position.x / ${fw.toFixed(2)};
                    float ph = position.x * 9.0 - uTime * (3.0 + 4.0 * uWind);
                    transformed.z += sin(ph) * 0.05 * k * (0.5 + uWind);
                    transformed.z += sin(ph * 0.6 + position.y * 5.0) * 0.025 * k;
                    transformed.y -= k * k * 0.1 * (1.0 - uWind);
                    transformed.x -= k * k * 0.04 * (1.0 - uWind);
                }`
            )
    }
    clothMat.customProgramCacheKey = () => 'fw-flag'
    const cloth = new THREE.Mesh(clothGeo, clothMat)
    cloth.position.y = poleH - fh / 2 - 0.02
    // The flag points where the wind blows.
    cloth.rotation.y = -hole.conditions.windDirection
    cloth.castShadow = castShadows
    flag.add(cloth)
    group.add(flag)

    // --- Cup.
    const cup = new THREE.Mesh(
        keep(new THREE.CircleGeometry(0.054, 28)),
        keep(
            new THREE.MeshBasicMaterial({
                color: 0x0c0d0b,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -4,
            })
        )
    )
    cup.rotation.x = -Math.PI / 2
    cup.position.set(hole.pin.x, hole.pin.y + 0.004, hole.pin.z)
    group.add(cup)
    const rim = new THREE.Mesh(
        keep(new THREE.RingGeometry(0.054, 0.061, 28)),
        keep(
            new THREE.MeshBasicMaterial({
                color: 0xe9e6da,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -4,
            })
        )
    )
    rim.rotation.x = -Math.PI / 2
    rim.position.copy(cup.position)
    group.add(rim)

    // --- Tee markers, one on each side of the ball.
    const next = hole.centerline[1] ?? hole.pin
    let dx = next.x - hole.tee.x
    let dz = next.z - hole.tee.z
    const dl = Math.hypot(dx, dz) || 1
    dx /= dl
    dz /= dl
    // Classic markers: a coloured ball on a short peg.
    const markerGeo = keep(new THREE.SphereGeometry(0.04, 18, 12))
    const markerMat = keep(new THREE.MeshLambertMaterial({ color: 0x3f6fae }))
    const pegGeo = keep(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 8))
    const pegMat = keep(new THREE.MeshLambertMaterial({ color: 0xe9e4d4 }))
    for (const side of [-1, 1]) {
        const x = hole.tee.x - dz * side * 2.5
        const z = hole.tee.z + dx * side * 2.5
        const y = ground(x, z)
        const peg = new THREE.Mesh(pegGeo, pegMat)
        peg.position.set(x, y + 0.035, z)
        const m = new THREE.Mesh(markerGeo, markerMat)
        m.position.set(x, y + 0.1, z)
        m.castShadow = castShadows
        group.add(peg, m)
    }

    // --- Ball.
    const dimples = keep(createDimpleTexture())
    const ball = new THREE.Mesh(
        keep(new THREE.SphereGeometry(BALL_RADIUS, 28, 20)),
        keep(
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.38,
                metalness: 0,
                bumpMap: dimples,
                bumpScale: 0.6,
            })
        )
    )
    ball.visible = false
    group.add(ball)

    // A soft blob under the ball. The shadow map is too coarse for a ball.
    const spot = keep(createSpotTexture())
    const blob = new THREE.Mesh(
        keep(new THREE.CircleGeometry(1, 20)),
        keep(
            new THREE.MeshBasicMaterial({
                color: 0x0a1206,
                map: spot,
                transparent: true,
                opacity: 0.5,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -6,
                polygonOffsetUnits: -6,
            })
        )
    )
    blob.rotation.x = -Math.PI / 2
    blob.visible = false
    blob.renderOrder = 2
    group.add(blob)
    const ballPos = new THREE.Vector3()
    let ballVisible = false

    // --- Aim ring: a faint ring on the ground with a low, fading wall, so
    // it is still visible at a flat angle from 200 m away.
    const ringGeo = keep(new THREE.BufferGeometry())
    const ringPos = new Float32Array((RING_SEGMENTS + 1) * 4 * 3)
    const ringAlpha = new Float32Array((RING_SEGMENTS + 1) * 4)
    const ringIdx: number[] = []
    for (let i = 0; i < RING_SEGMENTS; i++) {
        const a = i * 4
        const b = a + 4
        // flat band: verts 0,1  wall: verts 2,3
        ringIdx.push(a, b, a + 1, a + 1, b, b + 1)
        ringIdx.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3)
    }
    for (let i = 0; i <= RING_SEGMENTS; i++) {
        ringAlpha[i * 4] = 1
        ringAlpha[i * 4 + 1] = 1
        ringAlpha[i * 4 + 2] = 0.4
        ringAlpha[i * 4 + 3] = 0
    }
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3))
    ringGeo.setAttribute('aAlpha', new THREE.BufferAttribute(ringAlpha, 1))
    ringGeo.setIndex(ringIdx)
    const ringMat = keep(
        new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: { uOpacity: { value: 0.45 } },
            vertexShader: /* glsl */ `
                attribute float aAlpha;
                varying float vAlpha;
                void main() {
                    vAlpha = aAlpha;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform float uOpacity;
                varying float vAlpha;
                void main() {
                    gl_FragColor = vec4(1.0, 0.98, 0.9, vAlpha * uOpacity);
                }
            `,
        })
    )
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.frustumCulled = false
    ring.visible = false
    ring.renderOrder = 3
    group.add(ring)
    let aim: Vec3 | null = null

    const rebuildRing = (camera: THREE.PerspectiveCamera) => {
        if (!aim) {
            return
        }
        const dist = Math.hypot(
            camera.position.x - aim.x,
            camera.position.y - aim.y,
            camera.position.z - aim.z
        )
        const radius = Math.max(1.2, dist * 0.02)
        const width = Math.max(0.1, dist * 0.0022)
        const wall = dist * 0.006
        for (let i = 0; i <= RING_SEGMENTS; i++) {
            const a = (i / RING_SEGMENTS) * Math.PI * 2
            const c = Math.cos(a)
            const s = Math.sin(a)
            const xi = aim.x + c * (radius - width)
            const zi = aim.z + s * (radius - width)
            const xo = aim.x + c * radius
            const zo = aim.z + s * radius
            const yi = ground(xi, zi) + 0.04
            const yo = ground(xo, zo) + 0.04
            const k = i * 12
            ringPos.set(
                [xi, yi, zi, xo, yo, zo, xo, yo, zo, xo, yo + wall, zo],
                k
            )
        }
        ringGeo.attributes.position.needsUpdate = true
    }

    // --- Path preview: small see-through dots, evenly spaced along the path.
    const dotMat = keep(
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            fog: false,
        })
    )
    const dots = new THREE.InstancedMesh(
        keep(new THREE.SphereGeometry(1, 10, 6)),
        dotMat,
        PATH_DOTS
    )
    dots.frustumCulled = false
    dots.visible = false
    dots.renderOrder = 4
    dots.count = 0
    group.add(dots)
    const dotPos: THREE.Vector3[] = []
    const dotMatrix = new THREE.Matrix4()

    /** Resample a polyline into evenly spaced dots (ball centres). */
    const placeDots = (points: Vec3[]) => {
        dotPos.length = 0
        let total = 0
        for (let i = 1; i < points.length; i++) {
            total += Math.hypot(
                points[i].x - points[i - 1].x,
                points[i].y - points[i - 1].y,
                points[i].z - points[i - 1].z
            )
        }
        if (total < 0.05) {
            return
        }
        const n = Math.min(PATH_DOTS, Math.max(4, Math.round(total / 0.25)))
        const step = total / n
        let seg = 1
        let segStart = 0
        for (let k = 1; k <= n; k++) {
            const want = k * step
            while (seg < points.length) {
                const a = points[seg - 1]
                const b = points[seg]
                const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
                if (segStart + len >= want || seg === points.length - 1) {
                    const f = len > 0 ? Math.min(1, (want - segStart) / len) : 0
                    dotPos.push(
                        new THREE.Vector3(
                            a.x + (b.x - a.x) * f,
                            a.y + (b.y - a.y) * f + BALL_RADIUS,
                            a.z + (b.z - a.z) * f
                        )
                    )
                    break
                }
                segStart += len
                seg++
            }
        }
    }

    const tmp = new THREE.Vector3()
    return {
        group,
        setBall(pos, visible) {
            ballPos.set(pos.x, pos.y, pos.z)
            ballVisible = visible
            ball.visible = visible
            blob.visible = visible
        },
        setAimRing(pos) {
            aim = pos ? { ...pos } : null
            ring.visible = aim !== null
        },
        setPathPreview(points) {
            if (points && points.length > 1) {
                placeDots(points)
            } else {
                dotPos.length = 0
            }
            dots.count = dotPos.length
            dots.visible = dotPos.length > 0
        },
        update(camera, viewportHeight) {
            const pxPerRad =
                viewportHeight /
                (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
            if (ballVisible) {
                // Keep the ball at least about 2 px in radius on screen.
                const dist = tmp.copy(ballPos).sub(camera.position).length()
                const s = Math.max(1, ((2.1 / pxPerRad) * dist) / BALL_RADIUS)
                ball.scale.setScalar(s)
                ball.position.set(
                    ballPos.x,
                    ballPos.y + BALL_RADIUS * s,
                    ballPos.z
                )
                // Shadow blob: where the sun ray through the ball meets
                // the ground. It fades and widens with height.
                const g0 = ground(ballPos.x, ballPos.z)
                const h = Math.max(0, ballPos.y - g0)
                const t = h / Math.max(sunDir.y, 0.1)
                const sx = ballPos.x - sunDir.x * t
                const sz = ballPos.z - sunDir.z * t
                blob.position.set(sx, ground(sx, sz) + 0.012, sz)
                const spread = 1 + Math.min(h * 0.25, 6)
                blob.scale.setScalar(BALL_RADIUS * 2.1 * s * spread)
                const m = blob.material as THREE.MeshBasicMaterial
                m.opacity = 0.5 / (1 + h * 0.12)
            }
            if (aim) {
                rebuildRing(camera)
            }
            if (dots.visible) {
                // Constant size on screen, a little smaller toward the end.
                const last = Math.max(1, dotPos.length - 1)
                for (let i = 0; i < dotPos.length; i++) {
                    const px =
                        PATH_DOT_PX_START +
                        (PATH_DOT_PX_END - PATH_DOT_PX_START) * (i / last)
                    const d = tmp.copy(dotPos[i]).sub(camera.position).length()
                    const r = Math.max(0.006, (px / pxPerRad) * d)
                    dotMatrix.makeScale(r, r, r).setPosition(dotPos[i])
                    dots.setMatrixAt(i, dotMatrix)
                }
                dots.instanceMatrix.needsUpdate = true
            }
            // The flag grows a little with distance so it reads from the tee.
            const fd = tmp
                .set(hole.pin.x, hole.pin.y, hole.pin.z)
                .sub(camera.position)
                .length()
            const fs = THREE.MathUtils.clamp(fd / 42, 1, 5)
            flag.scale.setScalar(fs)
        },
        dispose() {
            for (const d of disposables) {
                d.dispose()
            }
        },
    }
}
