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
            <div className="border-destructive/30 bg-destructive/10 rounded-lg border p-6 text-center">
                <h3 className="mb-2 text-lg font-medium">Tool Loading Error</h3>
                <p>
                    There was a problem loading this tool. It probably does not
                    exist yet.
                </p>
            </div>
        )
    }

    if (!Component) {
        return <div className="p-8 text-center">Loading tool...</div>
    }

    return <Component />
}
