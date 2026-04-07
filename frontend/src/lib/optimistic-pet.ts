import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import type { Pet } from "@/api/generated/model";
import type { PutPetsIdStatusBody } from "@/api/generated/model/putPetsIdStatusBody";
import {
  deletePetsId,
  getGetMyPetsSectionsQueryKey,
  getGetPetsIdQueryKey,
  postPets,
  putPetsId,
  putPetsIdStatus,
} from "@/api/generated/pets/pets";

interface PetSectionsResponse {
  owned?: Pet[];
  fostering_active?: Pet[];
  fostering_past?: Pet[];
  transferred_away?: Pet[];
}

interface PetMutationContext {
  previousSections?: PetSectionsResponse;
  previousPet?: Pet;
}

interface CreatePetMutationContext {
  previousSections?: PetSectionsResponse;
  optimisticPetId: number;
}

let nextOptimisticPetId = -1;

const normalizePetList = (pets: (Pet | null | undefined)[] | undefined): Pet[] =>
  (pets ?? []).filter((pet): pet is Pet => Boolean(pet));

const mergePet = (pet: Pet, updates: Partial<Pet>): Pet => ({
  ...pet,
  ...updates,
});

const updateSectionsPet = (
  sections: PetSectionsResponse | undefined,
  updater: (pet: Pet) => Pet,
): PetSectionsResponse | undefined => {
  if (!sections) return sections;

  return {
    ...sections,
    owned: normalizePetList(sections.owned).map(updater),
    fostering_active: normalizePetList(sections.fostering_active).map(updater),
    fostering_past: normalizePetList(sections.fostering_past).map(updater),
    transferred_away: normalizePetList(sections.transferred_away).map(updater),
  };
};

const removeSectionsPet = (
  sections: PetSectionsResponse | undefined,
  petId: number,
): PetSectionsResponse | undefined => {
  if (!sections) return sections;

  return {
    ...sections,
    owned: normalizePetList(sections.owned).filter((pet) => pet.id !== petId),
    fostering_active: normalizePetList(sections.fostering_active).filter((pet) => pet.id !== petId),
    fostering_past: normalizePetList(sections.fostering_past).filter((pet) => pet.id !== petId),
    transferred_away: normalizePetList(sections.transferred_away).filter((pet) => pet.id !== petId),
  };
};

const reconcileCreatedPet = (
  sections: PetSectionsResponse | undefined,
  createdPet: Pet,
  optimisticPetId?: number,
): PetSectionsResponse | undefined => {
  if (!sections) return sections;

  const matchesOptimisticPet = (pet: Pet) => {
    if (typeof optimisticPetId === "number" && pet.id === optimisticPetId) {
      return true;
    }

    return (
      pet.id < 0 &&
      pet.name === createdPet.name &&
      pet.pet_type_id === createdPet.pet_type_id &&
      pet.birthday_precision === createdPet.birthday_precision
    );
  };

  const replaceList = (pets: Pet[] | undefined, options?: { insertIfMissing?: boolean }) => {
    if (!pets) return pets;

    const optimisticPetIndex = normalizePetList(pets).findIndex(matchesOptimisticPet);
    const nextPets =
      optimisticPetIndex >= 0
        ? normalizePetList(pets).map((pet, index) =>
            index === optimisticPetIndex ? createdPet : pet,
          )
        : normalizePetList(pets);

    if (optimisticPetIndex >= 0) {
      return nextPets;
    }

    if (nextPets.some((pet) => pet.id === createdPet.id)) {
      return nextPets;
    }

    if (options?.insertIfMissing) {
      return [createdPet, ...nextPets];
    }

    return nextPets;
  };

  return {
    ...sections,
    owned: replaceList(sections.owned, { insertIfMissing: true }),
    fostering_active: replaceList(sections.fostering_active),
    fostering_past: replaceList(sections.fostering_past),
    transferred_away: replaceList(sections.transferred_away),
  };
};

const getPetMutationContext = async (
  queryClient: QueryClient,
  petId: number,
): Promise<PetMutationContext> => {
  const sectionsKey = getGetMyPetsSectionsQueryKey();
  const petKey = getGetPetsIdQueryKey(petId);

  await Promise.all([
    queryClient.cancelQueries({ queryKey: sectionsKey }),
    queryClient.cancelQueries({ queryKey: petKey }),
  ]);

  return {
    previousSections: queryClient.getQueryData<PetSectionsResponse>(sectionsKey),
    previousPet: queryClient.getQueryData<Pet>(petKey),
  };
};

const buildOptimisticCreatedPet = (petId: number, payload: Pet): Pet => {
  return {
    id: petId,
    name: payload.name,
    sex: payload.sex,
    birthday_year: payload.birthday_year ?? null,
    birthday_month: payload.birthday_month ?? null,
    birthday_day: payload.birthday_day ?? null,
    birthday_precision: payload.birthday_precision,
    country: payload.country,
    state: payload.state ?? null,
    address: payload.address ?? null,
    description: payload.description,
    status: payload.status,
    created_by: payload.created_by,
    user_id: payload.user_id,
    pet_type_id: payload.pet_type_id,
    photo_url: payload.photo_url ?? undefined,
    photos: payload.photos ?? [],
    pet_type: payload.pet_type,
    city: payload.city ?? null,
    categories: payload.categories ?? [],
    viewer_permissions: payload.viewer_permissions ?? {
      can_edit: true,
      can_delete: true,
      is_owner: true,
    },
    relationships: payload.relationships ?? [],
    placement_requests: payload.placement_requests ?? [],
  };
};

const rollbackPetContext = (
  queryClient: QueryClient,
  petId: number,
  context?: PetMutationContext,
) => {
  if (!context) return;

  queryClient.setQueryData(getGetMyPetsSectionsQueryKey(), context.previousSections);
  queryClient.setQueryData(getGetPetsIdQueryKey(petId), context.previousPet);
};

const invalidatePetQueries = (queryClient: QueryClient, petId?: number) => {
  void queryClient.invalidateQueries({ queryKey: getGetMyPetsSectionsQueryKey() });
  if (typeof petId === "number") {
    void queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) });
  }
};

export function getCreatePetMutationOptions(queryClient: QueryClient) {
  return {
    onMutate: async ({ data }: { data: Pet }) => {
      const sectionsKey = getGetMyPetsSectionsQueryKey();
      await queryClient.cancelQueries({ queryKey: sectionsKey });

      const optimisticPetId = nextOptimisticPetId--;
      const optimisticPet = buildOptimisticCreatedPet(optimisticPetId, data);
      const previousSections = queryClient.getQueryData<PetSectionsResponse>(sectionsKey);

      queryClient.setQueryData<PetSectionsResponse | undefined>(sectionsKey, (current) => ({
        ...current,
        owned: [optimisticPet, ...normalizePetList(current?.owned)],
        fostering_active: normalizePetList(current?.fostering_active),
        fostering_past: normalizePetList(current?.fostering_past),
        transferred_away: normalizePetList(current?.transferred_away),
      }));

      return { previousSections, optimisticPetId };
    },
    onError: (
      _error: unknown,
      _variables: { data: Pet },
      onMutateResult: CreatePetMutationContext | undefined,
    ) => {
      queryClient.setQueryData(getGetMyPetsSectionsQueryKey(), onMutateResult?.previousSections);
    },
    onSuccess: (
      createdPet: Pet,
      _variables: { data: Pet },
      onMutateResult: CreatePetMutationContext | undefined,
    ) => {
      queryClient.setQueryData<PetSectionsResponse | undefined>(
        getGetMyPetsSectionsQueryKey(),
        (current) => reconcileCreatedPet(current, createdPet, onMutateResult?.optimisticPetId),
      );
    },
    onSettled: () => {
      invalidatePetQueries(queryClient);
    },
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof postPets>>,
    unknown,
    { data: Pet },
    CreatePetMutationContext
  >;
}

export function getOptimisticUpdatePetMutationOptions(queryClient: QueryClient) {
  return {
    onMutate: async ({ id, data }: { id: number; data: Pet }) => {
      const context = await getPetMutationContext(queryClient, id);

      queryClient.setQueryData<PetSectionsResponse | undefined>(
        getGetMyPetsSectionsQueryKey(),
        (current) =>
          updateSectionsPet(current, (pet) => (pet.id === id ? mergePet(pet, data) : pet)),
      );
      queryClient.setQueryData<Pet | undefined>(getGetPetsIdQueryKey(id), (current) =>
        current ? mergePet(current, data) : current,
      );

      return context;
    },
    onError: (
      _error: unknown,
      variables: { id: number },
      onMutateResult: PetMutationContext | undefined,
    ) => {
      rollbackPetContext(queryClient, variables.id, onMutateResult);
    },
    onSettled: (_data: unknown, _error: unknown, variables: { id: number }) => {
      invalidatePetQueries(queryClient, variables.id);
    },
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof putPetsId>>,
    unknown,
    { id: number; data: Pet },
    PetMutationContext
  >;
}

export function getOptimisticDeletePetMutationOptions(queryClient: QueryClient) {
  return {
    onMutate: async ({ id }: { id: number }) => {
      const context = await getPetMutationContext(queryClient, id);

      queryClient.setQueryData<PetSectionsResponse | undefined>(
        getGetMyPetsSectionsQueryKey(),
        (current) => removeSectionsPet(current, id),
      );
      queryClient.removeQueries({ queryKey: getGetPetsIdQueryKey(id), exact: true });

      return context;
    },
    onError: (
      _error: unknown,
      variables: { id: number },
      onMutateResult: PetMutationContext | undefined,
    ) => {
      rollbackPetContext(queryClient, variables.id, onMutateResult);
    },
    onSettled: (_data: unknown, _error: unknown, variables: { id: number }) => {
      invalidatePetQueries(queryClient, variables.id);
    },
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof deletePetsId>>,
    unknown,
    { id: number },
    PetMutationContext
  >;
}

export function getOptimisticUpdatePetStatusMutationOptions(queryClient: QueryClient) {
  return {
    onMutate: async ({ id, data }: { id: number; data: PutPetsIdStatusBody }) => {
      const context = await getPetMutationContext(queryClient, id);

      queryClient.setQueryData<PetSectionsResponse | undefined>(
        getGetMyPetsSectionsQueryKey(),
        (current) =>
          updateSectionsPet(current, (pet) =>
            pet.id === id ? mergePet(pet, { status: data.status as Pet["status"] }) : pet,
          ),
      );
      queryClient.setQueryData<Pet | undefined>(getGetPetsIdQueryKey(id), (current) =>
        current ? mergePet(current, { status: data.status as Pet["status"] }) : current,
      );

      return context;
    },
    onError: (
      _error: unknown,
      variables: { id: number },
      onMutateResult: PetMutationContext | undefined,
    ) => {
      rollbackPetContext(queryClient, variables.id, onMutateResult);
    },
    onSettled: (_data: unknown, _error: unknown, variables: { id: number }) => {
      invalidatePetQueries(queryClient, variables.id);
    },
  } satisfies UseMutationOptions<
    Awaited<ReturnType<typeof putPetsIdStatus>>,
    unknown,
    { id: number; data: PutPetsIdStatusBody },
    PetMutationContext
  >;
}
