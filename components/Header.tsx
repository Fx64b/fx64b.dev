import Link from 'next/link'

import { Separator } from '@/components/ui/separator'

export function Header() {
    return (
        <header className="bg-background sticky top-0 z-40 w-full border-b">
            <div className="container mx-auto flex h-16 items-center justify-between">
                <div className="ml-6 flex items-center md:ml-2">
                    <Link
                        href="/"
                        className="text-foreground hover:text-primary text-lg font-semibold transition-colors"
                    >
                        Fx64b.dev
                    </Link>
                </div>
                <nav className="mr-6 flex items-center space-x-4 md:mr-2">
                    <Link
                        href="/blog"
                        className="text-foreground hover:text-primary text-lg transition-colors"
                    >
                        Blog
                    </Link>
                    <Separator orientation={'vertical'} />
                    <Link
                        href="/tools"
                        className="text-foreground hover:text-primary text-lg transition-colors"
                    >
                        Tools
                    </Link>
                </nav>
            </div>
        </header>
    )
}
