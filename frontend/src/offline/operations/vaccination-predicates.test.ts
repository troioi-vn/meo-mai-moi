import { describe, expect, it } from 'vite-plus/test'
import type { OfflineOperation } from './types'
import {
  isPendingVaccinationCreateOperation,
  isVaccinationCreatePayload,
} from './vaccination-predicates'

function vaccinationOperation(overrides: Partial<OfflineOperation>): OfflineOperation {
  return {
    id: 'op-1',
    idempotencyKey: 'key-1',
    entityType: 'vaccination',
    entityId: 123,
    operation: 'create',
    payload: {
      petId: 123,
      vaccine_name: 'Rabies',
      administered_at: '2024-01-01',
    },
    status: 'pending',
    attempts: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('vaccination-predicates', () => {
  describe('isVaccinationCreatePayload', () => {
    it('accepts valid create payloads', () => {
      expect(
        isVaccinationCreatePayload({
          petId: 123,
          vaccine_name: 'Rabies',
          administered_at: '2024-01-01',
        })
      ).toBe(true)
    })

    it('rejects invalid create payloads', () => {
      expect(isVaccinationCreatePayload(null)).toBe(false)
      expect(isVaccinationCreatePayload({ petId: 123 })).toBe(false)
      expect(isVaccinationCreatePayload({ vaccine_name: 'Rabies' })).toBe(false)
      expect(
        isVaccinationCreatePayload({
          petId: 0,
          vaccine_name: 'Rabies',
          administered_at: '2024-01-01',
        })
      ).toBe(false)
    })
  })

  describe('isPendingVaccinationCreateOperation', () => {
    it('matches pending vaccination create operations', () => {
      expect(isPendingVaccinationCreateOperation(vaccinationOperation({}))).toBe(true)
    })

    it('filters by pet id when provided', () => {
      expect(isPendingVaccinationCreateOperation(vaccinationOperation({}), 123)).toBe(true)
      expect(isPendingVaccinationCreateOperation(vaccinationOperation({}), 456)).toBe(false)
    })

    it('rejects non-pending or non-create operations', () => {
      expect(isPendingVaccinationCreateOperation(vaccinationOperation({ status: 'failed' }))).toBe(
        false
      )
      expect(
        isPendingVaccinationCreateOperation(vaccinationOperation({ operation: 'update' }))
      ).toBe(false)
      expect(
        isPendingVaccinationCreateOperation(vaccinationOperation({ entityType: 'weight' }))
      ).toBe(false)
    })
  })
})
