import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import RegexTester from '@/components/tools/regex-tester'

describe('RegexTester', () => {
    it('counts matches against the test string', async () => {
        const user = userEvent.setup()
        render(<RegexTester />)
        await user.type(screen.getByLabelText('Regex pattern'), '\\d+')
        await user.type(screen.getByLabelText('Test string'), '12 ab 34 cd 5')
        await waitFor(() =>
            expect(screen.getByText('3 matches')).toBeInTheDocument()
        )
    })

    it('reports capture groups', async () => {
        const user = userEvent.setup()
        render(<RegexTester />)
        await user.type(screen.getByLabelText('Regex pattern'), '(\\d)(\\d)')
        await user.type(screen.getByLabelText('Test string'), '42')
        expect(await screen.findByText(/groups: 4, 2/)).toBeInTheDocument()
    })

    it('shows an error for an invalid pattern', async () => {
        const user = userEvent.setup()
        const { container } = render(<RegexTester />)
        await user.type(screen.getByLabelText('Regex pattern'), '(')
        await waitFor(() =>
            expect(container.querySelector('.text-destructive')).not.toBeNull()
        )
    })
})
