import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import TimestampConverter from '@/components/tools/timestamp-converter'

describe('TimestampConverter', () => {
    it('converts a Unix timestamp to an ISO date', async () => {
        const user = userEvent.setup()
        render(<TimestampConverter />)
        const epoch = screen.getByLabelText('Unix timestamp')
        await user.clear(epoch)
        await user.type(epoch, '1700000000')
        expect(
            await screen.findByText(/2023-11-14T22:13:20\.000Z/)
        ).toBeInTheDocument()
    })

    it('shows an error for a non-numeric timestamp', async () => {
        const user = userEvent.setup()
        render(<TimestampConverter />)
        const epoch = screen.getByLabelText('Unix timestamp')
        await user.clear(epoch)
        await user.type(epoch, 'abc')
        await waitFor(() =>
            expect(
                screen.getByText(/valid integer timestamp/i)
            ).toBeInTheDocument()
        )
    })

    it('converts a date string to a Unix timestamp', async () => {
        const user = userEvent.setup()
        render(<TimestampConverter />)
        await user.type(
            screen.getByLabelText('Date string'),
            '2023-11-14T22:13:20Z'
        )
        expect(await screen.findByText('1700000000')).toBeInTheDocument()
    })
})
