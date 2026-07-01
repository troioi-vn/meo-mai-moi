import { clearCachedAuthIdentity } from '@/lib/auth-identity-cache'
import { clearMediaUploadQueue } from '@/lib/media-upload-queue'
import { clearOfflineCache } from '@/lib/query-cache'
import { clearOperations } from '@/offline/operations'

/**
 * Clears all private offline stores for the signed-in user.
 * Called on logout, account deletion, 401 cleanup, and authenticated user switch.
 */
export async function clearAuthenticatedOfflineData(): Promise<void> {
  await clearOfflineCache()
  await clearMediaUploadQueue()
  await clearOperations()
  clearCachedAuthIdentity()
}
