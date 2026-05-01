import { Github, Linkedin, Mail } from 'lucide-react'

import Image from 'next/image'
import Link from 'next/link'

import { XIcon } from '@/components/icons/x-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AuthorBioProps {
    author?: string
    avatar?: string
}

export function AuthorBio({
    author = 'Fx64b',
    avatar = '/logo.svg',
}: AuthorBioProps) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <Image
                        src={avatar}
                        alt={author}
                        width={80}
                        height={80}
                        className="border-border rounded-full border-2"
                    />
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                            About {author}
                        </h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Software engineer from Switzerland building modern
                            web applications with React, Next.js, TypeScript,
                            and Go. Currently exploring cybersecurity
                            fundamentals and sharing my journey through this
                            blog.
                        </p>
                        <div className="mt-4 flex gap-2">
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
                                <Link
                                    href="https://www.linkedin.com/in/fabio-maffucci-23515b328/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Linkedin className="h-4 w-4" />
                                    <span className="sr-only">LinkedIn</span>
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                                <Link href="mailto:contact@fx64b.dev">
                                    <Mail className="h-4 w-4" />
                                    <span className="sr-only">Email</span>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
