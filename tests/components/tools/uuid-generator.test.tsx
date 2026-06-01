import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import UuidGenerator from '@/components/tools/uuid-generator'

const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('UuidGenerator', () => {
    it('generates five v4 UUIDs by default', () => {
        const { container } = render(<UuidGenerator />)
        const lines = container.querySelectorAll('.font-mono .break-all')
        expect(lines).toHaveLength(5)
        lines.forEach((line) => {
            expect(line.textContent ?? '').toMatch(UUID_V4)
        })
    })

    it('respects the requested count', async () => {
        const user = userEvent.setup()
        const { container } = render(<UuidGenerator />)
        const count = screen.getByLabelText('How many')
        await user.clear(count)
        await user.type(count, '3')
        await user.click(screen.getByRole('button', { name: /generate/i }))
        await waitFor(() =>
            expect(
                container.querySelectorAll('.font-mono .break-all')
            ).toHaveLength(3)
        )
    })

    it('uppercases output when toggled', async () => {
        const user = userEvent.setup()
        const { container } = render(<UuidGenerator />)
        await user.click(screen.getByRole('checkbox', { name: 'Uppercase' }))
        const first = container.querySelector('.font-mono .break-all')
        expect(first?.textContent).toBe(first?.textContent?.toUpperCase())
    })

    it('can insert the NIL UUID', async () => {
        const user = userEvent.setup()
        render(<UuidGenerator />)
        await user.click(screen.getByRole('button', { name: /nil uuid/i }))
        expect(
            await screen.findByText('00000000-0000-0000-0000-000000000000')
        ).toBeInTheDocument()
    })
})
