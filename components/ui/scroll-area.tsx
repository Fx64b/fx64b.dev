import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'

import * as React from 'react'

import { cn } from '@/lib/utils'

function ScrollArea({
    className,
    children,
    viewportClassName,
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
    /** Applied to the scrolling viewport rather than the outer wrapper. */
    viewportClassName?: string
}) {
    return (
        <ScrollAreaPrimitive.Root
            data-slot="scroll-area"
            className={cn('relative', className)}
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                data-slot="scroll-area-viewport"
                className={cn(
                    'focus-visible:ring-ring size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-1 focus-visible:outline-1',
                    viewportClassName
                )}
            >
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar />
            <ScrollBar orientation="horizontal" />
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    )
}

function ScrollBar({
    className,
    orientation = 'vertical',
    ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
    return (
        <ScrollAreaPrimitive.ScrollAreaScrollbar
            data-slot="scroll-area-scrollbar"
            orientation={orientation}
            className={cn(
                'flex touch-none p-px transition-colors select-none',
                orientation === 'vertical' &&
                    'h-full w-2 border-l border-l-transparent',
                orientation === 'horizontal' &&
                    'h-2 flex-col border-t border-t-transparent',
                className
            )}
            {...props}
        >
            <ScrollAreaPrimitive.ScrollAreaThumb
                data-slot="scroll-area-thumb"
                // Not `bg-border`: the code blocks sit on `muted`, which is the
                // same zinc-800 as the border in dark mode, so the thumb would
                // vanish. Tinting the muted foreground reads on both surfaces.
                className="bg-muted-foreground/30 hover:bg-muted-foreground/60 relative flex-1 rounded-full transition-colors"
            />
        </ScrollAreaPrimitive.ScrollAreaScrollbar>
    )
}

export { ScrollArea, ScrollBar }
