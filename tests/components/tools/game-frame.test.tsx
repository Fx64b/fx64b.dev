import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/components/theme-provider'
import Fairway from '@/components/tools/fairway'
import Thornwick from '@/components/tools/thornwick'

function frame(title: RegExp) {
    return screen.getByTitle(title) as HTMLIFrameElement
}

describe('game pages', () => {
    it('embeds Fairway without a theme parameter', () => {
        render(
            <ThemeProvider defaultTheme="dark">
                <Fairway />
            </ThemeProvider>
        )
        expect(frame(/Fairway/).getAttribute('src')).toBe('/games/fairway.html')
        const link = screen.getByRole('link', { name: /open in new tab/i })
        expect(link.getAttribute('href')).toBe('/games/fairway.html')
        expect(screen.getByText(/new full-size hole every day/i)).toBeTruthy()
    })

    it('passes the site theme to Thornwick', () => {
        render(
            <ThemeProvider defaultTheme="dark">
                <Thornwick />
            </ThemeProvider>
        )
        expect(frame(/Thornwick/).getAttribute('src')).toBe(
            '/games/thornwick.html?theme=dark'
        )
    })
})
