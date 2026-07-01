import { describe, expect, it } from 'vite-plus/test'
import type { WeightHistory } from '@/api/generated/model'
import { projectWeightHistory } from './weights'

const petId = 42

const serverWeights: WeightHistory[] = [
  { id: 1, pet_id: petId, weight_kg: 4.5, record_date: '2026-01-01' },
  { id: 2, pet_id: petId, weight_kg: 5.0, record_date: '2026-02-01' },
]

describe('projectWeightHistory', () => {
  it('prepends pending creates ahead of server rows', () => {
    const projected = projectWeightHistory(
      serverWeights,
      [{ localEntityId: 'local-1', weight_kg: 3.2, record_date: '2025-12-01' }],
      [],
      [],
      petId
    )

    expect(projected).toHaveLength(3)
    expect(projected[0]).toMatchObject({
      weight_kg: 3.2,
      record_date: '2025-12-01',
      pet_id: petId,
    })
    expect(projected[0]?.id).toBeLessThan(0)
  })

  it('applies pending updates onto matching server rows', () => {
    const projected = projectWeightHistory(
      serverWeights,
      [],
      [{ weightId: 2, weight_kg: 5.5 }],
      [],
      petId
    )

    expect(projected.find((item) => item.id === 2)?.weight_kg).toBe(5.5)
  })

  it('hides rows with pending deletes', () => {
    const projected = projectWeightHistory(serverWeights, [], [], [{ weightId: 1 }], petId)

    expect(projected.map((item) => item.id)).toEqual([2])
  })

  it('keeps rows with failed deletes visible for recovery', () => {
    const projected = projectWeightHistory(
      serverWeights,
      [],
      [],
      [{ weightId: 1, status: 'failed' }],
      petId
    )

    expect(projected.map((item) => item.id)).toEqual([1, 2])
  })
})
