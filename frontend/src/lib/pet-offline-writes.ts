import type { QueryClient } from '@tanstack/react-query'
import type { Pet } from '@/api/generated/model'
import type { PutPetsIdStatusBody } from '@/api/generated/model/putPetsIdStatusBody'
import type { Pet as AppPet } from '@/types/pet'
import { deletePetsId, postPets, putPetsId, putPetsIdStatus } from '@/api/generated/pets/pets'
import { invalidatePetCollectionQueries, invalidatePetProfileQueries } from '@/lib/pet-cache'
import {
  enqueueOperation,
  type PetCreatePayload,
  type PetDeletePayload,
  type PetStatusUpdatePayload,
  type PetUpdatePayload,
} from '@/offline/operations'
import { pendingPetNumericId, pendingPetToPet } from '@/offline/projections/pets'
import { generateQueueId } from '@/offline/queue-core'
import { entityVersionFromRecord } from '@/offline/entity-version'

export type { PetCreatePayload, PetDeletePayload, PetStatusUpdatePayload, PetUpdatePayload }

export async function createPetOnline(
  queryClient: QueryClient,
  payload: PetCreatePayload
): Promise<Pet> {
  const createdPet = await postPets(payload as Pet)
  await invalidatePetCollectionQueries(queryClient)
  return createdPet
}

export async function createPetOffline(payload: PetCreatePayload): Promise<{
  pet: AppPet
  localEntityId: string
}> {
  const localEntityId = generateQueueId()

  await enqueueOperation({
    idempotencyKey: localEntityId,
    entityType: 'pet',
    entityId: localEntityId,
    operation: 'create',
    localEntityId,
    payload,
  })

  return {
    localEntityId,
    pet: pendingPetToPet({
      localEntityId,
      data: payload as Partial<AppPet>,
    }),
  }
}

export async function updatePetOnline(
  queryClient: QueryClient,
  petId: number,
  data: Partial<Pet>
): Promise<Pet> {
  const updatedPet = await putPetsId(petId, data as Pet)
  await invalidatePetProfileQueries(queryClient, petId)
  await invalidatePetCollectionQueries(queryClient)
  return updatedPet
}

export async function updatePetOffline(
  petId: number,
  data: Partial<Pet>,
  baseVersion?: string
): Promise<void> {
  const payload: PetUpdatePayload = { petId, data }

  await enqueueOperation({
    idempotencyKey: generateQueueId(),
    entityType: 'pet',
    entityId: petId,
    operation: 'update',
    payload,
    baseVersion,
  })
}

export async function updatePetStatusOnline(
  queryClient: QueryClient,
  petId: number,
  status: PutPetsIdStatusBody['status']
): Promise<void> {
  await putPetsIdStatus(petId, { status })
  await invalidatePetProfileQueries(queryClient, petId)
  await invalidatePetCollectionQueries(queryClient)
}

export async function updatePetStatusOffline(
  petId: number,
  status: PutPetsIdStatusBody['status']
): Promise<void> {
  const payload: PetStatusUpdatePayload = { petId, status }

  await enqueueOperation({
    idempotencyKey: generateQueueId(),
    entityType: 'pet',
    entityId: petId,
    operation: 'update',
    payload,
  })
}

export async function deletePetOnline(queryClient: QueryClient, petId: number): Promise<void> {
  await deletePetsId(petId)
  await invalidatePetProfileQueries(queryClient, petId)
  await invalidatePetCollectionQueries(queryClient)
}

export async function deletePetOffline(petId: number): Promise<void> {
  const payload: PetDeletePayload = { petId }

  await enqueueOperation({
    idempotencyKey: generateQueueId(),
    entityType: 'pet',
    entityId: petId,
    operation: 'delete',
    payload,
  })
}

export function offlineCreatedPetId(localEntityId: string): number {
  return pendingPetNumericId(localEntityId)
}

export function entityVersionFromPet(
  pet: { updated_at?: string | null } | undefined
): string | undefined {
  return entityVersionFromRecord(pet as { updated_at?: string | null } | undefined)
}
