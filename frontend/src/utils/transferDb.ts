import type { PersistedTransferRecord } from '@/types/transfer'

const DB_NAME = 'archival-cloud-transfers'
const DB_VERSION = 1
const STORE_NAME = 'tasks'

export function cloneableTransferRecord(
  record: PersistedTransferRecord,
  clone: ((value: PersistedTransferRecord) => unknown) | undefined = globalThis.structuredClone,
): PersistedTransferRecord {
  if (!clone) {
    return record
  }
  try {
    clone(record)
    return record
  } catch {
    return { id: record.id, ownerId: record.ownerId, task: record.task }
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('ownerId', 'ownerId')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadTransferRecords(ownerId: number): Promise<PersistedTransferRecord[]> {
  const db = await openDb()
  if (!db) {
    return []
  }
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const index = tx.objectStore(STORE_NAME).index('ownerId')
    return await waitForRequest(index.getAll(ownerId))
  } finally {
    db.close()
  }
}

export async function saveTransferRecord(record: PersistedTransferRecord): Promise<void> {
  const db = await openDb()
  if (!db) {
    return
  }
  try {
    const payload = cloneableTransferRecord(record)
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await waitForRequest(tx.objectStore(STORE_NAME).put(payload))
  } finally {
    db.close()
  }
}

export async function deleteTransferRecord(id: string): Promise<void> {
  const db = await openDb()
  if (!db) {
    return
  }
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await waitForRequest(tx.objectStore(STORE_NAME).delete(id))
  } finally {
    db.close()
  }
}
