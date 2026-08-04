import { Head } from 'vite-react-ssg'

import { ActionLink } from '@/components/action-link'

export default function NotFound() {
    return (
        <>
            <Head>
                <title>Page Not Found - Fx64b.dev</title>
                <meta name="robots" content="noindex, follow" />
            </Head>
            <main className="mx-auto flex w-full max-w-[720px] flex-col items-start px-5 pt-24 pb-32 sm:px-6">
                <p className="text-muted-foreground mb-3 font-mono text-[13px] tracking-[0.06em]">
                    404
                </p>
                <h1 className="text-[36px] leading-none font-extrabold tracking-[-0.03em] sm:text-[48px]">
                    Page not found.
                </h1>
                <p className="text-muted-foreground mt-5 mb-8 max-w-[480px] text-[16px] leading-[1.7]">
                    The page you&#39;re looking for doesn&#39;t exist or may
                    have been moved.
                </p>
                <div className="flex flex-wrap gap-2.5">
                    <ActionLink href="/">Go home</ActionLink>
                    <ActionLink href="/projects" variant="secondary">
                        Explore projects
                    </ActionLink>
                </div>
            </main>
        </>
    )
}
