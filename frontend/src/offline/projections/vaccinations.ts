import type { VaccinationRecord } from '@/api/generated/model'
import { pendingLocalNumericId } from './local-id'
import type { ProjectedOfflineStatus } from './types'

export interface ProjectedVaccinationCreate extends ProjectedOfflineStatus {
  localEntityId: string
  vaccine_name: string
  administered_at: string
  due_at?: string | null
  notes?: string | null
}

export interface ProjectedVaccinationUpdate extends ProjectedOfflineStatus {
  recordId: number
  vaccine_name?: string
  administered_at?: string
  due_at?: string | null
  notes?: string | null
}

export interface ProjectedVaccinationDelete extends ProjectedOfflineStatus {
  recordId: number
}

export function pendingVaccinationNumericId(localEntityId: string): number {
  return pendingLocalNumericId(localEntityId)
}

export function pendingVaccinationToRecord(
  pending: ProjectedVaccinationCreate,
  petId: number
): VaccinationRecord {
  return {
    id: pendingVaccinationNumericId(pending.localEntityId),
    pet_id: petId,
    vaccine_name: pending.vaccine_name,
    administered_at: pending.administered_at,
    due_at: pending.due_at ?? undefined,
    notes: pending.notes ?? undefined,
    completed_at: null,
    photo_url: null,
  }
}

export function projectVaccinations(
  serverVaccinations: VaccinationRecord[],
  pendingCreates: ProjectedVaccinationCreate[],
  pendingUpdates: ProjectedVaccinationUpdate[],
  pendingDeletes: ProjectedVaccinationDelete[],
  petId: number,
  options?: { includePendingCreates?: boolean }
): VaccinationRecord[] {
  const includePendingCreates = options?.includePendingCreates ?? true
  const pendingItems = includePendingCreates
    ? pendingCreates.map((pending) => pendingVaccinationToRecord(pending, petId))
    : []

  const updatesByRecordId = new Map(
    pendingUpdates.map((pendingUpdate) => [pendingUpdate.recordId, pendingUpdate])
  )
  const hiddenDeletedRecordIds = new Set(
    pendingDeletes
      .filter(
        (pendingDelete) =>
          pendingDelete.status !== 'failed' && pendingDelete.status !== 'conflicted'
      )
      .map((pendingDelete) => pendingDelete.recordId)
  )

  const projectedServerItems = serverVaccinations
    .filter((item) => item.id == null || !hiddenDeletedRecordIds.has(item.id))
    .map((item) => {
      if (item.id == null) {
        return item
      }

      const pendingUpdate = updatesByRecordId.get(item.id)
      if (!pendingUpdate) {
        return item
      }

      return {
        ...item,
        ...(pendingUpdate.vaccine_name !== undefined
          ? { vaccine_name: pendingUpdate.vaccine_name }
          : {}),
        ...(pendingUpdate.administered_at !== undefined
          ? { administered_at: pendingUpdate.administered_at }
          : {}),
        ...(pendingUpdate.due_at !== undefined
          ? { due_at: pendingUpdate.due_at ?? undefined }
          : {}),
        ...(pendingUpdate.notes !== undefined ? { notes: pendingUpdate.notes ?? undefined } : {}),
      }
    })

  return [...pendingItems, ...projectedServerItems]
}
