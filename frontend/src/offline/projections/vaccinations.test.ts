import { describe, expect, it } from 'vite-plus/test'
import type { VaccinationRecord } from '@/api/generated/model'
import { projectVaccinations } from './vaccinations'

const petId = 7

const serverVaccinations: VaccinationRecord[] = [
  {
    id: 10,
    pet_id: petId,
    vaccine_name: 'Rabies',
    administered_at: '2026-01-01',
    completed_at: null,
    photo_url: null,
  },
]

describe('projectVaccinations', () => {
  it('includes pending creates when requested', () => {
    const projected = projectVaccinations(
      serverVaccinations,
      [
        {
          localEntityId: 'vac-local',
          vaccine_name: 'FVRCP',
          administered_at: '2026-02-01',
        },
      ],
      [],
      [],
      petId,
      { includePendingCreates: true }
    )

    expect(projected).toHaveLength(2)
    expect(projected[0]?.vaccine_name).toBe('FVRCP')
  })

  it('omits pending creates when filtered out by status view', () => {
    const projected = projectVaccinations(
      serverVaccinations,
      [
        {
          localEntityId: 'vac-local',
          vaccine_name: 'FVRCP',
          administered_at: '2026-02-01',
        },
      ],
      [],
      [],
      petId,
      { includePendingCreates: false }
    )

    expect(projected).toHaveLength(1)
    expect(projected[0]?.id).toBe(10)
  })

  it('applies pending updates and deletes', () => {
    const projected = projectVaccinations(
      serverVaccinations,
      [],
      [{ recordId: 10, notes: 'Booster due' }],
      [{ recordId: 10 }],
      petId
    )

    expect(projected).toHaveLength(0)
  })

  it('keeps records with failed deletes visible for recovery', () => {
    const projected = projectVaccinations(
      serverVaccinations,
      [],
      [],
      [{ recordId: 10, status: 'failed' }],
      petId
    )

    expect(projected).toHaveLength(1)
    expect(projected[0]?.id).toBe(10)
  })
})
