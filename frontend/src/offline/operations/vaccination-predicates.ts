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
