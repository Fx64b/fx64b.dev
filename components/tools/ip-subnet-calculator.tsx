'use client'

import { useEffect, useRef, useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

interface SubnetInfo {
    networkAddress: string
    broadcastAddress: string
    subnetMask: string
    wildcardMask: string
    firstHost: string
    lastHost: string
    totalHosts: number
    usableHosts: number
    cidr: number
    ipClass: string
    binaryMask: string
    networkBinary: string
}

function ipToInt(ip: string): number {
    return (
        ip
            .split('.')
            .reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0
    )
}

function intToIp(n: number): string {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(
        '.'
    )
}

function calculateSubnet(cidrInput: string): SubnetInfo | null {
    const match = cidrInput
        .trim()
        .match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/)
    if (!match) return null

    const [, ipStr, prefixStr] = match
    const prefix = parseInt(prefixStr, 10)
    if (prefix > 32) return null

    const octets = ipStr.split('.').map(Number)
    if (octets.some((o) => o > 255)) return null

    const ip = ipToInt(ipStr)
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    const wildcard = ~mask >>> 0
    const network = (ip & mask) >>> 0
    const broadcast = (network | wildcard) >>> 0
    const firstHost = prefix === 32 ? network : (network + 1) >>> 0
    const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0
    const totalHosts = Math.pow(2, 32 - prefix)
    const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2)

    const firstOctet = (network >>> 24) & 255
    let ipClass = 'E'
    if (firstOctet < 128) ipClass = 'A'
    else if (firstOctet < 192) ipClass = 'B'
    else if (firstOctet < 224) ipClass = 'C'
    else if (firstOctet < 240) ipClass = 'D (Multicast)'

    const toBinary = (n: number) =>
        n
            .toString(2)
            .padStart(32, '0')
            .replace(/(.{8})/g, '$1.')
            .slice(0, -1)

    return {
        networkAddress: intToIp(network),
        broadcastAddress: intToIp(broadcast),
        subnetMask: intToIp(mask),
        wildcardMask: intToIp(wildcard),
        firstHost: intToIp(firstHost),
        lastHost: intToIp(lastHost),
        totalHosts,
        usableHosts,
        cidr: prefix,
        ipClass,
        binaryMask: toBinary(mask),
        networkBinary: toBinary(network),
    }
}

export default function IpSubnetCalculator() {
    const [input, setInput] = useState('192.168.1.0/24')
    const [info, setInfo] = useState<SubnetInfo | null>(null)
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus()
    }, [])

    useEffect(() => {
        if (!input.trim()) {
            setInfo(null)
            setError('')
            return
        }
        const result = calculateSubnet(input)
        if (result) {
            setInfo(result)
            setError('')
        } else {
            setInfo(null)
            setError('Invalid CIDR notation. Example: 192.168.1.0/24')
        }
    }, [input])

    const Row = ({
        label,
        value,
        mono = true,
    }: {
        label: string
        value: string
        mono?: boolean
    }) => (
        <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground w-40 shrink-0 text-sm">
                {label}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                    className={`min-w-0 truncate text-sm ${mono ? 'font-mono' : ''}`}
                >
                    {value}
                </span>
                <CopyButton
                    value={value}
                    label={`Copy ${label}`}
                    className="h-6 w-6 shrink-0"
                />
            </div>
        </div>
    )

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g. 192.168.1.0/24"
                        className="font-mono text-base"
                        aria-label="CIDR notation"
                    />
                    {error && (
                        <p className="text-destructive mt-2 text-sm">{error}</p>
                    )}
                </CardContent>
            </Card>

            {info && (
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="divide-y">
                            <Row
                                label="Network Address"
                                value={info.networkAddress}
                            />
                            <Row label="Subnet Mask" value={info.subnetMask} />
                            <Row
                                label="Broadcast Address"
                                value={info.broadcastAddress}
                            />
                            <Row label="First Host" value={info.firstHost} />
                            <Row label="Last Host" value={info.lastHost} />
                            <Row
                                label="Wildcard Mask"
                                value={info.wildcardMask}
                            />
                            <Row
                                label="Total Hosts"
                                value={info.totalHosts.toLocaleString()}
                                mono={false}
                            />
                            <Row
                                label="Usable Hosts"
                                value={info.usableHosts.toLocaleString()}
                                mono={false}
                            />
                            <Row
                                label="IP Class"
                                value={info.ipClass}
                                mono={false}
                            />
                        </div>
                        <div className="mt-4">
                            <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                                Subnet Mask (binary)
                            </p>
                            <div className="bg-secondary/20 overflow-x-auto rounded p-2 font-mono text-xs">
                                {info.binaryMask}
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                                Network Address (binary)
                            </p>
                            <div className="bg-secondary/20 overflow-x-auto rounded p-2 font-mono text-xs">
                                {info.networkBinary}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Separator className="my-8" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">About Subnetting</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">CIDR Notation</h3>
                            <p className="text-muted-foreground text-sm">
                                CIDR (Classless Inter-Domain Routing) notation
                                expresses an IP address and its associated
                                network prefix as <code>address/prefix</code>.
                                The prefix length defines how many bits are the
                                network part.
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Common Subnets</h3>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-xs">
                                <p>/8 → 16,777,214 hosts</p>
                                <p>/16 → 65,534 hosts</p>
                                <p>/24 → 254 hosts</p>
                                <p>/25 → 126 hosts</p>
                                <p>/30 → 2 hosts (point-to-point)</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Private Ranges</h3>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-xs">
                                <p>10.0.0.0/8</p>
                                <p>172.16.0.0/12</p>
                                <p>192.168.0.0/16</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">Pentesting Use</h3>
                            <p className="text-muted-foreground text-sm">
                                During recon, subnet calculations help scope
                                network segments, identify broadcast domains,
                                and enumerate potential hosts within a given
                                CIDR range.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
