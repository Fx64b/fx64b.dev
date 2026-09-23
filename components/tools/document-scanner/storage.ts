/**
 * Keeps the current scan session in IndexedDB so a reload or a closed tab
 * doesn't lose captured pages. Photos are written once, on capture; the
 * small per-page settings list is rewritten on every change. All calls
 * fail soft: if storage is unavailable the tool just works in memory.
 */
import type { PageSettings, ScanPage } from './types'

const DB_NAME = 'fx64b-document-scanner'
const DB_VERSION = 1
const BLOBS = 'blobs'
const META = 'meta'
const PAGES_KEY = 'pages'

type StoredPage = PageSettings & { id: string }

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB unavailable'))
                return
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION)
            req.onupgradeneeded = () => {
                req.result.createObjectStore(BLOBS)
                req.result.createObjectStore(META)
            }
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        })
        dbPromise.catch(() => {
            dbPromise = null
        })
    }
    return dbPromise
}

function run<T>(
    store: string,
    mode: IDBTransactionMode,
    fn: (s: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
    return openDb().then(
        (db) =>
            new Promise((resolve, reject) => {
                const tx = db.transaction(store, mode)
                const req = fn(tx.objectStore(store))
                tx.oncomplete = () => resolve(req ? req.result : undefined)
                tx.onerror = () => reject(tx.error)
                tx.onabort = () => reject(tx.error)
            })
    )
}

const soft = <T>(p: Promise<T>) => p.catch(() => undefined)

export function saveBlob(id: string, blob: Blob) {
    return soft(run(BLOBS, 'readwrite', (s) => s.put(blob, id)))
}

export function deleteBlob(id: string) {
    return soft(run(BLOBS, 'readwrite', (s) => s.delete(id)))
}

export function savePages(pages: ScanPage[]) {
    const meta: StoredPage[] = pages.map(({ blob: _blob, ...rest }) => rest)
    return soft(run(META, 'readwrite', (s) => s.put(meta, PAGES_KEY)))
}

/** Restores the saved session, skipping pages whose photo went missing. */
export async function loadSession(): Promise<ScanPage[]> {
    try {
        const meta = (await run<StoredPage[]>(META, 'readonly', (s) =>
            s.get(PAGES_KEY)
        )) as StoredPage[] | undefined
        if (!meta?.length) {
            return []
        }
        const pages: ScanPage[] = []
        for (const m of meta) {
            const blob = (await run<Blob>(BLOBS, 'readonly', (s) =>
                s.get(m.id)
            )) as Blob | undefined
            if (blob) {
                pages.push({ ...m, blob })
            }
        }
        return pages
    } catch {
        return []
    }
}

export function clearSession() {
    return soft(
        Promise.all([
            run(BLOBS, 'readwrite', (s) => s.clear()),
            run(META, 'readwrite', (s) => s.clear()),
        ])
    )
}
