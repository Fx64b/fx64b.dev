import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type Hud, createHud } from '../../../games/fairway/src/ui/hud'
import {
    type Screens,
    createScreens,
} from '../../../games/fairway/src/ui/screens'

function text(root: ParentNode, sel: string): string {
    return (
        root.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    )
}

describe('HUD', () => {
    let root: HTMLElement
    let hud: Hud

    beforeEach(() => {
        vi.useFakeTimers()
        root = document.createElement('div')
        document.body.append(root)
        hud = createHud(root)
    })

    afterEach(() => {
        hud.dispose()
        root.remove()
        vi.useRealTimers()
    })

    it('renders and updates', () => {
        hud.setHoleInfo({ number: 12, par: 4 })
        hud.setStrokes(2)
        hud.setLie('firstCut')
        hud.setDistance(137.16)
        hud.setClub(3, 145)
        hud.setWind(3.9, Math.PI / 2)

        expect(text(root, '.fw-hole-title')).toBe('Hole #12')
        expect(text(root, '.fw-hole-meta')).toBe('Par 4Strokes 2')
        expect(text(root, '.fw-lie')).toBe('First cut')
        expect(
            root.querySelector('.fw-lie-dot')?.getAttribute('data-lie')
        ).toBe('firstCut')
        expect(text(root, '.fw-shot')).toBe('150ydTo pin159yd7 Iron')
        expect(text(root, '.fw-wind .fw-big')).toBe('14km/h')
        expect(
            (root.querySelector('.fw-wind-arrow') as SVGElement).style.transform
        ).toBe('rotate(90.00deg)')

        const pressed = root.querySelectorAll('.fw-club[aria-pressed="true"]')
        expect(pressed).toHaveLength(1)
        expect(pressed[0].getAttribute('data-index')).toBe('3')
    })

    it('shows a seed title and calm wind', () => {
        hud.setHoleInfo({ number: 0, par: 3, title: 'Seed maple' })
        hud.setWind(0.05, 1)
        expect(text(root, '.fw-hole-title')).toBe('Seed maple')
        expect(text(root, '.fw-wind .fw-num')).toBe('Calm')
        expect(
            root.querySelector<HTMLElement>('.fw-wind .fw-unit')?.hidden
        ).toBe(true)
        hud.setClub(7, null)
        expect(text(root, '.fw-shot')).toContain('Putter')
    })

    it('turns the wind arrow the short way', () => {
        const arrow = root.querySelector('.fw-wind-arrow') as SVGElement
        hud.setWind(5, (170 * Math.PI) / 180)
        hud.setWind(5, (-170 * Math.PI) / 180)
        expect(arrow.style.transform).toBe('rotate(190.00deg)')
    })

    it('reports club clicks', () => {
        const cb = vi.fn()
        hud.onClubSelect(cb)
        ;(root.querySelector('.fw-club[data-index="5"]') as HTMLElement).click()
        expect(cb).toHaveBeenCalledWith(5)
    })

    it('fills the power meter and lingers after release', () => {
        const fill = root.querySelector('.fw-meter-fill') as HTMLElement
        const meter = root.querySelector('.fw-meter') as HTMLElement
        hud.setPower(0.5)
        expect(fill.style.transform).toBe('scaleY(0.5)')
        expect(hud.swingPad.hasAttribute('data-active')).toBe(true)
        hud.setPower(1.4)
        expect(fill.style.transform).toBe('scaleY(1)')
        expect(meter.getAttribute('aria-valuenow')).toBe('100')
        hud.setPower(0)
        expect(hud.swingPad.hasAttribute('data-active')).toBe(false)
        expect(fill.style.transform).toBe('scaleY(1)')
        vi.advanceTimersByTime(1000)
        expect(fill.style.transform).toBe('scaleY(0)')
    })

    it('shows toasts, skip and the hint', () => {
        const toast = root.querySelector('.fw-toast') as HTMLElement
        hud.toast('In the water. +1 stroke')
        expect(toast.textContent).toBe('In the water. +1 stroke')
        expect(toast.hasAttribute('data-show')).toBe(true)
        vi.advanceTimersByTime(2300)
        expect(toast.hasAttribute('data-show')).toBe(false)

        const skip = vi.fn()
        hud.onSkip(skip)
        hud.showSkip(true)
        expect(hud.el.dataset.mode).toBe('flight')
        ;(root.querySelector('.fw-skip') as HTMLElement).click()
        expect(skip).toHaveBeenCalledTimes(1)
        hud.showSkip(false)
        expect(hud.el.dataset.mode).toBe('aim')

        const dismissed = vi.fn()
        hud.onHintDismiss(dismissed)
        hud.showHint(true)
        const hint = root.querySelector('.fw-hint') as HTMLElement
        expect(hint.hidden).toBe(false)
        expect(hint.textContent).toContain('release to hit')
        ;(hint.querySelector('button') as HTMLElement).click()
        expect(hint.hidden).toBe(true)
        expect(dismissed).toHaveBeenCalledTimes(1)
    })

    it('contains no emoji', () => {
        hud.toast('In the hole!')
        expect(root.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
    })
})

describe('Screens', () => {
    let root: HTMLElement
    let screens: Screens

    beforeEach(() => {
        root = document.createElement('div')
        document.body.append(root)
        screens = createScreens(root)
    })

    afterEach(() => {
        screens.dispose()
        root.remove()
    })

    it('starts hidden', () => {
        expect(screens.current()).toBe(null)
        expect(screens.el.hasAttribute('data-hidden')).toBe(true)
    })

    it('renders the title and reports choices', () => {
        const daily = vi.fn()
        const random = vi.fn()
        const archive = vi.fn()
        const seed = vi.fn()
        screens.onPlayDaily(daily)
        screens.onPlayRandom(random)
        screens.onOpenArchive(archive)
        screens.onPlaySeed(seed)

        screens.showTitle({
            date: '2026-11-27',
            number: 1,
            par: 4,
            lengthM: 376.7328,
            result: null,
        })
        expect(screens.current()).toBe('title')
        expect(screens.el.hasAttribute('data-hidden')).toBe(false)
        expect(text(root, '.fw-wordmark')).toBe('Fairway')
        expect(text(root, '.fw-today')).toContain('Hole #1')
        expect(text(root, '.fw-today')).toContain('Par 4')
        expect(text(root, '.fw-today')).toContain('412 yd')

        const buttons = [...root.querySelectorAll('button')]
        buttons.find((b) => b.textContent === 'Play')?.click()
        buttons.find((b) => b.textContent?.includes('Random'))?.click()
        buttons.find((b) => b.textContent?.includes('Archive'))?.click()
        expect(daily).toHaveBeenCalledTimes(1)
        expect(random).toHaveBeenCalledTimes(1)
        expect(archive).toHaveBeenCalledTimes(1)

        const input = root.querySelector('.fw-seed input') as HTMLInputElement
        input.value = '  maple  '
        input.dispatchEvent(new Event('input'))
        ;(root.querySelector('.fw-seed') as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true })
        )
        expect(seed).toHaveBeenCalledWith('maple')
    })

    it('shows the result of a played day on the title', () => {
        screens.showTitle({
            date: '2026-11-27',
            number: 1,
            par: 4,
            lengthM: 380,
            result: { strokes: 5, par: 4 },
        })
        expect(text(root, '.fw-today-result')).toContain('5 Bogey')
        expect(text(root, '.fw-today')).toContain('Play again (practice)')
    })

    it('renders the archive with played and unplayed days', () => {
        const date = vi.fn()
        const back = vi.fn()
        screens.onPlayDate(date)
        screens.onBack(back)
        screens.showArchive([
            { date: '2026-11-27', number: 1, par: 4, strokes: null },
            { date: '2026-11-29', number: 3, par: 3, strokes: 2 },
            { date: '2026-11-28', number: 2, par: 5, strokes: 6 },
        ])
        const rows = [...root.querySelectorAll<HTMLElement>('.fw-archive-row')]
        expect(rows.map((r) => r.dataset.date)).toEqual([
            '2026-11-29',
            '2026-11-28',
            '2026-11-27',
        ])
        expect(rows.map((r) => r.dataset.played)).toEqual([
            'true',
            'true',
            'false',
        ])
        expect(text(rows[0], '.fw-archive-score')).toBe('2 par 3\u22121')
        expect(text(root, '.fw-archive-sub')).toBe('2 of 3 holes played')
        rows[2].click()
        expect(date).toHaveBeenCalledWith('2026-11-27')

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        expect(back).toHaveBeenCalledWith('archive')
    })

    it('renders the result, copies the share text and navigates', async () => {
        const again = vi.fn()
        const back = vi.fn()
        screens.onPlayAgain(again)
        screens.onBack(back)
        screens.showResult({
            number: 12,
            seed: '2026-12-08',
            par: 4,
            strokes: 3,
            putts: 1,
            penalties: 0,
            bunkers: 1,
            official: false,
        })
        expect(screens.current()).toBe('result')
        expect(text(root, '.fw-result-score')).toBe('Birdie')
        expect(text(root, '.fw-result-sub')).toContain('Practice')
        const share =
            'Fairway #12 - 3 (par 4)\nBirdie - 1 putt, no penalties, 1 bunker'
        expect(root.querySelector('.fw-share-text')?.textContent).toBe(share)

        const write = vi.mocked(navigator.clipboard.writeText)
        write.mockClear()
        ;(root.querySelector('.fw-copy') as HTMLElement).click()
        await Promise.resolve()
        await Promise.resolve()
        expect(write).toHaveBeenCalledWith(share)
        expect(text(root, '.fw-copy')).toBe('Copied')

        const buttons = [...root.querySelectorAll('button')]
        buttons.find((b) => b.textContent === 'Play again (practice)')?.click()
        buttons.find((b) => b.textContent === 'Back to title')?.click()
        expect(again).toHaveBeenCalledTimes(1)
        expect(back).toHaveBeenCalledWith('result')

        screens.hide()
        expect(screens.current()).toBe(null)
        expect(screens.el.hasAttribute('data-hidden')).toBe(true)
    })
})
