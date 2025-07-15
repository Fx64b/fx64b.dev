'use client'

import { CheckIcon, ClipboardIcon } from 'lucide-react'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

import React, { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

import Link from 'next/link'

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
    [key: string]: any
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    const processedContent = content.replace(
        /^(#{1,6})\s+(.+)$/gm,
        (match, hashes, title) => {
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
            <div className="group relative my-6">
                <div className="flex items-center justify-between rounded-t-md bg-[#1e1e1e] px-4 py-2">
                    <span className="text-xs font-medium text-gray-400">
                        {languageNames[language] || language.toUpperCase()}
                    </span>
                    <CopyToClipboard
                        text={code}
                        onCopy={() => {
                            setIsCopied(true)
                            setTimeout(() => setIsCopied(false), 2000)
                        }}
                    >
                        <button
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                            aria-label="Copy code to clipboard"
                        >
                            {isCopied ? (
                                <>
                                    <CheckIcon className="h-3.5 w-3.5" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <ClipboardIcon className="h-3.5 w-3.5" />
                                    Copy
                                </>
                            )}
                        </button>
                    </CopyToClipboard>
                </div>
                <div className="overflow-hidden rounded-b-md">
                    <SyntaxHighlighter
                        style={oneDark}
                        language={language}
                        PreTag="div"
                        showLineNumbers={!isSingleLine}
                        customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            fontSize: '0.875rem',
                        }}
                        {...props}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            </div>
        ) : (
            <code
                className="bg-secondary/50 rounded px-1.5 py-0.5 font-mono text-sm"
                {...props}
            >
                {children}
            </code>
        )
    }

    return (
        <ReactMarkdown
            rehypePlugins={[rehypeRaw, remarkGfm]}
            components={{
                code: CodeBlock as any,
                hr: () => <Separator className="my-8" />,
                a: ({ href, children }) => (
                    <Link
                        href={href!}
                        target={href?.startsWith('http') ? '_blank' : undefined}
                        className="text-primary hover:text-primary/80 underline underline-offset-4"
                    >
                        {children}
                    </Link>
                ),
                h1: ({ children }) => (
                    <h1 className="scroll-mt-20 text-3xl font-bold tracking-tight">
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2 className="scroll-mt-20 text-2xl font-semibold tracking-tight">
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3 className="scroll-mt-20 text-xl font-semibold tracking-tight">
                        {children}
                    </h3>
                ),
                p: ({ children }) => <p className="leading-7">{children}</p>,
                ul: ({ children }) => (
                    <ul className="my-2 ml-6 list-disc [&>li]:mt-2">
                        {children}
                    </ul>
                ),
                ol: ({ children }) => (
                    <ol className="my-2 ml-6 list-decimal [&>li]:mt-2">
                        {children}
                    </ol>
                ),
                blockquote: ({ children }) => (
                    <blockquote className="mt-6 border-l-2 pl-6 italic">
                        {children}
                    </blockquote>
                ),
                table: ({ children }) => (
                    <div className="my-6 w-full overflow-y-auto">
                        <Table>{children}</Table>
                    </div>
                ),
                thead: ({ children }) => <TableHeader>{children}</TableHeader>,
                tbody: ({ children }) => <TableBody>{children}</TableBody>,
                tr: ({ children }) => <TableRow>{children}</TableRow>,
                th: ({ children }) => <TableHead>{children}</TableHead>,
                td: ({ children }) => <TableCell>{children}</TableCell>,
            }}
        >
            {processedContent}
        </ReactMarkdown>
    )
}

export default MarkdownRenderer
