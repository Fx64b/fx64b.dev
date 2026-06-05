import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReverseShellGenerator from '@/components/tools/reverse-shell-generator'

const DEFAULT_IP = '10.10.10.10'
const DEFAULT_PORT = '4444'

async function setField(
    user: ReturnType<typeof userEvent.setup>,
    label: RegExp | string,
    value: string
) {
    const input = screen.getByRole('textbox', { name: label })
    await user.clear(input)
    if (value) await user.type(input, value)
}

describe('ReverseShellGenerator', () => {
    describe('initial state', () => {
        it('pre-populates the IP field with the default listener address', () => {
            render(<ReverseShellGenerator />)
            expect(
                screen.getByRole('textbox', { name: /listener ip/i })
            ).toHaveValue(DEFAULT_IP)
        })

        it('pre-populates the port field with the default port', () => {
            render(<ReverseShellGenerator />)
            expect(screen.getByRole('textbox', { name: /port/i })).toHaveValue(
                DEFAULT_PORT
            )
        })

        it('renders shell commands on load', () => {
            render(<ReverseShellGenerator />)
            // Bash TCP shell is always present regardless of category filter
            expect(screen.getByText('Bash TCP')).toBeInTheDocument()
        })

        it('embeds the default IP in the generated commands', () => {
            render(<ReverseShellGenerator />)
            const commands = screen.getAllByText(new RegExp(DEFAULT_IP))
            expect(commands.length).toBeGreaterThan(0)
        })

        it('embeds the default port in the generated commands', () => {
            render(<ReverseShellGenerator />)
            const commands = screen.getAllByText(new RegExp(DEFAULT_PORT))
            expect(commands.length).toBeGreaterThan(0)
        })

        it('shows shell names for multiple languages/platforms', () => {
            render(<ReverseShellGenerator />)
            for (const name of [
                'Python 3',
                'PHP',
                'PowerShell',
                'Netcat (nc)',
            ]) {
                expect(screen.getByText(name)).toBeInTheDocument()
            }
        })

        it('shows category filter buttons', () => {
            render(<ReverseShellGenerator />)
            for (const cat of ['All', 'Unix', 'Windows', 'Python', 'Web']) {
                expect(
                    screen.getByRole('button', { name: cat })
                ).toBeInTheDocument()
            }
        })

        it('shows the authorized-use-only notice', () => {
            render(<ReverseShellGenerator />)
            expect(
                screen.getByText(/authorized penetration testing/i)
            ).toBeInTheDocument()
        })
    })

    describe('IP / port updates propagate to commands', () => {
        it('updates commands when the IP is changed', async () => {
            const user = userEvent.setup()
            render(<ReverseShellGenerator />)
            await setField(user, /listener ip/i, '192.168.1.50')
            await waitFor(() => {
                const hits = screen.getAllByText(/192\.168\.1\.50/)
                expect(hits.length).toBeGreaterThan(0)
            })
        })

        it('updates commands when the port is changed', async () => {
            const user = userEvent.setup()
            render(<ReverseShellGenerator />)
            await setField(user, /listener port/i, '9001')
            await waitFor(() => {
                const hits = screen.getAllByText(/9001/)
                expect(hits.length).toBeGreaterThan(0)
            })
        })

        it('shows the bash TCP command with the correct IP and port', async () => {
            const user = userEvent.setup()
            render(<ReverseShellGenerator />)
            await setField(user, /listener ip/i, '10.0.0.1')
            await setField(user, /listener port/i, '1337')
            // Check IP and port both appear in the output (they appear in all commands)
            await waitFor(() => {
                expect(
                    screen.getAllByText(/10\.0\.0\.1/).length
                ).toBeGreaterThan(0)
                expect(screen.getAllByText(/1337/).length).toBeGreaterThan(0)
            })
        })
    })

    describe('category filter', () => {
        it('clicking "Unix" shows only Unix shells', async () => {
            const user = userEvent.setup()
            render(<ReverseShellGenerator />)
            await user.click(screen.getByRole('button', { name: 'Unix' }))
            // Unix shells are present
            expect(screen.getByText('Bash TCP')).toBeInTheDocument()
            // Windows-only shells should be gone
            expect(screen.queryByText('PowerShell')).not.toBeInTheDocument()
        })

        it('clicking "Windows" shows only Windows shells', async () => {
            const user = userEvent.setup()
            render(<ReverseShellGenerator />)
            await user.click(screen.getByRole('button', { name: 'Windows' }))
            expect(screen.getByText('PowerShell')).toBeInTheDocument()
            expect(screen.queryByText('Bash TCP')).not.toBeInTheDocument()
        })

        it('clicking "Python" shows only Python shells', async () => {
            const user = userEvent.setup()
            render(<ReverseShellGenerator />)
            await user.click(screen.getByRole('button', { name: 'Python' }))
            expect(screen.getByText('Python 3')).toBeInTheDocument()
            expect(screen.queryByText('PowerShell')).not.toBeInTheDocument()
        })

        it('clicking "All" after a filter restores all shells', async () => {
            const user = userEvent.setup()
            render(<ReverseShellGenerator />)
            await user.click(screen.getByRole('button', { name: 'Windows' }))
            await user.click(screen.getByRole('button', { name: 'All' }))
            await waitFor(() => {
                expect(screen.getByText('Bash TCP')).toBeInTheDocument()
                expect(screen.getByText('PowerShell')).toBeInTheDocument()
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

        it('copies the shell command when the copy button is clicked', async () => {
            const user = userEvent.setup()
            render(<ReverseShellGenerator />)
            const [firstCopy] = screen.getAllByRole('button', { name: /copy/i })
            await user.click(firstCopy)
            expect(writeTextSpy).toHaveBeenCalledWith(
                expect.stringContaining(DEFAULT_IP)
            )
            expect(writeTextSpy).toHaveBeenCalledWith(
                expect.stringContaining(DEFAULT_PORT)
            )
        })
    })
})
