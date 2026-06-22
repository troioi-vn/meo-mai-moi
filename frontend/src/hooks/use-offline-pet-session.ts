import { useGetMyPetsSections } from '@/api/generated/pets/pets'
import { useAuth } from '@/hooks/use-auth'
import { useNetworkStatus } from '@/hooks/use-network-status'

/**
 * Unified offline pet session detection for nav, routing, and My Pets.
 * When offline with persisted my-pets cache, treat the user as having a pet session
 * even if live auth revalidation has not completed.
 */
export function useOfflinePetSession() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const isOnline = useNetworkStatus()

  const sectionsQuery = useGetMyPetsSections({
    query: {
      enabled: !authLoading && (isAuthenticated || !isOnline),
    },
  })

  const canBrowsePetsOffline = !isOnline && Boolean(sectionsQuery.data)
  const hasOfflinePetSession = isAuthenticated || canBrowsePetsOffline

  return {
    canBrowsePetsOffline,
    hasOfflinePetSession,
    ...sectionsQuery,
  }
}
