/*
 * The look of the day: sun direction, sky colours, haze. One place, so the
 * sky dome, the fog, the water reflection and the lights always agree.
 */
import * as THREE from 'three'

export interface Atmosphere {
    /** Unit vector toward the sun. */
    sunDir: THREE.Vector3
    sunColor: THREE.Color
    sunIntensity: number
    skyZenith: THREE.Color
    skyMid: THREE.Color
    skyHorizon: THREE.Color
    sunGlow: THREE.Color
    hemiSky: THREE.Color
    hemiGround: THREE.Color
    hemiIntensity: number
    fogDensity: number
    exposure: number
}

/** A quiet late afternoon: a warm, low sun from the side. */
export function createAtmosphere(): Atmosphere {
    return {
        sunDir: new THREE.Vector3(0.74, 0.36, 0.5).normalize(),
        sunColor: new THREE.Color(0xffca8c),
        sunIntensity: 3.05,
        skyZenith: new THREE.Color(0x5b8ec8),
        skyMid: new THREE.Color(0xb3cee2),
        skyHorizon: new THREE.Color(0xf5dab4),
        sunGlow: new THREE.Color(0xffc98a),
        hemiSky: new THREE.Color(0xc6d6f0),
        hemiGround: new THREE.Color(0x9a9a66),
        hemiIntensity: 1.7,
        fogDensity: 0.0017,
        exposure: 0.95,
    }
}

export type SkyUniforms = {
    uSunDir: { value: THREE.Vector3 }
    uSkyZenith: { value: THREE.Color }
    uSkyMid: { value: THREE.Color }
    uSkyHorizon: { value: THREE.Color }
    uSunGlow: { value: THREE.Color }
}

export function createSkyUniforms(a: Atmosphere): SkyUniforms {
    return {
        uSunDir: { value: a.sunDir },
        uSkyZenith: { value: a.skyZenith },
        uSkyMid: { value: a.skyMid },
        uSkyHorizon: { value: a.skyHorizon },
        uSunGlow: { value: a.sunGlow },
    }
}

/** GLSL: the clear-sky colour in a direction. Shared by sky and water. */
export const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSkyZenith;
uniform vec3 uSkyMid;
uniform vec3 uSkyHorizon;
uniform vec3 uSunGlow;

vec3 fwSky(vec3 d) {
    float h = max(d.y, 0.0);
    vec3 c = mix(uSkyHorizon, uSkyMid, smoothstep(0.0, 0.26, h));
    c = mix(c, uSkyZenith, smoothstep(0.12, 0.85, h));
    float sd = max(dot(d, uSunDir), 0.0);
    // A wide, gentle glow around the sun and a tighter bright core.
    c += uSunGlow * (0.08 * pow(sd, 2.0) + 0.26 * pow(sd, 7.0) + 0.5 * pow(sd, 48.0));
    return c;
}
`
