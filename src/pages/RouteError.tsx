import { Head } from 'vite-react-ssg'

import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'

import { ActionLink } from '@/components/action-link'

const RELOAD_KEY = 'fx64b-stale-build-reload'
const RELOAD_COOLDOWN_MS = 15_000

/**
 * Errors that mean the page is running against a build that no longer exists
 * on the server - a deploy landed while the tab was open, so a lazily loaded
 * chunk or the router's static loader-data manifest now 404s and the HTML
 * error page fails to parse as JSON. Reloading picks up the new build.
 */
function isStaleBuildError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '')
    return /JSON|Failed to fetch|Load failed|dynamically imported module|module script failed/i.test(
        message
    )
}

export default function RouteError() {
    const error = useRouteError()

    useEffect(() => {
        if (!isStaleBuildError(error)) {
            return
        }
        try {
            // One reload per cooldown window, so a genuine, reproducible error
            // cannot put the tab into a reload loop.
            const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
            if (Date.now() - last < RELOAD_COOLDOWN_MS) {
                return
            }
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
        } catch {
            // Storage unavailable (private mode): skip the auto reload rather
            // than risk looping.
            return
        }
        window.location.reload()
    }, [error])

    return (
        <>
            <Head>
                <title>Something went wrong - Fx64b.dev</title>
                <meta name="robots" content="noindex, follow" />
            </Head>
            <main className="mx-auto flex w-full max-w-[720px] flex-col items-start px-5 pt-24 pb-32 sm:px-6">
                <p className="text-muted-foreground mb-3 font-mono text-[13px] tracking-[0.06em]">
                    Error
                </p>
                <h1 className="text-[36px] leading-none font-extrabold tracking-[-0.03em] sm:text-[48px]">
                    Something went wrong.
                </h1>
                <p className="text-muted-foreground mt-5 mb-8 max-w-[480px] text-[16px] leading-[1.7]">
                    This page failed to load. Reloading usually fixes it - the
                    site may have been updated while you were reading.
                </p>
                <div className="flex flex-wrap gap-2.5">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex cursor-pointer items-center gap-2 rounded-md px-[18px] py-[9px] text-[14px] font-semibold transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none"
                    >
                        Reload the page
                    </button>
                    <ActionLink href="/" variant="secondary">
                        Go home
                    </ActionLink>
                </div>
            </main>
        </>
    )
}
