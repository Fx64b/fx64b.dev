import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import JwtDecoder from '@/components/tools/jwt-decoder'

// Standard jwt.io example token (HS256, {sub, name, iat}).
const SAMPLE =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('JwtDecoder', () => {
    it('decodes the header and payload of a valid token', async () => {
        const user = userEvent.setup()
        render(<JwtDecoder />)
        await user.type(screen.getByRole('textbox'), SAMPLE)
        expect(await screen.findByText(/HS256/)).toBeInTheDocument()
        expect(await screen.findByText(/John Doe/)).toBeInTheDocument()
    })

    it('surfaces timestamp claims', async () => {
        const user = userEvent.setup()
        render(<JwtDecoder />)
        await user.type(screen.getByRole('textbox'), SAMPLE)
        expect(await screen.findByText(/Issued at \(iat\)/)).toBeInTheDocument()
    })

    it('shows an error for a malformed token', async () => {
        const user = userEvent.setup()
        render(<JwtDecoder />)
        await user.type(screen.getByRole('textbox'), 'not-a-jwt')
        await waitFor(() =>
            expect(
                screen.getByText(/must have at least a header/i)
            ).toBeInTheDocument()
        )
    })
})
