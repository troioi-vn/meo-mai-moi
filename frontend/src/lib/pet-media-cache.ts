import type { QueryClient } from '@tanstack/react-query'
import {
  getGetMyPetsQueryKey,
  getGetMyPetsSectionsQueryKey,
  getGetPetsFeaturedQueryKey,
  getGetPetsIdQueryKey,
  getGetPetsIdViewQueryKey,
  getGetPetsPlacementRequestsQueryKey,
} from '@/api/generated/pets/pets'

export async function invalidatePetMediaQueries(queryClient: QueryClient, petId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) }),
    queryClient.invalidateQueries({ queryKey: getGetPetsIdViewQueryKey(petId) }),
    queryClient.invalidateQueries({ queryKey: getGetMyPetsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetMyPetsSectionsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetPetsFeaturedQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetPetsPlacementRequestsQueryKey() }),
  ])
}
