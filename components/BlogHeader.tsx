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
        <div className={'my-2'}>
            <h1>{title}</h1>
            <span>Readtime: {readtime}</span>
            <div className={'flex items-center gap-4'}>
                <Avatar
                    isBordered
                    radius="full"
                    color={'primary'}
                    size={'lg'}
                    src={avatar || '/logo.svg'}
                />
                <p className={'text-lg font-semibold'}>{author}</p>
            </div>
            <p className="text-gray-500">{date}</p>
        </div>
    )
}
