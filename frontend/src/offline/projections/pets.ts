import type { Pet } from '@/types/pet'
import { pendingLocalNumericId } from './local-id'
import type { ProjectedOfflineStatus } from './types'
import type { OfflineOperationStatus } from '@/offline/operations/types'

export interface PetSectionsResponse {
  owned: Pet[]
  fostering_active: Pet[]
  fostering_past: Pet[]
  transferred_away: Pet[]
}

export interface ProjectedPetCreate extends ProjectedOfflineStatus {
  localEntityId: string
  data: Partial<Pet>
}

export interface ProjectedPetUpdate extends ProjectedOfflineStatus {
  petId: number
  data: Partial<Pet>
}

export interface ProjectedPetStatusUpdate extends ProjectedOfflineStatus {
  petId: number
  petStatus: Pet['status']
}

export interface ProjectedPetDelete extends ProjectedOfflineStatus {
  petId: number
}

const OFFLINE_LOCAL_ENTITY_ID_FIELD = '__offlineLocalEntityId'
const OFFLINE_OPERATION_STATUS_FIELD = '__offlineOperationStatus'

type OfflineProjectedPet = Pet & {
  [OFFLINE_LOCAL_ENTITY_ID_FIELD]?: string
  [OFFLINE_OPERATION_STATUS_FIELD]?: OfflineOperationStatus
}

const normalizePetList = (pets: (Pet | null | undefined)[] | undefined): Pet[] =>
  (pets ?? []).filter((pet): pet is Pet => Boolean(pet))

export function pendingPetNumericId(localEntityId: string): number {
  return pendingLocalNumericId(localEntityId)
}

export function pendingPetToPet(pending: ProjectedPetCreate): Pet {
  const petId = pendingPetNumericId(pending.localEntityId)
  const data = pending.data

  const pet: OfflineProjectedPet = {
    id: petId,
    name: data.name ?? '',
    sex: data.sex ?? 'not_specified',
    birthday_year: data.birthday_year ?? null,
    birthday_month: data.birthday_month ?? null,
    birthday_day: data.birthday_day ?? null,
    birthday_precision: data.birthday_precision ?? 'unknown',
    country: data.country ?? '',
    state: data.state ?? null,
    address: data.address ?? null,
    description: data.description ?? '',
    status: data.status ?? 'active',
    created_by: data.created_by ?? null,
    user_id: data.user_id ?? 0,
    pet_type_id: data.pet_type_id ?? 0,
    photo_url: data.photo_url ?? undefined,
    photos: data.photos ?? [],
    pet_type: data.pet_type,
    city: data.city ?? null,
    categories: data.categories ?? [],
    viewer_permissions: data.viewer_permissions ?? {
      can_edit: true,
      can_delete: true,
      is_owner: true,
    },
    relationships: data.relationships ?? [],
    placement_requests: data.placement_requests ?? [],
    [OFFLINE_LOCAL_ENTITY_ID_FIELD]: pending.localEntityId,
    [OFFLINE_OPERATION_STATUS_FIELD]: pending.status,
  }

  return pet
}

export function getPetOfflineLocalEntityId(pet: Pet): string | undefined {
  return (pet as OfflineProjectedPet)[OFFLINE_LOCAL_ENTITY_ID_FIELD]
}

export function getPetOfflineOperationStatus(pet: Pet): OfflineOperationStatus | undefined {
  return (pet as OfflineProjectedPet)[OFFLINE_OPERATION_STATUS_FIELD]
}

const markPetOfflineStatus = (pet: Pet, status?: OfflineOperationStatus): Pet => {
  if (!status) return pet

  return {
    ...pet,
    [OFFLINE_OPERATION_STATUS_FIELD]: status,
  } as Pet
}

const mergePet = (pet: Pet, updates: Partial<Pet>, status?: OfflineOperationStatus): Pet => ({
  ...pet,
  ...updates,
  ...(status ? { [OFFLINE_OPERATION_STATUS_FIELD]: status } : {}),
})

const updateSectionsPet = (
  sections: PetSectionsResponse,
  updater: (pet: Pet) => Pet
): PetSectionsResponse => {
  return {
    ...sections,
    owned: normalizePetList(sections.owned).map(updater),
    fostering_active: normalizePetList(sections.fostering_active).map(updater),
    fostering_past: normalizePetList(sections.fostering_past).map(updater),
    transferred_away: normalizePetList(sections.transferred_away).map(updater),
  }
}

export function projectPetSections(
  serverSections: PetSectionsResponse | undefined,
  pendingCreates: ProjectedPetCreate[],
  pendingUpdates: ProjectedPetUpdate[],
  pendingStatusUpdates: ProjectedPetStatusUpdate[],
  pendingDeletes: ProjectedPetDelete[]
): PetSectionsResponse | undefined {
  if (!serverSections && pendingCreates.length === 0) {
    return serverSections
  }

  const base: PetSectionsResponse = {
    owned: normalizePetList(serverSections?.owned),
    fostering_active: normalizePetList(serverSections?.fostering_active),
    fostering_past: normalizePetList(serverSections?.fostering_past),
    transferred_away: normalizePetList(serverSections?.transferred_away),
  }

  const hiddenDeletedPetIds = new Set(
    pendingDeletes
      .filter(
        (pendingDelete) =>
          pendingDelete.status !== 'failed' && pendingDelete.status !== 'conflicted'
      )
      .map((pendingDelete) => pendingDelete.petId)
  )

  let projected = {
    ...base,
    owned: base.owned.filter((pet) => !hiddenDeletedPetIds.has(pet.id)),
    fostering_active: base.fostering_active.filter((pet) => !hiddenDeletedPetIds.has(pet.id)),
    fostering_past: base.fostering_past.filter((pet) => !hiddenDeletedPetIds.has(pet.id)),
    transferred_away: base.transferred_away.filter((pet) => !hiddenDeletedPetIds.has(pet.id)),
  }

  const updatesByPetId = new Map(
    pendingUpdates.map((pendingUpdate) => [pendingUpdate.petId, pendingUpdate])
  )
  const statusUpdatesByPetId = new Map(
    pendingStatusUpdates.map((pendingStatus) => [pendingStatus.petId, pendingStatus])
  )

  projected = updateSectionsPet(projected, (pet) => {
    const pendingUpdate = updatesByPetId.get(pet.id)
    const pendingStatus = statusUpdatesByPetId.get(pet.id)

    let nextPet = pet
    if (pendingUpdate) {
      nextPet = mergePet(nextPet, pendingUpdate.data, pendingUpdate.status)
    }
    if (pendingStatus) {
      nextPet = mergePet(nextPet, { status: pendingStatus.petStatus }, pendingStatus.status)
    }

    return nextPet
  })

  projected = updateSectionsPet(projected, (pet) => {
    const pendingDelete = pendingDeletes.find(
      (deleteOperation) =>
        deleteOperation.petId === pet.id &&
        (deleteOperation.status === 'failed' || deleteOperation.status === 'conflicted')
    )

    return markPetOfflineStatus(pet, pendingDelete?.status)
  })

  const pendingPets = pendingCreates.map((pending) => pendingPetToPet(pending))

  return {
    ...projected,
    owned: [...pendingPets, ...normalizePetList(projected.owned)],
  }
}

export function projectPetDetail(
  serverPet: Pet | undefined,
  pendingCreates: ProjectedPetCreate[],
  pendingUpdates: ProjectedPetUpdate[],
  pendingStatusUpdates: ProjectedPetStatusUpdate[],
  pendingDeletes: ProjectedPetDelete[],
  petId: number
): Pet | undefined {
  const isDeleted = pendingDeletes.some(
    (pendingDelete) =>
      pendingDelete.petId === petId &&
      pendingDelete.status !== 'failed' &&
      pendingDelete.status !== 'conflicted'
  )

  if (isDeleted) {
    return undefined
  }

  const pendingCreate = pendingCreates.find(
    (pending) => pendingPetNumericId(pending.localEntityId) === petId
  )

  let pet = serverPet ?? (pendingCreate ? pendingPetToPet(pendingCreate) : undefined)
  if (!pet) {
    return undefined
  }

  const pendingUpdate = pendingUpdates.find((update) => update.petId === petId)
  if (pendingUpdate) {
    pet = mergePet(pet, pendingUpdate.data, pendingUpdate.status)
  }

  const pendingStatus = pendingStatusUpdates.find((update) => update.petId === petId)
  if (pendingStatus) {
    pet = mergePet(pet, { status: pendingStatus.petStatus }, pendingStatus.status)
  }

  const pendingDelete = pendingDeletes.find(
    (deleteOperation) =>
      deleteOperation.petId === petId &&
      (deleteOperation.status === 'failed' || deleteOperation.status === 'conflicted')
  )
  if (pendingDelete) {
    pet = markPetOfflineStatus(pet, pendingDelete.status)
  }

  return pet
}

export function findProjectedPetInSections(
  sections: PetSectionsResponse | undefined,
  petId: number
): Pet | undefined {
  if (!sections) return undefined

  const lists = [
    sections.owned,
    sections.fostering_active,
    sections.fostering_past,
    sections.transferred_away,
  ]

  for (const list of lists) {
    const match = normalizePetList(list).find((pet) => pet.id === petId)
    if (match) {
      return match
    }
  }

  return undefined
}
