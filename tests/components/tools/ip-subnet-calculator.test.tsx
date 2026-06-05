import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import IpSubnetCalculator from '@/components/tools/ip-subnet-calculator'

// Expected subnet data for well-known CIDRs
const SUBNET_VECTORS = [
    {
        cidr: '192.168.1.0/24',
        network: '192.168.1.0',
        broadcast: '192.168.1.255',
        mask: '255.255.255.0',
        wildcard: '0.0.0.255',
        firstHost: '192.168.1.1',
        lastHost: '192.168.1.254',
        usableHosts: '254',
    },
    {
        cidr: '10.0.0.0/8',
        network: '10.0.0.0',
        broadcast: '10.255.255.255',
        mask: '255.0.0.0',
        wildcard: '0.255.255.255',
        firstHost: '10.0.0.1',
        lastHost: '10.255.255.254',
        usableHosts: '16,777,214',
    },
    {
        cidr: '172.16.0.0/12',
        network: '172.16.0.0',
        broadcast: '172.31.255.255',
        mask: '255.240.0.0',
        wildcard: '0.15.255.255',
        firstHost: '172.16.0.1',
        lastHost: '172.31.255.254',
        usableHosts: '1,048,574',
    },
    {
        // Host bits should be zeroed to find the network address
        cidr: '192.168.1.100/24',
        network: '192.168.1.0',
        broadcast: '192.168.1.255',
        mask: '255.255.255.0',
    },
    {
        // /30 is the smallest subnet with usable hosts (2 hosts)
        cidr: '10.0.0.0/30',
        network: '10.0.0.0',
        broadcast: '10.0.0.3',
        firstHost: '10.0.0.1',
        lastHost: '10.0.0.2',
        usableHosts: '2',
    },
    {
        // /32 is a host route — no broadcast, single address
        cidr: '192.168.1.1/32',
        network: '192.168.1.1',
        broadcast: '192.168.1.1',
        mask: '255.255.255.255',
        usableHosts: '1',
    },
]

async function setCidr(
    user: ReturnType<typeof userEvent.setup>,
    value: string
) {
    const input = screen.getByRole('textbox')
    await user.clear(input)
    if (value) await user.type(input, value)
}

describe('IpSubnetCalculator', () => {
    describe('initial state', () => {
        it('pre-populates with 192.168.1.0/24 and shows results', async () => {
            render(<IpSubnetCalculator />)
            expect(screen.getByRole('textbox')).toHaveValue('192.168.1.0/24')
            await waitFor(() =>
                expect(screen.getByText('192.168.1.0')).toBeInTheDocument()
            )
        })

        it('shows the subnet mask field', async () => {
            render(<IpSubnetCalculator />)
            await waitFor(() =>
                expect(screen.getByText('255.255.255.0')).toBeInTheDocument()
            )
        })
    })

    describe('subnet calculations', () => {
        for (const v of SUBNET_VECTORS) {
            describe(`CIDR: ${v.cidr}`, () => {
                beforeEach(() => {
                    render(<IpSubnetCalculator />)
                })

                it('computes the correct network address', async () => {
                    const user = userEvent.setup()
                    await setCidr(user, v.cidr)
                    await waitFor(() =>
                        expect(
                            screen.getAllByText(v.network).length
                        ).toBeGreaterThan(0)
                    )
                })

                if (v.broadcast) {
                    it('computes the correct broadcast address', async () => {
                        const user = userEvent.setup()
                        await setCidr(user, v.cidr)
                        await waitFor(() =>
                            expect(
                                screen.getAllByText(v.broadcast!).length
                            ).toBeGreaterThan(0)
                        )
                    })
                }

                if (v.mask) {
                    it('computes the correct subnet mask', async () => {
                        const user = userEvent.setup()
                        await setCidr(user, v.cidr)
                        await waitFor(() =>
                            expect(
                                screen.getAllByText(v.mask!).length
                            ).toBeGreaterThan(0)
                        )
                    })
                }

                if (v.firstHost) {
                    it('computes the correct first host address', async () => {
                        const user = userEvent.setup()
                        await setCidr(user, v.cidr)
                        await waitFor(() =>
                            expect(
                                screen.getAllByText(v.firstHost!).length
                            ).toBeGreaterThan(0)
                        )
                    })
                }

                if (v.usableHosts) {
                    it(`shows ${v.usableHosts} usable hosts`, async () => {
                        const user = userEvent.setup()
                        await setCidr(user, v.cidr)
                        await waitFor(() =>
                            expect(
                                screen.getAllByText(v.usableHosts!).length
                            ).toBeGreaterThan(0)
                        )
                    })
                }
            })
        }
    })

    describe('binary representations', () => {
        it('shows the subnet mask in binary notation', async () => {
            render(<IpSubnetCalculator />)
            // /24 → 24 ones followed by 8 zeros in binary
            await waitFor(() => {
                const binaryText = screen.getByText(
                    '11111111.11111111.11111111.00000000'
                )
                expect(binaryText).toBeInTheDocument()
            })
        })
    })

    describe('error handling', () => {
        it('shows an error for completely invalid input', async () => {
            const user = userEvent.setup()
            render(<IpSubnetCalculator />)
            await setCidr(user, 'notanip')
            await waitFor(() =>
                expect(
                    screen.getByText(/invalid cidr notation/i)
                ).toBeInTheDocument()
            )
        })

        it('shows an error when prefix length exceeds 32', async () => {
            const user = userEvent.setup()
            render(<IpSubnetCalculator />)
            await setCidr(user, '10.0.0.0/33')
            await waitFor(() =>
                expect(
                    screen.getByText(/invalid cidr notation/i)
                ).toBeInTheDocument()
            )
        })

        it('shows an error when an octet exceeds 255', async () => {
            const user = userEvent.setup()
            render(<IpSubnetCalculator />)
            await setCidr(user, '256.0.0.0/24')
            await waitFor(() =>
                expect(
                    screen.getByText(/invalid cidr notation/i)
                ).toBeInTheDocument()
            )
        })

        it('clears the error when a valid CIDR is entered', async () => {
            const user = userEvent.setup()
            render(<IpSubnetCalculator />)
            await setCidr(user, 'garbage')
            await waitFor(() =>
                expect(
                    screen.getByText(/invalid cidr notation/i)
                ).toBeInTheDocument()
            )
            await setCidr(user, '10.0.0.0/8')
            await waitFor(() =>
                expect(
                    screen.queryByText(/invalid cidr notation/i)
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

        it('copies a field value when its copy button is clicked', async () => {
            const user = userEvent.setup()
            render(<IpSubnetCalculator />)
            await waitFor(() =>
                expect(screen.getByText('192.168.1.0')).toBeInTheDocument()
            )
            const [firstCopy] = screen.getAllByRole('button', { name: /copy/i })
            await user.click(firstCopy)
            expect(writeTextSpy).toHaveBeenCalled()
        })
    })
})
