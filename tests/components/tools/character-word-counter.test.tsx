import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CharacterWordCounter from '@/components/tools/character-word-counter'

// Each StatCard renders <p>{title}</p><p>{value}</p> as siblings.
// This helper finds the value by walking to the sibling of the title element.
function getStatValue(title: string): string {
    const titleEl = screen.getByText(title)
    return titleEl.nextElementSibling?.textContent ?? ''
}

function getTextarea() {
    return screen.getByPlaceholderText('Type or paste your text here...')
}

describe('CharacterWordCounter', () => {
    describe('initial state', () => {
        it('shows all-zero counts and zero times on load', () => {
            render(<CharacterWordCounter />)
            expect(getStatValue('Characters')).toBe('0')
            expect(getStatValue('Characters (no spaces)')).toBe('0')
            expect(getStatValue('Words')).toBe('0')
            expect(getStatValue('Sentences')).toBe('0')
            expect(getStatValue('Paragraphs')).toBe('0')
            expect(getStatValue('Lines')).toBe('0')
            expect(getStatValue('Reading Time')).toBe('0 seconds')
            expect(getStatValue('Speaking Time')).toBe('0 seconds')
        })

        it('copy and clear buttons are disabled when the textarea is empty', () => {
            render(<CharacterWordCounter />)
            expect(screen.getByTestId('copy-button')).toBeDisabled()
            expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
        })
    })

    describe('character counting', () => {
        beforeEach(() => {
            render(<CharacterWordCounter />)
        })

        it('counts all characters including spaces', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), 'hi there')
            await waitFor(() => expect(getStatValue('Characters')).toBe('8'))
        })

        it('counts characters excluding spaces separately', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), 'hi there')
            // "hi there" → 7 non-space chars
            await waitFor(() =>
                expect(getStatValue('Characters (no spaces)')).toBe('7')
            )
        })
    })

    describe('word counting', () => {
        beforeEach(() => {
            render(<CharacterWordCounter />)
        })

        it('counts two space-separated words', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), 'hello world')
            await waitFor(() => expect(getStatValue('Words')).toBe('2'))
        })

        it('treats multiple consecutive spaces as one separator', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), 'one  two   three')
            await waitFor(() => expect(getStatValue('Words')).toBe('3'))
        })

        it('whitespace-only input yields 0 words', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), '   ')
            await waitFor(() => expect(getStatValue('Words')).toBe('0'))
        })
    })

    describe('sentence counting', () => {
        beforeEach(() => {
            render(<CharacterWordCounter />)
        })

        it('counts sentences separated by periods', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), 'Hello world. Foo bar.')
            await waitFor(() => expect(getStatValue('Sentences')).toBe('2'))
        })

        it('counts sentences ending with ! and ?', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), 'Hello? No! Really.')
            await waitFor(() => expect(getStatValue('Sentences')).toBe('3'))
        })

        it('text with no terminal punctuation counts as one sentence', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), 'just some words')
            await waitFor(() => expect(getStatValue('Sentences')).toBe('1'))
        })
    })

    describe('paragraph and line counting', () => {
        beforeEach(() => {
            render(<CharacterWordCounter />)
        })

        it('counts two paragraphs separated by a newline', async () => {
            const user = userEvent.setup()
            await user.type(
                getTextarea(),
                'First paragraph{Enter}Second paragraph'
            )
            await waitFor(() => expect(getStatValue('Paragraphs')).toBe('2'))
        })

        it('counts three lines', async () => {
            const user = userEvent.setup()
            await user.type(
                getTextarea(),
                'line one{Enter}line two{Enter}line three'
            )
            await waitFor(() => expect(getStatValue('Lines')).toBe('3'))
        })
    })

    describe('reading and speaking time', () => {
        beforeEach(() => {
            render(<CharacterWordCounter />)
        })

        it('shows time in seconds for short text', async () => {
            const user = userEvent.setup()
            await user.type(getTextarea(), 'hello world')
            await waitFor(() => {
                expect(getStatValue('Reading Time')).toMatch(/seconds$/)
                expect(getStatValue('Speaking Time')).toMatch(/seconds$/)
            })
        })

        it('switches to minutes once the word count exceeds the wpm threshold', async () => {
            // 230 words exceeds both the 225 wpm reading and 150 wpm speaking thresholds
            const longText = Array(230).fill('word').join(' ')
            fireEvent.change(getTextarea(), { target: { value: longText } })
            await waitFor(() => {
                expect(getStatValue('Reading Time')).toMatch(/minutes$/)
                expect(getStatValue('Speaking Time')).toMatch(/minutes$/)
            })
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

        it('copies the textarea text to clipboard', async () => {
            const user = userEvent.setup()
            render(<CharacterWordCounter />)
            await user.type(getTextarea(), 'hello')
            await user.click(screen.getByTestId('copy-button'))
            expect(writeTextSpy).toHaveBeenCalledWith('hello')
        })

        it('copy button is disabled when the textarea is empty', () => {
            render(<CharacterWordCounter />)
            expect(screen.getByTestId('copy-button')).toBeDisabled()
        })

        it('shows a check icon after copying', async () => {
            const user = userEvent.setup()
            render(<CharacterWordCounter />)
            await user.type(getTextarea(), 'test')
            await user.click(screen.getByTestId('copy-button'))
            expect(screen.getByTestId('check-icon')).toBeInTheDocument()
        })
    })

    describe('clear button', () => {
        it('clears the textarea and resets all counts to zero', async () => {
            const user = userEvent.setup()
            render(<CharacterWordCounter />)
            await user.type(getTextarea(), 'hello world')
            await waitFor(() => expect(getStatValue('Words')).toBe('2'))

            await user.click(screen.getByRole('button', { name: 'Clear' }))

            await waitFor(() => {
                expect(getTextarea()).toHaveValue('')
                expect(getStatValue('Characters')).toBe('0')
                expect(getStatValue('Words')).toBe('0')
            })
        })
    })
})
