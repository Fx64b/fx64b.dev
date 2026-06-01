import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import JsonFormatter from '@/components/tools/json-formatter'

describe('JsonFormatter', () => {
    it('formats minified JSON with indentation', async () => {
        const user = userEvent.setup()
        render(<JsonFormatter />)
        await user.type(screen.getByRole('textbox'), '{{"hello":"world"}')
        await user.click(screen.getByRole('button', { name: 'Format' }))
        expect(await screen.findByText(/"hello": "world"/)).toBeInTheDocument()
    })

    it('minifies JSON', async () => {
        const user = userEvent.setup()
        render(<JsonFormatter />)
        await user.type(screen.getByRole('textbox'), '{{ "a" : 1 }')
        await user.click(screen.getByRole('button', { name: 'Minify' }))
        expect(await screen.findByText('{"a":1}')).toBeInTheDocument()
    })

    it('shows an error for invalid JSON', async () => {
        const user = userEvent.setup()
        const { container } = render(<JsonFormatter />)
        await user.type(screen.getByRole('textbox'), '{{not valid}')
        await user.click(screen.getByRole('button', { name: 'Format' }))
        await waitFor(() =>
            expect(container.querySelector('.text-destructive')).not.toBeNull()
        )
    })
})
