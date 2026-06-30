import { QueryClient } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import {
  getGetMyPetsQueryKey,
  getGetMyPetsSectionsQueryKey,
  getGetPetsFeaturedQueryKey,
  getGetPetsIdQueryKey,
  getGetPetsIdViewQueryKey,
  getGetPetsPlacementRequestsQueryKey,
} from '@/api/generated/pets/pets'
import {
  invalidatePetCollectionQueries,
  invalidatePetPlacementQueries,
  invalidatePetProfileQueries,
} from './pet-cache'
import { invalidatePetMediaQueries } from './pet-media-cache'

describe('pet-cache', () => {
  let queryClient: QueryClient
  let invalidateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    queryClient = new QueryClient()
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()
  })

  describe('invalidatePetProfileQueries', () => {
    it('invalidates authenticated and public pet detail queries', async () => {
      await invalidatePetProfileQueries(queryClient, 42)

      expect(invalidateSpy).toHaveBeenCalledTimes(2)
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsIdQueryKey(42),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsIdViewQueryKey(42),
      })
    })
  })

  describe('invalidatePetCollectionQueries', () => {
    it('invalidates pet list and discovery queries', async () => {
      await invalidatePetCollectionQueries(queryClient)

      expect(invalidateSpy).toHaveBeenCalledTimes(3)
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetMyPetsQueryKey(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetMyPetsSectionsQueryKey(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsFeaturedQueryKey(),
      })
    })
  })

  describe('invalidatePetPlacementQueries', () => {
    it('invalidates pet profile and placement listing queries', async () => {
      await invalidatePetPlacementQueries(queryClient, 7)

      expect(invalidateSpy).toHaveBeenCalledTimes(3)
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsIdQueryKey(7),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsIdViewQueryKey(7),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsPlacementRequestsQueryKey(),
      })
    })
  })

  describe('invalidatePetMediaQueries', () => {
    it('invalidates collection, profile, and placement listing queries', async () => {
      await invalidatePetMediaQueries(queryClient, 9)

      expect(invalidateSpy).toHaveBeenCalledTimes(6)
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsIdQueryKey(9),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsIdViewQueryKey(9),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetMyPetsQueryKey(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetMyPetsSectionsQueryKey(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsFeaturedQueryKey(),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: getGetPetsPlacementRequestsQueryKey(),
      })
    })
  })
})
