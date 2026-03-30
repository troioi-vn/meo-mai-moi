import type { QueryClient, UseMutationOptions } from '@tanstack/react-query'
import type { Pet } from '@/api/generated/model'
import type { PetSectionsResponse } from '@/api/generated/model/petSectionsResponse'
import type { PutPetsIdStatusBody } from '@/api/generated/model/putPetsIdStatusBody'
import type { PetType } from '@/api/generated/model/petType'
import { getGetPetTypesQueryKey } from '@/api/generated/pet-types/pet-types'
import {
  deletePetsId,
  getGetMyPetsSectionsQueryKey,
  getGetPetsIdQueryKey,
  postPets,
  putPetsId,
  putPetsIdStatus,
} from '@/api/generated/pets/pets'

type PetMutationContext = {
  previousSections?: PetSectionsResponse
  previousPet?: Pet
}

type CreatePetMutationContext = {
  previousSections?: PetSectionsResponse
  optimisticPetId: number
}

let nextOptimisticPetId = -1

const mergePet = (pet: Pet, updates: Partial<Pet>): Pet => ({
  ...pet,
  ...updates,
})

const updateSectionsPet = (
  sections: PetSectionsResponse | undefined,
  updater: (pet: Pet) => Pet
): PetSectionsResponse | undefined => {
  if (!sections) return sections

  return {
    ...sections,
    owned: sections.owned?.map(updater),
    fostering_active: sections.fostering_active?.map(updater),
    fostering_past: sections.fostering_past?.map(updater),
    transferred_away: sections.transferred_away?.map(updater),
  }
}

const removeSectionsPet = (
  sections: PetSectionsResponse | undefined,
  petId: number
): PetSectionsResponse | undefined => {
  if (!sections) return sections

  return {
    ...sections,
    owned: sections.owned?.filter((pet) => pet.id !== petId),
    fostering_active: sections.fostering_active?.filter((pet) => pet.id !== petId),
    fostering_past: sections.fostering_past?.filter((pet) => pet.id !== petId),
    transferred_away: sections.transferred_away?.filter((pet) => pet.id !== petId),
  }
}

const replaceSectionsPet = (
  sections: PetSectionsResponse | undefined,
  petId: number,
  replacement: Pet
): PetSectionsResponse | undefined => {
  if (!sections) return sections

  return {
    ...sections,
    owned: sections.owned?.map((pet) => (pet.id === petId ? replacement : pet)),
    fostering_active: sections.fostering_active?.map((pet) => (pet.id === petId ? replacement : pet)),
    fostering_past: sections.fostering_past?.map((pet) => (pet.id === petId ? replacement : pet)),
    transferred_away: sections.transferred_away?.map((pet) => (pet.id === petId ? replacement : pet)),
  }
}

const getPetMutationContext = async (
  queryClient: QueryClient,
  petId: number
): Promise<PetMutationContext> => {
  const sectionsKey = getGetMyPetsSectionsQueryKey()
  const petKey = getGetPetsIdQueryKey(petId)

  await Promise.all([
    queryClient.cancelQueries({ queryKey: sectionsKey }),
    queryClient.cancelQueries({ queryKey: petKey }),
  ])

  return {
    previousSections: queryClient.getQueryData<PetSectionsResponse>(sectionsKey),
    previousPet: queryClient.getQueryData<Pet>(petKey),
  }
}

const getOptimisticPetType = (queryClient: QueryClient, petTypeId: number): PetType | undefined => {
  const petTypes = queryClient.getQueryData<PetType[]>(getGetPetTypesQueryKey())
  return petTypes?.find((petType) => petType.id === petTypeId)
}

const buildOptimisticCreatedPet = (
  queryClient: QueryClient,
  petId: number,
  payload: Pet
): Pet => {
  const timestamp = new Date().toISOString()

  return {
    id: petId,
    name: payload.name,
    sex: payload.sex,
    birthday: payload.birthday ?? null,
    birthday_year: payload.birthday_year ?? null,
    birthday_month: payload.birthday_month ?? null,
    birthday_day: payload.birthday_day ?? null,
    birthday_precision: payload.birthday_precision,
    country: payload.country,
    state: payload.state ?? null,
    address: payload.address ?? null,
    description: payload.description,
    status: payload.status ?? 'active',
    created_by: payload.created_by ?? 0,
    user_id: payload.user_id ?? 0,
    pet_type_id: payload.pet_type_id,
    photo_url: payload.photo_url ?? null,
    photos: payload.photos ?? [],
    pet_type: payload.pet_type ?? getOptimisticPetType(queryClient, payload.pet_type_id),
    city: payload.city ?? null,
    categories: payload.categories ?? [],
    user: payload.user ?? {
      id: 0,
      name: '',
      email: '',
    },
    viewer_permissions: payload.viewer_permissions ?? {
      can_edit: true,
      can_delete: true,
      is_owner: true,
    },
    relationships: payload.relationships ?? [],
    placement_requests: payload.placement_requests ?? [],
  }
}

const rollbackPetContext = (queryClient: QueryClient, petId: number, context?: PetMutationContext) => {
  if (!context) return

  queryClient.setQueryData(getGetMyPetsSectionsQueryKey(), context.previousSections)
  queryClient.setQueryData(getGetPetsIdQueryKey(petId), context.previousPet)
}

const invalidatePetQueries = (queryClient: QueryClient, petId?: number) => {
  void queryClient.invalidateQueries({ queryKey: getGetMyPetsSectionsQueryKey() })
  if (typeof petId === 'number') {
    void queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) })
  }
}

export function getCreatePetMutationOptions(queryClient: QueryClient) {
  return {
    onMutate: async ({ data }: { data: Pet }) => {
      const sectionsKey = getGetMyPetsSectionsQueryKey()
      await queryClient.cancelQueries({ queryKey: sectionsKey })

      const optimisticPetId = nextOptimisticPetId--
      const optimisticPet = buildOptimisticCreatedPet(queryClient, optimisticPetId, data)
      const previousSections = queryClient.getQueryData<PetSectionsResponse>(sectionsKey)

      queryClient.setQueryData<PetSectionsResponse | undefined>(sectionsKey, (current) => ({
        ...current,
        owned: [optimisticPet, ...(current?.owned ?? [])],
        fostering_active: current?.fostering_active ?? [],
        fostering_past: current?.fostering_past ?? [],
        transferred_away: current?.transferred_away ?? [],
      }))

      return { previousSections, optimisticPetId }
    },
    onError: (_error: unknown, _variables: { data: Pet }, context?: CreatePetMutationContext) => {
      queryClient.setQueryData(getGetMyPetsSectionsQueryKey(), context?.previousSections)
    },
    onSuccess: (createdPet: Pet, _variables: { data: Pet }, context?: CreatePetMutationContext) => {
      if (!context) return

      queryClient.setQueryData<PetSectionsResponse | undefined>(
        getGetMyPetsSectionsQueryKey(),
        (current) => replaceSectionsPet(current, context.optimisticPetId, createdPet)
      )
    },
    onSettled: () => {
      invalidatePetQueries(queryClient)
    },
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof postPets>>,
    unknown,
    { data: Pet },
    CreatePetMutationContext
  >
}

export function getOptimisticUpdatePetMutationOptions(queryClient: QueryClient) {
  return {
    onMutate: async ({ id, data }: { id: number; data: Pet }) => {
      const context = await getPetMutationContext(queryClient, id)

      queryClient.setQueryData<PetSectionsResponse | undefined>(
        getGetMyPetsSectionsQueryKey(),
        (current) =>
          updateSectionsPet(current, (pet) => (pet.id === id ? mergePet(pet, data) : pet))
      )
      queryClient.setQueryData<Pet | undefined>(getGetPetsIdQueryKey(id), (current) =>
        current ? mergePet(current, data) : current
      )

      return context
    },
    onError: (_error: unknown, variables: { id: number }, context?: PetMutationContext) => {
      rollbackPetContext(queryClient, variables.id, context)
    },
    onSettled: (_data: unknown, _error: unknown, variables: { id: number }) => {
      invalidatePetQueries(queryClient, variables.id)
    },
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof putPetsId>>,
    unknown,
    { id: number; data: Pet },
    PetMutationContext
  >
}

export function getOptimisticDeletePetMutationOptions(queryClient: QueryClient) {
  return {
    onMutate: async ({ id }: { id: number }) => {
      const context = await getPetMutationContext(queryClient, id)

      queryClient.setQueryData<PetSectionsResponse | undefined>(
        getGetMyPetsSectionsQueryKey(),
        (current) => removeSectionsPet(current, id)
      )
      queryClient.removeQueries({ queryKey: getGetPetsIdQueryKey(id), exact: true })

      return context
    },
    onError: (_error: unknown, variables: { id: number }, context?: PetMutationContext) => {
      rollbackPetContext(queryClient, variables.id, context)
    },
    onSettled: (_data: unknown, _error: unknown, variables: { id: number }) => {
      invalidatePetQueries(queryClient, variables.id)
    },
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof deletePetsId>>,
    unknown,
    { id: number },
    PetMutationContext
  >
}

export function getOptimisticUpdatePetStatusMutationOptions(queryClient: QueryClient) {
  return {
    onMutate: async ({ id, data }: { id: number; data: PutPetsIdStatusBody }) => {
      const context = await getPetMutationContext(queryClient, id)

      queryClient.setQueryData<PetSectionsResponse | undefined>(
        getGetMyPetsSectionsQueryKey(),
        (current) =>
          updateSectionsPet(current, (pet) =>
            pet.id === id ? mergePet(pet, { status: data.status as Pet['status'] }) : pet
          )
      )
      queryClient.setQueryData<Pet | undefined>(getGetPetsIdQueryKey(id), (current) =>
        current ? mergePet(current, { status: data.status as Pet['status'] }) : current
      )

      return context
    },
    onError: (_error: unknown, variables: { id: number }, context?: PetMutationContext) => {
      rollbackPetContext(queryClient, variables.id, context)
    },
    onSettled: (_data: unknown, _error: unknown, variables: { id: number }) => {
      invalidatePetQueries(queryClient, variables.id)
    },
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof putPetsIdStatus>>,
    unknown,
    { id: number; data: PutPetsIdStatusBody },
    PetMutationContext
  >
}
