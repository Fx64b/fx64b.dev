import { ActionLink } from '@/components/action-link'
import { Reveal } from '@/components/reveal'

export function HeroSection() {
    return (
        <section className="mx-auto w-full max-w-[720px] px-5 pt-16 pb-10 sm:px-6 sm:pt-20">
            <Reveal>
                <h1 className="text-[40px] leading-none font-extrabold tracking-[-0.03em] sm:text-[64px]">
                    Hi, I&#39;m
                    <br />
                    Fabio.
                </h1>
                <p className="text-muted-foreground mt-5 mb-8 max-w-[520px] text-[18px] leading-[1.6]">
                    Software engineer from Switzerland building modern web
                    applications with React, Next.js, TypeScript and Go.
                    Currently exploring cybersecurity fundamentals.
                </p>
                <div className="flex flex-wrap gap-2.5">
                    <ActionLink href="/#work">View my work</ActionLink>
                    <ActionLink href="/#contact" variant="secondary">
                        Get in touch
                    </ActionLink>
                </div>
            </Reveal>
        </section>
    )
}
