import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Base64EncoderDecoder from '@/components/tools/base64-encoder-decoder'

// Known Base64 encode/decode pairs (RFC 4648 §10 test vectors)
const ENCODE_VECTORS: Array<{ plain: string; encoded: string }> = [
    { plain: 'f',       encoded: 'Zg==' },
    { plain: 'fo',      encoded: 'Zm8=' },
    { plain: 'foo',     encoded: 'Zm9v' },
    { plain: 'foobar',  encoded: 'Zm9vYmFy' },
    { plain: 'hello',   encoded: 'aGVsbG8=' },
    { plain: 'Hello, World!', encoded: 'SGVsbG8sIFdvcmxkIQ==' },
]

async function setInput(
    user: ReturnType<typeof userEvent.setup>,
    value: string
) {
    const ta = screen.getByRole('textbox')
    await user.clear(ta)
    if (value) await user.type(ta, value)
}

async function clickMode(
    user: ReturnType<typeof userEvent.setup>,
    label: 'Encode' | 'Decode'
) {
    await user.click(screen.getByRole('button', { name: label }))
}

describe('Base64EncoderDecoder', () => {
    describe('initial state', () => {
        it('defaults to Encode mode with an empty input', () => {
            render(<Base64EncoderDecoder />)
            expect(screen.getByRole('textbox')).toHaveValue('')
            // Encode button should appear active (default variant styling)
            expect(screen.getByRole('button', { name: 'Encode' })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Decode' })).toBeInTheDocument()
        })

        it('shows the output placeholder when input is empty', () => {
            render(<Base64EncoderDecoder />)
            expect(
                screen.getByText('Output will appear here...')
            ).toBeInTheDocument()
        })
    })

    describe('encoding — RFC 4648 test vectors', () => {
        beforeEach(() => {
            render(<Base64EncoderDecoder />)
        })

        for (const { plain, encoded } of ENCODE_VECTORS) {
            it(`encodes "${plain}" → "${encoded}"`, async () => {
                const user = userEvent.setup()
                await setInput(user, plain)
                await waitFor(() =>
                    expect(screen.getByText(encoded)).toBeInTheDocument()
                )
            })
        }
    })

    describe('decoding — RFC 4648 test vectors', () => {
        beforeEach(() => {
            render(<Base64EncoderDecoder />)
        })

        for (const { plain, encoded } of ENCODE_VECTORS) {
            it(`decodes "${encoded}" → "${plain}"`, async () => {
                const user = userEvent.setup()
                await clickMode(user, 'Decode')
                await setInput(user, encoded)
                await waitFor(() =>
                    expect(screen.getByText(plain)).toBeInTheDocument()
                )
            })
        }
    })

    describe('mode switching', () => {
        it('switching to Decode clears the output when input is empty', async () => {
            const user = userEvent.setup()
            render(<Base64EncoderDecoder />)
            await clickMode(user, 'Decode')
            await waitFor(() =>
                expect(
                    screen.getByText('Output will appear here...')
                ).toBeInTheDocument()
            )
        })

        it('re-encodes current input when mode is toggled back to Encode', async () => {
            const user = userEvent.setup()
            render(<Base64EncoderDecoder />)
            await setInput(user, 'hello')
            await waitFor(() =>
                expect(screen.getByText('aGVsbG8=')).toBeInTheDocument()
            )
            await clickMode(user, 'Decode')
            await clickMode(user, 'Encode')
            await waitFor(() =>
                expect(screen.getByText('aGVsbG8=')).toBeInTheDocument()
            )
        })
    })

    describe('error handling', () => {
        it('shows an error for invalid Base64 in Decode mode', async () => {
            const user = userEvent.setup()
            render(<Base64EncoderDecoder />)
            await clickMode(user, 'Decode')
            await setInput(user, '!!!not-valid-base64!!!')
            await waitFor(() =>
                expect(
                    screen.getByText('Invalid Base64 input')
                ).toBeInTheDocument()
            )
        })

        it('clears the error when invalid input is removed', async () => {
            const user = userEvent.setup()
            render(<Base64EncoderDecoder />)
            await clickMode(user, 'Decode')
            await setInput(user, '!!!!')
            await waitFor(() =>
                expect(screen.getByText('Invalid Base64 input')).toBeInTheDocument()
            )
            await user.clear(screen.getByRole('textbox'))
            await waitFor(() =>
                expect(
                    screen.queryByText('Invalid Base64 input')
                ).not.toBeInTheDocument()
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

        it('copies the encoded output to clipboard', async () => {
            const user = userEvent.setup()
            render(<Base64EncoderDecoder />)
            await setInput(user, 'hello')
            await waitFor(() =>
                expect(screen.getByText('aGVsbG8=')).toBeInTheDocument()
            )
            await user.click(screen.getByRole('button', { name: /copy/i }))
            expect(writeTextSpy).toHaveBeenCalledWith('aGVsbG8=')
        })

        it('copy button is disabled when there is no output', () => {
            render(<Base64EncoderDecoder />)
            const copyBtn = screen.getByRole('button', { name: /copy/i })
            expect(copyBtn).toBeDisabled()
        })
    })
})
