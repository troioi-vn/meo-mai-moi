import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGetPetsPetWeights,
  usePostPetsPetWeights,
  usePutPetsPetWeightsWeight,
  useDeletePetsPetWeightsWeight,
  getGetPetsPetWeightsQueryKey,
} from '@/api/generated/pets/pets'
import type { WeightHistory } from '@/api/generated/model'

export interface UseWeightsResult {
  items: WeightHistory[]
  page: number
  meta: unknown
  links: unknown
  loading: boolean
  error: string | null
  refresh: (page?: number) => Promise<void>
  create: (payload: { weight_kg: number; record_date: string }) => Promise<WeightHistory>
  update: (
    id: number,
    payload: Partial<{ weight_kg: number; record_date: string }>
  ) => Promise<WeightHistory>
  remove: (id: number) => Promise<boolean>
}

export const useWeights = (petId: number): UseWeightsResult => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const params = { page }
  const {
    data: queryData,
    isLoading,
    error: queryError,
  } = useGetPetsPetWeights(petId, params, {
    query: { enabled: petId > 0 },
  })

  const items = queryData?.data ?? []
  const meta = queryData?.meta ?? null
  const links = queryData?.links ?? null
  const loading = isLoading
  const error = queryError ? 'Failed to load weights' : null

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getGetPetsPetWeightsQueryKey(petId) })
  }, [queryClient, petId])

  const createMutation = usePostPetsPetWeights()
  const updateMutation = usePutPetsPetWeightsWeight()
  const deleteMutation = useDeletePetsPetWeightsWeight()

  const refresh = useCallback(
    async (pg?: number) => {
      if (pg !== undefined) setPage(pg)
      invalidate()
    },
    [invalidate]
  )

  const create = useCallback(
    async (payload: { weight_kg: number; record_date: string }) => {
      const item = await createMutation.mutateAsync({ pet: petId, data: payload })
      setPage(1)
      invalidate()
      return item
    },
    [createMutation, petId, invalidate]
  )

  const updateOne = useCallback(
    async (id: number, payload: Partial<{ weight_kg: number; record_date: string }>) => {
      const item = await updateMutation.mutateAsync({ pet: petId, weight: id, data: payload })
      invalidate()
      return item
    },
    [updateMutation, petId, invalidate]
  )

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync({ pet: petId, weight: id })
      invalidate()
      return true
    },
    [deleteMutation, petId, invalidate]
  )

  return useMemo(
    () => ({
      items,
      page,
      meta,
      links,
      loading,
      error,
      refresh,
      create,
      update: updateOne,
      remove,
    }),
    [items, page, meta, links, loading, error, refresh, create, updateOne, remove]
  )
}
