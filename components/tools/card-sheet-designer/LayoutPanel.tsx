import {
    ColorField,
    NumberField,
    RangeField,
    Segmented,
    SelectField,
    Toggle,
} from './controls'
import { CARD_PRESETS } from './layout'
import type {
    GridLayout,
    LayoutSettings,
    LineStyle,
    Orientation,
} from './types'

const fmt = (n: number) => String(Math.round(n * 10) / 10)

export default function LayoutPanel({
    layout,
    grid,
    onChange,
}: {
    layout: LayoutSettings
    grid: GridLayout
    onChange: (patch: Partial<LayoutSettings>) => void
}) {
    const choosePreset = (id: string) => {
        const preset = CARD_PRESETS.find((p) => p.id === id)
        if (!preset) {
            return
        }
        onChange(
            id === 'custom'
                ? { preset: id }
                : { preset: id, size: { ...preset.size } }
        )
    }

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                    label="Card size"
                    value={layout.preset}
                    options={CARD_PRESETS.map((p) => ({
                        value: p.id,
                        label: p.label,
                    }))}
                    onChange={choosePreset}
                />
                <Segmented<Orientation>
                    label="Cards are"
                    value={layout.orientation}
                    options={[
                        { value: 'landscape', label: 'Wide' },
                        { value: 'portrait', label: 'Tall' },
                    ]}
                    onChange={(orientation) => onChange({ orientation })}
                />
                {layout.preset === 'custom' && (
                    <>
                        <NumberField
                            label="Width"
                            unit="mm"
                            value={layout.size.width}
                            min={20}
                            max={200}
                            step={0.5}
                            onChange={(width) =>
                                onChange({ size: { ...layout.size, width } })
                            }
                        />
                        <NumberField
                            label="Height"
                            unit="mm"
                            value={layout.size.height}
                            min={20}
                            max={200}
                            step={0.5}
                            onChange={(height) =>
                                onChange({ size: { ...layout.size, height } })
                            }
                        />
                    </>
                )}
            </div>

            <p className="text-[13px]" data-testid="grid-summary">
                {grid.perPage > 0 ? (
                    <>
                        <strong>{grid.perPage} cards</strong> of{' '}
                        {fmt(grid.cardWidth)} × {fmt(grid.cardHeight)} mm fit on
                        one A4 sheet.
                    </>
                ) : (
                    <span className="text-destructive">
                        No card fits on the sheet. Make the space between cards,
                        the printer margin or the card smaller.
                    </span>
                )}
            </p>

            <div className="space-y-3">
                <h3 className="text-[13px] font-medium">Cutting</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                    <Toggle
                        label="Thin line around each card"
                        checked={layout.outline}
                        onChange={(outline) => onChange({ outline })}
                    />
                    <Toggle
                        label="Crop marks at the paper edge"
                        checked={layout.cropMarks}
                        onChange={(cropMarks) => onChange({ cropMarks })}
                    />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <RangeField
                        label="Space between cards"
                        value={layout.gap}
                        min={0}
                        max={10}
                        step={0.5}
                        unit=" mm"
                        onChange={(gap) => onChange({ gap })}
                    />
                    <RangeField
                        label="Printer margin"
                        value={layout.minMargin}
                        min={0}
                        max={20}
                        step={0.5}
                        unit=" mm"
                        onChange={(minMargin) => onChange({ minMargin })}
                    />
                </div>
                <p className="text-muted-foreground text-[12px]">
                    Space between cards makes photos easier to cut cleanly. Most
                    printers can&apos;t print the outer 5 mm of the paper.
                </p>
            </div>

            <div className="space-y-3">
                <h3 className="text-[13px] font-medium">Frame</h3>
                <Toggle
                    label="Decorative frame inside each card"
                    checked={layout.frame}
                    onChange={(frame) => onChange({ frame })}
                />
                {layout.frame && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ColorField
                            label="Frame colour"
                            value={layout.frameColor}
                            onChange={(frameColor) => onChange({ frameColor })}
                        />
                        <SelectField<LineStyle>
                            label="Frame style"
                            value={layout.frameStyle}
                            options={[
                                { value: 'solid', label: 'Single line' },
                                { value: 'double', label: 'Double line' },
                                { value: 'dashed', label: 'Dashed' },
                                { value: 'dotted', label: 'Dotted' },
                            ]}
                            onChange={(frameStyle) => onChange({ frameStyle })}
                        />
                        <RangeField
                            label="Thickness"
                            value={layout.frameWidth}
                            min={0.1}
                            max={3}
                            step={0.1}
                            unit=" mm"
                            onChange={(frameWidth) => onChange({ frameWidth })}
                        />
                        <RangeField
                            label="Distance from card edge"
                            value={layout.frameInset}
                            min={0}
                            max={10}
                            step={0.25}
                            unit=" mm"
                            onChange={(frameInset) => onChange({ frameInset })}
                        />
                    </div>
                )}
            </div>
        </>
    )
}
