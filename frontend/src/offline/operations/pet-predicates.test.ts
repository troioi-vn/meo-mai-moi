import { describe, expect, it } from 'vite-plus/test'
import {
  isPendingPetCreateOperation,
  isPendingPetDeleteOperation,
  isPendingPetStatusUpdateOperation,
  isPendingPetUpdateOperation,
  isPetCreatePayload,
  isPetDeletePayload,
  isPetStatusUpdatePayload,
  isPetUpdatePayload,
} from './pet-predicates'
import type { OfflineOperation } from './types'

const baseOperation = (overrides: Partial<OfflineOperation>): OfflineOperation => ({
  id: 'op-1',
  idempotencyKey: 'idem-1',
  entityType: 'pet',
  entityId: 1,
  operation: 'create',
  payload: { name: 'Mochi', description: 'Cat', country: 'VN', pet_type_id: 1 },
  status: 'pending',
  attempts: 0,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
})

describe('pet-predicates', () => {
  it('detects pet create payloads and operations', () => {
    expect(isPetCreatePayload({ name: 'Mochi', description: 'Cat', country: 'VN' })).toBe(true)
    expect(isPetCreatePayload({ name: '' })).toBe(false)
    expect(isPendingPetCreateOperation(baseOperation({ operation: 'create' }))).toBe(true)
    expect(isPendingPetCreateOperation(baseOperation({ entityType: 'weight' }))).toBe(false)
  })

  it('distinguishes profile updates from status updates', () => {
    expect(
      isPetUpdatePayload({
        petId: 1,
        data: { name: 'Updated' },
      })
    ).toBe(true)
    expect(isPetStatusUpdatePayload({ petId: 1, status: 'lost' })).toBe(true)
    expect(
      isPendingPetUpdateOperation(
        baseOperation({
          operation: 'update',
          payload: { petId: 1, data: { name: 'Updated' } },
        })
      )
    ).toBe(true)
    expect(
      isPendingPetStatusUpdateOperation(
        baseOperation({
          operation: 'update',
          payload: { petId: 1, status: 'lost' },
        })
      )
    ).toBe(true)
  })

  it('detects delete payloads and operations', () => {
    expect(isPetDeletePayload({ petId: 1 })).toBe(true)
    expect(
      isPendingPetDeleteOperation(
        baseOperation({
          operation: 'delete',
          payload: { petId: 1 },
        })
      )
    ).toBe(true)
  })
})
