import type React from 'react'

import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/react'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

import './globals.css'

export const metadata: Metadata = {
    title: 'Fx64b - Software Engineer & Security Enthusiast',
    description:
        'Software engineer from Switzerland specializing in React, Next.js, TypeScript, and Go.',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className="dark bg-background text-foreground min-h-screen antialiased">
                <Header />
                {children}
                <Footer />
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}
