import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import PasswordGenerator from '@/components/tools/password-generator'

function passwordText() {
    return screen.getByTestId('password-output').textContent ?? ''
}

describe('PasswordGenerator', () => {
    it('generates a 16-character password by default', () => {
        render(<PasswordGenerator />)
        expect(passwordText()).toHaveLength(16)
    })

    it('limits the charset to the enabled sets', async () => {
        const user = userEvent.setup()
        render(<PasswordGenerator />)
        await user.click(
            screen.getByRole('checkbox', { name: 'Lowercase (a-z)' })
        )
        await user.click(
            screen.getByRole('checkbox', { name: 'Uppercase (A-Z)' })
        )
        await user.click(
            screen.getByRole('checkbox', { name: 'Symbols (!@#$)' })
        )
        await waitFor(() => expect(passwordText()).toMatch(/^[0-9]+$/))
    })

    it('shows an empty-state message when no charset is selected', async () => {
        const user = userEvent.setup()
        render(<PasswordGenerator />)
        for (const name of [
            'Lowercase (a-z)',
            'Uppercase (A-Z)',
            'Numbers (0-9)',
            'Symbols (!@#$)',
        ]) {
            await user.click(screen.getByRole('checkbox', { name }))
        }
        await waitFor(() =>
            expect(
                screen.getByText(/select at least one character set/i)
            ).toBeInTheDocument()
        )
    })

    it('regenerates a new password on demand', async () => {
        const user = userEvent.setup()
        render(<PasswordGenerator />)
        const first = passwordText()
        await user.click(screen.getByRole('button', { name: /regenerate/i }))
        // Extremely unlikely to collide for a 16-char random password.
        await waitFor(() => expect(passwordText()).not.toBe(first))
    })
})
