import type { MedicalRecord } from '@/api/generated/model'

export interface ProjectedMedicalRecordCreate {
  localEntityId: string
  record_type: string
  description: string
  record_date: string
  vet_name?: string | null
}

export interface ProjectedMedicalRecordUpdate {
  recordId: number
  record_type?: string
  description?: string
  record_date?: string
  vet_name?: string | null
}

export interface ProjectedMedicalRecordDelete {
  recordId: number
}

export function pendingMedicalRecordNumericId(localEntityId: string): number {
  let hash = 0
  for (let index = 0; index < localEntityId.length; index++) {
    hash = (Math.imul(31, hash) + localEntityId.charCodeAt(index)) | 0
  }

  if (hash === 0) return -1

  return hash > 0 ? -hash : hash
}

export function pendingMedicalRecordToRecord(
  pending: ProjectedMedicalRecordCreate,
  petId: number
): MedicalRecord {
  return {
    id: pendingMedicalRecordNumericId(pending.localEntityId),
    pet_id: petId,
    record_type: pending.record_type,
    description: pending.description,
    record_date: pending.record_date,
    vet_name: pending.vet_name ?? null,
    photos: [],
  }
}

export function projectMedicalRecords(
  serverItems: MedicalRecord[],
  pendingCreates: ProjectedMedicalRecordCreate[],
  pendingUpdates: ProjectedMedicalRecordUpdate[],
  pendingDeletes: ProjectedMedicalRecordDelete[],
  petId: number
): MedicalRecord[] {
  const pendingItems = pendingCreates.map((pending) => pendingMedicalRecordToRecord(pending, petId))
  const updatesByRecordId = new Map(
    pendingUpdates.map((pendingUpdate) => [pendingUpdate.recordId, pendingUpdate])
  )
  const deletedRecordIds = new Set(pendingDeletes.map((pendingDelete) => pendingDelete.recordId))

  const projectedServerItems = serverItems
    .filter((item) => item.id == null || !deletedRecordIds.has(item.id))
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
        ...(pendingUpdate.record_type !== undefined
          ? { record_type: pendingUpdate.record_type }
          : {}),
        ...(pendingUpdate.description !== undefined
          ? { description: pendingUpdate.description }
          : {}),
        ...(pendingUpdate.record_date !== undefined
          ? { record_date: pendingUpdate.record_date }
          : {}),
        ...(pendingUpdate.vet_name !== undefined ? { vet_name: pendingUpdate.vet_name } : {}),
      }
    })

  return [...pendingItems, ...projectedServerItems]
}
