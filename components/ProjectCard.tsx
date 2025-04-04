'use client'

import type { Project } from '@/types/project'
import { Code } from 'lucide-react'

import type React from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/Badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface ProjectCardProps {
    project: Project
}

const ProjectCard = ({ project }: ProjectCardProps) => {
    const handleGithubClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        window.open(project.githubLink, '_blank', 'noopener,noreferrer')
    }

    return (
        <Link
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
        >
            <Card className="cursor-pointer transition-all hover:shadow-md md:mx-auto md:max-w-[768px]">
                <CardHeader className="flex flex-row items-center space-y-0">
                    <Image
                        className="rounded-md mr-2"
                        src={project.logo || '/placeholder.svg'}
                        alt={project.title + ' logo'}
                        width={40}
                        height={40}
                    />
                    <p className="text-md">{project.title}</p>
                    <Badge status={project.status} />
                </CardHeader>
                <Separator />
                <CardContent className="flex text-left md:min-w-[768px]">
                    <p className="whitespace-pre-wrap">{project.description}</p>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleGithubClick}
                        title="View source code on GitHub"
                    >
                        <Code className="h-5 w-5" />
                        <span className="sr-only">View source on GitHub</span>
                    </Button>
                </CardFooter>
            </Card>
        </Link>
    )
}

export default ProjectCard
