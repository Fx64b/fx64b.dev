'use client'

import { Code2, GraduationCap, Rocket } from 'lucide-react'

import { Section } from '@/components/section'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface ActivityItem {
    icon: React.ReactNode
    title: string
    description: string
    badge?: string
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const activities: ActivityItem[] = [
    {
        icon: <Code2 className="h-6 w-6" />,
        title: 'Building a Flashcard SRS App',
        description:
            'Developing a modern spaced repetition system for effective learning with Next.js 15, TypeScript, and AI integration.',
        badge: 'Active Development',
        badgeVariant: 'default',
    },
    {
        icon: <GraduationCap className="h-6 w-6" />,
        title: 'Exploring Cybersecurity Fundamentals',
        description:
            'Diving deep into web security, penetration testing, and CTF challenges to strengthen security knowledge.',
        badge: 'Learning',
        badgeVariant: 'secondary',
    },
    {
        icon: <Rocket className="h-6 w-6" />,
        title: 'Contributing to Open Source',
        description:
            'Actively contributing to open source projects and maintaining personal tools for the developer community.',
        badge: 'Ongoing',
        badgeVariant: 'outline',
    },
]

export function CurrentlySection() {
    return (
        <Section>
            <div className="mb-12 text-center">
                <h2 className="mb-4 text-3xl font-bold tracking-tight">
                    What I&#39;m Up To
                </h2>
                <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                    Current projects, learning goals, and areas of focus
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activities.map((activity, index) => (
                    <Card
                        key={index}
                        className="border-border/50 bg-card/50 group relative overflow-hidden backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg"
                    >
                        <CardContent className="p-6">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="text-primary rounded-lg bg-primary/10 p-3">
                                    {activity.icon}
                                </div>
                                {activity.badge && (
                                    <Badge
                                        variant={activity.badgeVariant}
                                        className="text-xs"
                                    >
                                        {activity.badge}
                                    </Badge>
                                )}
                            </div>
                            <h3 className="mb-2 text-xl font-semibold">
                                {activity.title}
                            </h3>
                            <p className="text-foreground/70 text-sm leading-relaxed">
                                {activity.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </Section>
    )
}
