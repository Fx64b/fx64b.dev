import { Project } from '@/types/project'

const projectData: Project[] = [
    {
        title: 'Flashcard App',
        description:
            'A modern flashcard application for effective learning using the Spaced Repetition System (SRS). Features email authentication, study time tracking, progress analytics, and bulk card import. Built with Next.js 15, TypeScript, and Turso database. Currently in early development.',
        logo: '/learn-logo.png',
        link: 'https://learn.fx64b.dev',
        githubLink: 'https://github.com/Fx64b/learn',
        status: 'In Progress',
        tags: [
            'Next.js',
            'TypeScript',
            'Stripe',
            'AI Integration',
            'Turso',
            'Spaced Repetition',
            'Flashcards',
        ],
        featured: true,
    },
    {
        title: 'video-archiver',
        description:
            'A YouTube video downloader and archiver with various tools to download, manage, categorize, convert, stream and manipulate videos. The project is still in early development stage.',
        logo: '/va-logo.png',
        link: 'https://github.com/Fx64b/video-archiver',
        githubLink: 'https://github.com/Fx64b/video-archiver',
        status: 'On Hold',
        tags: [
            'Next.js',
            'TypeScript',
            'Go Lang',
            'SQLite',
            'Docker',
            'Docker Compose',
            'yt-dlp',
        ],
        featured: true,
    },
    {
        title: 'skool-loom-dl',
        description:
            'Skool-Loom-Downloader is a lightweight Go utility that automatically scrapes and downloads Loom videos from Skool.com classrooms. It supports both cookie-based and email/password authentication, handles JSON and Netscape cookie formats, and comes with Docker support for easy deployment.',
        logo: '/sld.webp',
        link: 'https://github.com/Fx64b/skool-loom-dl',
        githubLink: 'https://github.com/Fx64b/skool-loom-dl',
        status: 'Finished',
        tags: ['Go Lang', 'Skool.com', 'Loom', 'Video Downloader', 'Docker'],
        featured: true,
    },
    {
        title: 'Swiss Cross',
        description:
            'A lightweight React component for rendering the Swiss cross symbol with customizable size, colors, and border radius. TypeScript support, and dual CommonJS/ESM distribution. ',
        logo: '/swiss-cross-logo.png',
        link: 'https://www.npmjs.com/package/swiss-cross',
        githubLink: 'https://github.com/Fx64b/swiss-cross',
        status: 'Finished',
        tags: ['npm', 'Package', 'React', 'TypeScript', 'Swiss Cross'],
        featured: true,
    },
    {
        title: 'This Portfolio',
        description:
            'Yes, it is open source! \nYou can find the source code on GitHub. This portfolio is built using Next.js, Tailwind CSS, and shadcn/ui.',
        logo: '/logo.svg',
        link: 'https://github.com/Fx64b/fx64b.dev',
        githubLink: 'https://github.com/Fx64b/fx64b.dev',
        status: 'Finished',
        tags: [
            'Next.js',
            'TypeScript',
            'Tailwind CSS',
            'shadcn/ui',
            'Blog',
            'Tools',
            'Portfolio',
        ],
        featured: false,
    },
    {
        title: 'Skool Focus',
        description:
            'A browser extension that helps you focus while you use the skool.com website. \n\nWith an easy to use popup you can hide various distracting elements from the site like notification or the community feed.',
        logo: '/skool-focus-logo.png',
        link: 'https://chromewebstore.google.com/detail/skool-focus/nchfffdkbhafombnfcpladflclakmdmo',
        githubLink: 'https://github.com/fx64b/skool-focus-extension',
        status: 'Finished',
        tags: [
            'Browser Extension',
            'Chrome',
            'Firefox',
            'Skool.com',
            'Productivity',
        ],
        featured: false,
    },
]

export default projectData
