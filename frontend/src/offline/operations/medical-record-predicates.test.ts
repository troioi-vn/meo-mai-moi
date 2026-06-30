import { describe, expect, it } from 'vite-plus/test'
import type { OfflineOperation } from './types'
import {
  isActiveMedicalRecordDeleteOperation,
  isMedicalRecordCreatePayload,
  isMedicalRecordDeletePayload,
  isMedicalRecordUpdatePayload,
  isPendingMedicalRecordCreateOperation,
  isPendingMedicalRecordDeleteOperation,
  isPendingMedicalRecordUpdateOperation,
} from './medical-record-predicates'

function medicalRecordOperation(overrides: Partial<OfflineOperation>): OfflineOperation {
  return {
    id: 'op-1',
    idempotencyKey: 'key-1',
    entityType: 'medical_record',
    entityId: 123,
    operation: 'create',
    localEntityId: 'local-1',
    payload: {
      petId: 123,
      record_type: 'vet_visit',
      description: 'Annual checkup',
      record_date: '2024-01-01',
      vet_name: 'Dr. Smith',
    },
    status: 'pending',
    attempts: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('medical-record-predicates', () => {
  describe('isMedicalRecordCreatePayload', () => {
    it('accepts valid create payloads', () => {
      expect(
        isMedicalRecordCreatePayload({
          petId: 123,
          record_type: 'vet_visit',
          description: 'Annual checkup',
          record_date: '2024-01-01',
          vet_name: 'Dr. Smith',
        })
      ).toBe(true)
    })

    it('accepts empty description', () => {
      expect(
        isMedicalRecordCreatePayload({
          petId: 123,
          record_type: 'vet_visit',
          description: '',
          record_date: '2024-01-01',
        })
      ).toBe(true)
    })

    it('rejects invalid payloads', () => {
      expect(isMedicalRecordCreatePayload(null)).toBe(false)
      expect(
        isMedicalRecordCreatePayload({
          petId: 0,
          record_type: 'vet_visit',
          description: '',
          record_date: '2024-01-01',
        })
      ).toBe(false)
      expect(
        isMedicalRecordCreatePayload({
          petId: 123,
          record_type: '',
          description: '',
          record_date: '2024-01-01',
        })
      ).toBe(false)
    })
  })

  describe('isMedicalRecordUpdatePayload', () => {
    it('accepts valid update payloads', () => {
      expect(
        isMedicalRecordUpdatePayload({
          petId: 123,
          recordId: 1,
          description: 'Updated',
        })
      ).toBe(true)
    })

    it('rejects invalid update payloads', () => {
      expect(isMedicalRecordUpdatePayload(null)).toBe(false)
      expect(isMedicalRecordUpdatePayload({ petId: 123, recordId: 0 })).toBe(false)
      expect(isMedicalRecordUpdatePayload({ petId: 0, recordId: 1 })).toBe(false)
    })
  })

  describe('isMedicalRecordDeletePayload', () => {
    it('accepts valid delete payloads', () => {
      expect(isMedicalRecordDeletePayload({ petId: 123, recordId: 1 })).toBe(true)
    })

    it('rejects invalid delete payloads', () => {
      expect(isMedicalRecordDeletePayload(null)).toBe(false)
      expect(isMedicalRecordDeletePayload({ petId: 123, recordId: 0 })).toBe(false)
      expect(isMedicalRecordDeletePayload({ petId: 0, recordId: 1 })).toBe(false)
    })
  })

  describe('isPendingMedicalRecordCreateOperation', () => {
    it('matches pending medical record create operations', () => {
      expect(isPendingMedicalRecordCreateOperation(medicalRecordOperation({}))).toBe(true)
    })

    it('filters by pet id when provided', () => {
      expect(isPendingMedicalRecordCreateOperation(medicalRecordOperation({}), 123)).toBe(true)
      expect(isPendingMedicalRecordCreateOperation(medicalRecordOperation({}), 456)).toBe(false)
    })

    it('rejects non-create or non-pending operations', () => {
      expect(
        isPendingMedicalRecordCreateOperation(medicalRecordOperation({ status: 'failed' }))
      ).toBe(false)
      expect(
        isPendingMedicalRecordCreateOperation(medicalRecordOperation({ operation: 'update' }))
      ).toBe(false)
      expect(
        isPendingMedicalRecordCreateOperation(medicalRecordOperation({ entityType: 'weight' }))
      ).toBe(false)
    })
  })

  describe('isPendingMedicalRecordUpdateOperation', () => {
    it('matches pending medical record update operations by pet id', () => {
      const operation = medicalRecordOperation({
        operation: 'update',
        entityId: 1,
        payload: { petId: 123, recordId: 1, description: 'Updated' },
      })

      expect(isPendingMedicalRecordUpdateOperation(operation)).toBe(true)
      expect(isPendingMedicalRecordUpdateOperation(operation, 123)).toBe(true)
      expect(isPendingMedicalRecordUpdateOperation(operation, 456)).toBe(false)
    })
  })

  describe('isPendingMedicalRecordDeleteOperation', () => {
    it('matches pending medical record delete operations by pet id', () => {
      const operation = medicalRecordOperation({
        operation: 'delete',
        entityId: 1,
        payload: { petId: 123, recordId: 1 },
      })

      expect(isPendingMedicalRecordDeleteOperation(operation)).toBe(true)
      expect(isPendingMedicalRecordDeleteOperation(operation, 123)).toBe(true)
      expect(isPendingMedicalRecordDeleteOperation(operation, 456)).toBe(false)
    })
  })

  describe('isActiveMedicalRecordDeleteOperation', () => {
    it('matches pending and syncing medical record delete operations', () => {
      expect(
        isActiveMedicalRecordDeleteOperation(
          medicalRecordOperation({
            operation: 'delete',
            payload: { petId: 123, recordId: 1 },
          }),
          123
        )
      ).toBe(true)
      expect(
        isActiveMedicalRecordDeleteOperation(
          medicalRecordOperation({
            operation: 'delete',
            status: 'syncing',
            payload: { petId: 123, recordId: 1 },
          }),
          123
        )
      ).toBe(true)
      expect(
        isActiveMedicalRecordDeleteOperation(
          medicalRecordOperation({
            operation: 'delete',
            status: 'failed',
            payload: { petId: 123, recordId: 1 },
          }),
          123
        )
      ).toBe(false)
    })
  })
})
