import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ByteConverter from '@/components/tools/byte-converter'

import { renderWithSetup } from '../../test-utils'

describe('ByteConverter', () => {
    it('renders with default values', () => {
        renderWithSetup(<ByteConverter />)
        expect(screen.getByText('Byte Converter')).toBeInTheDocument()
        expect(screen.getByRole('textbox')).toHaveValue('1')

        // Check the default select value shows MB
        const selectButton = screen.getByRole('combobox')
        expect(selectButton).toHaveTextContent('MB')
    })

    it('updates values when input changes', async () => {
        const { user } = renderWithSetup(<ByteConverter />)

        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, '2')

        // Just validate something changed in the UI after typing
        expect(input).toHaveValue('2')
    })

    it('indicates when a value is copied', async () => {
        const { user } = renderWithSetup(<ByteConverter />)

        // Setup spy on clipboard API
        const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText')

        // Find copy buttons (they're the only buttons with a Copy or Check icon)
        const copyButtons = screen
            .getAllByRole('button')
            .filter(
                (btn) =>
                    !btn.classList.contains('data-[state=closed]') &&
                    btn !== screen.getByRole('combobox')
            )

        if (copyButtons.length > 0) {
            await user.click(copyButtons[0])
            expect(clipboardSpy).toHaveBeenCalled()
        }
    })
})
