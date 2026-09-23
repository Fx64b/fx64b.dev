import {
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Loader2, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { Preview } from './PageEditor'
import type { ScanPage } from './types'

interface PageStripProps {
    pages: ScanPage[]
    previews: Record<string, Preview>
    selectedId: string | null
    onSelect: (id: string) => void
    onReorder: (pages: ScanPage[]) => void
    onAdd: () => void
}

function Thumb({
    page,
    index,
    preview,
    selected,
    onSelect,
}: {
    page: ScanPage
    index: number
    preview?: Preview
    selected: boolean
    onSelect: () => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: page.id })

    return (
        <li
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={cn('relative', isDragging && 'z-10 opacity-80')}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={onSelect}
                aria-label={`Page ${index + 1}${selected ? ' (selected)' : ''}. Drag to reorder.`}
                aria-current={selected}
                className={cn(
                    'bg-muted/40 flex h-28 w-20 touch-none items-center justify-center overflow-hidden rounded-md border-2 transition-colors',
                    selected
                        ? 'border-primary'
                        : 'hover:border-muted-foreground/40 border-transparent'
                )}
            >
                {preview ? (
                    <img
                        src={preview.url}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                    />
                ) : (
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                )}
            </button>
            <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-xs font-medium text-white tabular-nums">
                {index + 1}
            </span>
        </li>
    )
}

/** Thumbnails of all pages in PDF order; drag (or use the keyboard) to reorder. */
export default function PageStrip({
    pages,
    previews,
    selectedId,
    onSelect,
    onReorder,
    onAdd,
}: PageStripProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 180, tolerance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) {
            return
        }
        const from = pages.findIndex((p) => p.id === active.id)
        const to = pages.findIndex((p) => p.id === over.id)
        onReorder(arrayMove(pages, from, to))
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
        >
            <SortableContext
                items={pages.map((p) => p.id)}
                strategy={rectSortingStrategy}
            >
                <ol className="flex flex-wrap gap-3" aria-label="Pages">
                    {pages.map((page, i) => (
                        <Thumb
                            key={page.id}
                            page={page}
                            index={i}
                            preview={previews[page.id]}
                            selected={page.id === selectedId}
                            onSelect={() => onSelect(page.id)}
                        />
                    ))}
                    <li>
                        <button
                            type="button"
                            onClick={onAdd}
                            className="text-muted-foreground hover:border-primary hover:text-foreground flex h-28 w-20 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed text-xs"
                        >
                            <Plus className="size-5" />
                            Add pages
                        </button>
                    </li>
                </ol>
            </SortableContext>
        </DndContext>
    )
}
