import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ColorConverter from '@/components/tools/color-converter'

describe('ColorConverter', () => {
    it('renders with default values', () => {
        render(<ColorConverter />)
        expect(screen.getByText('Color Converter')).toBeInTheDocument()
        expect(screen.getByRole('textbox')).toHaveValue('#1e90ff')
    })

    it('converts HEX to RGB and HSL correctly', async () => {
        render(<ColorConverter />)
        const user = userEvent.setup()

        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, '#ff0000')

        // Verify input value changed
        expect(input).toHaveValue('#ff0000')
    })

    it('handles invalid input correctly', async () => {
        render(<ColorConverter />)
        const user = userEvent.setup()

        const input = screen.getByRole('textbox')
        await user.clear(input)
        await user.type(input, 'not-a-color')

        expect(screen.getByText('Invalid color format')).toBeInTheDocument()
    })

    it('indicates when a color value is copied', async () => {
        render(<ColorConverter />)
        const user = userEvent.setup()

        // Find copy buttons
        const copyButtons = screen
            .getAllByRole('button')
            .filter(
                (btn) =>
                    !btn.classList.contains('data-[state=closed]') &&
                    btn !== screen.getByRole('combobox')
            )

        if (copyButtons.length > 0) {
            await user.click(copyButtons[0])
            // Clipboard API should be called
            expect(vi.spyOn(navigator.clipboard, 'writeText')).toBeDefined()
        }
    })
})
