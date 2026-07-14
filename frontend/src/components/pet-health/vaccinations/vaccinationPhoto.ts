import type { VaccinationRecord } from '@/api/generated/model/vaccinationRecord'
import type { HealthRecordPhoto } from '@/components/pet-health/HealthRecordPhotoModal'

export type VaccinationRecordWithId = VaccinationRecord & { id: number }

export function getVaccinationRecordPhoto(
  record: VaccinationRecordWithId
): HealthRecordPhoto | null {
  if (record.photo) {
    return record.photo
  }

  if (!record.photo_url) {
    return null
  }

  return {
    id: record.id,
    url: record.photo_url,
    thumb_url: record.photo_url,
  }
}
