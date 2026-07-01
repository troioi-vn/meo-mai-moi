import { describe, expect, it } from 'vite-plus/test'
import type { MedicalRecord } from '@/api/generated/model'
import { projectMedicalRecords } from './medical-records'

const petId = 15

const serverRecords: MedicalRecord[] = [
  {
    id: 4,
    pet_id: petId,
    record_type: 'Checkup',
    description: 'Annual visit',
    record_date: '2026-01-10',
    vet_name: 'Dr. A',
    photos: [],
  },
]

describe('projectMedicalRecords', () => {
  it('projects creates, updates, and deletes together', () => {
    const projected = projectMedicalRecords(
      serverRecords,
      [
        {
          localEntityId: 'med-local',
          record_type: 'Symptom',
          description: 'Offline cough',
          record_date: '2026-02-01',
        },
      ],
      [{ recordId: 4, description: 'Updated offline' }],
      [],
      petId
    )

    expect(projected).toHaveLength(2)
    expect(projected[0]?.record_type).toBe('Symptom')
    expect(projected.find((item) => item.id === 4)?.description).toBe('Updated offline')
  })

  it('removes rows targeted by pending deletes', () => {
    const projected = projectMedicalRecords(serverRecords, [], [], [{ recordId: 4 }], petId)

    expect(projected).toHaveLength(0)
  })

  it('keeps rows with failed deletes visible for recovery', () => {
    const projected = projectMedicalRecords(
      serverRecords,
      [],
      [],
      [{ recordId: 4, status: 'failed' }],
      petId
    )

    expect(projected).toHaveLength(1)
    expect(projected[0]?.id).toBe(4)
  })
})
