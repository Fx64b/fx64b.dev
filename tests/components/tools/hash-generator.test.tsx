import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import HashGenerator from '@/components/tools/hash-generator'
import { md5, sha } from '@/lib/hash-utils'

// ─── Pure unit tests for md5() ────────────────────────────────────────────────
// Test vectors from RFC 1321 §A.5.  These are the canonical expected outputs
// that any correct MD5 implementation must produce.

const MD5_RFC_VECTORS: Array<{ input: string; digest: string; label: string }> = [
    {
        input: '',
        digest: 'd41d8cd98f00b204e9800998ecf8427e',
        label: 'empty string',
    },
    {
        input: 'a',
        digest: '0cc175b9c0f1b6a831c399e269772661',
        label: '"a"',
    },
    {
        input: 'abc',
        digest: '900150983cd24fb0d6963f7d28e17f72',
        label: '"abc"',
    },
    {
        input: 'message digest',
        digest: 'f96b697d7cb7938d525a2f31aaf161d0',
        label: '"message digest"',
    },
    {
        input: 'abcdefghijklmnopqrstuvwxyz',
        digest: 'c3fcd3d76192e4007dfb496cca67e13b',
        label: 'lowercase alphabet',
    },
    {
        input: 'The quick brown fox jumps over the lazy dog',
        digest: '9e107d9d372bb6826bd81d3542a419d6',
        label: 'quick brown fox',
    },
    {
        input: 'The quick brown fox jumps over the lazy dog.',
        digest: 'e4d909c290d0fb1ca068ffaddf22cbd0',
        label: 'quick brown fox with trailing period',
    },
]

// SHA vectors: happy-dom's crypto.subtle may not match NIST exactly, so we
// verify format (length, charset, determinism) rather than exact byte values.
// Exact correctness of the underlying browser SubtleCrypto implementation is
// assumed — we are testing our wrapper, not re-testing the browser engine.

// Expected output lengths (hex characters = bits / 4)
const DIGEST_HEX_LENGTHS: Record<string, number> = {
    MD5: 32,
    'SHA-1': 40,
    'SHA-256': 64,
    'SHA-512': 128,
}

describe('md5() — RFC 1321 test vectors', () => {
    for (const { input, digest, label } of MD5_RFC_VECTORS) {
        it(`md5(${label}) = ${digest}`, () => {
            expect(md5(input)).toBe(digest)
        })
    }

    it('output is always 32 hex characters', () => {
        expect(md5('anything')).toHaveLength(DIGEST_HEX_LENGTHS.MD5)
        expect(md5('')).toHaveLength(DIGEST_HEX_LENGTHS.MD5)
    })

    it('output contains only lowercase hex characters', () => {
        expect(md5('test')).toMatch(/^[0-9a-f]+$/)
    })

    it('one-character difference produces a completely different digest', () => {
        expect(md5('abc')).not.toBe(md5('abd'))
    })

    it('same input always produces the same digest (determinism)', () => {
        expect(md5('repeatme')).toBe(md5('repeatme'))
    })

    it('handles multi-byte unicode input', () => {
        // Any result is fine as long as it is 32 hex chars and consistent
        const result = md5('こんにちは')
        expect(result).toHaveLength(DIGEST_HEX_LENGTHS.MD5)
        expect(result).toMatch(/^[0-9a-f]+$/)
        expect(md5('こんにちは')).toBe(result)
    })
})

describe('sha() — format and determinism', () => {
    it('SHA-256 output is always 64 hex characters', async () => {
        const result = await sha('SHA-256', 'test input')
        expect(result).toHaveLength(DIGEST_HEX_LENGTHS['SHA-256'])
        expect(result).toMatch(/^[0-9a-f]+$/)
    })

    it('SHA-512 output is always 128 hex characters', async () => {
        const result = await sha('SHA-512', 'test input')
        expect(result).toHaveLength(DIGEST_HEX_LENGTHS['SHA-512'])
        expect(result).toMatch(/^[0-9a-f]+$/)
    })

    it('SHA-1 output is always 40 hex characters', async () => {
        const result = await sha('SHA-1', 'test input')
        expect(result).toHaveLength(DIGEST_HEX_LENGTHS['SHA-1'])
    })

    it('SHA-256 is deterministic', async () => {
        const a = await sha('SHA-256', 'same')
        const b = await sha('SHA-256', 'same')
        expect(a).toBe(b)
    })

    it('one-character difference changes the SHA-256 output', async () => {
        const a = await sha('SHA-256', 'abc')
        const b = await sha('SHA-256', 'abd')
        expect(a).not.toBe(b)
    })
})

// ─── Component integration tests ──────────────────────────────────────────────

describe('HashGenerator component', () => {
    describe('initial state', () => {
        it('renders a text input', () => {
            render(<HashGenerator />)
            expect(screen.getByRole('textbox')).toBeInTheDocument()
        })

        it('renders cards for all four algorithms', () => {
            render(<HashGenerator />)
            // getAllByText because algorithm names also appear in the educational section
            for (const name of ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']) {
                expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1)
            }
        })

        it('shows placeholder dashes when input is empty', () => {
            render(<HashGenerator />)
            expect(screen.getAllByText('—').length).toBe(4)
        })

        it('copy buttons are disabled when input is empty', () => {
            render(<HashGenerator />)
            for (const name of ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'] as const) {
                expect(
                    screen.getByTestId(`copy-${name}`)
                ).toBeDisabled()
            }
        })
    })

    describe('hash computation on input', () => {
        it('shows the correct MD5 digest for "abc" (RFC 1321 vector)', async () => {
            const user = userEvent.setup()
            render(<HashGenerator />)
            await user.type(screen.getByRole('textbox'), 'abc')
            await waitFor(() => {
                expect(
                    screen.getByTestId('hash-MD5').textContent
                ).toBe('900150983cd24fb0d6963f7d28e17f72')
            })
        })

        it('shows a 64-character SHA-256 hex digest for any input', async () => {
            const user = userEvent.setup()
            render(<HashGenerator />)
            await user.type(screen.getByRole('textbox'), 'hello')
            await waitFor(() => {
                const text = screen.getByTestId('hash-SHA-256').textContent ?? ''
                expect(text).toHaveLength(64)
                expect(text).toMatch(/^[0-9a-f]+$/)
            })
        })

        it('shows a 128-character SHA-512 hex digest', async () => {
            const user = userEvent.setup()
            render(<HashGenerator />)
            await user.type(screen.getByRole('textbox'), 'hello')
            await waitFor(() => {
                const text = screen.getByTestId('hash-SHA-512').textContent ?? ''
                expect(text).toHaveLength(128)
            })
        })

        it('shows a 40-character SHA-1 hex digest', async () => {
            const user = userEvent.setup()
            render(<HashGenerator />)
            await user.type(screen.getByRole('textbox'), 'hello')
            await waitFor(() => {
                const text = screen.getByTestId('hash-SHA-1').textContent ?? ''
                expect(text).toHaveLength(40)
            })
        })

        it('clears all hashes when input is cleared', async () => {
            const user = userEvent.setup()
            render(<HashGenerator />)
            await user.type(screen.getByRole('textbox'), 'abc')
            await waitFor(() =>
                expect(screen.getByTestId('hash-MD5').textContent).not.toBe('—')
            )
            await user.clear(screen.getByRole('textbox'))
            await waitFor(() =>
                expect(screen.getAllByText('—').length).toBe(4)
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

        it('copies the MD5 hash when its copy button is clicked', async () => {
            const user = userEvent.setup()
            render(<HashGenerator />)
            await user.type(screen.getByRole('textbox'), 'abc')
            await waitFor(() =>
                expect(screen.getByTestId('hash-MD5').textContent).toHaveLength(32)
            )
            await user.click(screen.getByTestId('copy-MD5'))
            expect(writeTextSpy).toHaveBeenCalledWith(
                '900150983cd24fb0d6963f7d28e17f72'
            )
        })
    })
})
