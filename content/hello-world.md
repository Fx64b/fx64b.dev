---
title: 'Hello World!'
date: '2024-10-16'
description: 'The first "blog post" on this site. What I used to build this site and why.'
read: '5 mins'
author: 'Fx64b'
---

Hello World! This is the **first** "blog post" on this site.

After procrastinating for close to two years, I finally found the time to replace the "Work in Progress" page with a proper site:

![Old WIP page](/blog/hello-world_wip-page.png)

<br>

## What I used to build this site

-   **[Next.js](https://nextjs.org/)** for static and dynamic pages.
-   **[Gray Matter](https://github.com/jonschlinkert/gray-matter)** &amp; **[React Markdown](https://github.com/remarkjs/react-markdown)** for markdown to react conversion
-   **[Tailwind CSS](https://tailwindcss.com/)** & **[NextUI](https://nextui.org/)** for components and additional styling.
-   **[Prism Themes](https://prismjs.com/)** & **[React Syntax Highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)** for code syntax highlighting.
-   **[Vercel](https://vercel.com/)** for hosting, analytics and deployment.

<br>

**...**

<br>

Well you might ask yourself now, _"Why not use plain HTML and CSS and just build a static site?"_

<br>

Great question! It's almost like asking a chef why he didn't just microwave a frozen pizza for dinner.

Sure, it's quick and gets the job done but where is the fun in that?

<br>

And nothing screams "I'm serious about web development" like having a CI/CD pipeline and automated versioning set up for a blog that I'll probably update twice a year.

<br>

**So why all this?**

1. Because I can.
2. Because, honestly, I really wanted to experiment with these technologies, but I don't really have any ideas for actual projects to use them on.

## Building the site

The most interesting and _difficult_ part was definitely the `MarkdownRenderer.tsx`, specifically the codeblock and syntax highlighting part.

After several hours of googling and getting nonsense answers from ChatGPT I ended up with this _not so clean_ solution:

```tsx
// components/MarkdownRenderer.tsx
// ...
interface MarkdownRendererProps {
    content: string
}

interface CodeBlockProps {
    inline?: boolean
    className?: string
    children?: React.ReactNode
    [key: string]: any
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const CodeBlock: React.FC<CodeBlockProps> = ({
        inline,
        className,
        children,
        ...props
    }) => {
        const [isCopied, setIsCopied] = useState(false)
        const match = /language-(\w+)/.exec(className || '')
        const language = match?.[1]

        const code = String(children).replace(/\n$/, '')

        return !inline && language ? (
            <div style={{ position: 'relative' }}>
                <CopyToClipboard
                    text={code}
                    onCopy={() => {
                        setIsCopied(true)
                        setTimeout(() => setIsCopied(false), 2000) // Reset after 2 seconds
                    }}
                >
                    <button
                        style={{
                            position: 'absolute',
                            top: '1.1rem',
                            right: '1rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isCopied ? '#006fee' : '#fff',
                        }}
                        aria-label="Copy code to clipboard"
                    >
                        {isCopied ? (
                            <CheckIcon
                                style={{ width: '1.25rem', height: '1.25rem' }}
                            />
                        ) : (
                            <ClipboardIcon
                                style={{ width: '1.25rem', height: '1.25rem' }}
                            />
                        )}
                    </button>
                </CopyToClipboard>
                <SyntaxHighlighter
                    style={oneDark}
                    language={language}
                    PreTag="div"
                    {...props}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        ) : (
            <span {...props}>{children}</span>
        )
    }

    return (
        <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            components={{
                code: CodeBlock as any,
                hr: () => <Divider />,
                a: ({ href, children }) => (
                    <Link href={href!} isExternal>
                        {children}
                    </Link>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    )
}
```

<br>

### Here is how it works

1. **`CodeBlock` Subcomponent**

```tsx
// components/MarkdownRenderer.tsx
const CodeBlock: React.FC<CodeBlockProps> = ({ inline, className, children, ...props }) => {
    const [isCopied, setIsCopied] = useState(false)
    const match = /language-(\w+)/.exec(className || '')
    const language = match?.[1]

    const code = String(children).replace(/\n$/, '');
    ...
```

-   We start off by setting the `useState()` for the copy button.
-   Then we extract the language. During the markdown processing a class that looks like this is added to the codeblock to later identify the correct language: `language-tsx`
-   Then the children prop (which contains all the code) is converted into a string and all trailing newline (`\n`)

The Copy button isn't too interesting, I just use the `react-copy-to-clipboard` package.

Syntax highlighting is done by the `<SyntaxHighlighter>` component from `react-syntax-highlighter` with this relatively simple code block:

```tsx
// components/MarkdownRenderer.tsx
<SyntaxHighlighter style={oneDark} language={language} PreTag="div" {...props}>
    {code}
</SyntaxHighlighter>
```

<br>

If the code is inline (for example an `npm install` command) we just use a basic span element which results in a clean look:

```tsx
// components/MarkdownRenderer.tsx
) : (
    <span {...props}>{children}</span>
)
```

and looks like this:

```bash
pnpm install is-odd@latest
```

<br>

2. **Hot-gluing it all together**

Now we take these two components and patch them together like this:

```tsx
// components/MarkdownRenderer.tsx
return (
    <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
            code: CodeBlock as any,
            hr: () => <Divider />,
            a: ({ href, children }) => (
                <Link href={href!} isExternal>
                    {children}
                </Link>
            ),
        }}
    >
        {content}
    </ReactMarkdown>
)
```

-   `rehypeRaw` is used that things like `<br>` tags are not rendered as text so that the content renders halfway decently.
-   In the `components` attribute I specified the html elements I want to override with my own elements, specifically the `CodeBlock` component

<br>
<br>

### Handling of Markdown files

Posts are stored as simple markdown files in the `/content` directory.

The filename also acts as the slug in the url `/content/hello-world.md` -> `/blog/hello-world`

Here is how postdata and content is fetched:

```ts
// app/lib/posts.ts
export function getPostBySlug(slug: string): Post | null {
    const realSlug = slug.replace(/\.md$/, '')
    const fullPath = path.join(postsDirectory, `${realSlug}.md`)

    if (!fs.existsSync(fullPath)) {
        return null
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data } = matter(fileContents)

    return {
        ...(data as Post),
        slug: realSlug,
    }
}
```

This function additionally has a replace for `.md` in case the function is called by a function that gets all filenames from the content directory like this:

```ts
// app/lib/posts.ts
export function getPostSlugs(): string[] {
    return fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.md'))
}
```

and then:

```ts
// app/lib/posts.ts
export function getAllPosts(): Post[] {
    const slugs = getPostSlugs()
    return slugs
        .map((slug) => getPostBySlug(slug))
        .filter((post): post is Post => post !== null)
        .sort((a, b) => (a.date > b.date ? -1 : 1))
}
```

<br>
<br>

## Conclusion

There is much more code I could cover here, but I'm not gonna do that.
Check out the code yourself if you want to: [Fx64b/fx64b.dev](https://github.com/Fx64b/fx64b.dev).

<br>

If you have some spare time to waste you can help me clean up the code by creating a pull request.

<br>

Feel free to copy the code from this site. If you for some reason decide to copy content from my blog posts and publish them yourself, please add a reference to the original post.
