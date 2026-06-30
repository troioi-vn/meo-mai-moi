import { describe, expect, it } from 'vite-plus/test'
import type { OfflineOperation } from './types'
import {
  isActiveWeightDeleteOperation,
  isPendingWeightCreateOperation,
  isPendingWeightDeleteOperation,
  isPendingWeightUpdateOperation,
  isWeightCreatePayload,
  isWeightDeletePayload,
  isWeightUpdatePayload,
} from './weight-predicates'

function weightOperation(overrides: Partial<OfflineOperation>): OfflineOperation {
  return {
    id: 'op-1',
    idempotencyKey: 'key-1',
    entityType: 'weight',
    entityId: 123,
    operation: 'create',
    payload: {
      weight_kg: 5.5,
      record_date: '2024-01-01',
    },
    status: 'pending',
    attempts: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('weight-predicates', () => {
  describe('isWeightCreatePayload', () => {
    it('accepts valid create payloads', () => {
      expect(
        isWeightCreatePayload({
          weight_kg: 5.5,
          record_date: '2024-01-01',
        })
      ).toBe(true)
    })

    it('rejects invalid create payloads', () => {
      expect(isWeightCreatePayload(null)).toBe(false)
      expect(isWeightCreatePayload({ weight_kg: 5.5 })).toBe(false)
      expect(isWeightCreatePayload({ record_date: '' })).toBe(false)
    })
  })

  describe('isWeightUpdatePayload', () => {
    it('accepts valid update payloads', () => {
      expect(
        isWeightUpdatePayload({
          petId: 123,
          weightId: 1,
          weight_kg: 5.5,
        })
      ).toBe(true)
    })

    it('rejects invalid update payloads', () => {
      expect(isWeightUpdatePayload({ petId: 123 })).toBe(false)
      expect(isWeightUpdatePayload({ petId: 0, weightId: 1 })).toBe(false)
    })
  })

  describe('isPendingWeightCreateOperation', () => {
    it('matches pending weight create operations', () => {
      expect(isPendingWeightCreateOperation(weightOperation({}))).toBe(true)
    })

    it('filters by pet id when provided', () => {
      expect(isPendingWeightCreateOperation(weightOperation({ entityId: 123 }), 123)).toBe(true)
      expect(isPendingWeightCreateOperation(weightOperation({ entityId: 123 }), 456)).toBe(false)
    })

    it('rejects non-pending or non-create operations', () => {
      expect(isPendingWeightCreateOperation(weightOperation({ status: 'failed' }))).toBe(false)
      expect(isPendingWeightCreateOperation(weightOperation({ operation: 'update' }))).toBe(false)
      expect(isPendingWeightCreateOperation(weightOperation({ entityType: 'pet' }))).toBe(false)
    })
  })

  describe('isPendingWeightUpdateOperation', () => {
    it('matches pending weight update operations', () => {
      expect(
        isPendingWeightUpdateOperation(
          weightOperation({
            operation: 'update',
            entityId: 1,
            payload: { petId: 123, weightId: 1, weight_kg: 5.5 },
          })
        )
      ).toBe(true)
    })

    it('filters by pet id when provided', () => {
      const operation = weightOperation({
        operation: 'update',
        entityId: 1,
        payload: { petId: 123, weightId: 1, weight_kg: 5.5 },
      })

      expect(isPendingWeightUpdateOperation(operation, 123)).toBe(true)
      expect(isPendingWeightUpdateOperation(operation, 456)).toBe(false)
    })
  })

  describe('isWeightDeletePayload', () => {
    it('accepts valid delete payloads', () => {
      expect(
        isWeightDeletePayload({
          petId: 123,
          weightId: 1,
        })
      ).toBe(true)
    })

    it('rejects invalid delete payloads', () => {
      expect(isWeightDeletePayload({ petId: 123 })).toBe(false)
      expect(isWeightDeletePayload({ petId: 0, weightId: 1 })).toBe(false)
    })
  })

  describe('isPendingWeightDeleteOperation', () => {
    it('matches pending weight delete operations', () => {
      expect(
        isPendingWeightDeleteOperation(
          weightOperation({
            operation: 'delete',
            entityId: 1,
            payload: { petId: 123, weightId: 1 },
          })
        )
      ).toBe(true)
    })

    it('filters by pet id when provided', () => {
      const operation = weightOperation({
        operation: 'delete',
        entityId: 1,
        payload: { petId: 123, weightId: 1 },
      })

      expect(isPendingWeightDeleteOperation(operation, 123)).toBe(true)
      expect(isPendingWeightDeleteOperation(operation, 456)).toBe(false)
    })

    it('rejects non-pending delete operations', () => {
      expect(
        isPendingWeightDeleteOperation(
          weightOperation({
            operation: 'delete',
            status: 'failed',
            payload: { petId: 123, weightId: 1 },
          })
        )
      ).toBe(false)
    })
  })

  describe('isActiveWeightDeleteOperation', () => {
    it('includes pending and syncing delete operations', () => {
      const payload = { petId: 123, weightId: 1 }

      expect(
        isActiveWeightDeleteOperation(
          weightOperation({
            operation: 'delete',
            status: 'pending',
            payload,
          })
        )
      ).toBe(true)

      expect(
        isActiveWeightDeleteOperation(
          weightOperation({
            operation: 'delete',
            status: 'syncing',
            payload,
          })
        )
      ).toBe(true)
    })

    it('excludes failed delete operations', () => {
      expect(
        isActiveWeightDeleteOperation(
          weightOperation({
            operation: 'delete',
            status: 'failed',
            payload: { petId: 123, weightId: 1 },
          })
        )
      ).toBe(false)
    })
  })
})
