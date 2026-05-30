import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ColorConverter from '@/components/tools/color-converter'

async function setColorInput(
    user: ReturnType<typeof userEvent.setup>,
    value: string
) {
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, value)
}

async function selectFormat(
    user: ReturnType<typeof userEvent.setup>,
    format: string
) {
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: format }))
}

describe('ColorConverter', () => {
    describe('initial state', () => {
        it('shows the default dodger-blue colour on load', async () => {
            render(<ColorConverter />)
            await waitFor(() => {
                expect(screen.getByDisplayValue('#1e90ff')).toBeInTheDocument()
            })
        })

        it('renders HEX, RGB and HSL result cards', async () => {
            render(<ColorConverter />)
            await waitFor(() => {
                // Result cards render {format} as lowercase text ("hex", "rgb", "hsl").
                // CSS `uppercase` is visual only and not applied in happy-dom tests.
                expect(screen.getByText('hex')).toBeInTheDocument()
                expect(screen.getByText('rgb')).toBeInTheDocument()
                expect(screen.getByText('hsl')).toBeInTheDocument()
            })
        })
    })

    describe('HEX input conversions', () => {
        it('#ff0000 (red) → rgb(255, 0, 0)', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await setColorInput(user, '#ff0000')
            await waitFor(() =>
                expect(screen.getByText('rgb(255, 0, 0)')).toBeInTheDocument()
            )
        })

        it('#ff0000 (red) → hsl(0, 100%, 50%)', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await setColorInput(user, '#ff0000')
            await waitFor(() =>
                expect(screen.getByText('hsl(0, 100%, 50%)')).toBeInTheDocument()
            )
        })

        it('#000000 (black) → rgb(0, 0, 0)', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await setColorInput(user, '#000000')
            await waitFor(() =>
                expect(screen.getByText('rgb(0, 0, 0)')).toBeInTheDocument()
            )
        })

        it('#ffffff (white) → rgb(255, 255, 255)', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await setColorInput(user, '#ffffff')
            await waitFor(() =>
                expect(screen.getByText('rgb(255, 255, 255)')).toBeInTheDocument()
            )
        })

        it('short HEX #f00 is treated the same as #ff0000', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await setColorInput(user, '#f00')
            await waitFor(() =>
                expect(screen.getByText('rgb(255, 0, 0)')).toBeInTheDocument()
            )
        })

        it('HEX without # prefix is accepted', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await setColorInput(user, 'ff0000')
            await waitFor(() =>
                expect(screen.getByText('rgb(255, 0, 0)')).toBeInTheDocument()
            )
        })
    })

    describe('RGB input conversions', () => {
        it('rgb(255, 0, 0) → #ff0000', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await selectFormat(user, 'RGB')
            await setColorInput(user, 'rgb(255, 0, 0)')
            await waitFor(() =>
                expect(screen.getByText('#ff0000')).toBeInTheDocument()
            )
        })

        it('rgb(0, 0, 0) → #000000', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await selectFormat(user, 'RGB')
            await setColorInput(user, 'rgb(0, 0, 0)')
            await waitFor(() =>
                expect(screen.getByText('#000000')).toBeInTheDocument()
            )
        })

        it('bare "255, 0, 0" is accepted without the rgb() wrapper', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await selectFormat(user, 'RGB')
            await setColorInput(user, '255, 0, 0')
            await waitFor(() =>
                expect(screen.getByText('#ff0000')).toBeInTheDocument()
            )
        })
    })

    describe('HSL input conversions', () => {
        it('hsl(0, 100%, 50%) → #ff0000', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await selectFormat(user, 'HSL')
            await setColorInput(user, 'hsl(0, 100%, 50%)')
            await waitFor(() =>
                expect(screen.getByText('#ff0000')).toBeInTheDocument()
            )
        })
    })

    describe('invalid input', () => {
        it('shows an error message for a malformed HEX value', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await setColorInput(user, '#xyz')
            await waitFor(() =>
                expect(
                    screen.getByText('Invalid color format')
                ).toBeInTheDocument()
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

        it('copies the RGB result when its copy button is clicked', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await setColorInput(user, '#ff0000')
            await waitFor(() =>
                expect(screen.getByText('rgb(255, 0, 0)')).toBeInTheDocument()
            )
            const [firstCopy] = screen.getAllByTestId('copy-button')
            await user.click(firstCopy)
            expect(writeTextSpy).toHaveBeenCalled()
        })

        it('shows a check icon after copying', async () => {
            const user = userEvent.setup()
            render(<ColorConverter />)
            await waitFor(() =>
                expect(
                    screen.getAllByTestId('copy-button').length
                ).toBeGreaterThan(0)
            )
            await user.click(screen.getAllByTestId('copy-button')[0])
            expect(screen.getByTestId('check-icon')).toBeInTheDocument()
        })
    })
})
