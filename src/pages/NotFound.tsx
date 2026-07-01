import { Head } from 'vite-react-ssg'

import Link from '@/components/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <>
            <Head>
                <title>Page Not Found - Fx64b.dev</title>
                <meta name="robots" content="noindex, follow" />
            </Head>
            <div className="flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
                <h1 className="mb-4 text-4xl font-bold">Page Not Found</h1>
                <p className="text-muted-foreground mb-8 text-xl">
                    The page you&#39;re looking for doesn&#39;t exist or may
                    have been moved.
                </p>
                <div className="flex gap-4">
                    <Button asChild>
                        <Link href="/">Go Home</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/blog">Read My Blog</Link>
                    </Button>
                </div>
            </div>
        </>
    )
}
