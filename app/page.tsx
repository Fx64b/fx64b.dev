import { Image } from '@nextui-org/image'

export default function Home() {
    return (
        <div className="flex h-screen w-screen justify-center bg-background">
            <div className="mt-10 flex flex-col items-center gap-y-4 px-4 text-center">
                <Image
                    className={'w-48 rounded-full border-2 border-white'}
                    src="/logo.svg"
                    alt={
                        'Fx64b profile picture displaying the letter F in a serif font'
                    }
                />
                <h1 className={'text-2xl font-bold'}>Fx64b</h1>
                <p>
                    Lorem ipsum odor amet, consectetuer adipiscing elit.
                    Habitasse quam venenatis tempus hendrerit lorem.
                </p>
            </div>
        </div>
    )
}
