import React from 'react'

import { NextUIProvider } from '@nextui-org/react'
import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/react'

import './globals.css'

export const metadata: Metadata = {
    title: 'Fx64b.dev',
    description: 'Fx64b.dev - personal website of F_x64b.',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <NextUIProvider>
                <body>
                    {children}
                    <Analytics />
                </body>
            </NextUIProvider>
        </html>
    )
}