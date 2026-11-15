import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { Toggle } from './controls'
import { TEXT_PRESETS, parseBulkText } from './design'

interface CardText {
    text: string
    reference: string
}

function PasteList({
    onApply,
    onClearAll,
}: {
    onApply: (text: string) => void
    onClearAll: () => void
}) {
    const [text, setText] = useState('')
    const count = parseBulkText(text).length

    return (
        <div className="space-y-3 pt-3">
            <p className="text-muted-foreground text-[13px] leading-relaxed">
                One card per paragraph, with an empty line between cards. A last
                line starting with &quot;—&quot; or &quot;--&quot; becomes the
                small line. More sheets are added when needed.
            </p>
            <div className="flex flex-wrap gap-1.5">
                <span className="text-muted-foreground self-center text-[12px]">
                    Examples:
                </span>
                {TEXT_PRESETS.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => setText(p.text)}
                        className="text-muted-foreground hover:text-foreground hover:border-foreground rounded-full border px-2.5 py-0.5 text-[12px] transition-colors"
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            <Textarea
                aria-label="Texts for several cards"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={
                    'The LORD is my shepherd; I shall not want.\n— Psalm 23:1\n\nMerry Christmas!'
                }
                className="text-[13px]"
            />
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    disabled={count === 0}
                    onClick={() => {
                        onApply(text)
                        setText('')
                    }}
                >
                    {count === 0
                        ? 'Put on cards'
                        : `Put on ${count} card${count === 1 ? '' : 's'}`}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={onClearAll}
                >
                    Clear all texts
                </Button>
            </div>
        </div>
    )
}

export default function TextStep({
    sameText,
    value,
    index,
    total,
    onSelect,
    onChange,
    onSameTextChange,
    onApplyList,
    onClearAll,
}: {
    sameText: boolean
    /** Text of the selected card, or the shared text. */
    value: CardText
    index: number
    total: number
    onSelect: (index: number) => void
    onChange: (patch: Partial<CardText>) => void
    onSameTextChange: (on: boolean) => void
    onApplyList: (text: string) => void
    onClearAll: () => void
}) {
    const [listOpen, setListOpen] = useState(false)

    return (
        <>
            <Toggle
                label="Same text on every card"
                checked={sameText}
                onChange={onSameTextChange}
            />

            <div className="space-y-3">
                <div className="flex h-8 items-center justify-between gap-2">
                    <div
                        className="text-[13px] font-medium"
                        data-testid="card-editor-title"
                    >
                        {sameText ? (
                            `All ${total} cards`
                        ) : (
                            <>
                                Card {index + 1}{' '}
                                <span className="text-muted-foreground font-normal">
                                    of {total} · click a card in the preview to
                                    switch
                                </span>
                            </>
                        )}
                    </div>
                    {!sameText && (
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-8"
                                aria-label="Previous card"
                                disabled={index === 0}
                                onClick={() => onSelect(index - 1)}
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-8"
                                aria-label="Next card"
                                disabled={index >= total - 1}
                                onClick={() => onSelect(index + 1)}
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    )}
                </div>
                <Textarea
                    id="csd-card-text"
                    aria-label="Text"
                    value={value.text}
                    rows={4}
                    placeholder="e.g. a Bible verse or a Christmas greeting"
                    onChange={(e) => onChange({ text: e.target.value })}
                />
                <div className="space-y-1">
                    <label
                        htmlFor="csd-card-ref"
                        className="text-[13px] font-medium"
                    >
                        Small line below{' '}
                        <span className="text-muted-foreground font-normal">
                            (optional)
                        </span>
                    </label>
                    <Input
                        id="csd-card-ref"
                        value={value.reference}
                        placeholder="e.g. John 3:16 or Anna & Tom"
                        onChange={(e) =>
                            onChange({ reference: e.target.value })
                        }
                    />
                </div>
            </div>

            <div className="rounded-md border px-3 py-2">
                <button
                    type="button"
                    aria-expanded={listOpen}
                    onClick={() => setListOpen((o) => !o)}
                    className="flex w-full items-center justify-between text-left text-[13px] font-medium"
                >
                    Paste many texts at once
                    <ChevronRight
                        className={`text-muted-foreground size-4 transition-transform ${listOpen ? 'rotate-90' : ''}`}
                    />
                </button>
                {listOpen && (
                    <PasteList onApply={onApplyList} onClearAll={onClearAll} />
                )}
            </div>
        </>
    )
}
