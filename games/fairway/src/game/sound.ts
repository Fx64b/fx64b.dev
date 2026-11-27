// The sound and music settings: the toggle buttons on the HUD and the title
// screen, the M and N keys, and a soft click for the menu buttons. The
// settings are stored, so they stay as the player left them.
import type { GameAudio } from '../audio'
import { isEditable } from '../input'
import type { Hud, Screens } from '../ui'
import type { Storage } from './storage'

export interface SoundSettingsDeps {
    audio: GameAudio
    storage: Storage
    hud: Hud
    screens: Screens
}

export function wireSoundSettings(deps: SoundSettingsDeps): void {
    const { audio, storage, hud, screens } = deps
    hud.setSound(audio.enabled())
    screens.setSound(audio.enabled())
    screens.setMusic(audio.musicEnabled())

    function toggleSound(): void {
        const on = !audio.enabled()
        audio.setEnabled(on)
        storage.setSoundOn(on)
        hud.setSound(on)
        screens.setSound(on)
    }

    function toggleMusic(): void {
        const on = !audio.musicEnabled()
        audio.setMusicEnabled(on)
        storage.setMusicOn(on)
        screens.setMusic(on)
    }

    hud.onSoundToggle(toggleSound)
    screens.onSoundToggle(toggleSound)
    screens.onMusicToggle(toggleMusic)

    // M mutes everything, N only the music. Not while typing a seed.
    window.addEventListener('keydown', (e) => {
        if (
            (e.code !== 'KeyM' && e.code !== 'KeyN') ||
            e.repeat ||
            e.ctrlKey ||
            e.metaKey ||
            e.altKey ||
            isEditable(e.target)
        ) {
            return
        }
        if (e.code === 'KeyM') {
            toggleSound()
        } else {
            toggleMusic()
        }
    })

    // A very soft click for the menu buttons.
    screens.el.addEventListener('click', (e) => {
        const target = e.target
        if (target instanceof Element && target.closest('button, summary')) {
            audio.uiClick()
        }
    })
}
