/**
 * Zero-dependency IndexedDB key-value & recovery adapter (`kalorishomar_db`).
 * Provides non-blocking writes AND batch startup hydration (`idbGetMany`) so
 * multi-year meal histories survive browser localStorage evictions cleanly.
 *
 * A single long-lived connection is reused for every operation. Writes are
 * serialized through a promise chain: concurrent read-write transactions on
 * the same store can otherwise land out of order and resurrect stale data.
 */
const IDB_NAME = 'kalorishomar_db'
const IDB_VERSION = 1
const STORE_NAME = 'kv'

let connectionPromise: Promise<IDBDatabase | null> | null = null
let activeDb: IDBDatabase | null = null
let writeTail: Promise<void> = Promise.resolve()

function openConnection(): Promise<IDBDatabase | null> {
  if (connectionPromise) return connectionPromise
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  const pending = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })

  // Cache one connection for the lifetime of the page. A failed open is not
  // cached so a later operation can retry instead of being broken forever.
  connectionPromise = pending.then((db) => {
    if (!db) {
      connectionPromise = null
      return null
    }
    activeDb = db
    db.onversionchange = () => {
      db.close()
      if (activeDb === db) activeDb = null
      connectionPromise = null
    }
    return db
  })
  return connectionPromise
}

function getDb(): Promise<IDBDatabase | null> {
  return openConnection()
}

/** Serializes write transactions and guarantees the returned promise never rejects. */
function enqueueWrite<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  const result = writeTail.then(task, task)
  writeTail = result.then(
    () => undefined,
    () => undefined,
  )
  return result.catch(() => fallback)
}

function runWriteTransaction(write: (store: IDBObjectStore) => void): Promise<boolean> {
  return (async () => {
    const db = await getDb()
    if (!db) return false
    return new Promise<boolean>((resolve) => {
      let settled = false
      const finish = (ok: boolean) => {
        if (settled) return
        settled = true
        resolve(ok)
      }
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        write(tx.objectStore(STORE_NAME))
        tx.oncomplete = () => finish(true)
        tx.onerror = () => finish(false)
        tx.onabort = () => finish(false)
      } catch {
        finish(false)
      }
    })
  })()
}

export function idbSet<T>(key: string, value: T): Promise<boolean> {
  return enqueueWrite(() => runWriteTransaction((store) => store.put(value, key)), false)
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await getDb()
  if (!db) return undefined
  return new Promise<T | undefined>((resolve) => {
    let settled = false
    const finish = (value?: T) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => finish(req.result as T | undefined)
      req.onerror = () => finish(undefined)
      tx.onerror = () => finish(undefined)
      tx.onabort = () => finish(undefined)
    } catch {
      finish(undefined)
    }
  })
}

/** Reads multiple keys in a single readonly IndexedDB transaction for fast startup recovery. */
export async function idbGetMany(keys: readonly string[]): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  const db = await getDb()
  if (!db) return out
  return new Promise<Record<string, unknown>>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve(out)
    }
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      for (const k of keys) {
        const req = store.get(k)
        req.onsuccess = () => {
          if (req.result !== undefined) out[k] = req.result
        }
      }
      tx.oncomplete = finish
      tx.onerror = finish
      tx.onabort = finish
    } catch {
      finish()
    }
  })
}

export function idbClearAll(): Promise<boolean> {
  return enqueueWrite(() => runWriteTransaction((store) => store.clear()), false)
}

/**
 * Test-only helper: closes the cached connection and drains the write chain so
 * each test starts from a clean adapter without affecting production code.
 */
export function resetIdbAdapterForTests(): Promise<void> {
  const pending = writeTail
  if (activeDb) {
    activeDb.onversionchange = null
    activeDb.close()
    activeDb = null
  }
  connectionPromise = null
  writeTail = Promise.resolve()
  return pending.then(
    () => undefined,
    () => undefined,
  )
}
