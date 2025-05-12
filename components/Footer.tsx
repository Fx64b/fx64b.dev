import Image from 'next/image'
import Link from 'next/link'

import { getVersion } from '@/app/lib/version'

import { Cross } from '@/components/Cross'

export function Footer() {
    const version = getVersion()

    return (
        <div className={'flex flex-col items-center gap-y-4 p-4'}>
            <Link href={'https://github.com/Fx64b'} target={'_blank'}>
                <Image
                    src={'/github-mark-white.svg'}
                    width={40}
                    height={40}
                    alt={'GitHub logo'}
                />
            </Link>
            <Cross />
            2025 Fx64b - v{version}
        </div>
    )
}
