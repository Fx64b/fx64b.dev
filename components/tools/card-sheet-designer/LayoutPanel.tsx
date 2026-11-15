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
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
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
                    label="Orientation"
                    value={layout.orientation}
                    options={[
                        { value: 'landscape', label: 'Landscape' },
                        { value: 'portrait', label: 'Portrait' },
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
                    label="Minimum page margin"
                    value={layout.minMargin}
                    min={0}
                    max={20}
                    step={0.5}
                    unit=" mm"
                    onChange={(minMargin) => onChange({ minMargin })}
                />
            </div>

            <p
                className="text-muted-foreground text-[13px]"
                data-testid="grid-summary"
            >
                {grid.perPage > 0 ? (
                    <>
                        {grid.cols} × {grid.rows} ={' '}
                        <strong className="text-foreground">
                            {grid.perPage} cards
                        </strong>{' '}
                        per A4 sheet, each {fmt(grid.cardWidth)} ×{' '}
                        {fmt(grid.cardHeight)} mm. Page margins{' '}
                        {fmt(grid.marginX)} mm left/right, {fmt(grid.marginY)}{' '}
                        mm top/bottom.
                    </>
                ) : (
                    <span className="text-destructive">
                        No card fits on the page. Reduce the margin, the spacing
                        or the card size.
                    </span>
                )}
            </p>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold">Cutting guides</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <Toggle
                        label="Line around every card"
                        checked={layout.outline}
                        onChange={(outline) => onChange({ outline })}
                    />
                    <Toggle
                        label="Crop marks in the margin"
                        checked={layout.cropMarks}
                        onChange={(cropMarks) => onChange({ cropMarks })}
                    />
                </div>
                {layout.outline && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ColorField
                            label="Line colour"
                            value={layout.outlineColor}
                            onChange={(outlineColor) =>
                                onChange({ outlineColor })
                            }
                        />
                        <RangeField
                            label="Line width"
                            value={layout.outlineWidth}
                            min={0.1}
                            max={1.5}
                            step={0.05}
                            unit=" mm"
                            onChange={(outlineWidth) =>
                                onChange({ outlineWidth })
                            }
                        />
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold">Decorative frame</h3>
                <Toggle
                    label="Draw a frame inside each card"
                    checked={layout.frame}
                    onChange={(frame) => onChange({ frame })}
                />
                {layout.frame && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ColorField
                            label="Frame colour"
                            value={layout.frameColor}
                            onChange={(frameColor) => onChange({ frameColor })}
                        />
                        <SelectField<LineStyle>
                            label="Frame style"
                            value={layout.frameStyle}
                            options={[
                                { value: 'solid', label: 'Solid' },
                                { value: 'double', label: 'Double' },
                                { value: 'dashed', label: 'Dashed' },
                                { value: 'dotted', label: 'Dotted' },
                            ]}
                            onChange={(frameStyle) => onChange({ frameStyle })}
                        />
                        <RangeField
                            label="Frame width"
                            value={layout.frameWidth}
                            min={0.1}
                            max={3}
                            step={0.1}
                            unit=" mm"
                            onChange={(frameWidth) => onChange({ frameWidth })}
                        />
                        <RangeField
                            label="Distance from edge"
                            value={layout.frameInset}
                            min={0}
                            max={10}
                            step={0.25}
                            unit=" mm"
                            onChange={(frameInset) => onChange({ frameInset })}
                        />
                        <RangeField
                            label="Corner radius"
                            value={layout.frameRadius}
                            min={0}
                            max={8}
                            step={0.25}
                            unit=" mm"
                            onChange={(frameRadius) =>
                                onChange({ frameRadius })
                            }
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
