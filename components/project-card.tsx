'use client'

import { ExternalLink, Github } from 'lucide-react'

import type React from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Project {
    title: string
    description: string
    status: 'Finished' | 'In Progress' | 'Planned' | 'Abandoned' | 'On Hold'
    logo?: string
    link: string
    githubLink: string
    tags?: string[]
}

interface ProjectCardProps {
    project: Project
}

const statusColors = {
    Finished: 'bg-green-500/10 text-green-500',
    'In Progress': 'bg-blue-500/10 text-blue-500',
    Planned: 'bg-yellow-500/10 text-yellow-500',
    Abandoned: 'bg-red-500/10 text-red-500',
    'On Hold': 'bg-gray-500/10 text-gray-500',
}

export function ProjectCard({ project }: ProjectCardProps) {
    const handleGithubClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        window.open(project.githubLink, '_blank', 'noopener,noreferrer')
    }

    return (
        <Card className="group border-border/50 bg-card/50 hover:border-border hover:bg-card/80 relative h-full overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
            <CardContent className="flex h-full flex-col p-4 pb-0 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative flex-shrink-0">
                            <Image
                                src={
                                    project.logo ||
                                    '/placeholder.svg?height=40&width=40'
                                }
                                alt={`${project.title} logo`}
                                width={40}
                                height={40}
                                className="border-border/50 rounded-lg border"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="group-hover:text-foreground/90 text-lg font-semibold transition-colors">
                                {project.title}
                            </h3>
                            <Badge
                                className={`text-xs ${statusColors[project.status]}`}
                            >
                                {project.status}
                            </Badge>
                        </div>
                    </div>

                    <div className="flex flex-shrink-0 gap-1 opacity-100 transition-opacity md:gap-2 md:opacity-0 md:group-hover:opacity-100">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 md:h-8 md:w-8"
                            onClick={handleGithubClick}
                            aria-label="View GitHub repository"
                        >
                            <Github className="h-5 w-5 md:h-4 md:w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 md:h-8 md:w-8"
                            asChild
                        >
                            <Link
                                href={project.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Visit project website"
                            >
                                <ExternalLink className="h-5 w-5 md:h-4 md:w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <p className="text-foreground/70 mb-4 text-sm leading-relaxed">
                    {project.description}
                </p>

                {project.tags && project.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-2 pb-4 md:pb-6">
                        {project.tags.map((tag) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
