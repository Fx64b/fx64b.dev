import { Image, Link } from "@heroui/react"

import { getVersion } from '@/app/lib/version'

export function Footer() {
    const version = getVersion()

    return (
        <div className={'flex flex-col items-center gap-y-4 p-4'}>
            <Link isExternal href={'https://github.com/Fx64b'}>
                <Image
                    src={'/github-mark-white.svg'}
                    width={40}
                    height={40}
                    alt={'GitHub logo'}
                />
            </Link>
            &copy; 2024 Fx64b - v{version}
        </div>
    )
}
