import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

import { Footer } from '@/components/footer'
import { SiteNav } from '@/components/site-nav'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

/**
 * React Router does not act on the location hash by itself: scroll to the
 * anchor when there is one, otherwise back to the top on navigation.
 */
function useScrollToHash() {
    const { pathname, hash } = useLocation()

    useEffect(() => {
        if (hash) {
            const target = document.getElementById(
                decodeURIComponent(hash.slice(1))
            )
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' })
                return
            }
        }
        window.scrollTo({ top: 0 })
    }, [pathname, hash])
}

export default function App() {
    useScrollToHash()

    return (
        <ThemeProvider defaultTheme="system" storageKey="fx64b-ui-theme">
            <div className="flex min-h-screen flex-col">
                <SiteNav />
                <div className="grow">
                    <Outlet />
                </div>
                <Footer />
            </div>
            <Analytics />
            <SpeedInsights />
        </ThemeProvider>
    )
}
