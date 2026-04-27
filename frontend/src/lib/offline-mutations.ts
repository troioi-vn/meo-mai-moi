import type { QueryClient, UseMutationOptions } from '@tanstack/react-query'
import type { Pet } from '@/api/generated/model'
import type { PutPetsIdStatusBody } from '@/api/generated/model/putPetsIdStatusBody'
import type { ErrorType } from '@/api/orval-mutator'
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
import {
  getCreatePetMutationOptions,
  getOptimisticDeletePetMutationOptions,
  getOptimisticUpdatePetMutationOptions,
  getOptimisticUpdatePetStatusMutationOptions,
} from '@/lib/optimistic-pet'

interface PostPetsOptions<TContext> {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof postPets>>,
    ErrorType<void>,
    { data: Pet },
    TContext
  >
}

interface PutPetsIdOptions<TContext> {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof putPetsId>>,
    ErrorType<void>,
    { id: number; data: Pet },
    TContext
  >
}

interface DeletePetsIdOptions<TContext> {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof deletePetsId>>,
    ErrorType<void>,
    { id: number },
    TContext
  >
}

interface PutPetsIdStatusOptions<TContext> {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof putPetsIdStatus>>,
    ErrorType<void>,
    { id: number; data: PutPetsIdStatusBody },
    TContext
  >
}

export const OFFLINE_PET_MUTATION_KEYS = {
  postPets: ['postPets'] as const,
  putPetsId: ['putPetsId'] as const,
  deletePetsId: ['deletePetsId'] as const,
  putPetsIdStatus: ['putPetsIdStatus'] as const,
}

const OFFLINE_PET_MUTATION_KEY_SET = new Set<string>(
  Object.values(OFFLINE_PET_MUTATION_KEYS).map((key) => key[0])
)

export async function resumeOfflinePetMutations(queryClient: QueryClient) {
  const resumableMutations = queryClient
    .getMutationCache()
    .getAll()
    .filter((mutation) => {
      const mutationKey = mutation.options.mutationKey?.[0]
      return (
        typeof mutationKey === 'string' &&
        OFFLINE_PET_MUTATION_KEY_SET.has(mutationKey) &&
        mutation.state.status === 'pending'
      )
    })

  await Promise.allSettled(resumableMutations.map((mutation) => mutation.continue()))
}

export function setupMutationDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults(OFFLINE_PET_MUTATION_KEYS.postPets, {
    ...getCreatePetMutationOptions(queryClient),
    mutationFn: ({ data }: { data: Pet }) => postPets(data),
  })

  queryClient.setMutationDefaults(OFFLINE_PET_MUTATION_KEYS.putPetsId, {
    ...getOptimisticUpdatePetMutationOptions(queryClient),
    mutationFn: ({ id, data }: { id: number; data: Pet }) => putPetsId(id, data),
  })

  queryClient.setMutationDefaults(OFFLINE_PET_MUTATION_KEYS.deletePetsId, {
    ...getOptimisticDeletePetMutationOptions(queryClient),
    mutationFn: ({ id }: { id: number }) => deletePetsId(id),
  })

  queryClient.setMutationDefaults(OFFLINE_PET_MUTATION_KEYS.putPetsIdStatus, {
    ...getOptimisticUpdatePetStatusMutationOptions(queryClient),
    mutationFn: ({ id, data }: { id: number; data: PutPetsIdStatusBody }) =>
      putPetsIdStatus(id, data),
  })
}

export function useOfflinePostPets<TContext = unknown>(options?: PostPetsOptions<TContext>) {
  return usePostPets<ErrorType<void>, TContext>({
    ...options,
    mutation: {
      ...options?.mutation,
      mutationKey: [...OFFLINE_PET_MUTATION_KEYS.postPets],
    },
  })
}

export function useOfflinePutPetsId<TContext = unknown>(options?: PutPetsIdOptions<TContext>) {
  return usePutPetsId<ErrorType<void>, TContext>({
    ...options,
    mutation: {
      ...options?.mutation,
      mutationKey: [...OFFLINE_PET_MUTATION_KEYS.putPetsId],
    },
  })
}

export function useOfflineDeletePetsId<TContext = unknown>(
  options?: DeletePetsIdOptions<TContext>
) {
  return useDeletePetsId<ErrorType<void>, TContext>({
    ...options,
    mutation: {
      ...options?.mutation,
      mutationKey: [...OFFLINE_PET_MUTATION_KEYS.deletePetsId],
    },
  })
}

export function useOfflinePutPetsIdStatus<TContext = unknown>(
  options?: PutPetsIdStatusOptions<TContext>
) {
  return usePutPetsIdStatus<ErrorType<void>, TContext>({
    ...options,
    mutation: {
      ...options?.mutation,
      mutationKey: [...OFFLINE_PET_MUTATION_KEYS.putPetsIdStatus],
    },
  })
}
