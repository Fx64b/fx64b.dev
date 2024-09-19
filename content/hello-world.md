---
title: 'Hello World: Building Your First Next.js App with Markdown'
date: '2024-09-15'
description: 'Learn how to create a simple Next.js application using Markdown for content.'
read: '10 mins'
---

# Hello World: Building Your First Next.js App with Markdown

Welcome to my **first** blog post! In this tutorial, we'll explore how to create a simple Next.js application that uses Markdown files for content. We'll cover setting up the project, parsing Markdown, and displaying it on your site.

![Blog Post Screenshot](https://nextjs.org/_next/image?url=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Fv1723581090%2Ffront%2Fnext-conf-2024%2Ftakeover.png&w=1920&q=75)

## Introduction

Combining **Next.js** with **Markdown** allows you to build static sites efficiently. Markdown provides a simple way to write content, and Next.js can render this content seamlessly.

## Prerequisites

-   Node.js (v14 or later)
-   Basic knowledge of React and Next.js
-   Familiarity with TypeScript is a plus

## Setting Up the Project

First, let's create a new Next.js project with TypeScript and the App Router enabled:

```bash
npx create-next-app@latest my-nextjs-app --typescript --use-app
cd my-nextjs-app
```

## Installing Dependencies

Install the necessary packages to handle Markdown and front matter:

```bash
npm install gray-matter remark remark-html
```

-   **gray-matter**: Parses YAML front matter from Markdown files.
-   **remark** and **remark-html**: Convert Markdown content into HTML.

## Creating a Markdown File

Create a `content` directory in the root of your project and add a `hello-world.md` file:

And here's how you can create a basic React component:

```jsx
import React from 'react'

const HelloWorld = () => {
    return <h1>Hello, World!</h1>
}

export default HelloWorld
```

## Adding Images

You can include images in your Markdown content:

![Blog Post Screenshot](https://nextjs.org/_next/image?url=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Fv1723581090%2Ffront%2Fnext-conf-2024%2Ftakeover.png&w=1920&q=75)

Make sure the image path is correct relative to your Markdown file.

## Parsing Markdown Content

We'll create utility functions to read and parse the Markdown files.

```typescript
// lib/posts.ts
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

export interface PostData {
    title: string
    date: string
    description: string
    content: string
    slug: string
}

const postsDirectory = path.join(process.cwd(), 'content')

export function getPostSlugs(): string[] {
    return fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.md'))
}

export function getPostBySlug(slug: string): PostData {
    const realSlug = slug.replace(/\.md$/, '')
    const fullPath = path.join(postsDirectory, `${realSlug}.md`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    const { data, content } = matter(fileContents)

    return {
        ...(data as Omit<PostData, 'content' | 'slug'>),
        content,
        slug: realSlug,
    }
}
```

## Rendering Markdown in Next.js

In your `[slug]/page.tsx`, use the `remark` library to convert Markdown content to HTML.

```tsx
// app/blog/[slug]/page.tsx
import { remark } from 'remark'
import html from 'remark-html'

import { getPostBySlug, getPostSlugs } from '../../lib/posts'

interface Props {
    params: {
        slug: string
    }
}

export async function generateStaticParams() {
    const slugs = getPostSlugs().map((slug) => slug.replace(/\.md$/, ''))
    return slugs.map((slug) => ({
        slug,
    }))
}

export default async function PostPage({ params }: Props) {
    const { slug } = params
    const post = getPostBySlug(slug)

    const processedContent = await remark().use(html).process(post.content)
    const contentHtml = processedContent.toString()

    return (
        <article className="prose mx-auto">
            <h1>{post.title}</h1>
            <p className="text-gray-500">{post.date}</p>
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </article>
    )
}
```

## Styling with Tailwind CSS

Ensure Tailwind CSS is set up in your project. Use the `prose` class from the Tailwind CSS Typography plugin to style your content.

```bash
npm install @tailwindcss/typography
```

Update your `tailwind.config.js`:

```javascript
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [require('@tailwindcss/typography')],
}
```

## Adding a Layout

Create a `layout.tsx` in the `/blog/[slug]` directory to provide a consistent layout for your blog posts.

```tsx
// app/blog/[slug]/layout.tsx
'use client'

import { ReactNode } from 'react'

import { NextUIProvider } from '@nextui-org/react'
import { Link, Navbar, Text } from '@nextui-org/react'

// app/blog/[slug]/layout.tsx

// app/blog/[slug]/layout.tsx

// app/blog/[slug]/layout.tsx

// app/blog/[slug]/layout.tsx

// app/blog/[slug]/layout.tsx

// app/blog/[slug]/layout.tsx

// app/blog/[slug]/layout.tsx

export default function BlogPostLayout({ children }: { children: ReactNode }) {
    return (
        <NextUIProvider>
            <div className="flex min-h-screen flex-col">
                {/* Header */}
                <Navbar isBordered variant="sticky">
                    <Navbar.Brand>
                        <Link href="/">
                            <Text b color="inherit" hideIn="xs">
                                My Blog
                            </Text>
                        </Link>
                    </Navbar.Brand>
                    <Navbar.Content>
                        <Navbar.Link href="/blog">Blog</Navbar.Link>
                        <Navbar.Link href="/about">About</Navbar.Link>
                    </Navbar.Content>
                </Navbar>

                {/* Main Content */}
                <main className="container mx-auto flex-grow px-4 py-8">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-gray-100 py-4">
                    <div className="container mx-auto text-center">
                        <Text size={14} color="gray">
                            &copy; {new Date().getFullYear()} My Blog. All
                            rights reserved.
                        </Text>
                    </div>
                </footer>
            </div>
        </NextUIProvider>
    )
}
```

## Running the Application

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000/blog/hello-world` to see your blog post rendered with the new layout.

![Blog Post Screenshot](https://nextjs.org/_next/image?url=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Fv1723581090%2Ffront%2Fnext-conf-2024%2Ftakeover.png&w=1920&q=75)

## Conclusion

You've successfully built a simple Next.js application that renders Markdown content. This setup is scalable and can be extended to create a full-featured blog or documentation site.

## Next Steps

-   **Enhance Styling**: Customize the design using Tailwind CSS and NextUI components.
-   **Add Features**: Implement pagination, search functionality, or categories.
-   **SEO Optimization**: Use `next/head` to add meta tags for better SEO.
-   **Deploy**: Consider deploying your app to platforms like Vercel.

---

Feel free to modify and expand upon this example to suit your specific needs!
