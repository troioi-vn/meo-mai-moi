import type { Pet } from '@/api/generated/model'
import type { PutPetsIdStatusBody } from '@/api/generated/model/putPetsIdStatusBody'
import type { OfflineOperation } from './types'

export type PetCreatePayload = Omit<Pet, 'id'>

export interface PetUpdatePayload {
  petId: number
  data: Partial<Pet>
}

export interface PetStatusUpdatePayload {
  petId: number
  status: PutPetsIdStatusBody['status']
}

export interface PetDeletePayload {
  petId: number
}

export function isPetCreatePayload(payload: unknown): payload is PetCreatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as PetCreatePayload
  return typeof candidate.name === 'string' && candidate.name.length > 0
}

export function isPetUpdatePayload(payload: unknown): payload is PetUpdatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as PetUpdatePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId !== 0 &&
    'data' in candidate &&
    typeof candidate.data === 'object'
  )
}

export function isPetStatusUpdatePayload(payload: unknown): payload is PetStatusUpdatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as PetStatusUpdatePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId !== 0 &&
    typeof candidate.status === 'string' &&
    candidate.status.length > 0 &&
    !('data' in candidate)
  )
}

export function isPetDeletePayload(payload: unknown): payload is PetDeletePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as PetDeletePayload
  return (
    typeof candidate.petId === 'number' && Number.isFinite(candidate.petId) && candidate.petId !== 0
  )
}

export function isPendingPetCreateOperation(operation: OfflineOperation): boolean {
  return (
    operation.entityType === 'pet' &&
    operation.operation === 'create' &&
    operation.status === 'pending'
  )
}

export function isPendingPetUpdateOperation(operation: OfflineOperation): boolean {
  if (
    operation.entityType !== 'pet' ||
    operation.operation !== 'update' ||
    operation.status !== 'pending'
  ) {
    return false
  }

  return isPetUpdatePayload(operation.payload)
}

export function isPendingPetStatusUpdateOperation(operation: OfflineOperation): boolean {
  if (
    operation.entityType !== 'pet' ||
    operation.operation !== 'update' ||
    operation.status !== 'pending'
  ) {
    return false
  }

  return isPetStatusUpdatePayload(operation.payload)
}

export function isPendingPetDeleteOperation(operation: OfflineOperation): boolean {
  return (
    operation.entityType === 'pet' &&
    operation.operation === 'delete' &&
    operation.status === 'pending'
  )
}

export function isActivePetDeleteOperation(operation: OfflineOperation): boolean {
  return (
    operation.entityType === 'pet' &&
    operation.operation === 'delete' &&
    (operation.status === 'pending' || operation.status === 'syncing')
  )
}
