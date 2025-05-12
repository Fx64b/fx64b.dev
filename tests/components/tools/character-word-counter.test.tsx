import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import CharacterWordCounter from '@/components/tools/character-word-counter'

describe('CharacterWordCounter', () => {
    it('renders with empty state', () => {
        render(<CharacterWordCounter />)
        expect(screen.getByText('Character & Word Counter')).toBeInTheDocument()
        expect(
            screen.getByPlaceholderText('Type or paste your text here...')
        ).toBeInTheDocument()
        expect(screen.getAllByText('0')[0]).toBeInTheDocument() // First zero is character count
    })

    it('counts characters correctly', async () => {
        render(<CharacterWordCounter />)
        const user = userEvent.setup()

        const textarea = screen.getByPlaceholderText(
            'Type or paste your text here...'
        )
        await user.type(textarea, 'Hello world')

        const stats = screen.getAllByText('11')
        expect(stats.length).toBeGreaterThan(0) // 11 characters in "Hello world"
    })

    it('counts characters without spaces correctly', async () => {
        render(<CharacterWordCounter />)
        const user = userEvent.setup()

        const textarea = screen.getByPlaceholderText(
            'Type or paste your text here...'
        )
        await user.type(textarea, 'Hello world')

        const stats = screen.getAllByText('10')
        expect(stats.length).toBeGreaterThan(0) // 10 chars without space in "Hello world"
    })

    it('counts words correctly', async () => {
        render(<CharacterWordCounter />)
        const user = userEvent.setup()

        const textarea = screen.getByPlaceholderText(
            'Type or paste your text here...'
        )
        await user.type(textarea, 'Hello world, this is a test')

        const wordCount = screen.getAllByText('6')
        expect(wordCount.length).toBeGreaterThan(0) // 6 words in "Hello world, this is a test"
    })

    it('calculates sentence count correctly', async () => {
        render(<CharacterWordCounter />)
        const user = userEvent.setup()

        const textarea = screen.getByPlaceholderText(
            'Type or paste your text here...'
        )
        await user.type(
            textarea,
            'First sentence. Second sentence! Third sentence?'
        )

        const sentenceCount = screen.getAllByText('3')
        expect(sentenceCount.length).toBeGreaterThan(0) // 3 sentences
    })

    it('calculates paragraphs correctly', async () => {
        render(<CharacterWordCounter />)
        const user = userEvent.setup()

        const textarea = screen.getByPlaceholderText(
            'Type or paste your text here...'
        )
        await user.type(
            textarea,
            'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
        )

        const paragraphCount = screen.getAllByText('3')
        expect(paragraphCount.length).toBeGreaterThan(0) // 3 paragraphs
    })

    it('calculates reading and speaking time correctly', async () => {
        render(<CharacterWordCounter />)
        const user = userEvent.setup()

        const textarea = screen.getByPlaceholderText(
            'Type or paste your text here...'
        )

        // Create a string with 100 words (approx 27 seconds reading time at 225 wpm)
        const hundredWords = Array(100).fill('word').join(' ')
        await user.type(textarea, hundredWords)

        expect(screen.getByText('27 seconds')).toBeInTheDocument() // Reading time
        expect(screen.getByText('40 seconds')).toBeInTheDocument() // Speaking time
    })

    it('handles the copy functionality', async () => {
        render(<CharacterWordCounter />)
        const user = userEvent.setup()

        const textarea = screen.getByPlaceholderText(
            'Type or paste your text here...'
        )
        await user.type(textarea, 'Test text')

        const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText')

        const copyButton = screen.getByText('Copy')
        await user.click(copyButton)

        expect(clipboardSpy).toHaveBeenCalledWith('Test text')
    })

    it('clears text when clear button is clicked', async () => {
        render(<CharacterWordCounter />)
        const user = userEvent.setup()

        const textarea = screen.getByPlaceholderText(
            'Type or paste your text here...'
        )
        await user.type(textarea, 'Test text')
        expect(textarea).toHaveValue('Test text')

        const clearButton = screen.getByText('Clear')
        await user.click(clearButton)

        expect(textarea).toHaveValue('')
    })
})
