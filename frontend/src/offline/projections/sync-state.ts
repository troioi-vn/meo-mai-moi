import type { OfflineEntityType, OfflineOperation } from '@/offline/operations/types'
import {
  isActiveMedicalRecordDeleteOperation,
  isActiveVaccinationDeleteOperation,
  isActiveWeightDeleteOperation,
  isMedicalRecordDeletePayload,
  isMedicalRecordUpdatePayload,
  isVaccinationDeletePayload,
  isVaccinationUpdatePayload,
  isWeightDeletePayload,
  isWeightUpdatePayload,
} from '@/offline/operations'
import { isHabitDayEntriesPayload } from '@/offline/operations/habit-predicates'
import { pendingLocalNumericId } from './local-id'
import type { OfflineEntityMarker } from './types'

const ISSUE_MARKERS = new Set<OfflineEntityMarker>(['failed', 'conflicted'])

function issueMarker(status: OfflineOperation['status']): OfflineEntityMarker | null {
  if (status === 'failed') return 'failed'
  if (status === 'conflicted') return 'conflicted'
  return null
}

function pendingMarker(status: OfflineOperation['status']): OfflineEntityMarker | null {
  if (status === 'pending' || status === 'syncing') return 'pending'
  return issueMarker(status)
}

function preferMarker(
  current: OfflineEntityMarker | undefined,
  next: OfflineEntityMarker
): OfflineEntityMarker {
  if (!current) return next
  if (ISSUE_MARKERS.has(next)) return next
  if (ISSUE_MARKERS.has(current)) return current
  return next
}

function localCreateId(operation: OfflineOperation): number | null {
  const localEntityId = operation.localEntityId ?? operation.id
  return localEntityId ? pendingLocalNumericId(localEntityId) : null
}

function matchesPetEntity(operation: OfflineOperation, petId: number): boolean {
  return String(operation.entityId) === String(petId)
}

function resolveCreateMarker(
  operation: OfflineOperation,
  petId: number,
  recordId: number,
  marker: OfflineEntityMarker | null
): OfflineEntityMarker | null {
  if (operation.operation !== 'create' || !matchesPetEntity(operation, petId)) {
    return marker
  }

  if (localCreateId(operation) !== recordId) {
    return marker
  }

  const nextMarker = pendingMarker(operation.status)
  if (nextMarker) {
    return preferMarker(marker ?? undefined, nextMarker)
  }

  return marker
}

function resolveUpdateMarker(
  operation: OfflineOperation,
  recordId: number,
  marker: OfflineEntityMarker | null,
  payloadRecordId: number | undefined
): OfflineEntityMarker | null {
  if (operation.operation !== 'update' || payloadRecordId !== recordId) {
    return marker
  }

  const nextMarker = pendingMarker(operation.status)
  if (nextMarker) {
    return preferMarker(marker ?? undefined, nextMarker)
  }

  return marker
}

export function resolveWeightMarker(
  weightId: number,
  petId: number,
  operations: OfflineOperation[]
): OfflineEntityMarker | null {
  let marker: OfflineEntityMarker | null = null

  for (const operation of operations) {
    if (operation.entityType !== 'weight') continue

    marker = resolveCreateMarker(operation, petId, weightId, marker)

    if (isWeightUpdatePayload(operation.payload) && operation.payload.petId === petId) {
      marker = resolveUpdateMarker(operation, weightId, marker, operation.payload.weightId)
    }

    if (
      isWeightDeletePayload(operation.payload) &&
      operation.payload.petId === petId &&
      operation.payload.weightId === weightId
    ) {
      const issue = issueMarker(operation.status)
      if (issue) marker = preferMarker(marker ?? undefined, issue)
    }
  }

  return marker
}

export function resolveVaccinationMarker(
  recordId: number,
  petId: number,
  operations: OfflineOperation[]
): OfflineEntityMarker | null {
  let marker: OfflineEntityMarker | null = null

  for (const operation of operations) {
    if (operation.entityType !== 'vaccination') continue

    marker = resolveCreateMarker(operation, petId, recordId, marker)

    if (isVaccinationUpdatePayload(operation.payload) && operation.payload.petId === petId) {
      marker = resolveUpdateMarker(operation, recordId, marker, operation.payload.recordId)
    }

    if (
      isVaccinationDeletePayload(operation.payload) &&
      operation.payload.petId === petId &&
      operation.payload.recordId === recordId
    ) {
      const issue = issueMarker(operation.status)
      if (issue) marker = preferMarker(marker ?? undefined, issue)
    }
  }

  return marker
}

export function resolveMedicalRecordMarker(
  recordId: number,
  petId: number,
  operations: OfflineOperation[]
): OfflineEntityMarker | null {
  let marker: OfflineEntityMarker | null = null

  for (const operation of operations) {
    if (operation.entityType !== 'medical_record') continue

    marker = resolveCreateMarker(operation, petId, recordId, marker)

    if (isMedicalRecordUpdatePayload(operation.payload) && operation.payload.petId === petId) {
      marker = resolveUpdateMarker(operation, recordId, marker, operation.payload.recordId)
    }

    if (
      isMedicalRecordDeletePayload(operation.payload) &&
      operation.payload.petId === petId &&
      operation.payload.recordId === recordId
    ) {
      const issue = issueMarker(operation.status)
      if (issue) marker = preferMarker(marker ?? undefined, issue)
    }
  }

  return marker
}

export function buildHabitDayMarkerMap(
  habitId: number,
  operations: OfflineOperation[]
): Map<string, OfflineEntityMarker> {
  const markers = new Map<string, OfflineEntityMarker>()

  for (const operation of operations) {
    if (operation.entityType !== 'habit') continue
    if (!isHabitDayEntriesPayload(operation.payload)) continue
    if (operation.payload.habitId !== habitId) continue

    const marker = resolveHabitDayMarker(habitId, operation.payload.date, [operation])
    if (marker) {
      markers.set(operation.payload.date, marker)
    }
  }

  return markers
}

export function resolveHabitDayMarker(
  habitId: number,
  date: string,
  operations: OfflineOperation[]
): OfflineEntityMarker | null {
  for (const operation of operations) {
    if (operation.entityType !== 'habit') continue
    if (!isHabitDayEntriesPayload(operation.payload)) continue
    if (operation.payload.habitId !== habitId || operation.payload.date !== date) continue

    const marker = pendingMarker(operation.status)
    if (marker) {
      return marker
    }
  }

  return null
}

export function resolveRecordMarker(
  entityType: Extract<OfflineEntityType, 'weight' | 'vaccination' | 'medical_record'>,
  recordId: number,
  petId: number,
  operations: OfflineOperation[]
): OfflineEntityMarker | null {
  switch (entityType) {
    case 'weight':
      return resolveWeightMarker(recordId, petId, operations)
    case 'vaccination':
      return resolveVaccinationMarker(recordId, petId, operations)
    case 'medical_record':
      return resolveMedicalRecordMarker(recordId, petId, operations)
  }
}

export function hasActiveDeleteForRecord(
  entityType: Extract<OfflineEntityType, 'weight' | 'vaccination' | 'medical_record'>,
  recordId: number,
  petId: number,
  operations: OfflineOperation[]
): boolean {
  return operations.some((operation) => {
    if (operation.status !== 'pending' && operation.status !== 'syncing') {
      return false
    }

    switch (entityType) {
      case 'weight':
        return (
          isActiveWeightDeleteOperation(operation, petId) &&
          operation.payload &&
          typeof operation.payload === 'object' &&
          (operation.payload as { weightId?: number }).weightId === recordId
        )
      case 'vaccination':
        return (
          isActiveVaccinationDeleteOperation(operation, petId) &&
          operation.payload &&
          typeof operation.payload === 'object' &&
          (operation.payload as { recordId?: number }).recordId === recordId
        )
      case 'medical_record':
        return (
          isActiveMedicalRecordDeleteOperation(operation, petId) &&
          operation.payload &&
          typeof operation.payload === 'object' &&
          (operation.payload as { recordId?: number }).recordId === recordId
        )
    }
  })
}
