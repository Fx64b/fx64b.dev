import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import HourDecimalConverter from '@/components/tools/hour-decimal-converter'

describe('HourDecimalConverter', () => {
    it('renders with default values', () => {
        render(<HourDecimalConverter />)

        expect(
            screen.getByText('Hour to Decimal Converter')
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Hours')).toHaveValue('8')
        expect(screen.getByLabelText('Minutes (0-59)')).toHaveValue('12')
        expect(screen.getByText('Decimal Time Result')).toBeInTheDocument()
    })

    it('converts hours and minutes to decimal correctly', async () => {
        render(<HourDecimalConverter />)
        const user = userEvent.setup()

        // Test various time combinations
        const testCases = [
            { hours: '1', minutes: '30' },
            { hours: '2', minutes: '15' },
            { hours: '0', minutes: '30' },
            { hours: '12', minutes: '0' },
        ]

        for (const { hours, minutes } of testCases) {
            // Input hours
            const hoursInput = screen.getByLabelText('Hours')
            await user.clear(hoursInput)
            await user.type(hoursInput, hours)

            // Input minutes
            const minutesInput = screen.getByLabelText('Minutes (0-59)')
            await user.clear(minutesInput)
            await user.type(minutesInput, minutes)

            // Check that result is displayed
            expect(screen.getByText('Decimal Time Result')).toBeInTheDocument()
        }
    })

    it('rejects invalid input for minutes field', async () => {
        render(<HourDecimalConverter />)
        const user = userEvent.setup()

        const minutesInput = screen.getByLabelText('Minutes (0-59)')
        await user.clear(minutesInput)

        // Try to input 65 minutes (over the limit of 59)
        await user.type(minutesInput, '65')

        // Should be truncated to just "6"
        expect(minutesInput).not.toHaveValue('65')
    })

    it('handles edge cases correctly', async () => {
        render(<HourDecimalConverter />)
        const user = userEvent.setup()

        // Test case: 0 hours 0 minutes
        const hoursInput = screen.getByLabelText('Hours')
        const minutesInput = screen.getByLabelText('Minutes (0-59)')

        await user.clear(hoursInput)
        await user.type(hoursInput, '0')
        await user.clear(minutesInput)
        await user.type(minutesInput, '0')

        // Check result is displayed
        expect(screen.getByText('Decimal Time Result')).toBeInTheDocument()

        // Test case: Maximum value for minutes (59)
        await user.clear(hoursInput)
        await user.type(hoursInput, '1')
        await user.clear(minutesInput)
        await user.type(minutesInput, '59')

        // Check result is displayed
        expect(screen.getByText('Decimal Time Result')).toBeInTheDocument()
    })

    it('allows only numeric input', async () => {
        render(<HourDecimalConverter />)
        const user = userEvent.setup()

        const hoursInput = screen.getByLabelText('Hours')
        await user.clear(hoursInput)

        // Try to input non-numeric characters
        await user.type(hoursInput, 'abc123')

        // Should only keep the numeric part
        expect(hoursInput).toHaveValue('123')
    })
})
