import Image from 'next/image'

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
            <h1>{title}</h1>
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
            {readtime && (
                <div>
                    <b>Readtime:</b> <span>{readtime}</span>
                </div>
            )}
            <p className="my-2 text-gray-500">{date}</p>
            <Separator />
        </div>
    )
}
