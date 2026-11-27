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
            uDeep: { value: new THREE.Color(0x1c3a3d) },
            uShallow: { value: new THREE.Color(0x4f7f78) },
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
            uniform vec3 uShallow;
            uniform vec3 uBank;
            varying vec3 vWorld;
            void main() {
                vec3 V = normalize(cameraPosition - vWorld);
                vec2 p = vWorld.xz;
                vec3 N = vec3(0.0, 1.0, 0.0);
                #ifdef FW_RIPPLES
                vec2 r1 = texture2D(uNoise, p * 0.03 + uTime * vec2(0.007, 0.004)).rg - 0.5;
                vec2 r2 = texture2D(uNoise, p * 0.085 - uTime * vec2(0.005, 0.009)).gr - 0.5;
                N = normalize(vec3((r1.x + r2.x) * 0.02, 1.0, (r1.y + r2.y) * 0.02));
                #endif
                vec3 R = reflect(-V, N);
                R.y = abs(R.y);
                // The sky in the water: taken a little higher up than the true
                // mirror direction, so a pond seen at a flat angle is still
                // blue and not the pale colour of the horizon.
                vec3 refl = fwSky(normalize(vec3(R.x, R.y * 2.0 + 0.22, R.z)));
                refl *= vec3(0.8, 0.86, 0.93);
                // The far bank and its trees, mirrored: an uneven dark band.
                float az = atan(R.z, R.x);
                float line = 0.075 + 0.05 * texture2D(uNoise, vec2(az * 0.55, 0.37)).b;
                // Use the flat mirror direction here: ripples would break the
                // band into blotches.
                float flatY = abs(V.y);
                float bank = 1.0 - smoothstep(line - 0.05, line + 0.07, flatY);
                refl = mix(refl, uBank, bank * 0.85);
                float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
                // Depth from the baked ground: 0 at the shore, 1 at 1.6 m.
                vec2 suv = (p - uSplatRect.xy) * uSplatRect.zw;
                float depth = texture2D(uSplatB, suv).b;
                // Lighter and clearer over the shelf, deep in the middle.
                vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 0.6, depth));
                vec3 col = mix(body, refl, clamp(fres + 0.18, 0.0, 1.0));
                float glint = pow(max(dot(R, uSunDir), 0.0), 260.0);
                col += uSunGlow * glint * 1.2;
                // A soft, slightly bright edge where the water thins out.
                float edge = smoothstep(0.0, 0.045, depth);
                col += vec3(0.05, 0.055, 0.045) * (1.0 - smoothstep(0.03, 0.16, depth));
                float alpha = edge * mix(0.6, 0.96, smoothstep(0.02, 0.4, depth));
                // Mirror-like at a flat angle even in the shallows.
                alpha = max(alpha, edge * clamp(fres * 1.3, 0.0, 0.96));
                gl_FragColor = vec4(col, alpha);
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
