import { Spinner, Link } from '@nextui-org/react'

export default function Home() {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="flex flex-col items-center gap-y-4">
                <b>
                    Wait a second,{' '}
                    <Link href={'https://github.com/Fx64b'}>F_x64b</Link> is
                    working on it.{' '}
                </b>
                <Spinner size="lg" />
            </div>
        </div>
    )
}
