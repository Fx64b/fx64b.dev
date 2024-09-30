import { Divider } from '@nextui-org/divider'
import { Avatar } from '@nextui-org/react'

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
        <div className={'mb-8 mt-2 flex flex-col'}>
            <h1>{title}</h1>
            <div className={'my-4 flex items-center gap-4'}>
                <Avatar
                    isBordered
                    radius="full"
                    color={'primary'}
                    size={'lg'}
                    src={avatar || '/logo.svg'}
                />
                <p className={'text-lg font-semibold'}>{author}</p>
            </div>
            {readtime && (
                <div>
                    <b>Readtime:</b> <span>{readtime}</span>
                </div>
            )}
            <p className="my-2 text-gray-500">{date}</p>
            <Divider />
        </div>
    )
}
