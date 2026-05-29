'use client'

import React, { useEffect, useState } from 'react'

interface DynamicToolLoaderProps {
    slug: string
}

export default function DynamicToolLoader({ slug }: DynamicToolLoaderProps) {
    const [Component, setComponent] = useState<React.ComponentType | null>(null)
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
        const importComponent = async () => {
            try {
                const component = await import(`@/components/tools/${slug}`)
                setComponent(() => component.default)
            } catch (err) {
                setError(true)
            }
        }

        importComponent()
    }, [slug])

    if (error) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground text-sm">
                    This tool could not be loaded.
                </p>
            </div>
        )
    }

    if (!Component) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
        )
    }

    return <Component />
}
