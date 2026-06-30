import type { OfflineOperation } from './types'

export interface WeightCreatePayload {
  weight_kg: number
  record_date: string
  tare_weight_kg?: number | null
}

export interface WeightUpdatePayload {
  petId: number
  weightId: number
  weight_kg?: number
  record_date?: string
  tare_weight_kg?: number | null
}

export function isWeightCreatePayload(payload: unknown): payload is WeightCreatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as WeightCreatePayload
  return (
    typeof candidate.weight_kg === 'number' &&
    typeof candidate.record_date === 'string' &&
    candidate.record_date.length > 0
  )
}

export function isWeightUpdatePayload(payload: unknown): payload is WeightUpdatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as WeightUpdatePayload
  return (
    typeof candidate.petId === 'number' &&
    Number.isFinite(candidate.petId) &&
    candidate.petId > 0 &&
    typeof candidate.weightId === 'number' &&
    Number.isFinite(candidate.weightId) &&
    candidate.weightId > 0
  )
}

export function isPendingWeightCreateOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'weight' ||
    operation.operation !== 'create' ||
    operation.status !== 'pending'
  ) {
    return false
  }

  if (arguments.length < 2 || petId === undefined) {
    return true
  }

  return String(operation.entityId) === String(petId)
}

export function isPendingWeightUpdateOperation(
  operation: OfflineOperation,
  petId?: number | string
): boolean {
  if (
    operation.entityType !== 'weight' ||
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
