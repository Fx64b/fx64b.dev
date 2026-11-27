// Fairway: the composition root. It creates the renderer, the UI, the input,
// the storage and the audio, connects them through the round controller and
// the menus (src/game/), and runs the frame loop.
import { createAudio } from './audio'
import { createRoundController } from './game/controller'
import { installDebugHook } from './game/debug'
import { createMenus } from './game/menus'
import { wireSoundSettings } from './game/sound'
import { createStorage } from './game/storage'
import { createInput } from './input'
import { type Quality, createRenderer } from './render'
import { createHud, createMinimap, createScreens, prefersTouch } from './ui'

/** Longest frame step in s: a stalled tab does not jump the ball ahead. */
const MAX_FRAME_S = 0.05

/** Phones get the low tier. ?quality=low|high overrides it. */
function pickQuality(params: URLSearchParams): Quality {
    const asked = params.get('quality')
    if (asked === 'low' || asked === 'high') {
        return asked
    }
    return prefersTouch() ? 'low' : 'high'
}

const params = new URLSearchParams(location.search)
const canvas = document.getElementById('view') as HTMLCanvasElement
const uiRoot = document.getElementById('ui') as HTMLElement

const renderer = createRenderer(canvas, { quality: pickQuality(params) })
const hud = createHud(uiRoot)
const minimap = createMinimap(uiRoot)
const screens = createScreens(uiRoot)
const input = createInput({ canvas, swingPad: hud.swingPad })
const storage = createStorage()
const audio = createAudio({
    enabled: storage.soundOn(),
    music: storage.musicOn(),
})
wireSoundSettings({ audio, storage, hud, screens })

// The renderer caps the pixel ratio for its quality tier.
function resize(): void {
    renderer.resize(
        window.innerWidth,
        window.innerHeight,
        window.devicePixelRatio || 1
    )
}
window.addEventListener('resize', resize)
resize()

const controller = createRoundController({
    renderer,
    hud,
    minimap,
    input,
    audio,
})
const menus = createMenus({ screens, hud, storage, controller })

let last = performance.now()
function frame(now: number): void {
    const dt = Math.min(MAX_FRAME_S, Math.max(0, (now - last) / 1000))
    last = now
    controller.step(dt)
    renderer.update(dt)
    renderer.render()
    audio.setListener(renderer.camera.position)
    audio.update()
    requestAnimationFrame(frame)
}

menus.start(params)
requestAnimationFrame(frame)
installDebugHook({ renderer, hud, input, audio, controller, menus })
