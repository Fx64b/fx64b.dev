import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import DecisionMaker from '@/components/tools/decision-maker'

function result() {
    return screen.getByTestId('decision-result').textContent ?? ''
}

describe('DecisionMaker', () => {
    it('flips a coin to heads or tails', async () => {
        const user = userEvent.setup()
        render(<DecisionMaker />)
        await user.click(screen.getByRole('button', { name: 'Flip the coin' }))
        await waitFor(() => expect(result()).toMatch(/heads|tails/i))
    })

    it('rolls dice and shows a total', async () => {
        const user = userEvent.setup()
        render(<DecisionMaker />)
        await user.click(screen.getByRole('button', { name: 'Dice Roller' }))
        await user.click(screen.getByRole('button', { name: 'Roll' }))
        await waitFor(() => expect(result()).toMatch(/=\s*\d+/))
    })

    it('picks a random option from the list', async () => {
        const user = userEvent.setup()
        render(<DecisionMaker />)
        await user.click(screen.getByRole('button', { name: 'Random Picker' }))
        await user.type(
            screen.getByLabelText('Options'),
            'apple\nbanana\ncherry'
        )
        await user.click(screen.getByRole('button', { name: 'Pick one' }))
        await waitFor(() =>
            expect(['apple', 'banana', 'cherry']).toContain(result())
        )
    })
})
