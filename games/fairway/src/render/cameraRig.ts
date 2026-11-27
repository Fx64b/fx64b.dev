/*
 * The cameras from SPEC section 4. The rig owns all smoothing: callers only
 * say where the ball is and what kind of view they want.
 */
import * as THREE from 'three'

import type { HoleData, Vec3 } from '../shared/hole'
import type { HeightSampler } from './height'

export const EYE_HEIGHT = 1.7
export const ADDRESS_BACK = 4

type Mode = 'none' | 'address' | 'follow' | 'glide' | 'overview'

const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)

export class CameraRig {
    readonly camera: THREE.PerspectiveCamera
    private mode: Mode = 'none'
    private ground: HeightSampler = () => 0
    private hole: HoleData | null = null

    private pos = new THREE.Vector3(0, 2, -3)
    private look = new THREE.Vector3(0, 0, 10)
    private wantPos = new THREE.Vector3()
    private wantLook = new THREE.Vector3()
    private posRate = 12
    private lookRate = 12

    private followDir = new THREE.Vector3(0, 0, 1)
    private fromPos = new THREE.Vector3()
    private fromLook = new THREE.Vector3()
    private glideT = 0
    private glideDur = 1
    private time = 0

    constructor() {
        this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.12, 6000)
    }

    setHole(hole: HoleData, ground: HeightSampler) {
        this.hole = hole
        this.ground = ground
        this.mode = 'none'
    }

    /** Field of view: 55 degrees high in landscape, wider in portrait. */
    setAspect(aspect: number) {
        const minH = THREE.MathUtils.degToRad(52)
        let v = 55
        if (aspect < 1) {
            v = THREE.MathUtils.radToDeg(
                2 * Math.atan(Math.tan(minH / 2) / aspect)
            )
            v = Math.min(v, 82)
        }
        this.camera.fov = v
        this.camera.aspect = aspect
        this.camera.updateProjectionMatrix()
    }

    private addressPose(
        ball: Vec3,
        aimAngle: number,
        outPos: THREE.Vector3,
        outLook: THREE.Vector3
    ) {
        const dx = Math.cos(aimAngle)
        const dz = Math.sin(aimAngle)
        const ex = ball.x - dx * ADDRESS_BACK
        const ez = ball.z - dz * ADDRESS_BACK
        // Eye height is measured from the higher of the ball and the ground
        // under the camera. On a raised tee the ground behind the ball is
        // lower, and the ball must not hide behind the tee edge.
        const ey = Math.max(this.ground(ex, ez), ball.y) + EYE_HEIGHT
        outPos.set(ex, ey, ez)
        // Look down the aim line about 10 degrees below the horizon. The
        // ball then sits a little below the centre of the view, clear of the
        // HUD at the bottom. Follow the land a little.
        const ahead = 26
        const gy = this.ground(ball.x + dx * ahead, ball.z + dz * ahead)
        const rise = THREE.MathUtils.clamp((gy - ball.y) * 0.45, -2.5, 3)
        outLook.set(
            ball.x + dx * (ahead - ADDRESS_BACK),
            ey - 4.6 + rise,
            ball.z + dz * (ahead - ADDRESS_BACK)
        )
    }

    address(ball: Vec3, aimAngle: number) {
        if (this.mode === 'glide') {
            // Keep gliding, toward the new target.
            this.addressPose(ball, aimAngle, this.wantPos, this.wantLook)
            return
        }
        this.addressPose(ball, aimAngle, this.wantPos, this.wantLook)
        if (this.mode !== 'address') {
            this.pos.copy(this.wantPos)
            this.look.copy(this.wantLook)
            this.mode = 'address'
        }
        this.posRate = 16
        this.lookRate = 16
    }

    follow(ball: Vec3, velocity: Vec3) {
        const speed = Math.hypot(velocity.x, velocity.z)
        if (this.mode !== 'follow') {
            // Start from the current view direction.
            this.followDir
                .set(this.look.x - this.pos.x, 0, this.look.z - this.pos.z)
                .normalize()
            this.mode = 'follow'
        }
        if (speed > 0.6) {
            const k = Math.min(1, speed / 12) * 0.2
            this.followDir.x += (velocity.x / speed - this.followDir.x) * k
            this.followDir.z += (velocity.z / speed - this.followDir.z) * k
            this.followDir.normalize()
        }
        const d = this.followDir
        const back = 6.5
        const px = ball.x - d.x * back
        const pz = ball.z - d.z * back
        const py = Math.max(ball.y + 2.3, this.ground(px, pz) + 1.5)
        this.wantPos.set(px, py, pz)
        // Look a little ahead of the ball, slightly above it.
        this.wantLook.set(ball.x + d.x * 3, ball.y + 0.6, ball.z + d.z * 3)
        this.posRate = 4.5
        this.lookRate = 11
    }

    glideTo(ball: Vec3, aimAngle: number, seconds: number) {
        this.addressPose(ball, aimAngle, this.wantPos, this.wantLook)
        if (seconds <= 0 || this.mode === 'none') {
            this.pos.copy(this.wantPos)
            this.look.copy(this.wantLook)
            this.mode = 'address'
            return
        }
        this.fromPos.copy(this.pos)
        this.fromLook.copy(this.look)
        this.glideT = 0
        this.glideDur = seconds
        this.mode = 'glide'
    }

    overview() {
        this.mode = 'overview'
        this.overviewPose(this.pos, this.look)
    }

    /**
     * Frames the whole hole, tee to green, from high behind the tee. The
     * distance comes from the size of the hole and the field of view, so
     * short par 3s and long par 5s both fit, also on a tall phone screen.
     */
    private overviewPose(outPos: THREE.Vector3, outLook: THREE.Vector3) {
        const hole = this.hole
        if (!hole) {
            return
        }
        const pts = [hole.tee, ...hole.centerline, hole.pin]
        const tx = hole.tee.x
        const tz = hole.tee.z
        let dx = hole.pin.x - tx
        let dz = hole.pin.z - tz
        const len = Math.hypot(dx, dz) || 1
        dx /= len
        dz /= len
        // Extent of the hole along and across the tee-to-pin line.
        let minA = 0
        let maxA = len
        let maxC = 0
        for (const p of pts) {
            const a = (p.x - tx) * dx + (p.z - tz) * dz
            const c = Math.abs(-(p.x - tx) * dz + (p.z - tz) * dx)
            minA = Math.min(minA, a)
            maxA = Math.max(maxA, a)
            maxC = Math.max(maxC, c)
        }
        const margin = 12
        const halfLen = (maxA - minA) / 2 + margin
        const halfWide = maxC + 32
        const mid = (minA + maxA) / 2
        const cx = tx + dx * mid
        const cz = tz + dz * mid
        const base = Math.max(hole.tee.y, hole.pin.y)

        // Look down at a fixed angle, with a slow sway to the side.
        const pitch = THREE.MathUtils.degToRad(31)
        const sway = 0.22 + Math.sin(this.time * 0.12) * 0.06
        const vHalf = THREE.MathUtils.degToRad(this.camera.fov) / 2
        const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect)
        // Distance so that the length fits the height of the view and the
        // width fits its width. The length is foreshortened by the pitch.
        const fitLen =
            (halfLen * Math.sin(pitch)) / Math.tan(vHalf) +
            halfLen * Math.cos(pitch)
        const fitWide = halfWide / Math.tan(hHalf) + halfLen * Math.cos(pitch)
        const dist = Math.max(fitLen, fitWide, 90)
        const bx = Math.cos(sway) * dx - Math.sin(sway) * dz
        const bz = Math.sin(sway) * dx + Math.cos(sway) * dz
        outPos.set(
            cx - bx * dist * Math.cos(pitch),
            base + dist * Math.sin(pitch),
            cz - bz * dist * Math.cos(pitch)
        )
        outLook.set(cx, base, cz)
    }

    update(dt: number) {
        this.time += dt
        if (this.mode === 'glide') {
            this.glideT = Math.min(1, this.glideT + dt / this.glideDur)
            const t = this.glideT
            const e = t * t * t * (t * (t * 6 - 15) + 10)
            this.pos.lerpVectors(this.fromPos, this.wantPos, e)
            this.look.lerpVectors(this.fromLook, this.wantLook, e)
            // A small lift in the middle, so the move clears the ground.
            this.pos.y += Math.sin(Math.PI * e) * 0.5
            if (t >= 1) {
                this.mode = 'address'
            }
        } else if (this.mode === 'overview') {
            this.overviewPose(this.pos, this.look)
        } else if (this.mode !== 'none') {
            this.pos.lerp(this.wantPos, damp(this.posRate, dt))
            this.look.lerp(this.wantLook, damp(this.lookRate, dt))
        }
        // Never go under the ground.
        if (this.mode !== 'none') {
            const g = this.ground(this.pos.x, this.pos.z) + 0.5
            if (this.pos.y < g) {
                this.pos.y = g
            }
        }
        this.camera.position.copy(this.pos)
        this.camera.up.set(0, 1, 0)
        this.camera.lookAt(this.look)
    }
}
