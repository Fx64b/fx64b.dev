/// <reference lib="webworker" />
/**
 * Runs OpenCV.js off the main thread. OpenCV is fetched from /vendor and
 * evaluated globally (it is a UMD script that assigns `self.cv`), which works
 * the same in Vite dev and in the production bundle.
 */
import { detectDocument, processPage } from './cv-pipeline'
import type { WorkerRequest, WorkerResponse } from './scanner-protocol'
import type { RgbaImage } from './types'

declare const self: DedicatedWorkerGlobalScope & { cv?: any }

const OPENCV_URL = '/vendor/opencv/opencv.js'

let cvPromise: Promise<any> | null = null

function loadCv(): Promise<any> {
    if (!cvPromise) {
        cvPromise = (async () => {
            const res = await fetch(OPENCV_URL)
            if (!res.ok) {
                throw new Error(`Failed to load OpenCV (${res.status})`)
            }
            // Indirect eval runs the UMD script in global scope.
            ;(0, eval)(await res.text())
            const cv = self.cv
            if (!cv.Mat) {
                await new Promise<void>((resolve) => {
                    cv.onRuntimeInitialized = () => resolve()
                })
            }
            // The Emscripten module is a thenable that resolves to itself;
            // returning it from an async function would never settle.
            delete cv.then
            return cv
        })()
        cvPromise.catch(() => {
            cvPromise = null
        })
    }
    return cvPromise
}

async function decode(
    source: Blob | ImageBitmap,
    maxSide: number
): Promise<RgbaImage> {
    const bitmap =
        source instanceof Blob
            ? await createImageBitmap(source, {
                  imageOrientation: 'from-image',
              })
            : source
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    return ctx.getImageData(0, 0, width, height)
}

// Decoding a 12 MP photo is the slowest step while tuning a page, so keep
// the most recent decodes around. Keyed by page id + size.
const decodeCache = new Map<string, Promise<RgbaImage>>()
const CACHE_LIMIT = 4
const CACHE_MAX_SIDE = 2000

function decodeCached(
    key: string,
    blob: Blob,
    maxSide: number
): Promise<RgbaImage> {
    const k = `${key}:${maxSide}`
    let entry = decodeCache.get(k)
    if (entry) {
        decodeCache.delete(k)
    } else {
        entry = decode(blob, maxSide)
        entry.catch(() => decodeCache.delete(k))
    }
    decodeCache.set(k, entry)
    while (decodeCache.size > CACHE_LIMIT) {
        decodeCache.delete(decodeCache.keys().next().value!)
    }
    return entry
}

async function encode(
    image: RgbaImage,
    type: 'image/jpeg' | 'image/png',
    quality: number
): Promise<Blob> {
    const canvas = new OffscreenCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(
        new ImageData(
            image.data as Uint8ClampedArray<ArrayBuffer>,
            image.width,
            image.height
        ),
        0,
        0
    )
    return canvas.convertToBlob({ type, quality })
}

async function handle(req: WorkerRequest): Promise<WorkerResponse> {
    const cv = await loadCv()
    switch (req.type) {
        case 'init':
            return { id: req.id, type: 'init' }
        case 'detect': {
            const image = await decode(req.source, req.maxSide)
            return { id: req.id, type: 'detect', ...detectDocument(cv, image) }
        }
        case 'process': {
            // Full-resolution export decodes are too big to keep around.
            const image =
                req.sourceMaxSide > CACHE_MAX_SIDE
                    ? await decode(req.blob, req.sourceMaxSide)
                    : await decodeCached(
                          req.pageId,
                          req.blob,
                          req.sourceMaxSide
                      )
            const out = processPage(cv, image, req.settings, req.maxSide)
            const blob = await encode(out, req.format, req.quality)
            return {
                id: req.id,
                type: 'process',
                blob,
                width: out.width,
                height: out.height,
            }
        }
        case 'forget':
            for (const key of [...decodeCache.keys()]) {
                if (key.startsWith(`${req.pageId}:`)) {
                    decodeCache.delete(key)
                }
            }
            return { id: req.id, type: 'forget' }
    }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const req = event.data
    handle(req).then(
        (res) => self.postMessage(res),
        (err: unknown) =>
            self.postMessage({
                id: req.id,
                type: 'error',
                message: err instanceof Error ? err.message : String(err),
            } satisfies WorkerResponse)
    )
}
