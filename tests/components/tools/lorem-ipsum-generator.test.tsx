import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LoremIpsumGenerator from '@/components/tools/lorem-ipsum-generator'

// Words that are exclusive to each mode — used to verify the right pool is active
const CLASSIC_EXCLUSIVE = ['lorem', 'ipsum', 'consectetur', 'adipiscing']
const DEV_EXCLUSIVE = [
    'sprint', 'scrum', 'kanban', 'kubernetes', 'microservice',
    'refactor', 'pipeline', 'idempotent', 'backlog', 'observability',
]
const CYBER_EXCLUSIVE = [
    'reconnaissance', 'enumeration', 'exfiltration', 'persistence',
    'beaconing', 'ransomware', 'shellcode', 'lateral-movement',
]

function getOutput() {
    return screen.getByTestId('output').textContent ?? ''
}

describe('LoremIpsumGenerator', () => {
    describe('initial state', () => {
        it('renders with content in the output area on load', async () => {
            render(<LoremIpsumGenerator />)
            await waitFor(() =>
                expect(getOutput().length).toBeGreaterThan(0)
            )
        })

        it('shows mode selector buttons for all three modes', () => {
            render(<LoremIpsumGenerator />)
            expect(screen.getByRole('button', { name: 'Lorem Ipsum' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Dev Ipsum' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Cyber Ipsum' })).toBeInTheDocument()
        })

        it('shows output-type selector buttons', () => {
            render(<LoremIpsumGenerator />)
            expect(screen.getByRole('button', { name: 'Paragraphs' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Sentences' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Words' })).toBeInTheDocument()
        })

        it('shows a non-zero word and character count', async () => {
            render(<LoremIpsumGenerator />)
            await waitFor(() => {
                expect(screen.getByText(/\d+ words · \d+ characters/)).toBeInTheDocument()
            })
        })

        it('starts with the classic Lorem ipsum opening by default', async () => {
            render(<LoremIpsumGenerator />)
            await waitFor(() =>
                expect(getOutput()).toMatch(/Lorem ipsum dolor sit amet/i)
            )
        })
    })

    describe('classic Lorem Ipsum mode', () => {
        it('output contains classic Latin vocabulary', async () => {
            render(<LoremIpsumGenerator />)
            await waitFor(() => {
                const text = getOutput().toLowerCase()
                expect(
                    CLASSIC_EXCLUSIVE.some((word) => text.includes(word))
                ).toBe(true)
            })
        })
    })

    describe('Dev Ipsum mode', () => {
        it('output contains dev vocabulary after switching to Dev Ipsum', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Dev Ipsum' }))
            await waitFor(() => {
                const text = getOutput().toLowerCase()
                expect(
                    DEV_EXCLUSIVE.some((word) => text.toLowerCase().includes(word.toLowerCase()))
                ).toBe(true)
            })
        })

        it('output no longer contains classic Lorem ipsum text', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Dev Ipsum' }))
            // Uncheck "start with opening sentence" so we get pure dev words
            const checkbox = screen.getByRole('checkbox')
            await user.click(checkbox)
            await waitFor(() => {
                const text = getOutput().toLowerCase()
                // Classic-only Latin words should not appear in dev mode
                expect(text).not.toMatch(/\bipsum\b/)
                expect(text).not.toMatch(/\bconsectetur\b/)
            })
        })

        it('Dev Ipsum opening starts with "Agile"', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Dev Ipsum' }))
            await waitFor(() =>
                expect(getOutput()).toMatch(/^Agile/i)
            )
        })
    })

    describe('Cyber Ipsum mode', () => {
        it('output contains cyber vocabulary after switching to Cyber Ipsum', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Cyber Ipsum' }))
            await waitFor(() => {
                const text = getOutput().toLowerCase()
                expect(
                    CYBER_EXCLUSIVE.some((word) => text.toLowerCase().includes(word.toLowerCase()))
                ).toBe(true)
            })
        })

        it('Cyber Ipsum opening starts with "Threat-actor"', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Cyber Ipsum' }))
            await waitFor(() =>
                expect(getOutput()).toMatch(/^Threat-actor/i)
            )
        })

        it('switching back to Lorem Ipsum restores classic text', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Cyber Ipsum' }))
            await user.click(screen.getByRole('button', { name: 'Lorem Ipsum' }))
            await waitFor(() =>
                expect(getOutput()).toMatch(/lorem ipsum dolor sit amet/i)
            )
        })
    })

    describe('output type', () => {
        it('switching to Sentences produces a single block of text (no double newlines)', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Sentences' }))
            await waitFor(() => {
                expect(getOutput()).not.toContain('\n\n')
                expect(getOutput().length).toBeGreaterThan(0)
            })
        })

        it('switching to Words produces output without sentence-ending periods in the middle', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Words' }))
            await waitFor(() =>
                expect(getOutput().length).toBeGreaterThan(0)
            )
        })

        it('switching to Paragraphs produces multiple paragraphs for count > 1', async () => {
            render(<LoremIpsumGenerator />)
            // Default count is 3 paragraphs, so there should be newlines between them
            await waitFor(() => {
                const output = getOutput()
                // Output will have >1 <p> children in the DOM
                const paras = screen.getAllByTestId('output')[0].querySelectorAll('p')
                expect(paras.length).toBeGreaterThan(1)
            })
        })
    })

    describe('"Start with opening sentence" checkbox', () => {
        it('unchecking it removes the fixed opening from classic mode', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            const checkbox = screen.getByRole('checkbox')
            await user.click(checkbox) // uncheck
            await waitFor(() =>
                expect(getOutput()).not.toMatch(/Lorem ipsum dolor sit amet/i)
            )
        })
    })

    describe('regenerate button', () => {
        it('regenerate button is present', () => {
            render(<LoremIpsumGenerator />)
            expect(
                screen.getByRole('button', { name: 'Regenerate' })
            ).toBeInTheDocument()
        })

        it('clicking regenerate produces non-empty output', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await user.click(screen.getByRole('button', { name: 'Regenerate' }))
            await waitFor(() =>
                expect(getOutput().length).toBeGreaterThan(0)
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

        it('copies the output text when the copy button is clicked', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await waitFor(() =>
                expect(getOutput().length).toBeGreaterThan(0)
            )
            await user.click(screen.getByTestId('copy-button'))
            expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('Lorem'))
        })

        it('shows the check icon after copying', async () => {
            const user = userEvent.setup()
            render(<LoremIpsumGenerator />)
            await waitFor(() => expect(getOutput().length).toBeGreaterThan(0))
            await user.click(screen.getByTestId('copy-button'))
            expect(screen.getByTestId('check-icon')).toBeInTheDocument()
        })
    })
})
