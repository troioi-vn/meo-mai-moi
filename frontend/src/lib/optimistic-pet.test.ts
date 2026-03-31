import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { getGetPetTypesQueryKey } from '@/api/generated/pet-types/pet-types'
import {
  getGetMyPetsSectionsQueryKey,
  getGetPetsIdQueryKey,
} from '@/api/generated/pets/pets'
import {
  getCreatePetMutationOptions,
  getOptimisticDeletePetMutationOptions,
  getOptimisticUpdatePetMutationOptions,
  getOptimisticUpdatePetStatusMutationOptions,
} from './optimistic-pet'

const basePet = {
  id: 1,
  name: 'Milo',
  country: 'VN',
  description: '',
  user_id: 1,
  pet_type_id: 1,
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  pet_type: {
    id: 1,
    name: 'Cat',
    slug: 'cat',
    is_active: true,
    is_system: true,
    display_order: 1,
    placement_requests_allowed: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  user: {
    id: 1,
    name: 'Athanasius',
    email: 'athanasius@example.com',
  },
} as const

describe('optimistic-pet helpers', () => {
  it('optimistically updates pet data and rolls back on error', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(getGetMyPetsSectionsQueryKey(), { owned: [basePet] })
    queryClient.setQueryData(getGetPetsIdQueryKey(basePet.id), basePet)

    const options = getOptimisticUpdatePetMutationOptions(queryClient)
    const context = await options.onMutate({
      id: basePet.id,
      data: { ...basePet, name: 'Luna' },
    })

    expect(queryClient.getQueryData(getGetPetsIdQueryKey(basePet.id))).toEqual(
      expect.objectContaining({ name: 'Luna' })
    )

    options.onError(new Error('nope'), { id: basePet.id, data: { ...basePet, name: 'Luna' } }, context)

    expect(queryClient.getQueryData(getGetPetsIdQueryKey(basePet.id))).toEqual(basePet)
  })

  it('optimistically removes deleted pets from cached sections', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(getGetMyPetsSectionsQueryKey(), {
      owned: [basePet],
      fostering_active: [basePet],
    })
    queryClient.setQueryData(getGetPetsIdQueryKey(basePet.id), basePet)

    const options = getOptimisticDeletePetMutationOptions(queryClient)
    await options.onMutate({ id: basePet.id })

    expect(queryClient.getQueryData(getGetMyPetsSectionsQueryKey())).toEqual({
      owned: [],
      fostering_active: [],
    })
    expect(queryClient.getQueryData(getGetPetsIdQueryKey(basePet.id))).toBeUndefined()
  })

  it('optimistically updates pet status in list and detail caches', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(getGetMyPetsSectionsQueryKey(), { owned: [basePet] })
    queryClient.setQueryData(getGetPetsIdQueryKey(basePet.id), basePet)

    const options = getOptimisticUpdatePetStatusMutationOptions(queryClient)
    await options.onMutate({ id: basePet.id, data: { status: 'lost' } })

    expect(queryClient.getQueryData(getGetPetsIdQueryKey(basePet.id))).toEqual(
      expect.objectContaining({ status: 'lost' })
    )
    expect(queryClient.getQueryData(getGetMyPetsSectionsQueryKey())).toEqual({
      owned: [expect.objectContaining({ status: 'lost' })],
    })
  })

  it('invalidates pet lists after create settles', () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const options = getCreatePetMutationOptions(queryClient)
    options.onSettled()

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: getGetMyPetsSectionsQueryKey() })
  })

  it('optimistically inserts a created pet into owned pets and can replace it on success', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(getGetMyPetsSectionsQueryKey(), { owned: [] })
    queryClient.setQueryData(getGetPetTypesQueryKey(), [basePet.pet_type])

    const options = getCreatePetMutationOptions(queryClient)
    const context = await options.onMutate({
      data: {
        ...basePet,
        id: 999,
        name: 'Nori',
      },
    })

    expect(queryClient.getQueryData(getGetMyPetsSectionsQueryKey())).toEqual({
      owned: [expect.objectContaining({ id: context.optimisticPetId, name: 'Nori' })],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })

    options.onSuccess(
      {
        ...basePet,
        id: 42,
        name: 'Nori',
      },
      { data: { ...basePet, id: 999, name: 'Nori' } },
      context
    )

    expect(queryClient.getQueryData(getGetMyPetsSectionsQueryKey())).toEqual({
      owned: [expect.objectContaining({ id: 42, name: 'Nori' })],
      fostering_active: [],
      fostering_past: [],
      transferred_away: [],
    })
  })
})
