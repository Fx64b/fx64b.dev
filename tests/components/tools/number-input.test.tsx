import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { useState } from 'react'

import { NumberInput } from '@/components/tools/number-input'

function Harness({
    initial = 0,
    min,
    max,
    onValue,
}: {
    initial?: number
    min?: number
    max?: number
    onValue?: (n: number) => void
}) {
    const [value, setValue] = useState(initial)
    return (
        <NumberInput
            aria-label="Amount"
            value={value}
            min={min}
            max={max}
            onValueChange={(n) => {
                setValue(n)
                onValue?.(n)
            }}
        />
    )
}

describe('NumberInput', () => {
    it('renders the initial numeric value', () => {
        render(<Harness initial={5} />)
        expect(screen.getByLabelText('Amount')).toHaveValue(5)
    })

    it('can be cleared to an empty field instead of snapping back to 0', async () => {
        const user = userEvent.setup()
        render(<Harness initial={80} min={1} />)
        const input = screen.getByLabelText('Amount')
        await user.clear(input)
        // The visible field stays empty; it does not force a "0"/min back in.
        expect(input).toHaveValue(null)
    })

    it('does not keep a leading zero when typing after a default of 0', async () => {
        const user = userEvent.setup()
        render(<Harness initial={0} min={0} />)
        const input = screen.getByLabelText('Amount')
        // Select-on-focus means typing replaces the existing 0.
        await user.click(input)
        await user.type(input, '2')
        await waitFor(() => expect(input).toHaveValue(2))
    })

    it('emits the cleared fallback value to the parent', async () => {
        const user = userEvent.setup()
        const onValue = vi.fn()
        render(<Harness initial={5} min={1} onValue={onValue} />)
        await user.clear(screen.getByLabelText('Amount'))
        expect(onValue).toHaveBeenLastCalledWith(1)
    })

    it('clamps values above the maximum', async () => {
        const user = userEvent.setup()
        const onValue = vi.fn()
        render(<Harness initial={1} max={100} onValue={onValue} />)
        const input = screen.getByLabelText('Amount')
        await user.clear(input)
        await user.type(input, '500')
        await waitFor(() => expect(onValue).toHaveBeenLastCalledWith(100))
    })
})
