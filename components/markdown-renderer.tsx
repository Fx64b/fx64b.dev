import { CheckIcon, ClipboardIcon } from 'lucide-react'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

import Link from '@/components/link'
import { Separator } from '@/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface MarkdownRendererProps {
    content: string
}

interface CodeBlockProps {
    inline?: boolean
    className?: string
    children?: React.ReactNode
    [key: string]: unknown
}

// Line numbers are positioned inline; their colour comes from the stylesheet.
const lineNumberStyle: React.CSSProperties = {
    display: 'inline-block',
    minWidth: '2.25em',
    paddingRight: '1em',
    textAlign: 'right',
    userSelect: 'none',
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const processedContent = content.replace(
        /^(#{1,6})\s+(.+)$/gm,
        (match, hashes, title, offset, string) => {
            // Check if this heading is inside a code block
            const beforeMatch = string.substring(0, offset)

            // Count code block delimiters before this position
            const codeBlockStarts = (beforeMatch.match(/```/g) || []).length
            const inlineCodeStarts = (beforeMatch.match(/(?<!\\)`(?!`)/g) || [])
                .length

            // If we're inside a code block, don't transform
            if (codeBlockStarts % 2 === 1 || inlineCodeStarts % 2 === 1) {
                return match
            }

            const id = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
            return `${hashes} <span id="${id}">${title}</span>`
        }
    )

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

        const isSingleLine = code.split('\n').length === 1

        const languageNames: Record<string, string> = {
            javascript: 'JavaScript',
            typescript: 'TypeScript',
            tsx: 'TypeScript',
            jsx: 'JavaScript',
            python: 'Python',
            java: 'Java',
            c: 'C',
            cpp: 'C++',
            csharp: 'C#',
            php: 'PHP',
            ruby: 'Ruby',
            go: 'Go',
            rust: 'Rust',
            kotlin: 'Kotlin',
            swift: 'Swift',
            bash: 'Bash',
            shell: 'Shell',
            sql: 'SQL',
            html: 'HTML',
            css: 'CSS',
            scss: 'SCSS',
            json: 'JSON',
            yaml: 'YAML',
            xml: 'XML',
            markdown: 'Markdown',
            diff: 'Diff',
        }

        return !inline && language ? (
            <div className="group border-border bg-muted relative my-6 overflow-hidden rounded-lg border">
                <div className="border-border flex items-center justify-between border-b px-4 py-2">
                    <span className="text-muted-foreground font-mono text-[11px] tracking-[0.06em] uppercase">
                        {languageNames[language] || language.toUpperCase()}
                    </span>
                    <button
                        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-xs px-1.5 py-1 text-[11px] transition-colors duration-150 ease-out"
                        aria-label="Copy code to clipboard"
                        onClick={() => {
                            navigator.clipboard.writeText(code)
                            setIsCopied(true)
                            setTimeout(() => setIsCopied(false), 2000)
                        }}
                    >
                        {isCopied ? (
                            <>
                                <CheckIcon className="size-3.5" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <ClipboardIcon className="size-3.5" />
                                Copy
                            </>
                        )}
                    </button>
                </div>
                <div className="code-block overflow-x-auto p-4">
                    {/* Highlighting is emitted as Prism class names and
                        coloured from globals.css, so the palette follows the
                        theme instead of being baked into the pre-rendered
                        HTML by a JavaScript-chosen inline style. */}
                    <SyntaxHighlighter
                        useInlineStyles={false}
                        language={language}
                        PreTag="div"
                        showLineNumbers={!isSingleLine}
                        lineNumberStyle={lineNumberStyle}
                        {...props}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            </div>
        ) : (
            <code
                className="bg-muted text-foreground rounded-xs px-1.5 py-0.5 font-mono text-[13.5px]"
                {...props}
            >
                {children}
            </code>
        )
    }

    return (
        <div className="markdown">
            <ReactMarkdown
                rehypePlugins={[rehypeRaw, remarkGfm]}
                components={{
                    code: CodeBlock as any,
                    hr: () => <Separator className="my-10" />,
                    a: ({ href, children, className }) => (
                        <Link
                            href={href!}
                            target={
                                href?.startsWith('http') ? '_blank' : undefined
                            }
                            rel={
                                href?.startsWith('http')
                                    ? 'noopener noreferrer'
                                    : undefined
                            }
                            className={className as string}
                        >
                            {children}
                        </Link>
                    ),
                    table: ({ children }) => (
                        <div className="my-6 w-full overflow-y-auto">
                            <Table>{children}</Table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <TableHeader>{children}</TableHeader>
                    ),
                    tbody: ({ children }) => <TableBody>{children}</TableBody>,
                    tr: ({ children }) => <TableRow>{children}</TableRow>,
                    th: ({ children }) => <TableHead>{children}</TableHead>,
                    td: ({ children }) => <TableCell>{children}</TableCell>,
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    )
}

export default MarkdownRenderer
