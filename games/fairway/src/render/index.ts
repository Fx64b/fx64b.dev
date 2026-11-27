/*
 * Fairway renderer. Builds a Three.js scene from a HoleData and owns the
 * cameras. See SPEC.md sections 1 and 4.
 */
import * as THREE from 'three'

import { createGround as createCourseGround } from '../course'
import type { HoleData, Vec3 } from '../shared/hole'
import {
    type Atmosphere,
    createAtmosphere,
    createSkyUniforms,
} from './atmosphere'
import { CameraRig } from './cameraRig'
import type { HeightSampler } from './height'
import { type Props, createProps } from './props'
import { type Sky, createSky } from './sky'
import {
    type Quality,
    type Terrain,
    createGround,
    createTerrain,
} from './terrain'
import { createNoiseTexture } from './textures'
import { type Trees, createBackdropTrees, createTrees } from './trees'
import { type Water, createWater } from './water'

export type { Quality } from './terrain'
export { BALL_RADIUS } from './props'
export { EYE_HEIGHT, ADDRESS_BACK } from './cameraRig'

export interface RendererOptions {
    quality?: Quality
}

export interface RenderStats {
    drawCalls: number
    triangles: number
    geometries: number
    textures: number
}

export interface Renderer {
    /** Build or rebuild the scene. */
    setHole(hole: HoleData): void
    /** pos is the point where the ball touches the ground (its bottom). */
    setBall(pos: Vec3, visible?: boolean): void
    /** A faint ring at the nominal carry. null hides it. */
    setAimRing(pos: Vec3 | null): void

    /** Eye 1.7 m, 3 m behind the ball on the aim line. aimAngle is in
     *  radians, atan2(dz, dx). Snaps on the first call, then smooths. */
    cameraAddress(ball: Vec3, aimAngle: number): void
    /** Chase camera, smoothed, level horizon. Call each frame of a shot. */
    cameraFollow(ball: Vec3, velocity: Vec3): void
    /** Smooth move to the next address position. */
    cameraGlideTo(ball: Vec3, aimAngle: number, seconds: number): void
    /** A high overview of the hole. */
    cameraOverview(): void

    /** Animations (flag, water, clouds) and camera smoothing. */
    update(dt: number): void
    render(): void
    resize(width: number, height: number, pixelRatio: number): void
    dispose(): void

    // --- Additions to the base API.
    readonly quality: Quality
    /** Rebuilds the scene at another quality tier. */
    setQuality(quality: Quality): void
    /** Rendered ground height (same as the hole data, also out of bounds). */
    groundHeight(x: number, z: number): number
    /** World point to CSS pixels, for HUD labels. */
    project(pos: Vec3): { x: number; y: number; visible: boolean }
    /** The camera, read only. */
    readonly camera: THREE.PerspectiveCamera
    /** Draw calls and triangles of the last frame. */
    stats(): RenderStats
}

interface World {
    terrain: Terrain
    trees: Trees
    water: Water
    props: Props
    sampler: HeightSampler
}

const SHADOW_MAP = 1536

export function createRenderer(
    canvas: HTMLCanvasElement,
    opts: RendererOptions = {}
): Renderer {
    let quality: Quality = opts.quality ?? 'high'
    const atmo: Atmosphere = createAtmosphere()

    const gl = new THREE.WebGLRenderer({
        canvas,
        antialias: quality === 'high',
        powerPreference: 'high-performance',
    })
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = atmo.exposure
    gl.shadowMap.type = THREE.PCFShadowMap

    const scene = new THREE.Scene()
    const fog = new THREE.FogExp2(atmo.skyHorizon.getHex(), atmo.fogDensity)
    scene.fog = fog

    const rig = new CameraRig()
    const camera = rig.camera

    const time = { value: 0 }
    const noise = createNoiseTexture()
    const skyUniforms = createSkyUniforms(atmo)

    const hemi = new THREE.HemisphereLight(
        atmo.hemiSky,
        atmo.hemiGround,
        atmo.hemiIntensity
    )
    scene.add(hemi)
    const sun = new THREE.DirectionalLight(atmo.sunColor, atmo.sunIntensity)
    sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP)
    sun.shadow.bias = -0.0006
    sun.shadow.normalBias = 0.12
    sun.shadow.radius = 4
    sun.shadow.intensity = 0.88
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 1400
    scene.add(sun)
    scene.add(sun.target)

    let sky: Sky | null = null
    let world: World | null = null
    let hole: HoleData | null = null
    let width = canvas.clientWidth || canvas.width || 1
    let height = canvas.clientHeight || canvas.height || 1
    let pixelRatio = 1

    const applyQuality = () => {
        const high = quality === 'high'
        gl.shadowMap.enabled = high
        sun.castShadow = high
        if (sky) {
            scene.remove(sky.mesh)
            sky.dispose()
        }
        sky = createSky(skyUniforms, noise, time, true)
        scene.add(sky.mesh)
        applySize()
    }

    const applySize = () => {
        const cap = quality === 'high' ? 2 : 1.25
        gl.setPixelRatio(Math.min(pixelRatio, cap))
        gl.setSize(width, height, false)
        rig.setAspect(width / height)
    }

    const disposeWorld = () => {
        if (!world) {
            return
        }
        scene.remove(
            world.terrain.group,
            world.trees.group,
            world.water.group,
            world.props.group
        )
        world.terrain.dispose()
        world.trees.dispose()
        world.water.dispose()
        world.props.dispose()
        world = null
    }

    const build = (h: HoleData) => {
        disposeWorld()
        hole = h
        const high = quality === 'high'
        // The same ground function as the physics, so the ball always sits
        // on the drawn surface.
        const sampler = createCourseGround(h).height
        const ground = createGround(h, sampler)
        const backdrop = createBackdropTrees(h, ground, quality)
        const terrain = createTerrain(
            h,
            sampler,
            ground,
            quality,
            noise,
            atmo.sunDir,
            [...h.trees, ...backdrop],
            high
        )
        const trees = createTrees(h.trees, backdrop, quality, time, noise, high)
        const water = createWater(
            h.water,
            skyUniforms,
            terrain.uniforms,
            time,
            high
        )
        const props = createProps(h, terrain.ground, atmo.sunDir, time, high)
        scene.add(terrain.group, trees.group, water.group, props.group)
        world = { terrain, trees, water, props, sampler }
        rig.setHole(h, terrain.ground)
        rig.overview()
    }

    // Shadow area: follows the view. It is small and sharp when the camera
    // is near the ground, and grows with the distance to what is on screen.
    const fwd = new THREE.Vector3()
    const centre = new THREE.Vector3()
    const lightRight = new THREE.Vector3()
    const lightUp = new THREE.Vector3()
    lightRight.crossVectors(new THREE.Vector3(0, 1, 0), atmo.sunDir).normalize()
    lightUp.crossVectors(atmo.sunDir, lightRight).normalize()
    const updateShadows = () => {
        if (!world) {
            return
        }
        camera.getWorldDirection(fwd)
        const g = world.terrain.ground(camera.position.x, camera.position.z)
        const above = Math.max(1, camera.position.y - g)
        // Distance along the view to the ground, limited.
        const reach = fwd.y < -0.02 ? Math.min(above / -fwd.y, 420) : 420
        const dist = THREE.MathUtils.clamp(reach * 0.6, 30, 260)
        const half = THREE.MathUtils.clamp(dist * 1.45, 62, 300)
        centre.copy(camera.position).addScaledVector(fwd, dist)
        centre.y = world.terrain.ground(centre.x, centre.z)
        // Snap to shadow texels, so shadows do not swim when the view moves.
        const texel = (half * 2) / SHADOW_MAP
        const r = Math.round(centre.dot(lightRight) / texel) * texel
        const u = Math.round(centre.dot(lightUp) / texel) * texel
        const d = centre.dot(atmo.sunDir)
        centre
            .set(0, 0, 0)
            .addScaledVector(lightRight, r)
            .addScaledVector(lightUp, u)
            .addScaledVector(atmo.sunDir, d)
        const cam = sun.shadow.camera
        if (cam.right !== half) {
            cam.left = -half
            cam.right = half
            cam.top = half
            cam.bottom = -half
            cam.updateProjectionMatrix()
        }
        sun.target.position.copy(centre)
        sun.position.copy(centre).addScaledVector(atmo.sunDir, 600)
        sun.target.updateMatrixWorld()
        world.terrain.uniforms.uShadowArea.value.set(centre.x, centre.z, half)
        world.trees.setFarShadows(half > 110)
    }

    sun.position.copy(atmo.sunDir).multiplyScalar(600)
    applyQuality()

    const v = new THREE.Vector3()
    return {
        get quality() {
            return quality
        },
        camera,
        setHole(h) {
            build(h)
        },
        setQuality(q) {
            if (q === quality) {
                return
            }
            quality = q
            applyQuality()
            if (hole) {
                build(hole)
            }
        },
        setBall(pos, visible = true) {
            world?.props.setBall(pos, visible)
        },
        setAimRing(pos) {
            world?.props.setAimRing(pos)
        },
        cameraAddress(ball, aimAngle) {
            rig.address(ball, aimAngle)
        },
        cameraFollow(ball, velocity) {
            rig.follow(ball, velocity)
        },
        cameraGlideTo(ball, aimAngle, seconds) {
            rig.glideTo(ball, aimAngle, seconds)
        },
        cameraOverview() {
            rig.overview()
        },
        update(dt) {
            time.value += dt
            rig.update(dt)
            // The haze is thinner when the camera looks down from high up.
            const lift = world
                ? camera.position.y -
                  world.terrain.ground(camera.position.x, camera.position.z)
                : 0
            fog.density =
                atmo.fogDensity *
                THREE.MathUtils.clamp(1 - (lift - 25) / 330, 0.42, 1)
            if (!world) {
                return
            }
            world.trees.regroup(camera.position.x, camera.position.z)
            world.props.update(camera, height)
            if (quality === 'high') {
                updateShadows()
            }
        },
        render() {
            if (sky) {
                sky.mesh.position.copy(camera.position)
            }
            gl.render(scene, camera)
        },
        resize(w, h, pr) {
            width = Math.max(1, w)
            height = Math.max(1, h)
            pixelRatio = pr
            applySize()
        },
        groundHeight(x, z) {
            return world ? world.terrain.ground(x, z) : 0
        },
        project(pos) {
            v.set(pos.x, pos.y, pos.z).project(camera)
            return {
                x: (v.x * 0.5 + 0.5) * width,
                y: (-v.y * 0.5 + 0.5) * height,
                visible: v.z > -1 && v.z < 1,
            }
        },
        stats() {
            return {
                drawCalls: gl.info.render.calls,
                triangles: gl.info.render.triangles,
                geometries: gl.info.memory.geometries,
                textures: gl.info.memory.textures,
            }
        },
        dispose() {
            disposeWorld()
            sky?.dispose()
            noise.dispose()
            gl.dispose()
        },
    }
}
