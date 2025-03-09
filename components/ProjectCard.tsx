import { Project } from '@/types/project'
import {
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Divider,
    Link,
    Button,
} from '@heroui/react'

import Image from 'next/image'

import { Badge } from '@/components/Badge'

interface ProjectCardProps {
    project: Project
}

const ProjectCard = ({ project }: ProjectCardProps) => {
    return (
        <Card className="md:mx-auto md:max-w-(--breakpoint-md)">
            <CardHeader className={'flex gap-4'}>
                <Image
                    className={'rounded-md'}
                    src={project.logo}
                    alt={project.title + ' logo'}
                    width={40}
                    height={40}
                />
                <p className={'text-md'}>{project.title}</p>
                <Badge status={project.status} />
            </CardHeader>
            <Divider />
            <CardBody className={'flex gap-4 md:min-w-[768px]'}>
                <p className={'whitespace-pre-wrap'}>
                    {project.description}
                </p>
            </CardBody>
            <CardFooter className="flex justify-between">
                <Link isExternal showAnchorIcon href={project.githubLink}>
                    View source code on GitHub.
                </Link>
                <Button
                    as={Link}
                    href={project.link}
                    isExternal
                    variant="light"
                >
                    View Project
                </Button>
            </CardFooter>
        </Card>
    )
}

export default ProjectCard