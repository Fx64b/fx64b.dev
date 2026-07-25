import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Stagger in milliseconds. */
    delay?: number
}

/**
 * Fades and rises its children into view once, the first time they enter the
 * viewport. The hidden state lives in CSS behind the `js` class, and
 * `prefers-reduced-motion: reduce` disables the animation entirely.
 */
export function Reveal({
    delay = 0,
    className,
    style,
    children,
    ...props
}: RevealProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [revealed, setRevealed] = useState(false)

    useEffect(() => {
        const element = ref.current
        if (!element || typeof IntersectionObserver === 'undefined') {
            setRevealed(true)
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setRevealed(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '0px 0px -8% 0px' }
        )

        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            data-revealed={revealed}
            className={cn('reveal', className)}
            style={{
                transitionDelay: delay ? `${delay}ms` : undefined,
                ...style,
            }}
            {...props}
        >
            {children}
        </div>
    )
}
