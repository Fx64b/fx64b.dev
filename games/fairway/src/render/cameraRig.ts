/*
 * The cameras from SPEC section 4. The rig owns all smoothing: callers only
 * say where the ball is and what kind of view they want.
 */
import * as THREE from 'three'

import type { HoleData, Vec3 } from '../shared/hole'
import type { HeightSampler } from './height'

export const EYE_HEIGHT = 1.7
export const ADDRESS_BACK = 4
/** Putting view: a crouched eye, further back, so slopes are readable. */
export const PUTT_EYE_HEIGHT = 0.9
export const PUTT_BACK = 5.2

type Mode = 'none' | 'address' | 'follow' | 'glide' | 'overview'

const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)

export class CameraRig {
    readonly camera: THREE.PerspectiveCamera
    private mode: Mode = 'none'
    private ground: HeightSampler = () => 0
    private hole: HoleData | null = null
    private isGreen: (x: number, z: number) => boolean = () => false
    /** 0 = normal address view, 1 = putting view. Smoothed. */
    private putt = 0
    private puttTarget = 0
    private lastBall: Vec3 = { x: 0, y: 0, z: 0 }
    private lastAim = 0

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

    setHole(
        hole: HoleData,
        ground: HeightSampler,
        isGreen: (x: number, z: number) => boolean
    ) {
        this.hole = hole
        this.ground = ground
        this.isGreen = isGreen
        this.mode = 'none'
        this.putt = 0
        this.puttTarget = 0
    }

    /** The current kind of view. */
    get view(): Mode {
        return this.mode
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

    /**
     * The address pose. `putt` blends from the standing view (0) to the
     * crouched putting view (1): lower, further back, and looking flatter,
     * so the ball and the cup area are both in view and the slopes of the
     * green show against the horizon.
     */
    private addressPose(
        ball: Vec3,
        aimAngle: number,
        putt: number,
        outPos: THREE.Vector3,
        outLook: THREE.Vector3
    ) {
        const dx = Math.cos(aimAngle)
        const dz = Math.sin(aimAngle)
        const back = THREE.MathUtils.lerp(ADDRESS_BACK, PUTT_BACK, putt)
        const eye = THREE.MathUtils.lerp(EYE_HEIGHT, PUTT_EYE_HEIGHT, putt)
        const ex = ball.x - dx * back
        const ez = ball.z - dz * back
        // Eye height is measured from the higher of the ball and the ground
        // under the camera. On a raised tee the ground behind the ball is
        // lower, and the ball must not hide behind the tee edge.
        const ey = Math.max(this.ground(ex, ez), ball.y) + eye
        outPos.set(ex, ey, ez)
        // Look down the aim line about 10 degrees below the horizon (about
        // 3 degrees when putting). The ball then sits a little below the
        // centre of the view, clear of the HUD at the bottom. Follow the
        // land a little.
        const ahead = 26
        const gy = this.ground(ball.x + dx * ahead, ball.z + dz * ahead)
        const rise =
            THREE.MathUtils.clamp((gy - ball.y) * 0.45, -2.5, 3) * (1 - putt)
        const drop = THREE.MathUtils.lerp(4.6, 1.3, putt)
        outLook.set(
            ball.x + dx * (ahead - back),
            ey - drop + rise,
            ball.z + dz * (ahead - back)
        )
    }

    address(ball: Vec3, aimAngle: number) {
        this.lastBall = { x: ball.x, y: ball.y, z: ball.z }
        this.lastAim = aimAngle
        this.puttTarget = this.isGreen(ball.x, ball.z) ? 1 : 0
        if (this.mode === 'glide') {
            // Keep gliding, toward the new target.
            this.putt = this.puttTarget
            this.addressPose(
                ball,
                aimAngle,
                this.putt,
                this.wantPos,
                this.wantLook
            )
            return
        }
        if (this.mode !== 'address') {
            this.putt = this.puttTarget
        }
        this.addressPose(ball, aimAngle, this.putt, this.wantPos, this.wantLook)
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
        // The glide itself is the blend into (or out of) the putting view.
        this.lastBall = { x: ball.x, y: ball.y, z: ball.z }
        this.lastAim = aimAngle
        this.puttTarget = this.isGreen(ball.x, ball.z) ? 1 : 0
        this.putt = this.puttTarget
        this.addressPose(ball, aimAngle, this.putt, this.wantPos, this.wantLook)
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
     * Frames the whole hole from high behind the tee and a little to the
     * side. The camera looks down at a fixed angle and moves in as close as
     * it can while the tee, the line of play and the green all stay inside
     * the view, so short par 3s and long par 5s both fill the screen, also
     * on a tall phone.
     */
    private overviewPose(outPos: THREE.Vector3, outLook: THREE.Vector3) {
        const hole = this.hole
        if (!hole) {
            return
        }
        const tx = hole.tee.x
        const tz = hole.tee.z
        let dx = hole.pin.x - tx
        let dz = hole.pin.z - tz
        const len = Math.hypot(dx, dz) || 1
        dx /= len
        dz /= len
        // What must be in view: the line of play, with room around the tee
        // and the green.
        const pts: { x: number; z: number }[] = []
        const around = (p: { x: number; z: number }, r: number) => {
            pts.push(
                { x: p.x + r, z: p.z },
                { x: p.x - r, z: p.z },
                { x: p.x, z: p.z + r },
                { x: p.x, z: p.z - r }
            )
        }
        around(hole.tee, 14)
        around(hole.pin, 24)
        for (const p of hole.centerline) {
            around(p, 22)
        }
        const base = Math.max(hole.tee.y, hole.pin.y)
        const pitch = THREE.MathUtils.degToRad(38)
        const sway = 0.24 + Math.sin(this.time * 0.12) * 0.06
        const bx = Math.cos(sway) * dx - Math.sin(sway) * dz
        const bz = Math.sin(sway) * dx + Math.cos(sway) * dz
        const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)
        const tanH = tanV * this.camera.aspect
        const cp = Math.cos(pitch)
        const sp = Math.sin(pitch)
        // Does everything fit at distance d when looking at (cx, cz)? Leave
        // room at the edges (more at the top and bottom, where the title
        // and the buttons are).
        const fits = (cx: number, cz: number, d: number) => {
            const ex = cx - bx * d * cp
            const ez = cz - bz * d * cp
            const ey = d * sp
            for (const p of pts) {
                const vx = p.x - ex
                const vz = p.z - ez
                const fwd = (vx * bx + vz * bz) * cp + ey * sp
                if (fwd < 1) {
                    return false
                }
                const right = -vx * bz + vz * bx
                const upv = (vx * bx + vz * bz) * sp - ey * cp
                if (
                    Math.abs(right) > fwd * tanH * 0.86 ||
                    Math.abs(upv) > fwd * tanV * 0.8
                ) {
                    return false
                }
            }
            return true
        }
        // Try look points along the hole and keep the one that lets the
        // camera come closest.
        let dist = Infinity
        let cx = tx
        let cz = tz
        for (let k = 0; k <= 8; k++) {
            const t = 0.3 + (0.4 * k) / 8
            const lx = tx + (hole.pin.x - tx) * t
            const lz = tz + (hole.pin.z - tz) * t
            let lo = 40
            let hi = 2500
            for (let i = 0; i < 18; i++) {
                const mid = (lo + hi) / 2
                if (fits(lx, lz, mid)) {
                    hi = mid
                } else {
                    lo = mid
                }
            }
            if (hi < dist) {
                dist = hi
                cx = lx
                cz = lz
            }
        }
        outPos.set(cx - bx * dist * cp, base + dist * sp, cz - bz * dist * cp)
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
            if (this.mode === 'address' && this.putt !== this.puttTarget) {
                // Ease between the standing and the putting view.
                const step = dt * 1.6
                const d = this.puttTarget - this.putt
                this.putt += Math.abs(d) <= step ? d : Math.sign(d) * step
                const t = this.putt * this.putt * (3 - 2 * this.putt)
                this.addressPose(
                    this.lastBall,
                    this.lastAim,
                    t,
                    this.wantPos,
                    this.wantLook
                )
            }
            this.pos.lerp(this.wantPos, damp(this.posRate, dt))
            this.look.lerp(this.wantLook, damp(this.lookRate, dt))
        }
        // Never go under the ground.
        if (this.mode !== 'none') {
            const g = this.ground(this.pos.x, this.pos.z) + 0.4
            if (this.pos.y < g) {
                this.pos.y = g
            }
        }
        this.camera.position.copy(this.pos)
        this.camera.up.set(0, 1, 0)
        this.camera.lookAt(this.look)
    }
}
