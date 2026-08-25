import type { QueryClient } from '@tanstack/react-query'
import { flushPersistedQueryCache } from '@/lib/query-cache'
import { removeOperation, type OfflineOperation } from '@/offline/operations'
import { handleReplayOperationError } from './replay-operation-error'

/**
 * Hand a replayed operation over to the server-backed cache.
 *
 * The order matters. Dropping the queued operation first leaves a window where
 * the optimistic copy is gone but the refreshed list has not reached IndexedDB
 * yet; a reload in that window restores the pre-write cache, which is still
 * inside `staleTime`, so nothing refetches and the record disappears. Refresh,
 * flush, then remove: a reload before the flush still projects the record from
 * the queue, and one after it reads the record from the persisted cache.
 *
 * Never throws, so callers can use it from inside their own error handling.
 */
export async function finalizeReplayedOperation(
  queryClient: QueryClient,
  operation: OfflineOperation,
  refreshCaches: () => Promise<void>
): Promise<void> {
  try {
    await refreshCaches()
  } catch (error) {
    // The write landed but the cache did not. Leave the operation queued so the
    // next pass retries it; the idempotency key keeps that a server-side no-op.
    await handleReplayOperationError(operation, error)
    return
  }

  await flushPersistedQueryCache(queryClient)
  await removeOperation(operation.id)
}
