import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  idbClearAll,
  idbGet,
  idbGetMany,
  idbSet,
  resetIdbAdapterForTests,
} from './idbAdapter'

interface FakeRequestLike {
  result?: unknown
  onsuccess: (() => void) | null
  onerror: (() => void) | null
  onupgradeneeded: (() => void) | null
}

class FakeRequest implements FakeRequestLike {
  result?: unknown
  onsuccess: (() => void) | null = null
  onerror: (() => void) | null = null
  onupgradeneeded: (() => void) | null = null
}

class FakeTransaction {
  oncomplete: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  private pending = 0
  private readonly data: Map<string, unknown>
  private readonly db: FakeDatabase

  constructor(data: Map<string, unknown>, db: FakeDatabase) {
    this.data = data
    this.db = db
  }

  objectStore(): {
    put: (value: unknown, key: string) => FakeRequest
    get: (key: string) => FakeRequest
    clear: () => FakeRequest
  } {
    return {
      put: (value, key) =>
        this.enqueue(() => {
          if (this.db.failNextWrite) {
            this.db.failNextWrite = false
            return false
          }
          this.data.set(key, value)
          return true
        }),
      get: (key) => this.enqueue(() => true, this.data.get(key)),
      clear: () =>
        this.enqueue(() => {
          this.data.clear()
          return true
        }),
    }
  }

  private enqueue(action: () => boolean, result?: unknown): FakeRequest {
    const req = new FakeRequest()
    this.pending += 1
    if (this.db.mode === 'readwrite') this.db.noteWriteStart()
    queueMicrotask(() => {
      const ok = action()
      req.result = result
      if (ok) req.onsuccess?.()
      else req.onerror?.()
      this.pending -= 1
      if (this.pending === 0) {
        if (ok) this.oncomplete?.()
        else this.onerror?.()
        this.db.noteWriteEnd()
      }
    })
    return req
  }
}

class FakeDatabase {
  stores = new Map<string, Map<string, unknown>>()
  objectStoreNames = { contains: (name: string) => this.stores.has(name) }
  onversionchange: (() => void) | null = null
  closed = false
  failNextWrite = false
  mode: 'readwrite' | 'readonly' = 'readonly'
  activeWrites = 0
  maxConcurrentWrites = 0

  createObjectStore(name: string) {
    this.stores.set(name, new Map())
  }

  transaction(_name: string, mode: 'readwrite' | 'readonly') {
    this.mode = mode
    return new FakeTransaction(this.stores.get('kv')!, this)
  }

  noteWriteStart() {
    this.activeWrites += 1
    this.maxConcurrentWrites = Math.max(this.maxConcurrentWrites, this.activeWrites)
  }

  noteWriteEnd() {
    if (this.activeWrites > 0) this.activeWrites -= 1
  }

  close() {
    this.closed = true
  }
}

interface FakeIdbState {
  openCalls: number
  lastDb: FakeDatabase | null
}

function installFakeIdb(): FakeIdbState {
  const state: FakeIdbState = { openCalls: 0, lastDb: null }
  const factory = {
    open() {
      state.openCalls += 1
      const req = new FakeRequest()
      const db = new FakeDatabase()
      state.lastDb = db
      queueMicrotask(() => {
        req.result = db
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
        req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    },
  }
  vi.stubGlobal('indexedDB', factory)
  return state
}

describe('IndexedDB adapter: one connection, serialized writes, no unhandled rejections', () => {
  beforeEach(async () => {
    await resetIdbAdapterForTests()
  })

  afterEach(async () => {
    await resetIdbAdapterForTests()
    vi.unstubAllGlobals()
  })

  it('opens one long-lived connection and reuses it for reads and writes', async () => {
    const state = installFakeIdb()
    expect(await idbSet('k1', 'v1')).toBe(true)
    expect(await idbSet('k2', 42)).toBe(true)
    expect(await idbGet('k1')).toBe('v1')
    expect(await idbGet('k2')).toBe(42)
    expect(await idbGetMany(['k1', 'missing', 'k2'])).toEqual({ k1: 'v1', k2: 42 })

    expect(state.openCalls).toBe(1)
    expect(state.lastDb?.closed).toBe(false)
  })

  it('serializes concurrent writes in call order without overlapping transactions', async () => {
    const state = installFakeIdb()
    const order: number[] = []
    const p1 = idbSet('a', 1).then(() => order.push(1))
    const p2 = idbSet('b', 2).then(() => order.push(2))
    const p3 = idbSet('c', 3).then(() => order.push(3))
    await Promise.all([p1, p2, p3])

    expect(order).toEqual([1, 2, 3])
    expect(state.lastDb?.maxConcurrentWrites).toBe(1)
    expect(await idbGetMany(['a', 'b', 'c'])).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('resolves false on transaction failure and keeps the write chain usable', async () => {
    const state = installFakeIdb()
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandled)
    try {
      state.lastDb = null
      expect(await idbSet('seed', 0)).toBe(true)
      const db = state.lastDb!
      db.failNextWrite = true
      await expect(idbSet('bad', 1)).resolves.toBe(false)
      await expect(idbSet('good', 2)).resolves.toBe(true)
      expect(await idbGet('bad')).toBeUndefined()
      expect(await idbGet('good')).toBe(2)
      await Promise.resolve()
      expect(unhandled).toEqual([])
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })

  it('queues clear-all behind pending writes', async () => {
    installFakeIdb()
    await idbSet('a', 1)
    const clear = idbClearAll()
    const after = idbSet('b', 2)
    expect(await clear).toBe(true)
    expect(await after).toBe(true)
    expect(await idbGetMany(['a', 'b'])).toEqual({ b: 2 })
  })
})
