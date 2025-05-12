'use client'

import { CheckIcon, ClipboardIcon } from 'lucide-react'
import rehypeRaw from 'rehype-raw'

import React, { useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

import Link from 'next/link'

import { Separator } from '@/components/ui/separator'

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
                hr: () => <Separator />,
                a: ({ href, children }) => (
                    <Link href={href!} target={'_blank'}>
                        {children}
                    </Link>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    )
}

export default MarkdownRenderer
