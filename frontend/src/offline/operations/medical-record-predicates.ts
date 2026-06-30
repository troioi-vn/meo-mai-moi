import type { OfflineOperation } from './types'

export interface MedicalRecordCreatePayload {
  petId: number
  record_type: string
  description: string
  record_date: string
  vet_name?: string | null
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
