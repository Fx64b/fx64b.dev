import { Calendar, Clock } from 'lucide-react'

import Image from '@/components/image'
import { Separator } from '@/components/ui/separator'

interface BlogHeaderProps {
    author: string
    avatar?: string
    title: string
    date: string
    readtime?: string
}

export function BlogHeader({
    author,
    avatar,
    title,
    date,
    readtime,
}: BlogHeaderProps) {
    return (
        <div className="mt-2 mb-4 flex flex-col md:items-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
            </h1>
            <div className="my-4 flex items-center gap-x-4">
                {/*NOTE: there seems to be an issue with the shadcn/ui avatar so the default next/image is used here*/}
                <Image
                    src={avatar || '/logo.svg'}
                    alt={author}
                    width={65}
                    height={65}
                    className="my-0 rounded-full border-2"
                />
                <p className="text-lg font-semibold">{author}</p>
            </div>
            <div className="text-muted-foreground my-2 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{date}</span>
                </div>
                {readtime && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{readtime}</span>
                    </div>
                )}
            </div>
            <Separator />
        </div>
    )
}
