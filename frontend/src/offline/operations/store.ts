import { clear, createStore, del, entries, set } from 'idb-keyval'
import { createListenerHub, generateQueueId } from '@/offline/queue-core'
import type {
  EnqueueOperationInput,
  OfflineOperation,
  OfflineOperationPatch,
  OfflineOperationStatus,
} from './types'

const PENDING_OPERATION_STATUSES = new Set<OfflineOperationStatus>([
  'pending',
  'syncing',
  'failed',
  'conflicted',
])

const ISSUE_OPERATION_STATUSES = new Set<OfflineOperationStatus>(['failed', 'conflicted'])

const store = createStore('meo-offline-operations', 'items')
const operations = new Map<string, OfflineOperation>()
const listenerHub = createListenerHub()
let initialized = false
let initializing: Promise<void> | null = null

async function ensureInitialized() {
  if (initialized) return
  if (initializing) return initializing

  initializing = (async () => {
    const storedOperations = await entries<string, OfflineOperation>(store)
    operations.clear()
    for (const [id, operation] of storedOperations) {
      operations.set(
        id,
        operation.status === 'syncing' ? { ...operation, status: 'pending' } : operation
      )
    }
    initialized = true
    listenerHub.notify()
  })()

  return initializing
}

const persistOperation = async (operation: OfflineOperation) => {
  operations.set(operation.id, operation)
  await set(operation.id, operation, store)
  listenerHub.notify()
}

export async function enqueueOperation(input: EnqueueOperationInput): Promise<string> {
  await ensureInitialized()

  const now = Date.now()
  const operation: OfflineOperation = {
    id: generateQueueId(),
    idempotencyKey: input.idempotencyKey,
    entityType: input.entityType,
    entityId: input.entityId,
    localEntityId: input.localEntityId,
    operation: input.operation,
    payload: input.payload,
    baseVersion: input.baseVersion,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  }

  await persistOperation(operation)

  return operation.id
}

export async function listOperations(): Promise<OfflineOperation[]> {
  await ensureInitialized()
  return [...operations.values()].sort((left, right) => left.createdAt - right.createdAt)
}

export function initializeOperationsStore(): Promise<void> {
  return ensureInitialized()
}

export async function getOperation(id: string): Promise<OfflineOperation | undefined> {
  await ensureInitialized()
  return operations.get(id)
}

export async function updateOperation(
  id: string,
  patch: OfflineOperationPatch
): Promise<OfflineOperation | undefined> {
  await ensureInitialized()

  const existing = operations.get(id)
  if (!existing) return undefined

  const updated: OfflineOperation = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }

  await persistOperation(updated)

  return updated
}

export async function removeOperation(id: string): Promise<void> {
  await ensureInitialized()
  if (!operations.has(id)) return

  operations.delete(id)
  await del(id, store)
  listenerHub.notify()
}

export async function clearOperations(): Promise<void> {
  await awaitStoreInitialization()
  operations.clear()
  initialized = false
  initializing = null
  await clear(store)
  listenerHub.notify()
}

export function subscribe(listener: () => void) {
  void ensureInitialized()

  return listenerHub.subscribe(listener)
}

export function getOperationCountSnapshot(): number {
  return operations.size
}

export function getPendingOperationCountSnapshot(): number {
  let count = 0
  for (const operation of operations.values()) {
    if (PENDING_OPERATION_STATUSES.has(operation.status)) {
      count++
    }
  }
  return count
}

export function getOperationIssuesSnapshot(): OfflineOperation[] {
  return [...operations.values()]
    .filter((operation) => ISSUE_OPERATION_STATUSES.has(operation.status))
    .sort((left, right) => right.updatedAt - left.updatedAt)
}

export function getOperationIssueCountSnapshot(): number {
  let count = 0
  for (const operation of operations.values()) {
    if (ISSUE_OPERATION_STATUSES.has(operation.status)) {
      count++
    }
  }
  return count
}

async function awaitStoreInitialization() {
  if (!initializing) return

  try {
    await initializing
  } catch {
    // Prior init failed; continue with clear.
  }
}

async function resetStoreState(options: { clearListeners: boolean }) {
  await awaitStoreInitialization()
  operations.clear()
  if (options.clearListeners) {
    listenerHub.clear()
  }
  initialized = false
  initializing = null
  await clear(store)
  listenerHub.notify()
}

export async function resetOperationsStoreForTests(): Promise<void> {
  await resetStoreState({ clearListeners: true })
}

/** Clears in-memory state only; IndexedDB data remains for persistence tests. */
export async function resetOperationsStoreMemoryForTests(): Promise<void> {
  await awaitStoreInitialization()
  operations.clear()
  listenerHub.clear()
  initialized = false
  initializing = null
}
