import Image from '@/components/image'
import Link from '@/components/link'

interface AuthorBioProps {
    author?: string
    avatar?: string
}

export function AuthorBio({
    author = 'Fx64b',
    avatar = '/logo.svg',
}: AuthorBioProps) {
    return (
        <div className="border-border flex items-center gap-4 border-t pt-8">
            <Image
                src={avatar}
                alt={author}
                width={44}
                height={44}
                className="border-border shrink-0 rounded-full border"
            />
            <p className="text-muted-foreground text-[13.5px] leading-[1.7]">
                <span className="text-foreground font-semibold">
                    Written by {author}
                </span>
                <br />
                Software engineer from Switzerland.{' '}
                <Link
                    href="/#contact"
                    className="text-brand decoration-brand/40 hover:decoration-brand underline decoration-1 underline-offset-4 transition-colors duration-150 ease-out"
                >
                    Get in touch
                </Link>
                .
            </p>
        </div>
    )
}
