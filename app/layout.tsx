import React from 'react'

import { NextUIProvider } from '@nextui-org/react'
import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/react'

import { Header } from '@/components/Header'

import './globals.css'
import { Footer } from '@/components/Footer'

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
                <body className={'min-h-fit bg-background dark'}>
                    <Header />
                    {children}
                    <Footer />
                    <Analytics />
                </body>
            </NextUIProvider>
        </html>
    )
}
