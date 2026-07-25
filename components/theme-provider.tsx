import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = 'dark' | 'light'

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    /** The theme actually applied to the document (never `system`). */
    resolvedTheme: ResolvedTheme
    setTheme: (theme: Theme) => void
    /** Flips between light and dark, starting from what is on screen. */
    toggleTheme: () => void
}

const initialState: ThemeProviderState = {
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: () => null,
    toggleTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

function getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') {
        return 'light'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'fx64b-ui-theme',
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') {
            return defaultTheme
        }
        return (localStorage.getItem(storageKey) as Theme) || defaultTheme
    })
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
        theme === 'system' ? getSystemTheme() : theme
    )

    useEffect(() => {
        const root = window.document.documentElement
        const apply = (next: ResolvedTheme) => {
            root.classList.remove('light', 'dark')
            root.classList.add(next)
            setResolvedTheme(next)
        }

        if (theme !== 'system') {
            apply(theme)
            return
        }

        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const onChange = () => apply(media.matches ? 'dark' : 'light')

        apply(media.matches ? 'dark' : 'light')
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [theme])

    const value: ThemeProviderState = {
        theme,
        resolvedTheme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
        toggleTheme: () => {
            const next: ResolvedTheme =
                resolvedTheme === 'dark' ? 'light' : 'dark'
            localStorage.setItem(storageKey, next)
            setTheme(next)
        },
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
