import { describe, expect, it } from 'vite-plus/test'
import type { OfflineOperation } from './types'
import {
  isActiveVaccinationDeleteOperation,
  isActiveVaccinationUpdateOperation,
  isPendingVaccinationCreateOperation,
  isPendingVaccinationDeleteOperation,
  isPendingVaccinationUpdateOperation,
  isVaccinationCreatePayload,
  isVaccinationDeletePayload,
  isVaccinationUpdatePayload,
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

  describe('isVaccinationUpdatePayload', () => {
    it('accepts valid update payloads', () => {
      expect(
        isVaccinationUpdatePayload({
          petId: 123,
          recordId: 1,
          vaccine_name: 'Updated',
        })
      ).toBe(true)
    })

    it('rejects invalid update payloads', () => {
      expect(isVaccinationUpdatePayload({ petId: 123 })).toBe(false)
      expect(isVaccinationUpdatePayload({ petId: 123, recordId: 0 })).toBe(false)
    })
  })

  describe('isVaccinationDeletePayload', () => {
    it('accepts valid delete payloads', () => {
      expect(isVaccinationDeletePayload({ petId: 123, recordId: 1 })).toBe(true)
    })

    it('rejects invalid delete payloads', () => {
      expect(isVaccinationDeletePayload({ petId: 123 })).toBe(false)
    })
  })

  describe('isPendingVaccinationUpdateOperation', () => {
    it('matches pending vaccination update operations', () => {
      expect(
        isPendingVaccinationUpdateOperation(
          vaccinationOperation({
            operation: 'update',
            entityId: 1,
            payload: { petId: 123, recordId: 1, notes: 'Updated' },
          })
        )
      ).toBe(true)
    })

    it('filters by pet id when provided', () => {
      expect(
        isPendingVaccinationUpdateOperation(
          vaccinationOperation({
            operation: 'update',
            payload: { petId: 123, recordId: 1 },
          }),
          123
        )
      ).toBe(true)
      expect(
        isPendingVaccinationUpdateOperation(
          vaccinationOperation({
            operation: 'update',
            payload: { petId: 123, recordId: 1 },
          }),
          456
        )
      ).toBe(false)
    })
  })

  describe('isActiveVaccinationUpdateOperation', () => {
    it('includes syncing update operations', () => {
      expect(
        isActiveVaccinationUpdateOperation(
          vaccinationOperation({
            operation: 'update',
            status: 'syncing',
            payload: { petId: 123, recordId: 1, notes: 'Updated' },
          })
        )
      ).toBe(true)
    })

    it('excludes failed update operations', () => {
      expect(
        isActiveVaccinationUpdateOperation(
          vaccinationOperation({
            operation: 'update',
            status: 'failed',
            payload: { petId: 123, recordId: 1, notes: 'Updated' },
          })
        )
      ).toBe(false)
    })
  })

  describe('isPendingVaccinationDeleteOperation', () => {
    it('matches pending vaccination delete operations', () => {
      expect(
        isPendingVaccinationDeleteOperation(
          vaccinationOperation({
            operation: 'delete',
            entityId: 1,
            payload: { petId: 123, recordId: 1 },
          })
        )
      ).toBe(true)
    })
  })

  describe('isActiveVaccinationDeleteOperation', () => {
    it('includes syncing delete operations', () => {
      expect(
        isActiveVaccinationDeleteOperation(
          vaccinationOperation({
            operation: 'delete',
            status: 'syncing',
            payload: { petId: 123, recordId: 1 },
          })
        )
      ).toBe(true)
    })

    it('excludes failed delete operations', () => {
      expect(
        isActiveVaccinationDeleteOperation(
          vaccinationOperation({
            operation: 'delete',
            status: 'failed',
            payload: { petId: 123, recordId: 1 },
          })
        )
      ).toBe(false)
    })
  })
})
