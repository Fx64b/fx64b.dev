/**
 * Autosaves the design in IndexedDB. IndexedDB rather than localStorage
 * because uploaded photos are stored inline and quickly exceed the ~5 MB
 * localStorage quota. Every call fails soft: without storage the tool
 * still works, it just forgets the design on reload.
 */
const DB_NAME = 'fx64b-card-sheet-designer'
const STORE = 'kv'
const KEY = 'design'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB unavailable'))
                return
            }
            const req = indexedDB.open(DB_NAME, 1)
            req.onupgradeneeded = () => req.result.createObjectStore(STORE)
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
    mode: IDBTransactionMode,
    fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    return openDb().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(STORE, mode)
                const req = fn(tx.objectStore(STORE))
                tx.oncomplete = () => resolve(req.result)
                tx.onerror = () => reject(tx.error)
                tx.onabort = () => reject(tx.error)
            })
    )
}

export async function loadSavedDesign(): Promise<unknown> {
    try {
        return await run('readonly', (s) => s.get(KEY))
    } catch {
        return undefined
    }
}

/** Resolves to false when the design could not be stored. */
export async function saveDesign(design: unknown): Promise<boolean> {
    try {
        await run('readwrite', (s) => s.put(design, KEY))
        return true
    } catch {
        return false
    }
}

export async function clearSavedDesign(): Promise<void> {
    try {
        await run('readwrite', (s) => s.delete(KEY))
    } catch {
        // ignore
    }
}
