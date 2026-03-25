import type { QueryClient, UseMutationOptions } from '@tanstack/react-query'
import type { Pet } from '@/api/generated/model'
import type { PutPetsIdStatusBody } from '@/api/generated/model/putPetsIdStatusBody'
import {
  deletePetsId,
  postPets,
  putPetsId,
  putPetsIdStatus,
  useDeletePetsId,
  usePostPets,
  usePutPetsId,
  usePutPetsIdStatus,
} from '@/api/generated/pets/pets'

type PostPetsOptions = Parameters<typeof usePostPets>[0]
type PutPetsIdOptions = Parameters<typeof usePutPetsId>[0]
type DeletePetsIdOptions = Parameters<typeof useDeletePetsId>[0]
type PutPetsIdStatusOptions = Parameters<typeof usePutPetsIdStatus>[0]

export const OFFLINE_PET_MUTATION_KEYS = {
  postPets: ['postPets'] as const,
  putPetsId: ['putPetsId'] as const,
  deletePetsId: ['deletePetsId'] as const,
  putPetsIdStatus: ['putPetsIdStatus'] as const,
}

export function setupMutationDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults(OFFLINE_PET_MUTATION_KEYS.postPets, {
    mutationFn: ({ data }: { data: Pet }) => postPets(data),
  } satisfies UseMutationOptions<Awaited<ReturnType<typeof postPets>>, unknown, { data: Pet }>)

  queryClient.setMutationDefaults(OFFLINE_PET_MUTATION_KEYS.putPetsId, {
    mutationFn: ({ id, data }: { id: number; data: Pet }) => putPetsId(id, data),
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof putPetsId>>,
    unknown,
    { id: number; data: Pet }
  >)

  queryClient.setMutationDefaults(OFFLINE_PET_MUTATION_KEYS.deletePetsId, {
    mutationFn: ({ id }: { id: number }) => deletePetsId(id),
  } satisfies UseMutationOptions<Awaited<ReturnType<typeof deletePetsId>>, unknown, { id: number }>)

  queryClient.setMutationDefaults(OFFLINE_PET_MUTATION_KEYS.putPetsIdStatus, {
    mutationFn: ({ id, data }: { id: number; data: PutPetsIdStatusBody }) => putPetsIdStatus(id, data),
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof putPetsIdStatus>>,
    unknown,
    { id: number; data: PutPetsIdStatusBody }
  >)
}

export function useOfflinePostPets(options?: PostPetsOptions) {
  return usePostPets({
    ...options,
    mutation: {
      ...options?.mutation,
      mutationKey: [...OFFLINE_PET_MUTATION_KEYS.postPets],
    },
  })
}

export function useOfflinePutPetsId(options?: PutPetsIdOptions) {
  return usePutPetsId({
    ...options,
    mutation: {
      ...options?.mutation,
      mutationKey: [...OFFLINE_PET_MUTATION_KEYS.putPetsId],
    },
  })
}

export function useOfflineDeletePetsId(options?: DeletePetsIdOptions) {
  return useDeletePetsId({
    ...options,
    mutation: {
      ...options?.mutation,
      mutationKey: [...OFFLINE_PET_MUTATION_KEYS.deletePetsId],
    },
  })
}

export function useOfflinePutPetsIdStatus(options?: PutPetsIdStatusOptions) {
  return usePutPetsIdStatus({
    ...options,
    mutation: {
      ...options?.mutation,
      mutationKey: [...OFFLINE_PET_MUTATION_KEYS.putPetsIdStatus],
    },
  })
}
