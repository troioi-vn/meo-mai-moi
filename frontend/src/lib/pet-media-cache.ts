import type { QueryClient } from '@tanstack/react-query'
import { invalidatePetCollectionQueries, invalidatePetPlacementQueries } from '@/lib/pet-cache'

export async function invalidatePetMediaQueries(queryClient: QueryClient, petId: number) {
  await Promise.all([
    invalidatePetCollectionQueries(queryClient),
    invalidatePetPlacementQueries(queryClient, petId),
  ])
}
