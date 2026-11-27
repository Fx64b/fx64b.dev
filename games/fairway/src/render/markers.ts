/*
 * Out of bounds: small white stakes along the edge of the playable area, as
 * on a real course. One instanced mesh.
 */
import * as THREE from 'three'

import { type HoleData, SURFACE_IDS } from '../shared/hole'
import type { HeightSampler } from './height'

export interface Markers {
    group: THREE.Group
    dispose(): void
}

const SPACING = 18
const HEIGHT = 0.95

export function createObStakes(hole: HoleData, ground: HeightSampler): Markers {
    const group = new THREE.Group()
    const b = hole.bounds
    const sf = hole.surfaces
    const waterId = SURFACE_IDS.indexOf('water')
    const isWater = (x: number, z: number) => {
        const c = Math.floor((x - sf.originX) / sf.cellSize)
        const r = Math.floor((z - sf.originZ) / sf.cellSize)
        return (
            c >= 0 &&
            r >= 0 &&
            c < sf.cols &&
            r < sf.rows &&
            sf.data[r * sf.cols + c] === waterId
        )
    }
    const spots: { x: number; z: number }[] = []
    const edge = (x0: number, z0: number, x1: number, z1: number) => {
        const len = Math.hypot(x1 - x0, z1 - z0)
        const n = Math.max(1, Math.round(len / SPACING))
        for (let i = 0; i < n; i++) {
            const t = i / n
            const x = x0 + (x1 - x0) * t
            const z = z0 + (z1 - z0) * t
            // Not in a pond that touches the edge.
            const ix = Math.min(Math.max(x, b.minX + 1), b.maxX - 1)
            const iz = Math.min(Math.max(z, b.minZ + 1), b.maxZ - 1)
            if (!isWater(ix, iz)) {
                spots.push({ x, z })
            }
        }
    }
    edge(b.minX, b.minZ, b.maxX, b.minZ)
    edge(b.maxX, b.minZ, b.maxX, b.maxZ)
    edge(b.maxX, b.maxZ, b.minX, b.maxZ)
    edge(b.minX, b.maxZ, b.minX, b.minZ)

    const geo = new THREE.CylinderGeometry(0.03, 0.036, HEIGHT, 6)
    geo.translate(0, HEIGHT / 2, 0)
    const mat = new THREE.MeshLambertMaterial({ color: 0xf0ede2 })
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length)
    const m = new THREE.Matrix4()
    spots.forEach((s, i) => {
        m.makeTranslation(s.x, ground(s.x, s.z) - 0.05, s.z)
        mesh.setMatrixAt(i, m)
    })
    mesh.frustumCulled = false
    group.add(mesh)
    return {
        group,
        dispose() {
            geo.dispose()
            mat.dispose()
            mesh.dispose()
        },
    }
}
