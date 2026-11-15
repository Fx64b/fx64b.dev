import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CardSheetDesigner from '@/components/tools/card-sheet-designer'

const printRoot = () => document.querySelector('.csd-print-root') as HTMLElement
const printedCards = () =>
    [...printRoot().querySelectorAll('.csd-card')] as HTMLElement[]

const openTab = async (
    user: ReturnType<typeof userEvent.setup>,
    name: RegExp
) => {
    await user.click(screen.getByRole('tab', { name }))
}

describe('CardSheetDesigner', () => {
    beforeEach(() => {
        window.print = vi.fn()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders a preview and a print copy of one A4 sheet with ten cards', () => {
        render(<CardSheetDesigner />)
        expect(
            screen.getAllByRole('button', { name: /^Edit card \d+$/ })
        ).toHaveLength(10)
        const pages = printRoot().querySelectorAll('.csd-page')
        expect(pages).toHaveLength(1)
        expect((pages[0] as HTMLElement).style.width).toBe('210mm')
        expect((pages[0] as HTMLElement).style.height).toBe('297mm')
        expect(printedCards()).toHaveLength(10)
        expect(printedCards()[0].style.width).toBe('85mm')
        expect(printedCards()[0].style.height).toBe('55mm')
        expect(printedCards()[1].style.left).toBe('105mm')
    })

    it('fills cards from a ready-made list', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.selectOptions(
            screen.getByLabelText('Insert ready-made texts'),
            'bible-kjv'
        )
        await user.click(screen.getByRole('button', { name: 'Fill 10 cards' }))
        const cards = printedCards()
        expect(cards[0]).toHaveTextContent('For God so loved the world')
        expect(cards[0]).toHaveTextContent('John 3:16')
        expect(cards[9]).toHaveTextContent('Numbers 6:24-25')
        expect(
            (
                screen.getByRole('textbox', {
                    name: 'Text',
                }) as HTMLTextAreaElement
            ).value
        ).toContain('For God so loved the world')
    })

    it('adds a sheet when the list is longer than one page', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        const text = Array.from({ length: 12 }, (_, i) => `Card ${i + 1}`).join(
            '\n\n'
        )
        await user.click(screen.getByLabelText('Fill cards from a list'))
        await user.paste(text)
        await user.click(screen.getByRole('button', { name: 'Fill 12 cards' }))
        expect(screen.getByTestId('page-count')).toHaveTextContent('2 sheets')
        expect(printRoot().querySelectorAll('.csd-page')).toHaveLength(2)
        expect(printedCards()).toHaveLength(20)
        expect(printedCards()[11]).toHaveTextContent('Card 12')
    })

    it('edits a single card selected in the preview', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.click(screen.getByRole('button', { name: 'Edit card 4' }))
        expect(screen.getByTestId('card-editor-title')).toHaveTextContent(
            'Card 4'
        )
        await user.type(
            screen.getByRole('textbox', { name: 'Text' }),
            'Frohe Weihnachten'
        )
        await user.type(
            screen.getByRole('textbox', { name: /Reference/ }),
            'Anna'
        )
        expect(printedCards()[3]).toHaveTextContent('Frohe Weihnachten')
        expect(printedCards()[3]).toHaveTextContent('Anna')
        expect(printedCards()[2]).not.toHaveTextContent('Frohe Weihnachten')

        await user.click(
            screen.getByRole('button', { name: 'Copy this text to all cards' })
        )
        expect(
            printedCards().every((c) =>
                c.textContent?.includes('Frohe Weihnachten')
            )
        ).toBe(true)
    })

    it('uses a linked image for all cards in shared mode', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await openTab(user, /Background/)
        await user.click(screen.getByRole('tab', { name: /Image link/ }))
        await user.type(
            screen.getByLabelText('Image link'),
            'https://example.com/tree.jpg'
        )
        await user.click(screen.getByRole('button', { name: 'Use' }))
        const imgs = printRoot().querySelectorAll('img')
        expect(imgs).toHaveLength(10)
        imgs.forEach((img) =>
            expect(img.getAttribute('src')).toBe('https://example.com/tree.jpg')
        )
    })

    it('rejects image links that are not http(s)', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await openTab(user, /Background/)
        await user.click(screen.getByRole('tab', { name: /Image link/ }))
        await user.type(
            screen.getByLabelText('Image link'),
            'javascript:alert(1)'
        )
        await user.click(screen.getByRole('button', { name: 'Use' }))
        expect(screen.getByRole('alert')).toHaveTextContent(/https/)
        expect(printRoot().querySelectorAll('img')).toHaveLength(0)
    })

    it('gives cards individual photos from a search', async () => {
        const user = userEvent.setup()
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(
                JSON.stringify({
                    page_count: 1,
                    results: ['a', 'b', 'c'].map((id) => ({
                        id,
                        url: `https://img.example/${id}.jpg`,
                        thumbnail: `https://img.example/${id}-t.jpg`,
                    })),
                }),
                { status: 200 }
            )
        )
        render(<CardSheetDesigner />)
        await openTab(user, /Background/)
        await user.click(
            screen.getByRole('radio', { name: 'Individual per card' })
        )
        await user.type(
            screen.getByLabelText('Search free photos'),
            'stars{Enter}'
        )
        await user.click(
            await screen.findByRole('button', {
                name: 'Fill cards with these photos',
            })
        )
        const srcs = [...printRoot().querySelectorAll('img')].map((i) =>
            i.getAttribute('src')
        )
        expect(srcs).toHaveLength(10)
        expect(srcs.slice(0, 4)).toEqual([
            'https://img.example/a.jpg',
            'https://img.example/b.jpg',
            'https://img.example/c.jpg',
            'https://img.example/a.jpg',
        ])

        // Picking a photo now only changes the selected card.
        await user.click(screen.getByRole('button', { name: 'Edit card 2' }))
        const grid = screen.getByText(/Click a photo to use it for card 2/)
            .parentElement!.nextElementSibling as HTMLElement
        await user.click(within(grid).getAllByRole('button')[2])
        const after = [...printRoot().querySelectorAll('img')].map((i) =>
            i.getAttribute('src')
        )
        expect(after[1]).toBe('https://img.example/c.jpg')
        expect(after[0]).toBe('https://img.example/a.jpg')
    })

    it('switches to portrait cards and adds crop marks', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await openTab(user, /Layout/)
        await user.click(screen.getByRole('radio', { name: 'Portrait' }))
        expect(printedCards()).toHaveLength(9)
        expect(printedCards()[0].style.width).toBe('55mm')
        expect(printRoot().querySelectorAll('svg line')).toHaveLength(0)
        await user.click(screen.getByLabelText('Crop marks in the margin'))
        expect(printRoot().querySelectorAll('svg line').length).toBeGreaterThan(
            0
        )
    })

    it('warns when a layout change hides cards with text', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.click(screen.getByRole('button', { name: 'Edit card 10' }))
        await user.type(
            screen.getByRole('textbox', { name: 'Text' }),
            'Last card'
        )
        await openTab(user, /Layout/)
        await user.click(screen.getByRole('radio', { name: 'Portrait' }))
        expect(screen.getByText(/1 more card has text/)).toBeInTheDocument()
        await user.click(
            screen.getByRole('button', { name: 'Add sheets to print them' })
        )
        expect(screen.getByTestId('page-count')).toHaveTextContent('2 sheets')
        expect(printedCards()[9]).toHaveTextContent('Last card')
    })

    it('prints with the browser print dialog', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.click(screen.getByRole('button', { name: /Print/ }))
        await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1))
        expect(document.querySelector('style')?.textContent).toContain(
            'size: A4 portrait'
        )
    })

    it('imports a saved design and reports broken files', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        const input = screen.getByLabelText('Import design file')

        await user.upload(
            input,
            new File(['not json'], 'x.json', { type: 'application/json' })
        )
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'not valid JSON'
        )

        const design = {
            cards: [{ text: 'Imported!', reference: 'file' }],
            pages: 1,
            layout: { orientation: 'portrait' },
        }
        await user.upload(
            input,
            new File([JSON.stringify(design)], 'd.json', {
                type: 'application/json',
            })
        )
        await waitFor(() =>
            expect(printedCards()[0]).toHaveTextContent('Imported!')
        )
        expect(printedCards()).toHaveLength(9)
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})
