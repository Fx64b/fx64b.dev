import React from 'react'

import { HeroUIProvider } from "@heroui/react"
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

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
            <body className={'min-h-fit overflow-x-hidden bg-background dark'}>
                <HeroUIProvider>
                    <Header />
                    {children}
                    <Footer />
                </HeroUIProvider>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
