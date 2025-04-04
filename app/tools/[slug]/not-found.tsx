import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function ToolNotFound() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <h1 className="mb-4 text-4xl font-bold">Tool Not Found</h1>
            <p className="text-muted-foreground mb-8 text-xl">
                The tool you&#39;re looking for doesn&#39;t exist or may have
                been moved.
            </p>
            <div className="flex gap-4">
                <Button asChild>
                    <Link href="/tools">Browse All Tools</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/">Go Home</Link>
                </Button>
            </div>
        </div>
    )
}
