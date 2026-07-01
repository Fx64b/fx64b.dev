import { AlertCircleIcon } from 'lucide-react'

import React, { useEffect, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface DynamicToolLoaderProps {
    slug: string
}

// Statically analyzable glob so Vite can code-split each tool into its own
// chunk and load it on demand, mirroring the previous dynamic import.
const toolModules = import.meta.glob<{ default: React.ComponentType }>(
    '/components/tools/*.tsx'
)

export default function DynamicToolLoader({ slug }: DynamicToolLoaderProps) {
    const [Component, setComponent] = useState<React.ComponentType | null>(null)
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
        const loader = toolModules[`/components/tools/${slug}.tsx`]

        if (!loader) {
            setError(true)
            return
        }

        loader()
            .then((component) => {
                setComponent(() => component.default)
            })
            .catch(() => {
                setError(true)
            })
    }, [slug])

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircleIcon className="h-5 w-5" />
                <AlertTitle>Tool Loading Error</AlertTitle>
                <AlertDescription>
                    There was a problem loading this tool. It probably does not
                    exist yet.
                </AlertDescription>
            </Alert>
        )
    }

    if (!Component) {
        return <div className="p-8 text-center">Loading tool...</div>
    }

    return <Component />
}
