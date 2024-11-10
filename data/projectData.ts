import { Project } from '@/types/project'

const projectData: Project[] = [
    {
        title: 'video-archiver',
        description:
            'A YouTube video downloader and archiver with various tools to manage, categorize, convert and manipulate videos..',
        logo: '/va-logo.png',
        link: 'https://github.com/Fx64b/video-archiver',
        githubLink: 'https://github.com/Fx64b/video-archiver',
        status: 'In Progress',
    },
    {
        title: 'This Portfolio',
        description:
            'Yes, it is open source! \nYou can find the source code on GitHub. This portfolio is built using Next.js, Tailwind CSS, and NextUI.',
        logo: '/logo.svg',
        link: 'https://github.com/Fx64b/fx64b.dev',
        githubLink: 'https://github.com/Fx64b/fx64b.dev',
        status: 'Finished',
    },
    {
        title: 'Skool Focus',
        description:
            'A browser extension that helps you focus while you use the skool.com website. \n\nWith an easy to use popup you can hide various distracting elements from the site like notification or the community feed.',
        logo: '/skool-focus-logo.png',
        link: 'https://chromewebstore.google.com/detail/skool-focus/nchfffdkbhafombnfcpladflclakmdmo',
        githubLink: 'https://github.com/fx64b/skool-focus-extension',
        status: 'Finished',
    },
]

export default projectData
