import { Github, Linkedin, Mail } from 'lucide-react'

import Image from 'next/image'
import Link from 'next/link'

import { getVersion } from '@/app/lib/version'

import { Cross } from '@/components/Cross'
import { XIcon } from '@/components/icons/x-icon'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function Footer() {
    const version = getVersion()

    return (
        <footer className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 border-t backdrop-blur">
            <div className="container mx-auto max-w-6xl px-6 py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    {/* Brand section */}
                    <div className="md:col-span-2">
                        <div className="mb-4 flex items-center space-x-2">
                            <Image
                                src={'/logo.svg'}
                                alt={'F'}
                                width={38}
                                height={38}
                                className="rounded-md"
                            />
                            <span className="text-xl font-bold">Fx64b</span>
                        </div>
                        <p className="text-foreground/70 max-w-md text-sm leading-relaxed">
                            Software engineer from Switzerland building modern
                            web applications with React, Next.js, TypeScript,
                            and Go.
                        </p>
                    </div>

                    {/* Quick links */}
                    <div>
                        <h3 className="mb-4 font-semibold">Quick Links</h3>
                        <div className="space-y-2">
                            <Link
                                href="/"
                                className="text-foreground/70 hover:text-foreground block text-sm transition-colors"
                            >
                                Home
                            </Link>
                            <Link
                                href="/blog"
                                className="text-foreground/70 hover:text-foreground block text-sm transition-colors"
                            >
                                Blog
                            </Link>
                            <Link
                                href="/tools"
                                className="text-foreground/70 hover:text-foreground block text-sm transition-colors"
                            >
                                Tools
                            </Link>
                        </div>
                    </div>

                    {/* Connect */}
                    <div>
                        <h3 className="mb-4 font-semibold">Connect</h3>
                        <div className="flex gap-2">
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
                            <Button variant="ghost" size="icon" asChild>
                                <Link
                                    href="https://x.com/f_x64b"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <XIcon className="h-4 w-4" />
                                    <span className="sr-only">X</span>
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="mailto:contact@fx64b.dev">
                                    <Mail className="h-4 w-4" />
                                    <span className="sr-only">Email</span>
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="https://www.linkedin.com/in/fabio-maffucci-23515b328/">
                                    <Linkedin className="h-4 w-4" />
                                    <span className="sr-only">Linkedin</span>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <Separator className="my-8" />

                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="text-foreground/60 flex items-center gap-4 text-sm">
                        <span>© 2025 Fx64b</span>
                        <span>•</span>
                        <span>v{version}</span>
                        <Cross />
                    </div>
                </div>
            </div>
        </footer>
    )
}
