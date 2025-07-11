'use client'

import { Github } from 'lucide-react'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function Header() {
    const pathname = usePathname()

    const isActive = (path: string) => {
        if (path === '/') {
            return pathname === '/'
        }
        return pathname.startsWith(path)
    }

    return (
        <header className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
            <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                <div className="flex items-center">
                    <Link
                        href="/"
                        className="hover:text-foreground/80 flex items-center space-x-2 text-xl font-bold tracking-tight transition-colors"
                    >
                        <Image
                            src={'/logo.svg'}
                            alt={'F'}
                            width={38}
                            height={38}
                            className="rounded-md"
                        />
                        <span>Fx64b</span>
                    </Link>
                </div>

                <nav className="flex items-center space-x-1">
                    <Link
                        href="/"
                        className={`hover:text-foreground hidden px-4 py-2 text-sm font-medium transition-colors sm:flex ${
                            isActive('/')
                                ? 'text-foreground'
                                : 'text-foreground/60'
                        }`}
                    >
                        Home
                    </Link>
                    <Link
                        href="/blog"
                        className={`hover:text-foreground px-4 py-2 text-sm font-medium transition-colors ${
                            isActive('/blog')
                                ? 'text-foreground'
                                : 'text-foreground/60'
                        }`}
                    >
                        Blog
                    </Link>
                    <Link
                        href="/tools"
                        className={`hover:text-foreground px-4 py-2 text-sm font-medium transition-colors ${
                            isActive('/tools')
                                ? 'text-foreground'
                                : 'text-foreground/60'
                        }`}
                    >
                        Tools
                    </Link>

                    <Separator orientation="vertical" className="mx-2 h-6" />

                    <Button variant="ghost" size="icon" asChild>
                        <Link
                            href="https://github.com/Fx64b"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Github className="h-4 w-4" />
                            <span className="sr-only">GitHub</span>
                        </Link>
                    </Button>
                </nav>
            </div>
        </header>
    )
}
