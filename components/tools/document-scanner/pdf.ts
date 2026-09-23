import { layoutPage } from './imaging'
import type { PageSize } from './types'

export interface PdfImage {
    bytes: Uint8Array
    format: 'jpeg' | 'png'
    width: number
    height: number
}

export interface BuildPdfOptions {
    pageSize: PageSize
    margin: boolean
    dpi: number
    title?: string
}

/** Assembles already-processed page images into a PDF, one per page. */
export async function buildPdf(
    images: PdfImage[],
    options: BuildPdfOptions
): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    doc.setProducer('fx64b.dev Document Scanner')
    doc.setCreator('fx64b.dev Document Scanner')
    if (options.title) {
        doc.setTitle(options.title)
    }

    for (const img of images) {
        const embedded =
            img.format === 'jpeg'
                ? await doc.embedJpg(img.bytes)
                : await doc.embedPng(img.bytes)
        const layout = layoutPage(
            img.width,
            img.height,
            options.pageSize,
            options.margin,
            options.dpi
        )
        const page = doc.addPage([layout.pageWidth, layout.pageHeight])
        page.drawImage(embedded, {
            x: layout.x,
            // PDF origin is bottom-left.
            y: layout.pageHeight - layout.y - layout.height,
            width: layout.width,
            height: layout.height,
        })
    }

    return doc.save()
}
