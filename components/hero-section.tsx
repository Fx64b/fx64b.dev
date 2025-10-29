'use client'

import { ArrowRight, Calendar, MapPin } from 'lucide-react'
import { SwissCross } from 'swiss-cross'

import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function HeroSection() {
    return (
        <section className="relative py-24 md:py-32">
            <div className="container mx-auto max-w-6xl px-6">
                <div className="flex flex-col items-center text-center">
                    {/* Status badge */}
                    <Badge variant="secondary" className="mb-6 px-3 py-1">
                        <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                        Currently focused on projects
                    </Badge>

                    {/* Profile image */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-white/5 blur-2xl" />
                        <Image
                            src="/logo.svg"
                            alt="Fx64b profile picture"
                            width={120}
                            height={120}
                            className="border-border/50 bg-background relative rounded-full border"
                        />
                    </div>

                    {/* Main heading */}
                    <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                        Software Engineer
                        <br />
                        <span className="from-foreground to-foreground/70 bg-gradient-to-r bg-clip-text text-transparent">
                            & Developer
                        </span>
                    </h1>

                    {/* Description */}
                    <p className="text-foreground/70 mb-8 max-w-2xl text-lg sm:text-xl">
                        Hey! I&#39;m{' '}
                        <Link
                            href={'https://fabio-maffucci.ch'}
                            className={'text-primary underline'}
                        >
                            Fabio
                        </Link>
                        , a software engineer from Switzerland building modern
                        web applications with React, Next.js, TypeScript, and
                        Go. Currently exploring cybersecurity fundamentals.
                    </p>

                    {/* Location and experience */}
                    <div className="text-foreground/60 mb-8 flex flex-wrap items-center justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>Switzerland</span>
                            <SwissCross borderRadius={'slight'} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>4+ years experience</span>
                        </div>
                    </div>

                    {/* CTA buttons */}
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Button size="lg" className="group" asChild>
                            <Link href="/projects">
                                View My Work
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" asChild>
                            <a href="mailto:contact@fx64b.dev">Get In Touch</a>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
