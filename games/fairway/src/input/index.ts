// Keyboard, mouse and touch input for a round (SPEC 3).
//
// - Aim: A/D or the arrow keys (continuous while held, with acceleration;
//   Shift for fine aim), or a drag on the canvas. Positive deltas turn the
//   aim to the player's right (clockwise seen from above).
// - Club: Q/E step, 1-8 pick, or the HUD club bar (that one is the HUD's).
// - Swing: hold Space or the swing pad, release to hit. Power rises linearly
//   from 0 to 1 over POWER_RAMP_S and is then capped.
// - Skip: while skippable (ball in flight), Enter skips. The HUD has a Skip
//   button. A click or tap on the view does not skip.
//
// A window blur, a hidden page or a pointercancel cancels a swing; it never
// hits a shot.

export const POWER_RAMP_S = 2.2

/** Power for a hold time in seconds: linear over POWER_RAMP_S, capped at 1. */
export function powerForHold(seconds: number): number {
    if (!(seconds > 0)) {
        return 0
    }
    return Math.min(1, seconds / POWER_RAMP_S)
}

export type ClubStep = -1 | 1 | { index: number }

export interface InputEvents {
    aim: (deltaRadians: number) => void
    club: (dir: ClubStep) => void
    swingStart: () => void
    swingRelease: (power: number) => void
    /** The swing was cancelled (blur, pointercancel, disabled). No shot. */
    swingCancel: () => void
    skip: () => void
}

export type InputEvent = keyof InputEvents

export interface Input {
    on<K extends InputEvent>(event: K, cb: InputEvents[K]): () => void
    /** Current charge 0..1 while holding, else 0. */
    power(): number
    isCharging(): boolean
    /** Aim, club and swing input. Off while the ball moves or a menu is
     *  open. Turning it off cancels a swing in progress. */
    setEnabled(v: boolean): void
    isEnabled(): boolean
    /** While true, Enter emits 'skip'. Clicks and taps do not. */
    setSkippable(v: boolean): void
    /** Cancel a swing in progress (emits 'swingCancel'). */
    cancelSwing(): void
    /** Call every frame with the frame time in seconds. */
    update(dt: number): void
    dispose(): void
}

export interface AimOptions {
    /** Key aim speed at the start of a hold, rad/s. */
    baseSpeed: number
    /** Key aim speed after the ramp, rad/s. */
    maxSpeed: number
    /** Hold time before the speed starts to rise, s. */
    rampDelay: number
    /** Time from base to max speed, s. */
    rampTime: number
    /** Factor while Shift is held. */
    fineFactor: number
    /** Drag aim, radians per CSS pixel. */
    dragPerPixel: number
}

export const DEFAULT_AIM: AimOptions = {
    baseSpeed: 0.12,
    maxSpeed: 0.9,
    rampDelay: 0.25,
    rampTime: 1.0,
    fineFactor: 0.3,
    dragPerPixel: 0.0035,
}

export interface InputOptions {
    canvas: HTMLCanvasElement
    swingPad: HTMLElement
    /** Where key events are read. Default: window. */
    keyTarget?: Window | HTMLElement
    /** Clock in ms. Default: performance.now. */
    now?: () => number
    aim?: Partial<AimOptions>
}

type Listeners = { [K in InputEvent]: Set<InputEvents[K]> }

type SwingSource = { kind: 'key' } | { kind: 'pointer'; id: number }

const AIM_LEFT = new Set(['KeyA', 'ArrowLeft'])
const AIM_RIGHT = new Set(['KeyD', 'ArrowRight'])

function keyCode(e: KeyboardEvent): string {
    if (e.code) {
        return e.code
    }
    // Fallback for synthetic events without a code.
    const k = e.key
    if (k === ' ' || k === 'Spacebar') {
        return 'Space'
    }
    if (/^[a-z]$/i.test(k)) {
        return `Key${k.toUpperCase()}`
    }
    if (/^[0-9]$/.test(k)) {
        return `Digit${k}`
    }
    return k
}

function isEditable(t: EventTarget | null): boolean {
    if (!t || !(t instanceof HTMLElement)) {
        return false
    }
    const tag = t.tagName
    return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        t.isContentEditable
    )
}

function isActivatable(el: Element | null): el is HTMLElement {
    if (!el || !(el instanceof HTMLElement)) {
        return false
    }
    const tag = el.tagName
    return (
        tag === 'BUTTON' ||
        tag === 'A' ||
        tag === 'SUMMARY' ||
        el.getAttribute('role') === 'button'
    )
}

export function createInput(opts: InputOptions): Input {
    const { canvas, swingPad } = opts
    const keyTarget: Window | HTMLElement = opts.keyTarget ?? window
    const now = opts.now ?? (() => performance.now())
    const aimOpts: AimOptions = { ...DEFAULT_AIM, ...opts.aim }

    const listeners: Listeners = {
        aim: new Set(),
        club: new Set(),
        swingStart: new Set(),
        swingRelease: new Set(),
        swingCancel: new Set(),
        skip: new Set(),
    }

    function emit<K extends InputEvent>(
        event: K,
        ...args: Parameters<InputEvents[K]>
    ): void {
        for (const cb of [...listeners[event]]) {
            ;(cb as (...a: Parameters<InputEvents[K]>) => void)(...args)
        }
    }

    let enabled = true
    let skippable = false
    let swing: SwingSource | null = null
    let swingStartMs = 0
    const held = new Set<string>()
    let shiftHeld = false
    let aimHoldTime = 0
    let drag: { id: number; x: number } | null = null

    // --- Swing -----------------------------------------------------------

    function power(): number {
        if (!swing) {
            return 0
        }
        return powerForHold((now() - swingStartMs) / 1000)
    }

    function startSwing(src: SwingSource): void {
        if (swing || !enabled) {
            return
        }
        swing = src
        swingStartMs = now()
        held.clear()
        aimHoldTime = 0
        endDrag()
        swingPad.setAttribute('data-charging', '')
        emit('swingStart')
    }

    function releaseSwing(): void {
        if (!swing) {
            return
        }
        const p = power()
        swing = null
        swingPad.removeAttribute('data-charging')
        emit('swingRelease', p)
    }

    function cancelSwing(): void {
        if (!swing) {
            return
        }
        swing = null
        swingPad.removeAttribute('data-charging')
        emit('swingCancel')
    }

    // --- Keyboard --------------------------------------------------------

    function onKeyDown(ev: Event): void {
        const e = ev as KeyboardEvent
        if (isEditable(e.target)) {
            return
        }
        const code = keyCode(e)
        if (e.key === 'Shift') {
            shiftHeld = true
        }
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return
        }

        if (skippable && !enabled) {
            if (code === 'Space' || code.startsWith('Arrow')) {
                e.preventDefault()
            }
            if (!e.repeat && (code === 'Enter' || code === 'NumpadEnter')) {
                e.preventDefault()
                emit('skip')
            }
            return
        }
        if (!enabled) {
            return
        }

        if (code === 'Space') {
            e.preventDefault()
            // A focused button would also be clicked by Space on keyup.
            const active = document.activeElement
            if (isActivatable(active)) {
                active.blur()
                canvas.focus({ preventScroll: true })
            }
            if (!e.repeat) {
                startSwing({ kind: 'key' })
            }
            return
        }
        if (swing) {
            if (code.startsWith('Arrow')) {
                e.preventDefault()
            }
            return
        }
        if (AIM_LEFT.has(code) || AIM_RIGHT.has(code)) {
            e.preventDefault()
            if (!held.has(code)) {
                held.add(code)
                aimHoldTime = 0
            }
            return
        }
        if (e.repeat) {
            return
        }
        if (code === 'KeyQ') {
            emit('club', -1)
        } else if (code === 'KeyE') {
            emit('club', 1)
        } else {
            const m = /^(?:Digit|Numpad)([1-8])$/.exec(code)
            if (m) {
                emit('club', { index: Number(m[1]) - 1 })
            }
        }
    }

    function onKeyUp(ev: Event): void {
        const e = ev as KeyboardEvent
        if (e.key === 'Shift') {
            shiftHeld = false
        }
        const code = keyCode(e)
        held.delete(code)
        if (code === 'Space') {
            if (swing?.kind === 'key') {
                e.preventDefault()
                releaseSwing()
            } else if (enabled && !isEditable(e.target)) {
                e.preventDefault()
            }
        }
    }

    // --- Pointer ---------------------------------------------------------

    function capture(el: Element, id: number): void {
        try {
            el.setPointerCapture?.(id)
        } catch {
            // The pointer may already be gone.
        }
    }

    function onPadDown(ev: Event): void {
        const e = ev as PointerEvent
        if (e.button > 0) {
            return
        }
        e.preventDefault()
        if (!enabled || swing) {
            return
        }
        capture(swingPad, e.pointerId)
        startSwing({ kind: 'pointer', id: e.pointerId })
    }

    function onPointerUp(ev: Event): void {
        const e = ev as PointerEvent
        if (swing?.kind === 'pointer' && swing.id === e.pointerId) {
            releaseSwing()
        }
        if (drag && drag.id === e.pointerId) {
            endDrag()
        }
    }

    function onPointerCancel(ev: Event): void {
        const e = ev as PointerEvent
        if (swing?.kind === 'pointer' && swing.id === e.pointerId) {
            cancelSwing()
        }
        if (drag && drag.id === e.pointerId) {
            endDrag()
        }
    }

    function onCanvasDown(ev: Event): void {
        const e = ev as PointerEvent
        if (e.button > 0) {
            return
        }
        if (!enabled || swing || drag) {
            return
        }
        e.preventDefault()
        canvas.focus({ preventScroll: true })
        drag = { id: e.pointerId, x: e.clientX }
        capture(canvas, e.pointerId)
    }

    function onPointerMove(ev: Event): void {
        const e = ev as PointerEvent
        if (!drag || drag.id !== e.pointerId) {
            return
        }
        const dx = e.clientX - drag.x
        drag.x = e.clientX
        if (dx !== 0 && enabled && !swing) {
            emit('aim', dx * aimOpts.dragPerPixel)
        }
    }

    function endDrag(): void {
        if (!drag) {
            return
        }
        try {
            if (canvas.hasPointerCapture?.(drag.id)) {
                canvas.releasePointerCapture(drag.id)
            }
        } catch {
            // Ignore.
        }
        drag = null
    }

    function preventDefault(e: Event): void {
        e.preventDefault()
    }

    // --- Focus loss --------------------------------------------------------

    function onBlur(): void {
        cancelSwing()
        endDrag()
        held.clear()
        shiftHeld = false
        aimHoldTime = 0
    }

    function onVisibility(): void {
        if (document.visibilityState === 'hidden') {
            onBlur()
        }
    }

    // --- Wiring ----------------------------------------------------------

    const bindings: [
        EventTarget,
        string,
        (e: Event) => void,
        AddEventListenerOptions?,
    ][] = [
        [keyTarget, 'keydown', onKeyDown],
        [keyTarget, 'keyup', onKeyUp],
        [swingPad, 'pointerdown', onPadDown],
        [canvas, 'pointerdown', onCanvasDown],
        [window, 'pointermove', onPointerMove],
        [window, 'pointerup', onPointerUp],
        [window, 'pointercancel', onPointerCancel],
        [swingPad, 'pointercancel', onPointerCancel],
        [canvas, 'pointercancel', onPointerCancel],
        [canvas, 'contextmenu', preventDefault],
        [swingPad, 'contextmenu', preventDefault],
        [swingPad, 'selectstart', preventDefault],
        [canvas, 'selectstart', preventDefault],
        [swingPad, 'dragstart', preventDefault],
        [canvas, 'dragstart', preventDefault],
        // iOS: stop the double-tap zoom and the callout on the pad.
        [swingPad, 'touchstart', preventDefault, { passive: false }],
        [swingPad, 'touchend', preventDefault, { passive: false }],
        [window, 'blur', onBlur],
        [document, 'visibilitychange', onVisibility],
    ]
    for (const [t, type, fn, o] of bindings) {
        t.addEventListener(type, fn, o)
    }

    function update(dt: number): void {
        if (!enabled || swing) {
            aimHoldTime = 0
            return
        }
        const d = Math.min(Math.max(dt, 0), 0.1)
        let dir = 0
        for (const c of held) {
            if (AIM_LEFT.has(c)) {
                dir -= 1
            } else if (AIM_RIGHT.has(c)) {
                dir += 1
            }
        }
        dir = Math.sign(dir)
        if (held.size === 0) {
            aimHoldTime = 0
            return
        }
        aimHoldTime += d
        if (dir === 0 || d === 0) {
            return
        }
        const t = Math.min(
            1,
            Math.max(0, (aimHoldTime - aimOpts.rampDelay) / aimOpts.rampTime)
        )
        const ease = t * t * (3 - 2 * t)
        let speed =
            aimOpts.baseSpeed + (aimOpts.maxSpeed - aimOpts.baseSpeed) * ease
        if (shiftHeld) {
            speed *= aimOpts.fineFactor
        }
        emit('aim', dir * speed * d)
    }

    return {
        on(event, cb) {
            const set = listeners[event] as Set<typeof cb>
            set.add(cb)
            return () => {
                set.delete(cb)
            }
        },
        power,
        isCharging: () => swing !== null,
        setEnabled(v) {
            if (enabled === v) {
                return
            }
            enabled = v
            if (!v) {
                cancelSwing()
                endDrag()
                held.clear()
                aimHoldTime = 0
            }
        },
        isEnabled: () => enabled,
        setSkippable(v) {
            skippable = v
        },
        cancelSwing,
        update,
        dispose() {
            for (const [t, type, fn, o] of bindings) {
                t.removeEventListener(type, fn, o)
            }
            swing = null
            swingPad.removeAttribute('data-charging')
            for (const set of Object.values(listeners)) {
                set.clear()
            }
        },
    }
}
