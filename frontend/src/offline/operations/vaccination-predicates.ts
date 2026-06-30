import type { OfflineOperation } from './types'

export interface VaccinationCreatePayload {
  petId: number
  vaccine_name: string
  administered_at: string
  due_at?: string | null
  notes?: string | null
}

export function isVaccinationCreatePayload(payload: unknown): payload is VaccinationCreatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as VaccinationCreatePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId > 0 &&
    typeof candidate.vaccine_name === 'string' &&
    candidate.vaccine_name.length > 0 &&
    typeof candidate.administered_at === 'string' &&
    candidate.administered_at.length > 0
  )
}

export interface VaccinationUpdatePayload {
  petId: number
  recordId: number
  vaccine_name?: string
  administered_at?: string
  due_at?: string | null
  notes?: string | null
}

export interface VaccinationDeletePayload {
  petId: number
  recordId: number
}

export function isVaccinationUpdatePayload(payload: unknown): payload is VaccinationUpdatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as VaccinationUpdatePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId > 0 &&
    typeof candidate.recordId === 'number' &&
    Number.isFinite(candidate.recordId) &&
    candidate.recordId > 0
  )
}

export function isVaccinationDeletePayload(payload: unknown): payload is VaccinationDeletePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as VaccinationDeletePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId > 0 &&
    typeof candidate.recordId === 'number' &&
    Number.isFinite(candidate.recordId) &&
    candidate.recordId > 0
  )
}

export function isPendingVaccinationCreateOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'vaccination' ||
    operation.operation !== 'create' ||
    operation.status !== 'pending'
  ) {
    return false
  }

  if (arguments.length < 2 || petId === undefined) {
    return true
  }

  if (!isVaccinationCreatePayload(operation.payload)) {
    return String(operation.entityId) === String(petId)
  }

  return String(operation.payload.petId) === String(petId)
}

export function isPendingVaccinationUpdateOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'vaccination' ||
    operation.operation !== 'update' ||
    operation.status !== 'pending'
  ) {
    return false
  }

  if (arguments.length < 2 || petId === undefined) {
    return true
  }

  if (!operation.payload || typeof operation.payload !== 'object') {
    return false
  }

  const payload = operation.payload as { petId?: unknown }
  return String(payload.petId) === String(petId)
}

export function isActiveVaccinationUpdateOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'vaccination' ||
    operation.operation !== 'update' ||
    (operation.status !== 'pending' && operation.status !== 'syncing')
  ) {
    return false
  }

  if (arguments.length < 2 || petId === undefined) {
    return true
  }

  if (!operation.payload || typeof operation.payload !== 'object') {
    return false
  }

  const payload = operation.payload as { petId?: unknown }
  return String(payload.petId) === String(petId)
}

export function isPendingVaccinationDeleteOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'vaccination' ||
    operation.operation !== 'delete' ||
    operation.status !== 'pending'
  ) {
    return false
  }

  if (arguments.length < 2 || petId === undefined) {
    return true
  }

  if (!operation.payload || typeof operation.payload !== 'object') {
    return false
  }

  const payload = operation.payload as { petId?: unknown }
  return String(payload.petId) === String(petId)
}

export function isActiveVaccinationDeleteOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'vaccination' ||
    operation.operation !== 'delete' ||
    (operation.status !== 'pending' && operation.status !== 'syncing')
  ) {
    return false
  }

  if (arguments.length < 2 || petId === undefined) {
    return true
  }

  if (!operation.payload || typeof operation.payload !== 'object') {
    return false
  }

  const payload = operation.payload as { petId?: unknown }
  return String(payload.petId) === String(petId)
}
