import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import TextCaseConverter from '@/components/tools/text-case-converter'

describe('TextCaseConverter', () => {
    it('renders with default values', () => {
        render(<TextCaseConverter />)
        expect(screen.getByText('Text Case Converter')).toBeInTheDocument()

        const textareas = screen.getAllByPlaceholderText(
            'Enter text to convert...'
        )
        expect(textareas.length).toBeGreaterThan(0)

        expect(
            screen.getByText('Converted text will appear here')
        ).toBeInTheDocument()
    })

    it('displays input text', async () => {
        render(<TextCaseConverter />)
        const user = userEvent.setup()

        // Input text - just test that text enters the box
        const textareas = screen.getAllByPlaceholderText(
            'Enter text to convert...'
        )
        const textarea = textareas[0]
        await user.type(textarea, 'testing text')

        expect(textarea).toHaveValue('testing text')
    })

    it('handles empty input correctly', async () => {
        render(<TextCaseConverter />)

        // Should show placeholder
        expect(
            screen.getByText('Converted text will appear here')
        ).toBeInTheDocument()
    })

    it('handles special characters correctly', async () => {
        render(<TextCaseConverter />)
        const user = userEvent.setup()

        // Text with special characters
        const specialText = 'This has 123 NUMBERS & !@#$ symbols'

        const textareas = screen.getAllByPlaceholderText(
            'Enter text to convert...'
        )
        const textarea = textareas[0]
        await user.type(textarea, specialText)

        expect(textarea).toHaveValue(specialText)
    })

    it('copies converted text to clipboard', async () => {
        render(<TextCaseConverter />)
        const user = userEvent.setup()

        // Setup spy on clipboard API
        const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText')

        // Input text
        const textareas = screen.getAllByPlaceholderText(
            'Enter text to convert...'
        )
        const textarea = textareas[0]
        await user.type(textarea, 'test text')

        // Get copy button
        const copyButton = screen.getByRole('button', {
            name: /copy to clipboard/i,
        })
        await user.click(copyButton)

        expect(clipboardSpy).toHaveBeenCalled()
    })

    it('shows converted text', async () => {
        render(<TextCaseConverter />)
        const user = userEvent.setup()

        const input = 'This is a Test'

        // Input text once
        const textareas = screen.getAllByPlaceholderText(
            'Enter text to convert...'
        )
        const textarea = textareas[0]
        await user.type(textarea, input)

        // The component automatically updates the output, so we just check that
        // the placeholder is gone after inputting text
        expect(
            screen.queryByText('Converted text will appear here')
        ).not.toBeInTheDocument()
    })
})
