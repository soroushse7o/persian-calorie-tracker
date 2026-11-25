/**
 * Zero-dependency IndexedDB key-value & recovery adapter (`kalorishomar_db`).
 * Provides non-blocking writes AND batch startup hydration (`idbGetMany`) so
 * multi-year meal histories survive browser localStorage evictions cleanly.
 */
const IDB_NAME = 'kalorishomar_db'
const IDB_VERSION = 1
const STORE_NAME = 'kv'

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
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
    } catch {
      resolve(null)
    }
  })
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  const db = await openDatabase()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(value, key)
      tx.oncomplete = () => {
        db.close()
        resolve(true)
      }
      tx.onerror = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase()
  if (!db) return undefined
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => {
        db.close()
        resolve(req.result as T | undefined)
      }
      req.onerror = () => {
        db.close()
        resolve(undefined)
      }
    } catch {
      db.close()
      resolve(undefined)
    }
  })
}

/** Reads multiple keys in a single readonly IndexedDB transaction for fast startup recovery. */
export async function idbGetMany(keys: readonly string[]): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  const db = await openDatabase()
  if (!db) return out
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      for (const k of keys) {
        const req = store.get(k)
        req.onsuccess = () => {
          if (req.result !== undefined) {
            out[k] = req.result
          }
        }
      }
      tx.oncomplete = () => {
        db.close()
        resolve(out)
      }
      tx.onerror = () => {
        db.close()
        resolve(out)
      }
    } catch {
      db.close()
      resolve(out)
    }
  })
}

export async function idbClearAll(): Promise<boolean> {
  const db = await openDatabase()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      tx.oncomplete = () => {
        db.close()
        resolve(true)
      }
      tx.onerror = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}
