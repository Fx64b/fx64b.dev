import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ByteConverter from '@/components/tools/byte-converter'

// The result <div> has title={value}, making it uniquely queryable without
// locale-formatting assumptions.
const titleOf = (value: string) => document.querySelector(`[title="${value}"]`)

describe('ByteConverter', () => {
    describe('initial state', () => {
        it('renders with 1 MB selected by default', () => {
            render(<ByteConverter />)
            expect(screen.getByRole('textbox')).toHaveValue('1')
            expect(screen.getByRole('combobox')).toHaveTextContent('MB')
        })

        it('renders all six unit labels', () => {
            render(<ByteConverter />)
            for (const unit of ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']) {
                expect(screen.getAllByText(unit).length).toBeGreaterThanOrEqual(
                    1
                )
            }
        })

        it('marks the source unit card with a Source badge', () => {
            render(<ByteConverter />)
            expect(screen.getByText('Source')).toBeInTheDocument()
        })
    })

    describe('conversion accuracy', () => {
        it('1 MB → 1 048 576 Bytes', async () => {
            render(<ByteConverter />)
            await waitFor(() => {
                expect(titleOf('1,048,576')).toBeTruthy()
            })
        })

        it('1 MB → 1 024 KB', async () => {
            render(<ByteConverter />)
            await waitFor(() => {
                expect(titleOf('1,024')).toBeTruthy()
            })
        })

        it('2 MB → 2 097 152 Bytes', async () => {
            const user = userEvent.setup()
            render(<ByteConverter />)
            await user.clear(screen.getByRole('textbox'))
            await user.type(screen.getByRole('textbox'), '2')
            await waitFor(() => {
                expect(titleOf('2,097,152')).toBeTruthy()
            })
        })

        it('1.5 MB → 1 572 864 Bytes', async () => {
            const user = userEvent.setup()
            render(<ByteConverter />)
            await user.clear(screen.getByRole('textbox'))
            await user.type(screen.getByRole('textbox'), '1.5')
            await waitFor(() => {
                expect(titleOf('1,572,864')).toBeTruthy()
            })
        })

        it('uses exponential notation for very small values (e.g. MB → TB)', async () => {
            render(<ByteConverter />)
            await waitFor(() => {
                const titles = Array.from(
                    document.querySelectorAll('[title]')
                ).map((el) => el.getAttribute('title') ?? '')
                expect(titles.some((t) => t.includes('e-'))).toBe(true)
            })
        })
    })

    describe('keyboard unit cycling', () => {
        it('ArrowDown on the input advances MB → GB', async () => {
            render(<ByteConverter />)
            fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' })
            await waitFor(() => {
                expect(screen.getByRole('combobox')).toHaveTextContent('GB')
            })
        })

        it('ArrowUp on the input retreats MB → KB', async () => {
            render(<ByteConverter />)
            fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowUp' })
            await waitFor(() => {
                expect(screen.getByRole('combobox')).toHaveTextContent('KB')
            })
        })

        it('ArrowUp wraps from Bytes back to PB', async () => {
            render(<ByteConverter />)
            const input = screen.getByRole('textbox')
            // MB (2) → KB (1) → Bytes (0) → PB (5, wraps)
            fireEvent.keyDown(input, { key: 'ArrowUp' })
            fireEvent.keyDown(input, { key: 'ArrowUp' })
            fireEvent.keyDown(input, { key: 'ArrowUp' })
            await waitFor(() => {
                expect(screen.getByRole('combobox')).toHaveTextContent('PB')
            })
        })
    })

    describe('edge cases', () => {
        it('shows dashes for every unit when input is empty', async () => {
            const user = userEvent.setup()
            render(<ByteConverter />)
            await user.clear(screen.getByRole('textbox'))
            await waitFor(() => {
                expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(
                    5
                )
            })
        })

        it('shows dashes for non-numeric input', async () => {
            const user = userEvent.setup()
            render(<ByteConverter />)
            await user.clear(screen.getByRole('textbox'))
            await user.type(screen.getByRole('textbox'), 'xyz')
            await waitFor(() => {
                expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(
                    5
                )
            })
        })

        it('converts 0: all units show 0', async () => {
            const user = userEvent.setup()
            render(<ByteConverter />)
            await user.clear(screen.getByRole('textbox'))
            await user.type(screen.getByRole('textbox'), '0')
            await waitFor(() => {
                const zeroTitles = document.querySelectorAll('[title="0"]')
                expect(zeroTitles.length).toBe(6)
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

        it('copies the Bytes value when its copy button is clicked', async () => {
            const user = userEvent.setup()
            render(<ByteConverter />)
            await waitFor(() => {
                expect(titleOf('1,048,576')).toBeTruthy()
            })
            const [firstCopy] = screen.getAllByTestId('copy-button')
            await user.click(firstCopy)
            expect(writeTextSpy).toHaveBeenCalledWith('1,048,576')
        })

        it('shows a check icon immediately after copying', async () => {
            const user = userEvent.setup()
            render(<ByteConverter />)
            await waitFor(() => {
                expect(
                    screen.getAllByTestId('copy-button').length
                ).toBeGreaterThan(0)
            })
            await user.click(screen.getAllByTestId('copy-button')[0])
            expect(screen.getByTestId('check-icon')).toBeInTheDocument()
        })
    })
})
