'use client'

import { useEffect, useState } from 'react'

export function Cross() {
    const [showVerse, setShowVerse] = useState(false)
    const [currentVerse, setCurrentVerse] = useState({
        text: '',
        reference: '',
    })

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

    const selectRandomVerse = () => {
        const randomIndex = Math.floor(Math.random() * verses.length)
        setCurrentVerse(verses[randomIndex])
    }

    useEffect(() => {
        selectRandomVerse()
    }, [])

    const handleClick = () => {
        if (!showVerse) {
            selectRandomVerse()
        }
        setShowVerse(!showVerse)
    }

    return (
        <div className="relative inline-flex items-center">
            <button
                onClick={handleClick}
                className="-m-2 inline-flex items-center p-4 hover:cursor-help focus:outline-none"
                aria-label="Bible verse reference"
            >
                <span className="relative inline-block h-[1.2em] w-[0.7em] align-middle">
                    <span className="absolute top-0 right-[40%] bottom-0 left-[40%] bg-white"></span>
                    <span className="absolute top-[20%] right-0 bottom-[70%] left-0 bg-white"></span>
                </span>
            </button>

            {showVerse && (
                <div className="absolute bottom-full left-1/2 z-50 mb-2 w-screen max-w-[300px] -translate-x-1/2 rounded bg-black p-2 text-center text-lg text-white">
                    &#34;{currentVerse.text}&#34;
                    <br />— {currentVerse.reference}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black"></div>
                </div>
            )}
        </div>
    )
}
