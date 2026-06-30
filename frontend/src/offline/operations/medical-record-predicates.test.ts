import { describe, expect, it } from 'vite-plus/test'
import type { OfflineOperation } from './types'
import {
  isMedicalRecordCreatePayload,
  isPendingMedicalRecordCreateOperation,
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
})
