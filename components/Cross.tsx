import { useState } from 'react'

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

const verses = [
    {
        text: 'By wisdom a house is built, and through understanding it is established.',
        reference: 'Proverbs 24:3',
    },
    {
        text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
        reference: 'Colossians 3:23',
    },
    {
        text: 'The heavens declare the glory of God; the skies proclaim the work of his hands.',
        reference: 'Psalm 19:1',
    },
    {
        text: 'For we are God’s handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.',
        reference: 'Ephesians 2:10',
    },
    {
        text: 'In the beginning God created the heavens and the earth.',
        reference: 'Genesis 1:1',
    },
    {
        text: 'I can do all things through Christ who strengthens me.',
        reference: 'Philippians 4:13',
    },
    {
        text: 'Commit to the Lord whatever you do, and he will establish your plans.',
        reference: 'Proverbs 16:3',
    },
]

export function Cross() {
    const [verse, setVerse] = useState(verses[0])

    const pickRandomVerse = () => {
        setVerse((current) => {
            const others = verses.filter((v) => v !== current)
            return others[Math.floor(Math.random() * others.length)]
        })
    }

    return (
        <Popover onOpenChange={(open) => open && pickRandomVerse()}>
            <PopoverTrigger
                aria-label="Show a Bible verse"
                className="hover:text-foreground focus-visible:ring-ring flex size-8 cursor-pointer items-center justify-center rounded-sm transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none"
            >
                <svg
                    viewBox="0 0 12 16"
                    className="h-4 w-3"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <rect x="5" width="2" height="16" />
                    <rect y="3" width="12" height="2" />
                </svg>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                collisionPadding={12}
                className="w-fit max-w-xs text-center"
            >
                <blockquote className="text-sm leading-relaxed">
                    “{verse.text}”
                </blockquote>
                <div className="text-muted-foreground mt-2 text-xs">
                     {verse.reference}
                </div>
            </PopoverContent>
        </Popover>
    )
}
