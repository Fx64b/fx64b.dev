import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DocumentScanner from '@/components/tools/document-scanner'
import { FULL_FRAME } from '@/components/tools/document-scanner/imaging'
import type { ScanPage } from '@/components/tools/document-scanner/types'

const mocks = vi.hoisted(() => ({
    loadSession: vi.fn(),
    processPage: vi.fn(),
    buildPdf: vi.fn(),
}))

vi.mock('@/components/tools/document-scanner/scanner-client', () => ({
    initScanner: vi.fn(() => Promise.resolve()),
    detect: vi.fn(() => Promise.resolve({ quad: null, area: 0 })),
    processPage: mocks.processPage,
    forgetPage: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/components/tools/document-scanner/storage', () => ({
    loadSession: mocks.loadSession,
    saveBlob: vi.fn(),
    deleteBlob: vi.fn(),
    savePages: vi.fn(),
    clearSession: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/components/tools/document-scanner/pdf', () => ({
    buildPdf: mocks.buildPdf,
}))

function makePage(id: string): ScanPage {
    return {
        id,
        blob: new Blob(['x'], { type: 'image/jpeg' }),
        corners: FULL_FRAME,
        autoCorners: null,
        rotation: 0,
        filter: 'color',
        brightness: 0,
        contrast: 0,
        threshold: 12,
    }
}

async function resumeWith(ids: string[]) {
    mocks.loadSession.mockResolvedValue(ids.map(makePage))
    const user = userEvent.setup()
    render(<DocumentScanner />)
    await user.click(await screen.findByRole('button', { name: 'Resume' }))
    return user
}

describe('DocumentScanner', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.loadSession.mockResolvedValue([])
        mocks.processPage.mockResolvedValue({
            blob: new Blob(['img'], { type: 'image/jpeg' }),
            width: 100,
            height: 141,
        })
        mocks.buildPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
        Object.defineProperty(window, 'isSecureContext', {
            value: true,
            configurable: true,
        })
    })

    it('shows the start screen', async () => {
        render(<DocumentScanner />)
        expect(
            await screen.findByRole('button', { name: /start camera/i })
        ).toBeEnabled()
        expect(screen.getByText('Scan documents to PDF')).toBeInTheDocument()
    })

    it('explains when camera permission is denied', async () => {
        Object.defineProperty(navigator, 'mediaDevices', {
            value: {
                getUserMedia: vi.fn(() =>
                    Promise.reject(
                        Object.assign(new Error('denied'), {
                            name: 'NotAllowedError',
                        })
                    )
                ),
            },
            configurable: true,
        })
        const user = userEvent.setup()
        render(<DocumentScanner />)
        await user.click(
            await screen.findByRole('button', { name: /start camera/i })
        )
        expect(
            await screen.findByText('Camera permission denied')
        ).toBeInTheDocument()
    })

    it('requires a secure context for the camera', async () => {
        Object.defineProperty(window, 'isSecureContext', {
            value: false,
            configurable: true,
        })
        const user = userEvent.setup()
        render(<DocumentScanner />)
        await user.click(
            await screen.findByRole('button', { name: /start camera/i })
        )
        expect(
            await screen.findByText('Camera needs a secure connection')
        ).toBeInTheDocument()
    })

    it('restores a saved session and renders previews', async () => {
        await resumeWith(['a', 'b', 'c'])
        expect(screen.getByText('Page 1 / 3')).toBeInTheDocument()
        await waitFor(() => expect(mocks.processPage).toHaveBeenCalledTimes(3))
    })

    it('reorders, deletes and changes the filter of pages', async () => {
        const user = await resumeWith(['a', 'b'])
        await user.click(
            screen.getByRole('button', { name: 'Move page later' })
        )
        expect(screen.getByText('Page 2 / 2')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'B&W scan' }))
        expect(
            screen.getByRole('button', { name: 'B&W scan' })
        ).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByLabelText('Clean-up strength')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /delete/i }))
        expect(screen.getByText('Page 1 / 1')).toBeInTheDocument()
    })

    it('builds a PDF of all pages in order', async () => {
        const user = await resumeWith(['a', 'b'])
        await user.click(screen.getByRole('button', { name: 'B&W scan' }))
        await user.click(
            screen.getByRole('button', { name: /download pdf \(2 pages\)/i })
        )
        await waitFor(() => expect(mocks.buildPdf).toHaveBeenCalled())
        const [images, options] = mocks.buildPdf.mock.calls[0]
        expect(images.map((i: { format: string }) => i.format)).toEqual([
            'png',
            'jpeg',
        ])
        expect(options).toMatchObject({ pageSize: 'a4', dpi: 200 })
    })
})
