'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Image from 'next/image'

import { Section } from '@/components/section'
import { Badge } from '@/components/ui/badge'

interface TechItem {
    name: string
    category: 'languages' | 'frontend' | 'backend' | 'tools'
}

const techCategories = {
    languages: ['javascript', 'typescript', 'go'],
    frontend: ['react', 'next.js', 'tailwindcss', 'radix-ui', 'angular'],
    backend: ['postgresql', 'mongodb', 'sqlite', 'apachekafka', 'quarkus'],
    tools: [
        'docker',
        'git',
        'neovim',
        'goland',
        'webstorm',
        'pnpm',
        'node.js',
        'vercel',
        'fedora',
        'manjaro',
    ],
}

const techStack: TechItem[] = [
    ...techCategories.languages.map((name) => ({
        name,
        category: 'languages' as const,
    })),
    ...techCategories.frontend.map((name) => ({
        name,
        category: 'frontend' as const,
    })),
    ...techCategories.backend.map((name) => ({
        name,
        category: 'backend' as const,
    })),
    ...techCategories.tools.map((name) => ({
        name,
        category: 'tools' as const,
    })),
]

const generateBadgeUrl = (tech: string): string => {
    return `https://img.shields.io/badge/${tech.replace('-', ' ')}-%23252525.svg?style=for-the-badge&logo=${tech}&logoColor=white`
}

export function TechStackSection() {
    const sectionRef = useRef<HTMLDivElement>(null)
    const [invertedBadges, setInvertedBadges] = useState<Set<string>>(new Set())

    const [isVisible, setIsVisible] = useState<boolean>(false)
    const [prefersReducedMotion, setPrefersReducedMotion] =
        useState<boolean>(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches)
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    const getRandomBadges = useCallback((count: number): string[] => {
        const shuffled = [...techStack].sort(() => 0.5 - Math.random())
        return shuffled.slice(0, count).map((tech) => tech.name)
    }, [])

    const getRandomDuration = useCallback((): number => {
        // Random duration between 2000ms (2s) and 4000ms (4s)
        return Math.floor(Math.random() * 2000) + 2000
    }, [])

    const animateRandomBadges = useCallback(() => {
        if (!isVisible || prefersReducedMotion) {
            return
        }

        // Clear previous badges
        setInvertedBadges(new Set())

        // Small delay before showing new badges for a smoother transition
        setTimeout(() => {
            // Randomly choose 1 or 2 badges to highlight
            const badgeCount = Math.floor(Math.random()) + 1
            const newInvertedBadges = new Set(getRandomBadges(badgeCount))
            setInvertedBadges(newInvertedBadges)
        }, 200)

        const nextDuration = getRandomDuration()
        timeoutRef.current = setTimeout(animateRandomBadges, nextDuration)
    }, [isVisible, prefersReducedMotion, getRandomBadges, getRandomDuration])

    // Intersection Observer to detect when section is visible (lazy loading)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    setIsVisible(entry.isIntersecting)
                })
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px',
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

    // Start/stop animation based on visibility and motion preference
    useEffect(() => {
        if (isVisible && !prefersReducedMotion) {
            // Start the animation cycle
            animateRandomBadges()
        } else {
            // Clear any pending timeouts and reset state
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
            setInvertedBadges(new Set())
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [isVisible, prefersReducedMotion, animateRandomBadges])

    const renderTechCategory = (
        category: keyof typeof techCategories,
        title: string
    ) => {
        const techs = techCategories[category]

        return (
            <div key={category} className="mb-3">
                <div className="mb-2 flex justify-center">
                    <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        {title}
                    </span>
                </div>
                <div className={`relative rounded-lg p-3 backdrop-blur-sm`}>
                    <div className="flex flex-wrap justify-center gap-2">
                        {techs.map((tech) => {
                            const isHighlighted = invertedBadges.has(tech)

                            return (
                                <Image
                                    key={tech}
                                    src={generateBadgeUrl(tech)}
                                    alt={tech}
                                    width={0}
                                    height={0}
                                    className={`h-8 w-auto rounded-sm transition-all duration-500 ease-in-out hover:scale-105 hover:invert sm:h-6 md:h-8 ${isHighlighted ? 'scale-105 shadow-lg invert' : ''} ${prefersReducedMotion ? 'transition-none' : ''} `}
                                />
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }

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

                <div className="relative mx-auto max-w-5xl">
                    <div className="px-4 sm:px-8 md:px-12">
                        {renderTechCategory('languages', 'Languages')}
                        {renderTechCategory('frontend', 'Frontend')}
                        {renderTechCategory('backend', 'Backend')}
                        {renderTechCategory('tools', 'Tools & Others')}
                    </div>
                </div>

                <div className="mt-6 flex w-full justify-center">
                    <Badge variant="outline" className="text-xs">
                        And many more...
                    </Badge>
                </div>
            </div>
        </Section>
    )
}
