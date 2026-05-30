import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TextCaseConverter from '@/components/tools/text-case-converter'

async function typeAndSelect(
    user: ReturnType<typeof userEvent.setup>,
    input: string,
    optionLabel: string
) {
    const textarea = screen.getByPlaceholderText('Enter text to convert...')
    await user.clear(textarea)
    await user.type(textarea, input)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: optionLabel }))
}

describe('TextCaseConverter', () => {
    describe('initial state', () => {
        it('shows the placeholder when no input is given', () => {
            render(<TextCaseConverter />)
            expect(
                screen.getByText('Converted text will appear here')
            ).toBeInTheDocument()
        })

        it('defaults to Title Case', () => {
            render(<TextCaseConverter />)
            expect(screen.getByRole('combobox')).toHaveTextContent('Title Case')
        })
    })

    describe('case conversions', () => {
        beforeEach(() => {
            render(<TextCaseConverter />)
        })

        it('lowercase', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'Hello World', 'lowercase')
            await waitFor(() =>
                expect(screen.getByText('hello world')).toBeInTheDocument()
            )
        })

        it('UPPERCASE', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'Hello World', 'UPPERCASE')
            await waitFor(() =>
                expect(screen.getByText('HELLO WORLD')).toBeInTheDocument()
            )
        })

        it('Title Case', async () => {
            const user = userEvent.setup()
            const textarea = screen.getByPlaceholderText('Enter text to convert...')
            await user.type(textarea, 'hello world')
            // Title Case is already the default selection
            await waitFor(() =>
                expect(screen.getByText('Hello World')).toBeInTheDocument()
            )
        })

        it('Sentence case', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'hello world. foo bar.', 'Sentence case')
            await waitFor(() =>
                expect(
                    screen.getByText('Hello world. Foo bar.')
                ).toBeInTheDocument()
            )
        })

        it('camelCase', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'hello world', 'camelCase')
            await waitFor(() =>
                expect(screen.getByText('helloWorld')).toBeInTheDocument()
            )
        })

        it('PascalCase', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'hello world', 'PascalCase')
            await waitFor(() =>
                expect(screen.getByText('HelloWorld')).toBeInTheDocument()
            )
        })

        it('snake_case', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'Hello World', 'snake_case')
            await waitFor(() =>
                expect(screen.getByText('hello_world')).toBeInTheDocument()
            )
        })

        it('kebab-case', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'Hello World', 'kebab-case')
            await waitFor(() =>
                expect(screen.getByText('hello-world')).toBeInTheDocument()
            )
        })

        it('CONSTANT_CASE', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'hello world', 'CONSTANT_CASE')
            await waitFor(() =>
                expect(screen.getByText('HELLO_WORLD')).toBeInTheDocument()
            )
        })

        it('dot.case', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'Hello World', 'dot.case')
            await waitFor(() =>
                expect(screen.getByText('hello.world')).toBeInTheDocument()
            )
        })

        it('path/case', async () => {
            const user = userEvent.setup()
            await typeAndSelect(user, 'Hello World', 'path/case')
            await waitFor(() =>
                expect(screen.getByText('hello/world')).toBeInTheDocument()
            )
        })
    })

    describe('edge cases', () => {
        it('produces empty output for whitespace-only input', async () => {
            const user = userEvent.setup()
            render(<TextCaseConverter />)
            const textarea = screen.getByPlaceholderText('Enter text to convert...')
            await user.type(textarea, '   ')
            await waitFor(() =>
                expect(
                    screen.getByText('Converted text will appear here')
                ).toBeInTheDocument()
            )
        })

        it('camelCase strips non-alphanumeric characters', async () => {
            const user = userEvent.setup()
            render(<TextCaseConverter />)
            await typeAndSelect(user, 'hello-world', 'camelCase')
            await waitFor(() =>
                expect(screen.getByText('helloWorld')).toBeInTheDocument()
            )
        })

        it('snake_case strips punctuation', async () => {
            const user = userEvent.setup()
            render(<TextCaseConverter />)
            await typeAndSelect(user, 'hello, world!', 'snake_case')
            await waitFor(() =>
                expect(screen.getByText('hello_world')).toBeInTheDocument()
            )
        })

        it('handles multi-word input for PascalCase correctly', async () => {
            const user = userEvent.setup()
            render(<TextCaseConverter />)
            // "the quick brown fox" → "TheQuickBrownFox" also appears in the
            // educational section, so use a different phrase to avoid ambiguity.
            await typeAndSelect(user, 'hello world foo bar', 'PascalCase')
            await waitFor(() =>
                expect(screen.getByText('HelloWorldFooBar')).toBeInTheDocument()
            )
        })
    })

    describe('copy to clipboard', () => {
        let writeTextSpy: ReturnType<typeof vi.spyOn>

        beforeEach(() => {
            writeTextSpy = vi
                .spyOn(navigator.clipboard, 'writeText')
                .mockResolvedValue(undefined)
        })

        afterEach(() => {
            writeTextSpy.mockRestore()
        })

        it('copies the converted output to clipboard', async () => {
            const user = userEvent.setup()
            render(<TextCaseConverter />)
            const textarea = screen.getByPlaceholderText('Enter text to convert...')
            await user.type(textarea, 'hello world')

            const copyBtn = screen.getByTestId('copy-button')
            await user.click(copyBtn)

            expect(writeTextSpy).toHaveBeenCalledWith('Hello World')
        })

        it('copy button is disabled when there is no output', () => {
            render(<TextCaseConverter />)
            expect(screen.getByTestId('copy-button')).toBeDisabled()
        })

        it('shows a check icon after copying', async () => {
            const user = userEvent.setup()
            render(<TextCaseConverter />)
            const textarea = screen.getByPlaceholderText('Enter text to convert...')
            await user.type(textarea, 'hello')
            await user.click(screen.getByTestId('copy-button'))
            expect(screen.getByTestId('check-icon')).toBeInTheDocument()
        })
    })
})
