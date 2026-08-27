import { ActionLink } from '@/components/action-link'
import Image from '@/components/image'
import { Reveal } from '@/components/reveal'

export function HeroSection() {
    return (
        <section className="mx-auto w-full max-w-[720px] px-5 pt-16 pb-10 sm:px-6 sm:pt-20">
            <Reveal>
                {/* Column-reverse puts the mark above the text on small screens
                    and the row puts it to the right of it from `sm` up. */}
                <div className="flex flex-col-reverse items-start gap-8 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-[40px] leading-none font-extrabold tracking-[-0.03em] sm:text-[64px]">
                            Hi, I&#39;m
                            <br />
                            Fabio.
                        </h1>
                        <p className="text-muted-foreground mt-5 mb-8 max-w-[520px] text-[18px] leading-[1.6]">
                            Software engineer from Switzerland building modern
                            web applications with React, Next.js, TypeScript and
                            Go. Currently exploring cybersecurity fundamentals.
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                            <ActionLink href="/#cheatsheet">
                                View my work
                            </ActionLink>
                            <ActionLink href="/#contact" variant="secondary">
                                Get in touch
                            </ActionLink>
                        </div>
                    </div>

                    <Image
                        src="/logo-mark.svg"
                        alt="Fx64b"
                        width={128}
                        height={128}
                        priority
                        className="border-border size-24 shrink-0 self-center rounded-lg border sm:size-32 sm:self-start"
                    />
                </div>
            </Reveal>
        </section>
    )
}
