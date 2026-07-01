import type { QueryClient } from '@tanstack/react-query'
import {
  getGetMyPetsQueryKey,
  getGetMyPetsSectionsQueryKey,
  getGetPetsFeaturedQueryKey,
  getGetPetsIdQueryKey,
  getGetPetsIdViewQueryKey,
  getGetPetsPlacementRequestsQueryKey,
} from '@/api/generated/pets/pets'

export async function invalidatePetProfileQueries(queryClient: QueryClient, petId: number) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) }),
    queryClient.invalidateQueries({ queryKey: getGetPetsIdViewQueryKey(petId) }),
  ])
}

export async function invalidatePetCollectionQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetMyPetsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetMyPetsSectionsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetPetsFeaturedQueryKey() }),
  ])
}

export async function invalidatePetPlacementQueries(queryClient: QueryClient, petId: number) {
  await Promise.all([
    invalidatePetProfileQueries(queryClient, petId),
    queryClient.invalidateQueries({ queryKey: getGetPetsPlacementRequestsQueryKey() }),
  ])
}
