import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import StandardDrinksConverter from '@/components/tools/standard-drinks-converter'

describe('StandardDrinksConverter', () => {
    it('computes grams of pure alcohol from volume and ABV', () => {
        render(<StandardDrinksConverter />)
        // Defaults: 330ml at 5% = 330 * 0.05 * 0.789 ≈ 13.0 g.
        expect(screen.getByTestId('alcohol-grams').textContent).toMatch(
            /13\.0 g/
        )
    })

    it('shows standard drinks for multiple countries', () => {
        render(<StandardDrinksConverter />)
        expect(screen.getByText('United States')).toBeInTheDocument()
        expect(screen.getByText('United Kingdom')).toBeInTheDocument()
        expect(screen.getByText('Australia')).toBeInTheDocument()
    })

    it('recomputes when a preset is applied', async () => {
        const user = userEvent.setup()
        render(<StandardDrinksConverter />)
        await user.click(screen.getByRole('button', { name: 'Shot' }))
        // 40ml at 40% = 40 * 0.4 * 0.789 ≈ 12.6 g.
        await waitFor(() =>
            expect(screen.getByTestId('alcohol-grams').textContent).toMatch(
                /12\.6 g/
            )
        )
    })
})
