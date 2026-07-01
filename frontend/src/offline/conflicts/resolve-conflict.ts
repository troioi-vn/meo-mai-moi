import type { QueryClient } from '@tanstack/react-query'
import {
  invalidatePetMedicalRecords,
  invalidatePetVaccinations,
  invalidatePetWeights,
} from '@/lib/health-record-cache'
import { invalidateHabitViews } from '@/lib/habit-cache'
import { invalidatePetCollectionQueries, invalidatePetProfileQueries } from '@/lib/pet-cache'
import {
  discardOperation,
  getOperation,
  removeOperation,
  updateOperation,
  type OfflineEntityType,
  type OfflineOperation,
  type OfflineOperationType,
} from '@/offline/operations'
import { generateQueueId } from '@/offline/queue-core'

export interface ConflictResolutionSupport {
  canKeepMine: boolean
  canUseServer: boolean
}

export function conflictResolutionSupport(
  entityType: OfflineEntityType,
  operation: OfflineOperationType
): ConflictResolutionSupport {
  if (operation === 'update' && (entityType === 'weight' || entityType === 'vaccination')) {
    return {
      canKeepMine: true,
      canUseServer: true,
    }
  }

  return {
    canKeepMine: false,
    canUseServer: false,
  }
}

async function invalidateOperationDomain(
  queryClient: QueryClient,
  operation: OfflineOperation
): Promise<void> {
  switch (operation.entityType) {
    case 'weight': {
      const payload = operation.payload as { petId?: number }
      if (typeof payload.petId === 'number') {
        await invalidatePetWeights(queryClient, payload.petId)
      }
      return
    }
    case 'vaccination': {
      const payload = operation.payload as { petId?: number }
      if (typeof payload.petId === 'number') {
        await invalidatePetVaccinations(queryClient, payload.petId)
      }
      return
    }
    case 'medical_record': {
      const payload = operation.payload as { petId?: number }
      if (typeof payload.petId === 'number') {
        await invalidatePetMedicalRecords(queryClient, payload.petId)
      }
      return
    }
    case 'habit': {
      const payload = operation.payload as { habitId?: number }
      if (typeof payload.habitId === 'number') {
        await invalidateHabitViews(queryClient, payload.habitId)
      }
      return
    }
    case 'pet': {
      if (operation.operation === 'create') {
        await invalidatePetCollectionQueries(queryClient)
        return
      }

      const payload = operation.payload as { petId?: number }
      if (typeof payload.petId === 'number') {
        await invalidatePetProfileQueries(queryClient, payload.petId)
      }
      await invalidatePetCollectionQueries(queryClient)
      return
    }
    default:
      return
  }
}

export async function acceptServerConflictVersion(
  queryClient: QueryClient,
  operationId: string
): Promise<boolean> {
  const operation = await getOperation(operationId)
  if (operation?.status !== 'conflicted') {
    return false
  }

  await removeOperation(operationId)
  await invalidateOperationDomain(queryClient, operation)

  return true
}

export async function rebaseConflictedOperation(
  operationId: string
): Promise<OfflineOperation | undefined> {
  const operation = await getOperation(operationId)
  if (operation?.status !== 'conflicted') {
    return undefined
  }

  const support = conflictResolutionSupport(operation.entityType, operation.operation)
  if (!support.canKeepMine) {
    return undefined
  }

  const serverVersion = operation.conflictMetadata?.serverVersion
  if (!serverVersion) {
    return undefined
  }

  return updateOperation(operationId, {
    status: 'pending',
    baseVersion: serverVersion,
    idempotencyKey: generateQueueId(),
    conflictMetadata: undefined,
    lastError: undefined,
  })
}

export async function discardConflictedOperation(operationId: string): Promise<boolean> {
  const operation = await getOperation(operationId)
  if (operation?.status !== 'conflicted') {
    return false
  }

  return discardOperation(operationId)
}

export function formatConflictPreview(value: unknown): string {
  if (value === undefined || value === null) {
    return '—'
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '[unavailable]'
  }
}
