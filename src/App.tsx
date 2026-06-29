import { Outlet } from 'react-router-dom'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

import './globals.css'

export default function App() {
    return (
        <>
            <Header />
            <Outlet />
            <Footer />
            <Analytics />
            <SpeedInsights />
        </>
    )
}
