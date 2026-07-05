import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useDeletePetsPetMicrochipsMicrochip,
  useGetPetsPetMicrochips,
  usePostPetsPetMicrochips,
  usePutPetsPetMicrochipsMicrochip,
} from '@/api/generated/pets/pets'
import type { PetMicrochip } from '@/api/generated/model'
import { invalidatePetMicrochips } from '@/lib/health-record-cache'

export interface UseMicrochipsResult {
  items: PetMicrochip[]
  page: number
  meta: unknown
  links: unknown
  loading: boolean
  error: string | null
  refresh: (page?: number) => Promise<void>
  create: (payload: {
    chip_number: string
    issuer?: string | null
    implanted_at?: string | null
  }) => Promise<PetMicrochip>
  update: (
    id: number,
    payload: Partial<{ chip_number: string; issuer?: string | null; implanted_at?: string | null }>
  ) => Promise<PetMicrochip>
  remove: (id: number) => Promise<boolean>
}

export const useMicrochips = (petId: number): UseMicrochipsResult => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const params = { page }
  const {
    data: queryData,
    isLoading,
    isError,
  } = useGetPetsPetMicrochips(petId, params, {
    query: { enabled: petId > 0 },
  })

  const items = useMemo(() => queryData?.data ?? [], [queryData])
  const meta = queryData?.meta ?? null
  const links = queryData?.links ?? null
  const loading = isLoading
  const error = isError ? 'Failed to load microchips' : null

  const createMutation = usePostPetsPetMicrochips()
  const updateMutation = usePutPetsPetMicrochipsMicrochip()
  const deleteMutation = useDeletePetsPetMicrochipsMicrochip()

  const invalidate = useCallback(() => {
    return invalidatePetMicrochips(queryClient, petId)
  }, [queryClient, petId])

  const refresh = useCallback(
    async (pg?: number) => {
      if (pg !== undefined) setPage(pg)
      await invalidate()
    },
    [invalidate]
  )

  const create = useCallback(
    async (payload: {
      chip_number: string
      issuer?: string | null
      implanted_at?: string | null
    }) => {
      const item = await createMutation.mutateAsync({
        pet: petId,
        data: {
          chip_number: payload.chip_number,
          issuer: payload.issuer ?? undefined,
          implanted_at: payload.implanted_at ?? undefined,
        },
      })
      setPage(1)
      await invalidate()
      return item
    },
    [createMutation, invalidate, petId]
  )

  const updateOne = useCallback(
    async (
      id: number,
      payload: Partial<{
        chip_number: string
        issuer?: string | null
        implanted_at?: string | null
      }>
    ) => {
      const item = await updateMutation.mutateAsync({
        pet: petId,
        microchip: id,
        data: {
          chip_number: payload.chip_number,
          issuer: payload.issuer ?? undefined,
          implanted_at: payload.implanted_at ?? undefined,
        },
      })
      await invalidate()
      return item
    },
    [invalidate, petId, updateMutation]
  )

  const remove = useCallback(
    async (id: number) => {
      await deleteMutation.mutateAsync({ pet: petId, microchip: id })
      await invalidate()
      return true
    },
    [deleteMutation, invalidate, petId]
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
