import { Search } from 'lucide-react'

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { CommandMenu } from '@/components/command-menu'
import Link from '@/components/link'
import { ModeToggle } from '@/components/mode-toggle'

const navLinks = [
    { label: 'Work', href: '/projects' },
    { label: 'Blog', href: '/blog' },
    { label: 'Tools', href: '/tools' },
    { label: 'Contact', href: '/#contact' },
]

export function SiteNav() {
    const { pathname, hash } = useLocation()
    const [commandOpen, setCommandOpen] = useState(false)
    const [isMac, setIsMac] = useState(true)

    useEffect(() => {
        setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent))
    }, [])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault()
                setCommandOpen((open) => !open)
            }
            if (event.key === 'Escape') {
                setCommandOpen(false)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    const isActive = (href: string) => {
        if (href.startsWith('/#')) {
            return pathname === '/' && hash === href.slice(1)
        }
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <header className="border-border bg-background sticky top-0 z-40 w-full border-b">
            <nav className="flex items-center justify-between gap-4 px-6 py-5 sm:px-12">
                <Link
                    href="/"
                    className="text-foreground shrink-0 text-[15px] font-bold"
                >
                    fx64b.dev
                </Link>

                <div className="hidden gap-7 text-[13.5px] font-medium sm:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                'hover:text-foreground transition-colors duration-150 ease-out',
                                isActive(link.href)
                                    ? 'text-brand'
                                    : 'text-muted-foreground'
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setCommandOpen(true)}
                        aria-label="Search"
                        className="border-border bg-popover text-muted-foreground hover:text-foreground focus-visible:ring-ring flex cursor-pointer items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[12px] transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none"
                    >
                        <Search className="size-3.5 sm:hidden" />
                        <span className="hidden sm:inline">Search</span>
                        <kbd className="bg-muted border-border text-foreground hidden rounded-xs border px-1.5 py-px font-mono text-[11px] sm:inline">
                            {isMac ? '⌘K' : 'Ctrl K'}
                        </kbd>
                    </button>

                    <ModeToggle />
                </div>
            </nav>

            <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
        </header>
    )
}
