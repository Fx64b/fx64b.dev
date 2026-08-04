import { Github, Linkedin, Mail } from 'lucide-react'

import { getVersion } from '@/lib/version'

import { Cross } from '@/components/Cross'
import { XIcon } from '@/components/icons/x-icon'
import Link from '@/components/link'

const socials = [
    {
        href: 'https://github.com/Fx64b',
        label: 'GitHub',
        icon: Github,
        external: true,
    },
    { href: 'https://x.com/f_x64b', label: 'X', icon: XIcon, external: true },
    {
        href: 'https://www.linkedin.com/in/fabio-maffucci-23515b328/',
        label: 'LinkedIn',
        icon: Linkedin,
        external: true,
    },
    { href: 'mailto:contact@fx64b.dev', label: 'Email', icon: Mail },
]

export function Footer() {
    const version = getVersion()

    return (
        <footer className="border-border border-t">
            <div className="text-muted-foreground mx-auto flex w-full max-w-[720px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[12.5px] sm:px-6">
                <div className="flex items-center gap-3">
                    <span>© {new Date().getFullYear()} Fx64b</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[12px]">v{version}</span>
                    <Cross />
                </div>

                <div className="flex items-center gap-1">
                    {socials.map(({ href, label, icon: Icon, external }) => (
                        <Link
                            key={label}
                            href={href}
                            target={external ? '_blank' : undefined}
                            rel={external ? 'noopener noreferrer' : undefined}
                            aria-label={label}
                            className="hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-sm transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none"
                        >
                            <Icon className="size-4" />
                        </Link>
                    ))}
                </div>
            </div>
        </footer>
    )
}
