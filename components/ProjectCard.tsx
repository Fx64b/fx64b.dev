import { Project } from '@/types/project'

import {
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Divider,
    Link,
} from "@heroui/react"
import Image from 'next/image'

import { Badge } from '@/components/Badge'

interface ProjectCardProps {
    project: Project
}

const ProjectCard = ({ project }: ProjectCardProps) => {
    return (
        <Link
            href={project.link}
            isExternal
            className={'md:mx-auto md:max-w-screen-md'}
        >
            <Card>
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
                <CardFooter>
                    <Link isExternal showAnchorIcon href={project.githubLink}>
                        View source code on GitHub.
                    </Link>
                </CardFooter>
            </Card>
        </Link>
    )
}

export default ProjectCard
