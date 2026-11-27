import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
    type Input,
    POWER_RAMP_S,
    createInput,
    powerForHold,
} from '../../../games/fairway/src/input'

function key(
    type: 'keydown' | 'keyup',
    code: string,
    init: KeyboardEventInit = {}
) {
    const e = new KeyboardEvent(type, {
        code,
        key: code === 'Space' ? ' ' : code,
        bubbles: true,
        cancelable: true,
        ...init,
    })
    window.dispatchEvent(e)
    return e
}

function pointer(
    target: EventTarget,
    type: string,
    init: { pointerId?: number; clientX?: number; button?: number } = {}
) {
    const e = new PointerEvent(type, {
        pointerId: 1,
        button: 0,
        bubbles: true,
        cancelable: true,
        ...init,
    })
    target.dispatchEvent(e)
    return e
}

describe('powerForHold', () => {
    it('ramps linearly and caps at 1 after 2.2 s', () => {
        expect(POWER_RAMP_S).toBe(2.2)
        expect(powerForHold(0)).toBe(0)
        expect(powerForHold(-1)).toBe(0)
        expect(powerForHold(1.1)).toBeCloseTo(0.5, 10)
        expect(powerForHold(0.55)).toBeCloseTo(0.25, 10)
        expect(powerForHold(2.2)).toBe(1)
        expect(powerForHold(3)).toBe(1)
    })
})

describe('createInput', () => {
    let canvas: HTMLCanvasElement
    let pad: HTMLElement
    let input: Input
    let t: number
    const now = () => t

    beforeEach(() => {
        t = 1000
        canvas = document.createElement('canvas')
        pad = document.createElement('div')
        document.body.append(canvas, pad)
        input = createInput({ canvas, swingPad: pad, now })
    })

    afterEach(() => {
        input.dispose()
        canvas.remove()
        pad.remove()
    })

    it('ramps power linearly while Space is held and caps it', () => {
        const start = vi.fn()
        const release = vi.fn()
        input.on('swingStart', start)
        input.on('swingRelease', release)

        expect(input.power()).toBe(0)
        const down = key('keydown', 'Space')
        expect(down.defaultPrevented).toBe(true)
        expect(start).toHaveBeenCalledTimes(1)
        expect(input.isCharging()).toBe(true)

        t += 550
        expect(input.power()).toBeCloseTo(0.25, 6)
        t += 550
        expect(input.power()).toBeCloseTo(0.5, 6)
        t += 1100
        expect(input.power()).toBeCloseTo(1, 6)
        t += 3000
        expect(input.power()).toBe(1)

        const up = key('keyup', 'Space')
        expect(up.defaultPrevented).toBe(true)
        expect(release).toHaveBeenCalledWith(1)
        expect(input.power()).toBe(0)
        expect(input.isCharging()).toBe(false)
    })

    it('releases with the power at release time', () => {
        const release = vi.fn()
        input.on('swingRelease', release)
        key('keydown', 'Space')
        t += 880
        key('keyup', 'Space')
        expect(release).toHaveBeenCalledTimes(1)
        expect(release.mock.calls[0][0]).toBeCloseTo(0.4, 6)
    })

    it('does not repeat-fire on Space auto-repeat', () => {
        const start = vi.fn()
        input.on('swingStart', start)
        key('keydown', 'Space')
        t += 300
        const rep = key('keydown', 'Space', { repeat: true })
        key('keydown', 'Space', { repeat: true })
        expect(rep.defaultPrevented).toBe(true)
        expect(start).toHaveBeenCalledTimes(1)
        // The start time is not reset by the repeats.
        expect(input.power()).toBeCloseTo(0.3 / POWER_RAMP_S, 6)
    })

    it('cancels the swing on window blur instead of hitting', () => {
        const release = vi.fn()
        const cancel = vi.fn()
        input.on('swingRelease', release)
        input.on('swingCancel', cancel)
        key('keydown', 'Space')
        t += 500
        window.dispatchEvent(new Event('blur'))
        expect(cancel).toHaveBeenCalledTimes(1)
        expect(input.isCharging()).toBe(false)
        key('keyup', 'Space')
        expect(release).not.toHaveBeenCalled()
    })

    it('cancels a pad swing on pointercancel', () => {
        const release = vi.fn()
        const cancel = vi.fn()
        input.on('swingRelease', release)
        input.on('swingCancel', cancel)
        pointer(pad, 'pointerdown')
        t += 300
        pointer(pad, 'pointercancel')
        expect(cancel).toHaveBeenCalledTimes(1)
        pointer(window, 'pointerup')
        expect(release).not.toHaveBeenCalled()
    })

    it('releases a pad swing when the pointer is released outside the pad', () => {
        const release = vi.fn()
        input.on('swingRelease', release)
        const down = pointer(pad, 'pointerdown', { pointerId: 7 })
        expect(down.defaultPrevented).toBe(true)
        expect(pad.hasAttribute('data-charging')).toBe(true)
        t += 1100
        // Another pointer does not release it.
        pointer(document.body, 'pointerup', { pointerId: 8 })
        expect(release).not.toHaveBeenCalled()
        pointer(document.body, 'pointerup', { pointerId: 7 })
        expect(release).toHaveBeenCalledTimes(1)
        expect(release.mock.calls[0][0]).toBeCloseTo(0.5, 6)
        expect(pad.hasAttribute('data-charging')).toBe(false)
    })

    it('ignores the swing while disabled and cancels on disable', () => {
        const start = vi.fn()
        const cancel = vi.fn()
        input.on('swingStart', start)
        input.on('swingCancel', cancel)
        key('keydown', 'Space')
        input.setEnabled(false)
        expect(cancel).toHaveBeenCalledTimes(1)
        key('keyup', 'Space')
        const e = key('keydown', 'Space')
        expect(start).toHaveBeenCalledTimes(1)
        // A menu is open: Space keeps its default behaviour.
        expect(e.defaultPrevented).toBe(false)
        pointer(pad, 'pointerdown')
        expect(start).toHaveBeenCalledTimes(1)
    })

    it('emits skip only on Enter while skippable, not on a click', () => {
        const skip = vi.fn()
        input.on('skip', skip)
        input.setEnabled(false)
        key('keydown', 'Enter')
        expect(skip).not.toHaveBeenCalled()
        input.setSkippable(true)
        const e = key('keydown', 'Space')
        expect(e.defaultPrevented).toBe(true)
        key('keydown', 'KeyX')
        pointer(canvas, 'pointerdown')
        pointer(pad, 'pointerdown')
        expect(skip).not.toHaveBeenCalled()
        key('keydown', 'Enter')
        key('keydown', 'Enter', { repeat: true })
        expect(skip).toHaveBeenCalledTimes(1)
    })

    it('blurs a focused button on Space so it is not clicked too', () => {
        const button = document.createElement('button')
        const click = vi.fn()
        button.addEventListener('click', click)
        document.body.append(button)
        button.focus()
        expect(document.activeElement).toBe(button)
        key('keydown', 'Space')
        expect(document.activeElement).not.toBe(button)
        key('keyup', 'Space')
        expect(click).not.toHaveBeenCalled()
        button.remove()
    })

    it('does not take keys typed into a text field', () => {
        const field = document.createElement('input')
        document.body.append(field)
        const start = vi.fn()
        input.on('swingStart', start)
        const e = new KeyboardEvent('keydown', {
            code: 'Space',
            key: ' ',
            bubbles: true,
            cancelable: true,
        })
        field.dispatchEvent(e)
        expect(start).not.toHaveBeenCalled()
        expect(e.defaultPrevented).toBe(false)
        field.remove()
    })

    it('steps and picks clubs with Q/E and 1-8', () => {
        const club = vi.fn()
        input.on('club', club)
        key('keydown', 'KeyQ')
        key('keydown', 'KeyE')
        key('keydown', 'Digit1')
        key('keydown', 'Digit8')
        key('keydown', 'Digit9')
        key('keydown', 'KeyE', { repeat: true })
        expect(club.mock.calls).toEqual([
            [-1],
            [1],
            [{ index: 0 }],
            [{ index: 7 }],
        ])
    })

    it('aims continuously while A/D is held, with acceleration', () => {
        const aim = vi.fn()
        input.on('aim', aim)
        key('keydown', 'KeyD')
        input.update(0.1)
        const first = aim.mock.calls[0][0] as number
        expect(first).toBeGreaterThan(0)
        for (let i = 0; i < 20; i++) {
            input.update(0.1)
        }
        const later = aim.mock.calls.at(-1)?.[0] as number
        expect(later).toBeGreaterThan(first * 3)
        key('keyup', 'KeyD')
        aim.mockClear()
        input.update(0.1)
        expect(aim).not.toHaveBeenCalled()

        key('keydown', 'ArrowLeft')
        input.update(0.1)
        expect(aim.mock.calls[0][0]).toBeLessThan(0)
        // Both directions cancel out.
        key('keydown', 'ArrowRight')
        aim.mockClear()
        input.update(0.1)
        expect(aim).not.toHaveBeenCalled()
    })

    it('aims by dragging on the canvas', () => {
        const aim = vi.fn()
        input.on('aim', aim)
        pointer(canvas, 'pointerdown', { clientX: 100 })
        pointer(canvas, 'pointermove', { clientX: 140 })
        pointer(canvas, 'pointermove', { clientX: 120 })
        pointer(canvas, 'pointerup', { clientX: 120 })
        pointer(canvas, 'pointermove', { clientX: 300 })
        expect(aim).toHaveBeenCalledTimes(2)
        expect(aim.mock.calls[0][0]).toBeGreaterThan(0)
        expect(aim.mock.calls[1][0]).toBeLessThan(0)
    })

    it('blocks the context menu on the canvas and the pad', () => {
        const e = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
        })
        pad.dispatchEvent(e)
        expect(e.defaultPrevented).toBe(true)
    })

    it('unsubscribes and disposes', () => {
        const start = vi.fn()
        const off = input.on('swingStart', start)
        off()
        key('keydown', 'Space')
        expect(start).not.toHaveBeenCalled()
        key('keyup', 'Space')
        input.dispose()
        const s2 = vi.fn()
        input.on('swingStart', s2)
        key('keydown', 'Space')
        expect(s2).not.toHaveBeenCalled()
    })
})
