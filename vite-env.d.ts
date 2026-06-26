/// <reference types="vite/client" />
/// <reference types="vite-react-ssg" />

declare const __APP_VERSION__: string

declare module 'virtual:content/posts' {
    interface ContentItem {
        slug: string
        data: Record<string, string>
        content: string
    }
    const posts: ContentItem[]
    export default posts
}

declare module 'virtual:content/projects' {
    interface ContentItem {
        slug: string
        data: Record<string, string>
        content: string
    }
    const projectDocs: ContentItem[]
    export default projectDocs
}
