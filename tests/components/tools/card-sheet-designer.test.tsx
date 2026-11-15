import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CardSheetDesigner from '@/components/tools/card-sheet-designer'

type User = ReturnType<typeof userEvent.setup>

const printRoot = () => document.querySelector('.csd-print-root') as HTMLElement
const printedCards = () =>
    [...printRoot().querySelectorAll('.csd-card')] as HTMLElement[]
const printedImages = () =>
    [...printRoot().querySelectorAll('img')].map((i) => i.getAttribute('src'))

const textBox = () => screen.getByRole('textbox', { name: 'Text' })
const smallLine = () => screen.getByRole('textbox', { name: /Small line/ })

/** Opens a collapsed step by its title. */
const openStep = async (user: User, title: string) => {
    const button = screen.getByRole('button', { name: new RegExp(title) })
    if (button.getAttribute('aria-expanded') !== 'true') {
        await user.click(button)
    }
}

/** The scope switch inside a step ("All cards" / "Only card N"). */
const scopeIn = (step: string, option: RegExp) => {
    const section = screen
        .getByRole('button', { name: new RegExp(step) })
        .closest('section')!
    return within(section).getByRole('radio', { name: option })
}

const mockSearch = (ids: string[]) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
            JSON.stringify({
                page_count: 1,
                results: ids.map((id) => ({
                    id,
                    url: `https://img.example/${id}.jpg`,
                    thumbnail: `https://img.example/${id}-t.jpg`,
                })),
            }),
            { status: 200 }
        )
    )

const useLink = async (user: User, url: string) => {
    await user.click(screen.getByRole('tab', { name: /Link/ }))
    await user.type(screen.getByLabelText('Image link'), url)
    await user.click(screen.getByRole('button', { name: 'Use' }))
}

describe('CardSheetDesigner', () => {
    beforeEach(() => {
        window.print = vi.fn()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts with one A4 sheet of ten business cards', () => {
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
        expect(screen.getByTestId('page-count')).toHaveTextContent(
            'Sheet 1 of 1'
        )
        // Empty cards get an on-screen hint that is never printed.
        expect(
            screen.getByText('Card 1 · add text').closest('.csd-screen-only')
        ).not.toBeNull()
    })

    it('fills cards from an example list', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.click(
            screen.getByRole('button', { name: 'Paste many texts at once' })
        )
        await user.click(
            screen.getByRole('button', { name: 'Bible verses (KJV)' })
        )
        await user.click(
            screen.getByRole('button', { name: 'Put on 10 cards' })
        )
        expect(printedCards()[0]).toHaveTextContent(
            'For God so loved the world'
        )
        expect(printedCards()[0]).toHaveTextContent('John 3:16')
        expect(printedCards()[9]).toHaveTextContent('Numbers 6:24-25')
        expect((textBox() as HTMLTextAreaElement).value).toContain(
            'For God so loved the world'
        )
    })

    it('adds sheets when a list is longer than one sheet', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.click(
            screen.getByRole('button', { name: 'Paste many texts at once' })
        )
        await user.click(
            screen.getByRole('textbox', { name: 'Texts for several cards' })
        )
        await user.paste(
            Array.from({ length: 12 }, (_, i) => `Card ${i + 1}`).join('\n\n')
        )
        await user.click(
            screen.getByRole('button', { name: 'Put on 12 cards' })
        )
        expect(screen.getByTestId('page-count')).toHaveTextContent('of 2')
        expect(printRoot().querySelectorAll('.csd-page')).toHaveLength(2)
        expect(printedCards()[11]).toHaveTextContent('Card 12')
    })

    it('edits the card clicked in the preview', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.click(screen.getByRole('button', { name: 'Edit card 4' }))
        expect(screen.getByTestId('card-editor-title')).toHaveTextContent(
            'Card 4'
        )
        await user.type(textBox(), 'Frohe Weihnachten')
        await user.type(smallLine(), 'Anna')
        expect(printedCards()[3]).toHaveTextContent('Frohe WeihnachtenAnna')
        expect(printedCards()[2]).not.toHaveTextContent('Frohe Weihnachten')
    })

    it('puts the same text on every card, also on new sheets', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.type(textBox(), 'own text')
        await user.click(screen.getByLabelText('Same text on every card'))
        expect(screen.getByTestId('card-editor-title')).toHaveTextContent(
            'All 10 cards'
        )
        expect(textBox()).toHaveValue('own text')
        await user.type(textBox(), '!')
        expect(
            printedCards().every((c) => c.textContent?.includes('own text!'))
        ).toBe(true)

        await user.click(screen.getByRole('button', { name: /Add sheet/ }))
        expect(printedCards()).toHaveLength(20)
        expect(printedCards()[19]).toHaveTextContent('own text!')

        // Turning it off brings back each card's own text.
        await user.click(screen.getByLabelText('Same text on every card'))
        expect(printedCards()[0]).toHaveTextContent('own text')
        expect(printedCards()[1]).not.toHaveTextContent('own text')
    })

    it('uses a photo link for all cards', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await useLink(user, 'https://example.com/tree.jpg')
        expect(printedImages()).toEqual(
            Array(10).fill('https://example.com/tree.jpg')
        )
    })

    it('rejects photo links that are not http(s)', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await useLink(user, 'javascript:1')
        expect(screen.getByRole('alert')).toHaveTextContent(/https/)
        expect(printedImages()).toHaveLength(0)
    })

    it('spreads search results over the cards and lets one card differ', async () => {
        const user = userEvent.setup()
        mockSearch(['a', 'b', 'c'])
        render(<CardSheetDesigner />)
        await user.type(
            screen.getByLabelText('Search free photos'),
            'stars{Enter}'
        )
        await user.click(
            await screen.findByRole('button', {
                name: 'Different photo on every card',
            })
        )
        expect(printedImages().slice(0, 4)).toEqual([
            'https://img.example/a.jpg',
            'https://img.example/b.jpg',
            'https://img.example/c.jpg',
            'https://img.example/a.jpg',
        ])
        expect(
            screen.getByText(/10 cards have their own photo/)
        ).toBeInTheDocument()

        // Only card 2 gets the next photo picked.
        await user.click(screen.getByRole('button', { name: 'Edit card 2' }))
        await user.click(scopeIn('Background', /Only card 2/))
        await user.click(screen.getAllByRole('button', { name: 'Photo' })[2])
        expect(printedImages()[1]).toBe('https://img.example/c.jpg')
        expect(printedImages()[0]).toBe('https://img.example/a.jpg')

        // A photo picked for all cards replaces every individual photo.
        await user.click(scopeIn('Background', /All cards/))
        await user.click(screen.getAllByRole('button', { name: 'Photo' })[1])
        expect(printedImages()).toEqual(
            Array(10).fill('https://img.example/b.jpg')
        )
    })

    it('changes photo brightness with one slider', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await useLink(user, 'https://example.com/tree.jpg')
        expect(screen.getByText('Original')).toBeInTheDocument()
        const slider = screen.getByLabelText(/Photo brightness/)
        // Range inputs can't be typed into; set the value like a drag would.
        Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value'
        )!.set!.call(slider, '-0.3')
        slider.dispatchEvent(new Event('input', { bubbles: true }))
        expect(await screen.findByText('Darker 30%')).toBeInTheDocument()
    })

    it('styles all cards with a look, or a single card on its own', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await openStep(user, 'Text style')
        await user.click(screen.getByRole('radio', { name: /White text/ }))
        expect(
            screen.getByRole('radio', { name: /White text/ })
        ).toHaveAttribute('aria-checked', 'true')

        await user.click(screen.getByRole('button', { name: 'Edit card 3' }))
        await user.click(scopeIn('Text style', /Only card 3/))
        await user.click(screen.getByRole('radio', { name: 'Bottom right' }))
        expect(
            screen.getByRole('radio', { name: 'Bottom right' })
        ).toHaveAttribute('aria-checked', 'true')
        expect(
            screen.getByRole('button', {
                name: 'Make card 3 match the other cards again',
            })
        ).toBeInTheDocument()

        // The other cards keep the shared position.
        await user.click(scopeIn('Text style', /All cards/))
        expect(screen.getByRole('radio', { name: 'Center' })).toHaveAttribute(
            'aria-checked',
            'true'
        )
    })

    it('switches to tall cards and adds crop marks', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await openStep(user, 'Size & cutting')
        await user.click(screen.getByRole('radio', { name: 'Tall' }))
        expect(printedCards()).toHaveLength(9)
        expect(printedCards()[0].style.width).toBe('55mm')
        expect(screen.getByTestId('grid-summary')).toHaveTextContent(
            '9 cards of 55 × 85 mm'
        )
        expect(printRoot().querySelectorAll('svg line')).toHaveLength(0)
        await user.click(screen.getByLabelText('Crop marks at the paper edge'))
        expect(printRoot().querySelectorAll('svg line').length).toBeGreaterThan(
            0
        )
    })

    it('warns when a layout change hides cards with text', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.click(screen.getByRole('button', { name: 'Edit card 10' }))
        await user.type(textBox(), 'Last card')
        await openStep(user, 'Size & cutting')
        await user.click(screen.getByRole('radio', { name: 'Tall' }))
        expect(
            screen.getByText(/1 card with text no longer fits/)
        ).toBeInTheDocument()
        await user.click(
            screen.getByRole('button', { name: 'Add sheets to print them' })
        )
        expect(screen.getByTestId('page-count')).toHaveTextContent('of 2')
        expect(printedCards()[9]).toHaveTextContent('Last card')
    })

    it('prints with the browser print dialog', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        await user.click(screen.getByRole('button', { name: /Print sheet/ }))
        await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1))
        expect(document.querySelector('style')?.textContent).toContain(
            'size: A4 portrait'
        )
    })

    it('opens a saved design and reports broken files', async () => {
        const user = userEvent.setup()
        render(<CardSheetDesigner />)
        const input = screen.getByLabelText('Open design file')

        await user.upload(
            input,
            new File(['not json'], 'x.json', { type: 'application/json' })
        )
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'not a saved card design'
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
