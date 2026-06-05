import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HourToDecimalConverter from '@/components/tools/hour-decimal-converter'

async function setTime(
    user: ReturnType<typeof userEvent.setup>,
    hours: string,
    minutes: string
) {
    const hoursInput = screen.getByRole('textbox', { name: 'Hours' })
    const minutesInput = screen.getByRole('textbox', { name: 'Minutes' })
    await user.clear(hoursInput)
    if (hours !== '') await user.type(hoursInput, hours)
    await user.clear(minutesInput)
    if (minutes !== '') await user.type(minutesInput, minutes)
}

describe('HourToDecimalConverter', () => {
    describe('initial state', () => {
        it('shows 8h 12m with result 8.2 on load', async () => {
            render(<HourToDecimalConverter />)
            expect(screen.getByRole('textbox', { name: 'Hours' })).toHaveValue(
                '8'
            )
            expect(
                screen.getByRole('textbox', { name: 'Minutes' })
            ).toHaveValue('12')
            await waitFor(() =>
                expect(screen.getByText('8.2')).toBeInTheDocument()
            )
        })
    })

    describe('conversion accuracy', () => {
        beforeEach(() => {
            render(<HourToDecimalConverter />)
        })

        it('1h 30m → 1.5', async () => {
            const user = userEvent.setup()
            await setTime(user, '1', '30')
            await waitFor(() =>
                expect(screen.getByText('1.5')).toBeInTheDocument()
            )
        })

        it('0h 15m → 0.25', async () => {
            const user = userEvent.setup()
            await setTime(user, '0', '15')
            await waitFor(() =>
                expect(screen.getByText('0.25')).toBeInTheDocument()
            )
        })

        it('0h 45m → 0.75', async () => {
            const user = userEvent.setup()
            await setTime(user, '0', '45')
            await waitFor(() =>
                expect(screen.getByText('0.75')).toBeInTheDocument()
            )
        })

        it('2h 45m → 2.75', async () => {
            const user = userEvent.setup()
            await setTime(user, '2', '45')
            await waitFor(() =>
                expect(screen.getByText('2.75')).toBeInTheDocument()
            )
        })

        it('1h 0m → 1 (no trailing decimal)', async () => {
            const user = userEvent.setup()
            await setTime(user, '1', '0')
            await waitFor(() =>
                expect(screen.getByText('1')).toBeInTheDocument()
            )
        })

        it('0h 0m → 0', async () => {
            const user = userEvent.setup()
            await setTime(user, '0', '0')
            await waitFor(() =>
                expect(screen.getByText('0')).toBeInTheDocument()
            )
        })
    })

    describe('edge cases', () => {
        beforeEach(() => {
            render(<HourToDecimalConverter />)
        })

        it('empty hours field is treated as 0', async () => {
            const user = userEvent.setup()
            await setTime(user, '', '30')
            await waitFor(() =>
                expect(screen.getByText('0.5')).toBeInTheDocument()
            )
        })

        it('empty minutes field is treated as 0', async () => {
            const user = userEvent.setup()
            await setTime(user, '3', '')
            await waitFor(() =>
                expect(screen.getByText('3')).toBeInTheDocument()
            )
        })

        it('minutes > 59 are rejected (typing "60" keeps the field at "6")', async () => {
            const user = userEvent.setup()
            const minutesInput = screen.getByRole('textbox', {
                name: 'Minutes',
            })
            await user.clear(minutesInput)
            await user.type(minutesInput, '60')
            expect(minutesInput).toHaveValue('6')
        })

        it('non-numeric characters are stripped from hours', async () => {
            const user = userEvent.setup()
            const hoursInput = screen.getByRole('textbox', { name: 'Hours' })
            await user.clear(hoursInput)
            await user.type(hoursInput, '2a')
            expect(hoursInput).toHaveValue('2')
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

        it('copies the decimal result to clipboard', async () => {
            const user = userEvent.setup()
            render(<HourToDecimalConverter />)
            await user.click(screen.getByTestId('copy-button'))
            expect(writeTextSpy).toHaveBeenCalledWith('8.2')
        })

        it('shows a check icon after copying', async () => {
            const user = userEvent.setup()
            render(<HourToDecimalConverter />)
            await user.click(screen.getByTestId('copy-button'))
            expect(screen.getByTestId('check-icon')).toBeInTheDocument()
        })
    })
})
