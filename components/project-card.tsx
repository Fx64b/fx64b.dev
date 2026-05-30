'use client'

import { ExternalLink, Github } from 'lucide-react'

import type React from 'react'
import Image from 'next/image'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

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
    showLinks?: boolean
}

const statusColors: Record<Project['status'], string> = {
    Finished: 'bg-green-500/10 text-green-500',
    'In Progress': 'bg-blue-500/10 text-blue-500',
    Planned: 'bg-yellow-500/10 text-yellow-500',
    Abandoned: 'bg-red-500/10 text-red-500',
    'On Hold': 'bg-gray-500/10 text-gray-500',
}

export function ProjectCard({ project, showLinks = false }: ProjectCardProps) {
    const openLink = (e: React.MouseEvent, url: string) => {
        e.preventDefault()
        e.stopPropagation()
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <Card className="hover:bg-card h-full transition-colors">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                    {project.logo && (
                        <Image
                            src={project.logo}
                            alt={`${project.title} logo`}
                            width={28}
                            height={28}
                            className="rounded-md shrink-0"
                        />
                    )}
                    <span className="min-w-0 flex-1 font-medium">
                        {project.title}
                    </span>
                    <Badge
                        className={`shrink-0 text-xs ${statusColors[project.status]}`}
                    >
                        {project.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                    {project.description}
                </p>
                <div className="flex items-end justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                        {project.tags?.slice(0, 3).map((tag) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                    {showLinks && (
                        <div className="flex shrink-0 gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => openLink(e, project.githubLink)}
                                aria-label="View source on GitHub"
                            >
                                <Github className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => openLink(e, project.link)}
                                aria-label="Visit project"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
