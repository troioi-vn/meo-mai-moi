import type { OfflineOperation } from './types'

export interface MedicalRecordCreatePayload {
  petId: number
  record_type: string
  description: string
  record_date: string
  vet_name?: string | null
}

export interface MedicalRecordUpdatePayload {
  petId: number
  recordId: number
  record_type?: string
  description?: string
  record_date?: string
  vet_name?: string | null
}

export interface MedicalRecordDeletePayload {
  petId: number
  recordId: number
}

export function isMedicalRecordCreatePayload(
  payload: unknown
): payload is MedicalRecordCreatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as MedicalRecordCreatePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId > 0 &&
    typeof candidate.record_type === 'string' &&
    candidate.record_type.length > 0 &&
    typeof candidate.description === 'string' &&
    typeof candidate.record_date === 'string' &&
    candidate.record_date.length > 0
  )
}

export function isMedicalRecordUpdatePayload(
  payload: unknown
): payload is MedicalRecordUpdatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as MedicalRecordUpdatePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId > 0 &&
    typeof candidate.recordId === 'number' &&
    Number.isFinite(candidate.recordId) &&
    candidate.recordId > 0
  )
}

export function isMedicalRecordDeletePayload(
  payload: unknown
): payload is MedicalRecordDeletePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as MedicalRecordDeletePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId > 0 &&
    typeof candidate.recordId === 'number' &&
    Number.isFinite(candidate.recordId) &&
    candidate.recordId > 0
  )
}

export function isPendingMedicalRecordCreateOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'medical_record' ||
    operation.operation !== 'create' ||
    operation.status !== 'pending'
  ) {
    return false
  }

  if (arguments.length < 2 || petId === undefined) {
    return true
  }

  if (!isMedicalRecordCreatePayload(operation.payload)) {
    return String(operation.entityId) === String(petId)
  }

  return String(operation.payload.petId) === String(petId)
}

export function isPendingMedicalRecordUpdateOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'medical_record' ||
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

export function isPendingMedicalRecordDeleteOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'medical_record' ||
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

export function isActiveMedicalRecordDeleteOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'medical_record' ||
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
