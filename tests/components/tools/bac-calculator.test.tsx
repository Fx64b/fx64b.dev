import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import BacCalculator from '@/components/tools/bac-calculator'

function bacValue() {
    return screen.getByTestId('bac-result').textContent ?? ''
}

describe('BacCalculator', () => {
    it('shows a safety disclaimer', () => {
        render(<BacCalculator />)
        expect(screen.getByText(/don't drive/i)).toBeInTheDocument()
    })

    it('estimates BAC from drinks, weight and time', async () => {
        const user = userEvent.setup()
        render(<BacCalculator />)

        const weight = screen.getByLabelText('Body weight (kg)')
        await user.clear(weight)
        await user.type(weight, '80')

        const hours = screen.getByLabelText('Hours since first drink')
        await user.clear(hours)
        await user.type(hours, '0')

        const beer = screen.getByLabelText('Beer (330ml, 5%)')
        await user.clear(beer)
        await user.type(beer, '2')

        // 2 beers, 80kg male, 0h ≈ 0.48 ‰.
        await waitFor(() => expect(bacValue()).toMatch(/0\.4\d ‰/))
    })

    it('returns to sober when enough time has passed', async () => {
        const user = userEvent.setup()
        render(<BacCalculator />)

        const beer = screen.getByLabelText('Beer (330ml, 5%)')
        await user.clear(beer)
        await user.type(beer, '1')

        const hours = screen.getByLabelText('Hours since first drink')
        await user.clear(hours)
        await user.type(hours, '24')

        await waitFor(() => expect(bacValue()).toMatch(/0\.00 ‰/))
    })
})
