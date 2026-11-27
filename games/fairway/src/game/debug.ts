// window.__fairway: a small hook for scripted screenshots and manual tests.
// It is not a public API and may change with the game.
//
//   __fairway.shoot(power, aimOffset?, club?)   hit a shot now (aim phase)
//   __fairway.playDaily('2026-11-27')           start a daily hole
//   __fairway.playSeed('alpha')                 start a seed
//   __fairway.phase                             'menu', 'aim', 'flight', ...
//   __fairway.round                             the round (ball, stats, ...)
//   __fairway.renderer / hud / input / audio    the live modules
import type { GameAudio } from '../audio'
import type { Input } from '../input'
import type { Renderer } from '../render'
import type { Hud } from '../ui'
import type { RoundController } from './controller'
import type { Menus } from './menus'

export interface DebugDeps {
    renderer: Renderer
    hud: Hud
    input: Input
    audio: GameAudio
    controller: RoundController
    menus: Menus
}

export function installDebugHook(deps: DebugDeps): void {
    const { renderer, hud, input, audio, controller, menus } = deps
    Object.assign(window, {
        __fairway: {
            renderer,
            hud,
            input,
            audio,
            get round() {
                return controller.round()
            },
            get phase() {
                return controller.phase()
            },
            playDaily: menus.playDaily,
            playSeed: menus.playSeed,
            shoot: controller.shoot,
        },
    })
}
