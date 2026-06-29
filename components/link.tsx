import * as React from 'react'
import { Link as RouterLink } from 'react-router-dom'

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string
    children?: React.ReactNode
}

const EXTERNAL = /^(https?:|mailto:|tel:|#)/

/**
 * Drop-in replacement for `next/link`. Internal paths use the client-side
 * router; external/protocol/hash links and anything with `target` fall back
 * to a plain anchor. Refs are forwarded so Radix `asChild` slots keep working.
 */
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
    { href, children, target, ...rest },
    ref
) {
    const isExternal = EXTERNAL.test(href) || target === '_blank'

    if (isExternal) {
        return (
            <a ref={ref} href={href} target={target} {...rest}>
                {children}
            </a>
        )
    }

    return (
        <RouterLink ref={ref} to={href} {...rest}>
            {children}
        </RouterLink>
    )
})

export default Link
