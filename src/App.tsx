import { Outlet } from 'react-router-dom'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

export default function App() {
    return (
        <ThemeProvider defaultTheme="system" storageKey="fx64b-ui-theme">
            <Header />
            <Outlet />
            <Footer />
            <Analytics />
            <SpeedInsights />
        </ThemeProvider>
    )
}
