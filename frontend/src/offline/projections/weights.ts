import type { WeightHistory } from '@/api/generated/model'
import { pendingLocalNumericId } from './local-id'
import type { ProjectedOfflineStatus } from './types'

export interface ProjectedWeightCreate extends ProjectedOfflineStatus {
  localEntityId: string
  weight_kg: number
  record_date: string
  tare_weight_kg?: number | null
}

export interface ProjectedWeightUpdate extends ProjectedOfflineStatus {
  weightId: number
  weight_kg?: number
  record_date?: string
  tare_weight_kg?: number | null
}

export interface ProjectedWeightDelete extends ProjectedOfflineStatus {
  weightId: number
}

export function pendingWeightNumericId(localEntityId: string): number {
  return pendingLocalNumericId(localEntityId)
}

export function pendingWeightToHistory(
  pending: ProjectedWeightCreate,
  petId: number
): WeightHistory {
  return {
    id: pendingWeightNumericId(pending.localEntityId),
    pet_id: petId,
    weight_kg: pending.weight_kg,
    record_date: pending.record_date,
  }
}

export function projectWeightHistory(
  serverWeights: WeightHistory[],
  pendingCreates: ProjectedWeightCreate[],
  pendingUpdates: ProjectedWeightUpdate[],
  pendingDeletes: ProjectedWeightDelete[],
  petId: number
): WeightHistory[] {
  const pendingItems = pendingCreates.map((pending) => pendingWeightToHistory(pending, petId))

  const updatesByWeightId = new Map(
    pendingUpdates.map((pendingUpdate) => [pendingUpdate.weightId, pendingUpdate])
  )
  const hiddenDeletedWeightIds = new Set(
    pendingDeletes
      .filter(
        (pendingDelete) =>
          pendingDelete.status !== 'failed' && pendingDelete.status !== 'conflicted'
      )
      .map((pendingDelete) => pendingDelete.weightId)
  )

  const projectedServerItems = serverWeights
    .filter((item) => item.id == null || !hiddenDeletedWeightIds.has(item.id))
    .map((item) => {
      if (item.id == null) {
        return item
      }

      const pendingUpdate = updatesByWeightId.get(item.id)
      if (!pendingUpdate) {
        return item
      }

      return {
        ...item,
        ...(pendingUpdate.weight_kg !== undefined ? { weight_kg: pendingUpdate.weight_kg } : {}),
        ...(pendingUpdate.record_date !== undefined
          ? { record_date: pendingUpdate.record_date }
          : {}),
      }
    })

  return [...pendingItems, ...projectedServerItems]
}
