'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Image from 'next/image'

import { Section } from '@/components/section'
import { Badge } from '@/components/ui/badge'

const techStack = [
    'typescript',
    'go',
    'quarkus',
    'react',
    'next.js',
    'tailwindcss',
    'radix-ui',
    'node.js',
    'pnpm',
    'postgresql',
    'mongodb',
    'sqlite',
    'docker',
    'vercel',
    'apachekafka',
    'fedora',
    'manjaro',
    'git',
    'goland',
    'webstorm',
    'neovim',
]

const generateBadgeUrl = (tech: string): string => {
    return `https://img.shields.io/badge/${tech.replace('-', ' ')}-%23252525.svg?style=for-the-badge&logo=${tech}&logoColor=white`
}

export function TechStackSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const [invertedBadges, setInvertedBadges] = useState<Set<string>>(new Set())
    const [isVisible, setIsVisible] = useState<boolean>(false)
    const animationRef = useRef<number>(0)
    const lastScrollY = useRef<number>(0)

    const getRandomBadges = useCallback((count: number): string[] => {
        const shuffled = [...techStack].sort(() => 0.5 - Math.random())
        return shuffled.slice(0, count)
    }, [])

    const animateBadges = useCallback(() => {
        if (!isVisible) {
            return
        }

        const currentScrollY = window.scrollY
        const scrollDelta = Math.abs(currentScrollY - lastScrollY.current)

        if (scrollDelta > 100) {
            setInvertedBadges((prev) => {
                const newInverted = new Set(prev)

                const badgesToInvert = getRandomBadges(1)
                badgesToInvert.forEach((badge) => {
                    if (newInverted.has(badge)) {
                        newInverted.delete(badge)
                    } else {
                        newInverted.add(badge)
                    }
                })

                return newInverted
            })

            lastScrollY.current = currentScrollY
        }

        animationRef.current = requestAnimationFrame(animateBadges)
    }, [isVisible, getRandomBadges])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    setIsVisible(entry.isIntersecting)
                })
            },
            {
                threshold: 0.3,
                rootMargin: '0px 0px -100px 0px',
            }
        )

        if (sectionRef.current) {
            observer.observe(sectionRef.current)
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (isVisible) {
            animationRef.current = requestAnimationFrame(animateBadges)

            setInvertedBadges(
                new Set(getRandomBadges(Math.floor(Math.random() * 2) + 1))
            )
        } else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            setInvertedBadges(new Set())
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [isVisible, animateBadges, getRandomBadges])

    return (
        <Section>
            <div ref={sectionRef}>
                <div className="mb-8 text-center">
                    <h2 className="mb-3 text-2xl font-bold tracking-tight">
                        Tech Stack
                    </h2>
                    <p className="text-foreground/70 mx-auto max-w-xl text-base">
                        Technologies I use to build my applications
                    </p>
                </div>

                <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
                    {techStack.map((tech) => (
                        <Image
                            key={tech}
                            src={generateBadgeUrl(tech)}
                            alt={tech}
                            width={0}
                            height={0}
                            sizes="100vw"
                            className={`h-8 w-auto rounded-sm transition-all duration-300 ease-in-out hover:invert ${
                                invertedBadges.has(tech) ? 'invert' : ''
                            }`}
                        />
                    ))}
                </div>
                <div className={'mt-5 flex w-full justify-center'}>
                    <Badge variant={'outline'}>And many more...</Badge>
                </div>
            </div>
        </Section>
    )
}
