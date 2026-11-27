import * as THREE from 'three'

import type { WaterBody } from '../shared/hole'
import { SKY_GLSL, type SkyUniforms } from './atmosphere'
import type { TerrainUniforms } from './terrain'

export interface Water {
    group: THREE.Group
    dispose(): void
}

/**
 * Calm water: a flat sheet that mirrors the sky colour, with the dark far
 * bank near the horizon, slow ripples (high quality only) and a soft edge
 * where it meets the shore.
 */
export function createWater(
    bodies: readonly WaterBody[],
    sky: SkyUniforms,
    terrain: TerrainUniforms,
    time: { value: number },
    ripples: boolean
): Water {
    const group = new THREE.Group()
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
            ...sky,
            uNoise: terrain.uNoise,
            uSplatB: terrain.uSplatB,
            uSplatRect: terrain.uSplatRect,
            uTime: time,
            uDeep: { value: new THREE.Color(0x1f3d3d) },
            uBank: { value: new THREE.Color(0x2f4c2a) },
        },
        defines: ripples ? { FW_RIPPLES: '' } : {},
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
        vertexShader: /* glsl */ `
            #include <common>
            #include <fog_pars_vertex>
            varying vec3 vWorld;
            void main() {
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vWorld = wp.xyz;
                vec4 mvPosition = viewMatrix * wp;
                gl_Position = projectionMatrix * mvPosition;
                #include <fog_vertex>
            }
        `,
        fragmentShader: /* glsl */ `
            #include <common>
            #include <fog_pars_fragment>
            ${SKY_GLSL}
            uniform sampler2D uNoise;
            uniform sampler2D uSplatB;
            uniform vec4 uSplatRect;
            uniform float uTime;
            uniform vec3 uDeep;
            uniform vec3 uBank;
            varying vec3 vWorld;
            void main() {
                vec3 V = normalize(cameraPosition - vWorld);
                vec2 p = vWorld.xz;
                vec3 N = vec3(0.0, 1.0, 0.0);
                float wob = 0.5;
                #ifdef FW_RIPPLES
                vec2 r1 = texture2D(uNoise, p * 0.03 + uTime * vec2(0.007, 0.004)).rg - 0.5;
                vec2 r2 = texture2D(uNoise, p * 0.085 - uTime * vec2(0.005, 0.009)).gr - 0.5;
                N = normalize(vec3((r1.x + r2.x) * 0.02, 1.0, (r1.y + r2.y) * 0.02));
                wob = r1.x + 0.5;
                #endif
                vec3 R = reflect(-V, N);
                R.y = abs(R.y);
                vec3 refl = fwSky(R);
                refl *= vec3(0.86, 0.9, 0.95);
                // The far bank and its trees, mirrored: an uneven dark band.
                float az = atan(R.z, R.x);
                float line = 0.1 + 0.07 * texture2D(uNoise, vec2(az * 1.9, 0.37)).r;
                float bank = 1.0 - smoothstep(line - 0.02, line + 0.03, R.y + (wob - 0.5) * 0.01);
                refl = mix(refl, uBank, bank * 0.92);
                float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
                vec3 col = mix(uDeep, refl, clamp(fres + 0.22, 0.0, 1.0));
                float glint = pow(max(dot(R, uSunDir), 0.0), 260.0);
                col += uSunGlow * glint * 1.2;

                vec2 suv = (p - uSplatRect.xy) * uSplatRect.zw;
                float w = texture2D(uSplatB, suv).g;
                float shore = smoothstep(0.4, 0.6, w);
                col = mix(col * 1.12 + 0.03, col, smoothstep(0.5, 0.8, w));
                gl_FragColor = vec4(col, shore * 0.96);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
                #include <fog_fragment>
            }
        `,
    })
    const geos: THREE.BufferGeometry[] = []
    for (const body of bodies) {
        if (body.outline.length < 3) {
            continue
        }
        let cx = 0
        let cz = 0
        for (const p of body.outline) {
            cx += p.x
            cz += p.z
        }
        cx /= body.outline.length
        cz /= body.outline.length
        // A little larger than the outline: the terrain hides the rest, so
        // the shoreline follows the real ground.
        const shape = new THREE.Shape(
            body.outline.map(
                (p) =>
                    new THREE.Vector2(
                        cx + (p.x - cx) * 1.3,
                        cz + (p.z - cz) * 1.3
                    )
            )
        )
        const geo = new THREE.ShapeGeometry(shape)
        geo.rotateX(Math.PI / 2)
        geos.push(geo)
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.y = body.level
        mesh.renderOrder = 1
        group.add(mesh)
    }
    return {
        group,
        dispose() {
            for (const g of geos) {
                g.dispose()
            }
            mat.dispose()
        },
    }
}
