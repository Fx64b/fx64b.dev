import type { Detection } from './cv-pipeline'
import type { WorkerRequest, WorkerResponse } from './scanner-protocol'
import type { PageSettings } from './types'

type Pending = {
    resolve: (res: WorkerResponse) => void
    reject: (err: Error) => void
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('./scanner.worker.ts', import.meta.url), {
            type: 'module',
        })
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const res = event.data
            const p = pending.get(res.id)
            if (!p) {
                return
            }
            pending.delete(res.id)
            if (res.type === 'error') {
                p.reject(new Error(res.message))
            } else {
                p.resolve(res)
            }
        }
        worker.onerror = (event) => {
            const err = new Error(event.message || 'Scanner worker failed')
            for (const p of pending.values()) {
                p.reject(err)
            }
            pending.clear()
            worker?.terminate()
            worker = null
        }
    }
    return worker
}

type DistributiveOmit<T, K extends keyof any> = T extends unknown
    ? Omit<T, K>
    : never

function call<T extends WorkerResponse['type']>(
    req: DistributiveOmit<WorkerRequest, 'id'> & { type: T },
    transfer: Transferable[] = []
): Promise<Extract<WorkerResponse, { type: T }>> {
    const id = nextId++
    return new Promise((resolve, reject) => {
        pending.set(id, {
            resolve: resolve as (res: WorkerResponse) => void,
            reject,
        })
        getWorker().postMessage({ ...req, id }, transfer)
    })
}

/** Loads OpenCV in the worker; resolves once it is ready. */
export async function initScanner(): Promise<void> {
    await call({ type: 'init' })
}

export async function detect(
    source: Blob | ImageBitmap,
    maxSide = 640
): Promise<Detection> {
    const { quad, area, signature } = await call(
        { type: 'detect', source, maxSide },
        source instanceof ImageBitmap ? [source] : []
    )
    return { quad, area, signature }
}

export interface ProcessOptions {
    sourceMaxSide: number
    maxSide: number
    format: 'image/jpeg' | 'image/png'
    quality: number
}

export async function processPage(
    pageId: string,
    blob: Blob,
    settings: PageSettings,
    options: ProcessOptions
): Promise<{ blob: Blob; width: number; height: number }> {
    const res = await call({
        type: 'process',
        pageId,
        blob,
        settings,
        ...options,
    })
    return { blob: res.blob, width: res.width, height: res.height }
}

export async function forgetPage(pageId: string): Promise<void> {
    if (worker) {
        await call({ type: 'forget', pageId })
    }
}
