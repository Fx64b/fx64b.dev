import projectData from '@/data/projectData'
import { getAllTools } from '@/data/toolsData'
import type { RouteRecord } from 'vite-react-ssg'

import { getAllPosts } from '@/lib/posts'

import App from './App'
import { BlogLayout, ProjectsLayout, ToolsLayout } from './layouts'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import BlogIndex from './pages/blog/BlogIndex'
import BlogPost from './pages/blog/BlogPost'
import ProjectPage from './pages/projects/ProjectPage'
import ProjectsIndex from './pages/projects/ProjectsIndex'
import ToolDetail from './pages/tools/ToolDetail'
import ToolsIndex from './pages/tools/ToolsIndex'

function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/\s+/g, '-')
}

export const routes: RouteRecord[] = [
    {
        path: '/',
        element: <App />,
        entry: 'src/App.tsx',
        children: [
            {
                index: true,
                element: <Home />,
                entry: 'src/pages/Home.tsx',
            },
            {
                path: 'blog',
                element: <BlogLayout />,
                entry: 'src/layouts.tsx',
                children: [
                    {
                        index: true,
                        element: <BlogIndex />,
                        entry: 'src/pages/blog/BlogIndex.tsx',
                    },
                    {
                        path: ':slug',
                        element: <BlogPost />,
                        entry: 'src/pages/blog/BlogPost.tsx',
                        getStaticPaths: () =>
                            getAllPosts().map((post) => post.slug),
                    },
                ],
            },
            {
                path: 'projects',
                element: <ProjectsLayout />,
                entry: 'src/layouts.tsx',
                children: [
                    {
                        index: true,
                        element: <ProjectsIndex />,
                        entry: 'src/pages/projects/ProjectsIndex.tsx',
                    },
                    {
                        path: ':slug',
                        element: <ProjectPage />,
                        entry: 'src/pages/projects/ProjectPage.tsx',
                        getStaticPaths: () =>
                            projectData
                                .filter((project) => project.featured)
                                .map((project) => titleToSlug(project.title)),
                    },
                ],
            },
            {
                path: 'tools',
                element: <ToolsLayout />,
                entry: 'src/layouts.tsx',
                children: [
                    {
                        index: true,
                        element: <ToolsIndex />,
                        entry: 'src/pages/tools/ToolsIndex.tsx',
                    },
                    {
                        path: ':slug',
                        element: <ToolDetail />,
                        entry: 'src/pages/tools/ToolDetail.tsx',
                        getStaticPaths: () =>
                            getAllTools().map((tool) => tool.slug),
                    },
                ],
            },
            {
                path: '*',
                element: <NotFound />,
                entry: 'src/pages/NotFound.tsx',
            },
        ],
    },
]
