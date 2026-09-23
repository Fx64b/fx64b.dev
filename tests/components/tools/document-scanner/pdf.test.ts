import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'

import { buildPdf } from '@/components/tools/document-scanner/pdf'

// 1x1 white PNG
const PNG = Uint8Array.from(
    atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    ),
    (c) => c.charCodeAt(0)
)

describe('buildPdf', () => {
    it('creates one page per image, oriented to each image', async () => {
        const bytes = await buildPdf(
            [
                { bytes: PNG, format: 'png', width: 1000, height: 1414 },
                { bytes: PNG, format: 'png', width: 1414, height: 1000 },
            ],
            { pageSize: 'a4', margin: false, dpi: 200, title: 'test scan' }
        )
        const doc = await PDFDocument.load(bytes)
        expect(doc.getPageCount()).toBe(2)
        const [p1, p2] = doc.getPages()
        expect(p1.getWidth()).toBeCloseTo(595.28)
        expect(p1.getHeight()).toBeCloseTo(841.89)
        expect(p2.getWidth()).toBeCloseTo(841.89)
        expect(doc.getTitle()).toBe('test scan')
    })

    it('uses the image size for "fit" pages', async () => {
        const bytes = await buildPdf(
            [{ bytes: PNG, format: 'png', width: 1700, height: 2200 }],
            { pageSize: 'fit', margin: false, dpi: 200 }
        )
        const page = (await PDFDocument.load(bytes)).getPage(0)
        expect(page.getWidth()).toBeCloseTo(612)
        expect(page.getHeight()).toBeCloseTo(792)
    })
})
