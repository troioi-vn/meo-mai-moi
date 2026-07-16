import { useGetMyPetsSections } from '@/api/generated/pets/pets'
import { useMyPetsSections } from '@/api/groups'
import { useAuth } from '@/hooks/use-auth'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useProjectedPetSections } from '@/hooks/use-projected-pets'

/**
 * Unified offline pet session detection for nav, routing, and My Pets.
 * When offline with persisted my-pets cache, treat the user as having a pet session
 * even if live auth revalidation has not completed.
 *
 * Group context filtering is online-only: when `groupId` is set and the user is
 * offline, callers should fall back to All pets (pass groupId=null).
 */
export function useOfflinePetSession(groupId?: number | null) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const isOnline = useNetworkStatus()
  const effectiveGroupId = isOnline ? (groupId ?? null) : null

  const allSectionsQuery = useGetMyPetsSections(undefined, {
    query: {
      enabled: !authLoading && (isAuthenticated || !isOnline) && effectiveGroupId == null,
    },
  })

  const groupSectionsQuery = useMyPetsSections(
    effectiveGroupId,
    !authLoading && isAuthenticated && isOnline && effectiveGroupId != null
  )

  const sectionsQuery = effectiveGroupId != null ? groupSectionsQuery : allSectionsQuery
  const projectedSectionsQuery = useProjectedPetSections(
    sectionsQuery as ReturnType<typeof useGetMyPetsSections>
  )

  const canBrowsePetsOffline = !isOnline && Boolean(projectedSectionsQuery.data)
  const hasOfflinePetSession = isAuthenticated || canBrowsePetsOffline

  return {
    canBrowsePetsOffline,
    hasOfflinePetSession,
    isOnline,
    effectiveGroupId,
    ...projectedSectionsQuery,
  }
}
