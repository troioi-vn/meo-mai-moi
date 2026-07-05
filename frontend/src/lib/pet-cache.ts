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

export function removePetProfileQueries(queryClient: QueryClient, petId: number) {
  queryClient.removeQueries({ queryKey: getGetPetsIdQueryKey(petId) })
  queryClient.removeQueries({ queryKey: getGetPetsIdViewQueryKey(petId) })
  queryClient.removeQueries({
    predicate: (query) => {
      const key = query.queryKey[0]
      return typeof key === 'string' && key.startsWith(`/pets/${String(petId)}/`)
    },
  })
}

export async function invalidatePetCollectionQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetMyPetsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetMyPetsSectionsQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getGetPetsFeaturedQueryKey() }),
  ])
}

export async function forgetLeftPet(queryClient: QueryClient, petId: number) {
  removePetProfileQueries(queryClient, petId)
  await invalidatePetCollectionQueries(queryClient)
}

export async function invalidatePetPlacementQueries(queryClient: QueryClient, petId: number) {
  await Promise.all([
    invalidatePetProfileQueries(queryClient, petId),
    queryClient.invalidateQueries({ queryKey: getGetPetsPlacementRequestsQueryKey() }),
  ])
}
