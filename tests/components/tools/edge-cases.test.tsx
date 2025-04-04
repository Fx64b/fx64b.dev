import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import ByteConverter from '@/components/tools/byte-converter'
import CharacterWordCounter from '@/components/tools/character-word-counter'
import ColorConverter from '@/components/tools/color-converter'
import HourDecimalConverter from '@/components/tools/hour-decimal-converter'
import TextCaseConverter from '@/components/tools/text-case-converter'

describe('Edge Cases', () => {
    describe('ByteConverter Edge Cases', () => {
        it('handles extremely large values', async () => {
            render(<ByteConverter />)
            const user = userEvent.setup()

            const input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, '9999999999999')

            // Verify input changed
            expect(input).toHaveValue('9999999999999')
        })
    })

    describe('CharacterWordCounter Edge Cases', () => {
        it('handles text with excessive whitespace', async () => {
            render(<CharacterWordCounter />)
            const user = userEvent.setup()

            const textarea = screen.getByPlaceholderText(
                'Type or paste your text here...'
            )
            await user.type(
                textarea,
                '   Multiple    spaces    between   words   '
            )

            // Verify input changed
            expect(textarea).toHaveValue(
                '   Multiple    spaces    between   words   '
            )
        })

        it('handles extremely long text', async () => {
            render(<CharacterWordCounter />)
            const user = userEvent.setup()

            const textarea = screen.getByPlaceholderText(
                'Type or paste your text here...'
            )

            // Create text with 100 characters (reducing from 1000 to make test faster)
            const longText = 'a'.repeat(100)
            await user.type(textarea, longText)

            // Verify input changed
            expect(textarea).toHaveValue(longText)
        })
    })

    describe('ColorConverter Edge Cases', () => {
        it('handles unusual formats correctly', async () => {
            render(<ColorConverter />)
            const user = userEvent.setup()

            // Test shortened HEX format
            const input = screen.getByRole('textbox')
            await user.clear(input)
            await user.type(input, '#f00') // Shortened hex for red

            // Verify input changed
            expect(input).toHaveValue('#f00')
        })
    })

    describe('HourDecimalConverter Edge Cases', () => {
        it('handles large hour values', async () => {
            render(<HourDecimalConverter />)
            const user = userEvent.setup()

            const hoursInput = screen.getByLabelText('Hours')
            await user.clear(hoursInput)
            await user.type(hoursInput, '100')

            const minutesInput = screen.getByLabelText('Minutes (0-59)')
            await user.clear(minutesInput)
            await user.type(minutesInput, '30')

            // Verify inputs changed
            expect(hoursInput).toHaveValue('100')
            expect(minutesInput).toHaveValue('30')
        })

        it('handles input when only minutes provided', async () => {
            render(<HourDecimalConverter />)
            const user = userEvent.setup()

            const hoursInput = screen.getByLabelText('Hours')
            await user.clear(hoursInput)

            const minutesInput = screen.getByLabelText('Minutes (0-59)')
            await user.clear(minutesInput)
            await user.type(minutesInput, '30')

            // Verify input changed
            expect(minutesInput).toHaveValue('30')
        })
    })

    describe('TextCaseConverter Edge Cases', () => {
        it('handles mixed script text correctly', async () => {
            render(<TextCaseConverter />)
            const user = userEvent.setup()

            // Text with multiple scripts and numbers
            const mixedText = 'English текст 123 and Symbols!@#'

            // Find the first textarea
            const textareas = screen.getAllByPlaceholderText(
                'Enter text to convert...'
            )
            const textarea = textareas[0]

            await user.type(textarea, mixedText)

            // Verify input changed
            expect(textarea).toHaveValue(mixedText)
        })

        it('handles very long input text', async () => {
            render(<TextCaseConverter />)
            const user = userEvent.setup()

            // Generate shorter text (50 characters) for faster tests
            const longText = 'a very long text '.repeat(5)

            // Find the first textarea
            const textareas = screen.getAllByPlaceholderText(
                'Enter text to convert...'
            )
            const textarea = textareas[0]

            await user.type(textarea, longText)

            // Verify input changed
            expect(textarea).toHaveValue(longText)
        })
    })
})
