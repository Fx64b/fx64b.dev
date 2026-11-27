import * as THREE from 'three'

import { SKY_GLSL, type SkyUniforms } from './atmosphere'

export interface Sky {
    mesh: THREE.Mesh
    dispose(): void
}

/**
 * A sky dome: soft gradient, sun glow, and a few light clouds. It is not tone
 * mapped, so its horizon colour is exactly the fog colour (three applies fog
 * after tone mapping).
 */
export function createSky(
    sky: SkyUniforms,
    noise: THREE.Texture,
    time: { value: number },
    clouds: boolean
): Sky {
    const geo = new THREE.SphereGeometry(1, 32, 16)
    const mat = new THREE.ShaderMaterial({
        uniforms: { ...sky, uNoise: { value: noise }, uTime: time },
        defines: clouds ? { FW_CLOUDS: '' } : {},
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        vertexShader: /* glsl */ `
            varying vec3 vDir;
            void main() {
                vDir = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            ${SKY_GLSL}
            uniform sampler2D uNoise;
            uniform float uTime;
            varying vec3 vDir;
            void main() {
                vec3 d = normalize(vDir);
                vec3 c = fwSky(d);
                float sd = max(dot(d, uSunDir), 0.0);
                c += uSunGlow * smoothstep(0.99955, 0.9998, sd) * 5.0;
                #ifdef FW_CLOUDS
                if (d.y > 0.01) {
                    vec2 uv = d.xz / (d.y + 0.22) * 0.11 + vec2(uTime * 0.0011, uTime * 0.0004);
                    float n = texture2D(uNoise, uv).b * 0.62
                        + texture2D(uNoise, uv * 2.3 + 0.37).r * 0.28
                        + texture2D(uNoise, uv * 5.3 + 0.11).g * 0.1;
                    float cov = smoothstep(0.5, 0.76, n) * smoothstep(0.01, 0.13, d.y);
                    float core = smoothstep(0.62, 0.92, n);
                    vec3 cc = mix(vec3(1.0, 0.9, 0.8), vec3(1.0, 0.975, 0.94), core);
                    cc = mix(cc, c, 0.22) * 1.05;
                    c = mix(c, cc, cov * 0.85);
                }
                #endif
                gl_FragColor = vec4(c, 1.0);
                #include <colorspace_fragment>
            }
        `,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.scale.setScalar(3000)
    mesh.renderOrder = -1000
    mesh.frustumCulled = false
    return {
        mesh,
        dispose() {
            geo.dispose()
            mat.dispose()
        },
    }
}
