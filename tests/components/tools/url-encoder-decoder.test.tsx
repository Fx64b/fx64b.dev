import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UrlEncoderDecoder from '@/components/tools/url-encoder-decoder'

// encodeURIComponent / decodeURIComponent reference pairs per RFC 3986
const ENCODE_VECTORS: Array<{ plain: string; encoded: string; label: string }> = [
    {
        plain: 'hello world',
        encoded: 'hello%20world',
        label: 'space → %20',
    },
    {
        plain: 'a=1&b=2',
        encoded: 'a%3D1%26b%3D2',
        label: '= and & are encoded',
    },
    {
        plain: 'https://example.com/path?q=foo bar',
        encoded: 'https%3A%2F%2Fexample.com%2Fpath%3Fq%3Dfoo%20bar',
        label: 'full URL with query string',
    },
    // Note: 'hello' → 'hello' (identity) is not tested here because the same
    // text appears in both the textarea and the output, causing getByText to
    // find multiple elements. The identity behaviour is implicitly covered by
    // the decode round-trip tests for the other vectors.

    {
        plain: '<script>alert(1)</script>',
        encoded: '%3Cscript%3Ealert(1)%3C%2Fscript%3E',
        label: 'XSS payload is fully encoded',
    },
    {
        plain: "' OR '1'='1",
        encoded: "'%20OR%20'1'%3D'1",
        label: 'SQL injection fragment is encoded',
    },
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

describe('UrlEncoderDecoder', () => {
    describe('initial state', () => {
        it('renders with empty input in Encode mode', () => {
            render(<UrlEncoderDecoder />)
            expect(screen.getByRole('textbox')).toHaveValue('')
            expect(screen.getByRole('button', { name: 'Encode' })).toBeInTheDocument()
        })

        it('shows the output placeholder when input is empty', () => {
            render(<UrlEncoderDecoder />)
            expect(
                screen.getByText('Output will appear here...')
            ).toBeInTheDocument()
        })
    })

    describe('encoding — RFC 3986 vectors', () => {
        beforeEach(() => {
            render(<UrlEncoderDecoder />)
        })

        for (const { plain, encoded, label } of ENCODE_VECTORS) {
            it(label, async () => {
                const user = userEvent.setup()
                await setInput(user, plain)
                await waitFor(() =>
                    expect(screen.getByText(encoded)).toBeInTheDocument()
                )
            })
        }
    })

    describe('decoding', () => {
        beforeEach(() => {
            render(<UrlEncoderDecoder />)
        })

        for (const { plain, encoded, label } of ENCODE_VECTORS) {
            it(`decodes: ${label}`, async () => {
                const user = userEvent.setup()
                await clickMode(user, 'Decode')
                await setInput(user, encoded)
                await waitFor(() =>
                    expect(screen.getByText(plain)).toBeInTheDocument()
                )
            })
        }

        it('decodes double-encoded sequences (%2520 → %20)', async () => {
            const user = userEvent.setup()
            await clickMode(user, 'Decode')
            await setInput(user, 'hello%2520world')
            await waitFor(() =>
                expect(screen.getByText('hello%20world')).toBeInTheDocument()
            )
        })
    })

    describe('error handling', () => {
        it('shows an error for malformed percent-encoding in Decode mode', async () => {
            const user = userEvent.setup()
            render(<UrlEncoderDecoder />)
            await clickMode(user, 'Decode')
            // Incomplete escape sequence at end of string
            await setInput(user, 'hello%GG')
            await waitFor(() =>
                expect(
                    screen.getByText('Invalid input for decoding')
                ).toBeInTheDocument()
            )
        })

        it('clears the error when valid input is entered', async () => {
            const user = userEvent.setup()
            render(<UrlEncoderDecoder />)
            await clickMode(user, 'Decode')
            await setInput(user, '%GG')
            await waitFor(() =>
                expect(screen.getByText('Invalid input for decoding')).toBeInTheDocument()
            )
            await setInput(user, 'hello%20world')
            await waitFor(() =>
                expect(
                    screen.queryByText('Invalid input for decoding')
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
            render(<UrlEncoderDecoder />)
            await setInput(user, 'hello world')
            await waitFor(() =>
                expect(screen.getByText('hello%20world')).toBeInTheDocument()
            )
            await user.click(screen.getByRole('button', { name: /copy/i }))
            expect(writeTextSpy).toHaveBeenCalledWith('hello%20world')
        })

        it('copy button is disabled when there is no output', () => {
            render(<UrlEncoderDecoder />)
            expect(
                screen.getByRole('button', { name: /copy/i })
            ).toBeDisabled()
        })
    })
})
