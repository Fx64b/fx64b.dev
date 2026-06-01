import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import QrCodeGenerator from '@/components/tools/qr-code-generator'

describe('QrCodeGenerator', () => {
    it('renders an SVG QR code for entered text', async () => {
        const user = userEvent.setup()
        render(<QrCodeGenerator />)
        await user.type(screen.getByRole('textbox'), 'https://fx64b.dev')
        await waitFor(() => {
            const output = screen.getByTestId('qr-output')
            expect(output.querySelector('svg')).not.toBeNull()
        })
    })

    it('does not render output for empty input', () => {
        render(<QrCodeGenerator />)
        expect(screen.queryByTestId('qr-output')).not.toBeInTheDocument()
    })
})
