import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import NumberBaseConverter from '@/components/tools/number-base-converter'

describe('NumberBaseConverter', () => {
    it('converts a decimal value to the other bases', async () => {
        const user = userEvent.setup()
        render(<NumberBaseConverter />)
        await user.type(screen.getByLabelText('Decimal'), '255')
        await waitFor(() => {
            expect(screen.getByLabelText('Hexadecimal')).toHaveValue('ff')
            expect(screen.getByLabelText('Binary')).toHaveValue('11111111')
            expect(screen.getByLabelText('Octal')).toHaveValue('377')
        })
    })

    it('converts a hexadecimal value to decimal', async () => {
        const user = userEvent.setup()
        render(<NumberBaseConverter />)
        await user.type(screen.getByLabelText('Hexadecimal'), 'ff')
        await waitFor(() =>
            expect(screen.getByLabelText('Decimal')).toHaveValue('255')
        )
    })

    it('shows an error for an invalid digit', async () => {
        const user = userEvent.setup()
        render(<NumberBaseConverter />)
        await user.type(screen.getByLabelText('Binary'), '2')
        await waitFor(() =>
            expect(
                screen.getByText(/invalid binary number/i)
            ).toBeInTheDocument()
        )
    })
})
