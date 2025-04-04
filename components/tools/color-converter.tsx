"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { ArrowDown, Check, Copy } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

type ColorFormat = "hex" | "rgb" | "hsl"

export default function ColorConverter() {
    const [inputValue, setInputValue] = useState<string>("#1e90ff")
    const [inputFormat, setInputFormat] = useState<ColorFormat>("hex")
    const [results, setResults] = useState<Record<ColorFormat, string>>({
        hex: "#1e90ff",
        rgb: "rgb(30, 144, 255)",
        hsl: "hsl(210, 100%, 56%)"
    })
    const [copied, setCopied] = useState<ColorFormat | null>(null)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    useEffect(() => {
        if (inputValue) {
            convertColor()
        }
    }, [inputValue, inputFormat])

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => {
                setCopied(null)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [copied])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
    }

    const convertColor = () => {
        setError(null)
        try {
            let hex: string = ""
            let rgb: number[] = [0, 0, 0]
            let hsl: number[] = [0, 0, 0]

            if (inputFormat === "hex") {
                rgb = hexToRgb(inputValue)
            } else if (inputFormat === "rgb") {
                rgb = parseRgb(inputValue)
            } else if (inputFormat === "hsl") {
                rgb = hslToRgb(parseHsl(inputValue))
            }

            hex = rgbToHex(rgb)
            hsl = rgbToHsl(rgb)

            setResults({
                hex: hex,
                rgb: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
                hsl: `hsl(${Math.round(hsl[0])}, ${Math.round(hsl[1])}%, ${Math.round(hsl[2])}%)`
            })
        } catch (err) {
            setError("Invalid color format")
        }
    }

    const hexToRgb = (hex: string): number[] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) ||
            /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex)

        if (!result) {
            throw new Error("Invalid hex format")
        }

        if (result[1].length === 1) {
            return [
                parseInt(result[1] + result[1], 16),
                parseInt(result[2] + result[2], 16),
                parseInt(result[3] + result[3], 16)
            ]
        }

        return [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ]
    }

    const parseRgb = (rgb: string): number[] => {
        const result = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i.exec(rgb) ||
            /(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(rgb)

        if (!result) {
            throw new Error("Invalid RGB format")
        }

        return [
            Math.min(255, Math.max(0, parseInt(result[1]))),
            Math.min(255, Math.max(0, parseInt(result[2]))),
            Math.min(255, Math.max(0, parseInt(result[3])))
        ]
    }

    const parseHsl = (hsl: string): number[] => {
        const result = /hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i.exec(hsl) ||
            /(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/i.exec(hsl)

        if (!result) {
            throw new Error("Invalid HSL format")
        }

        return [
            Math.min(360, Math.max(0, parseInt(result[1]))),
            Math.min(100, Math.max(0, parseInt(result[2]))),
            Math.min(100, Math.max(0, parseInt(result[3])))
        ]
    }

    const rgbToHex = (rgb: number[]): string => {
        return "#" + rgb.map(x => {
            const hex = x.toString(16)
            return hex.length === 1 ? "0" + hex : hex
        }).join("")
    }

    const rgbToHsl = (rgb: number[]): number[] => {
        let r = rgb[0] / 255
        let g = rgb[1] / 255
        let b = rgb[2] / 255

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        let h = 0, s = 0, l = (max + min) / 2

        if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break
                case g: h = (b - r) / d + 2; break
                case b: h = (r - g) / d + 4; break
            }

            h *= 60
        }

        return [h, s * 100, l * 100]
    }

    const hslToRgb = (hsl: number[]): number[] => {
        const h = hsl[0] / 360
        const s = hsl[1] / 100
        const l = hsl[2] / 100
        let r, g, b

        if (s === 0) {
            r = g = b = l
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) {t += 1}
                if (t > 1) {t -= 1}
                if (t < 1/6) {return p + (q - p) * 6 * t}
                if (t < 1/2) {return q}
                if (t < 2/3) {return p + (q - p) * (2/3 - t) * 6}
                return p
            }

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s
            const p = 2 * l - q
            r = hue2rgb(p, q, h + 1/3)
            g = hue2rgb(p, q, h)
            b = hue2rgb(p, q, h - 1/3)
        }

        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ]
    }

    const copyToClipboard = (format: ColorFormat) => {
        navigator.clipboard.writeText(results[format])
        setCopied(format)
    }

    const getColorPreviewStyle = () => {
        try {
            return {
                backgroundColor: results.hex,
                width: "100%",
                height: "40px",
                borderRadius: "6px",
                marginTop: "8px"
            }
        } catch {
            return { backgroundColor: "#ccc" }
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-center mb-4">Color Converter</h1>

            <Card className="mb-4">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row items-end gap-4">
                            <div className="w-full md:flex-1">
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    placeholder="Enter color value"
                                    className={`text-lg ${error ? 'border-destructive' : ''}`}
                                    aria-label="Color value to convert"
                                />
                            </div>

                            <div className="w-full md:w-auto">
                                <Select value={inputFormat} onValueChange={(val) => setInputFormat(val as ColorFormat)}>
                                    <SelectTrigger className="w-full md:w-[120px]">
                                        <SelectValue placeholder="Format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hex">HEX</SelectItem>
                                        <SelectItem value="rgb">RGB</SelectItem>
                                        <SelectItem value="hsl">HSL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {error && <p className="text-destructive text-sm mt-1">{error}</p>}

                        <div style={getColorPreviewStyle()} className="border" />

                        <div className="flex items-center justify-center w-full mt-2">
                            <ArrowDown className="my-2" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.keys(results).map((format) => (
                    <Card key={format} className={`${format === inputFormat ? "border-primary" : ""}`}>
                        <CardContent className="p-4 h-[100px] relative">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium uppercase">{format}</span>
                                {format !== inputFormat && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 absolute top-2 right-2"
                                                    onClick={() => copyToClipboard(format as ColorFormat)}
                                                >
                                                    {copied === format ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                    <span className="sr-only">Copy value</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{copied === format ? "Copied!" : "Copy"}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <div className="font-mono text-lg truncate mt-2">
                                {results[format as ColorFormat]}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-8 mb-4">
                <h2 className="text-xl font-semibold mb-4">About Color Formats</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">HEX</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                Hexadecimal color format used in CSS and HTML.
                            </p>
                            <div className="bg-secondary/20 p-3 rounded font-mono text-sm">#1e90ff</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">RGB</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                Red, Green, Blue values (0-255).
                            </p>
                            <div className="bg-secondary/20 p-3 rounded font-mono text-sm">rgb(30, 144, 255)</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">HSL</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                Hue, Saturation, Lightness format.
                            </p>
                            <div className="bg-secondary/20 p-3 rounded font-mono text-sm">hsl(210, 100%, 56%)</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Color Format Tips</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">Format Acceptance</h3>
                            <p className="text-sm text-muted-foreground">
                                The converter accepts various input formats:
                            </p>
                            <ul className="text-sm text-muted-foreground mt-2 list-disc pl-5">
                                <li><b>HEX:</b> Both with and without # prefix (e.g., #1e90ff or 1e90ff)</li>
                                <li><b>RGB:</b> Full format or just values (e.g., rgb(30, 144, 255) or 30, 144, 255)</li>
                                <li><b>HSL:</b> Full format or just values (e.g., hsl(210, 100%, 56%) or 210, 100%, 56%)</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="font-medium mb-2">Common Use Cases</h3>
                            <p className="text-sm text-muted-foreground">
                                Different color formats are used in different contexts:
                            </p>
                            <ul className="text-sm text-muted-foreground mt-2 list-disc pl-5">
                                <li><b>HEX:</b> Most common in CSS and design tools</li>
                                <li><b>RGB:</b> Useful for programmatic color manipulation</li>
                                <li><b>HSL:</b> Intuitive for designers (hue, saturation, lightness)</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}