import * as React from 'react'

type ImageProps = Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    'width' | 'height'
> & {
    src: string
    alt: string
    width?: number | string
    height?: number | string
    priority?: boolean
}

/**
 * Drop-in replacement for `next/image` for a static Vite site. Renders a
 * native <img> with the same props. `width`/`height` of 0 are omitted so
 * CSS sizing (e.g. `h-8 w-auto`) takes over, matching the previous behaviour.
 */
const Image = React.forwardRef<HTMLImageElement, ImageProps>(function Image(
    { src, alt, width, height, priority, loading, ...rest },
    ref
) {
    const w = width === 0 || width === '0' ? undefined : width
    const h = height === 0 || height === '0' ? undefined : height
    return (
        <img
            ref={ref}
            src={src}
            alt={alt}
            width={w}
            height={h}
            loading={loading ?? (priority ? 'eager' : 'lazy')}
            decoding="async"
            {...rest}
        />
    )
})

export default Image
