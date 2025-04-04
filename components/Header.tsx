import Link from 'next/link'

export function Header() {
    return (
        <header className="bg-background sticky top-0 z-40 w-full border-b">
            <div className="container mx-auto flex h-16 items-center justify-between">
                <div className="ml-2 flex items-center">
                    <Link
                        href="/"
                        className="text-foreground hover:text-primary text-lg font-semibold transition-colors"
                    >
                        Fx64b.dev
                    </Link>
                </div>
                <nav className="mr-2 flex items-center space-x-4">
                    <Link
                        href="/blog"
                        className="text-foreground hover:text-primary text-lg transition-colors"
                    >
                        Blog
                    </Link>
                </nav>
            </div>
        </header>
    )
}
