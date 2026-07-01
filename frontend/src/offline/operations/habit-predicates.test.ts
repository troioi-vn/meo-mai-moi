import { describe, expect, it } from 'vite-plus/test'
import type { OfflineOperation } from './types'
import {
  isHabitDayEntriesPayload,
  isHabitUpdatePayload,
  isPendingHabitDayEntriesOperation,
  isPendingHabitDayEntriesOperationForDate,
  isPendingHabitUpdateOperation,
} from './habit-predicates'

function habitOperation(overrides: Partial<OfflineOperation>): OfflineOperation {
  return {
    id: 'op-1',
    idempotencyKey: 'key-1',
    entityType: 'habit',
    entityId: 123,
    operation: 'update',
    payload: {
      habitId: 123,
      date: '2026-04-10',
      entries: [{ pet_id: 101, value_int: 1 }],
    },
    status: 'pending',
    attempts: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('habit-predicates', () => {
  describe('isHabitDayEntriesPayload', () => {
    it('accepts valid day-entry payloads', () => {
      expect(
        isHabitDayEntriesPayload({
          habitId: 123,
          date: '2026-04-10',
          entries: [
            { pet_id: 101, value_int: 1 },
            { pet_id: 202, value_int: null },
          ],
        })
      ).toBe(true)
    })

    it('rejects invalid day-entry payloads', () => {
      expect(isHabitDayEntriesPayload(null)).toBe(false)
      expect(isHabitDayEntriesPayload({ habitId: 0, date: '2026-04-10', entries: [] })).toBe(false)
      expect(isHabitDayEntriesPayload({ habitId: 123, date: '', entries: [] })).toBe(false)
      expect(
        isHabitDayEntriesPayload({
          habitId: 123,
          date: '2026-04-10',
          entries: [{ pet_id: 0, value_int: 1 }],
        })
      ).toBe(false)
    })
  })

  describe('isPendingHabitDayEntriesOperation', () => {
    it('matches pending habit day-entry operations by habit id', () => {
      expect(isPendingHabitDayEntriesOperation(habitOperation({}))).toBe(true)
      expect(isPendingHabitDayEntriesOperation(habitOperation({}), 123)).toBe(true)
      expect(isPendingHabitDayEntriesOperation(habitOperation({}), 456)).toBe(false)
    })

    it('rejects non-pending habit operations', () => {
      expect(isPendingHabitDayEntriesOperation(habitOperation({ status: 'failed' }))).toBe(false)
      expect(isPendingHabitDayEntriesOperation(habitOperation({ operation: 'create' }))).toBe(false)
      expect(isPendingHabitDayEntriesOperation(habitOperation({ entityType: 'weight' }))).toBe(
        false
      )
    })
  })

  describe('isPendingHabitDayEntriesOperationForDate', () => {
    it('matches the exact habit and date', () => {
      expect(isPendingHabitDayEntriesOperationForDate(habitOperation({}), 123, '2026-04-10')).toBe(
        true
      )
      expect(isPendingHabitDayEntriesOperationForDate(habitOperation({}), 123, '2026-04-11')).toBe(
        false
      )
    })
  })

  describe('isHabitUpdatePayload', () => {
    it('accepts valid habit update payloads', () => {
      expect(
        isHabitUpdatePayload({
          kind: 'habit-update',
          habitId: 123,
          data: { name: 'Dinner meds' },
        })
      ).toBe(true)
    })

    it('rejects invalid habit update payloads', () => {
      expect(isHabitUpdatePayload(null)).toBe(false)
      expect(isHabitUpdatePayload({ kind: 'habit-update', habitId: 0, data: {} })).toBe(false)
      expect(isHabitUpdatePayload({ kind: 'habit-update', habitId: 123, data: [] })).toBe(false)
    })
  })

  describe('isPendingHabitUpdateOperation', () => {
    it('matches pending habit edit operations by habit id', () => {
      const operation = habitOperation({
        payload: {
          kind: 'habit-update',
          habitId: 123,
          data: { name: 'Dinner meds' },
        },
      })

      expect(isPendingHabitUpdateOperation(operation)).toBe(true)
      expect(isPendingHabitUpdateOperation(operation, 123)).toBe(true)
      expect(isPendingHabitUpdateOperation(operation, 456)).toBe(false)
    })

    it('does not match day-entry operations', () => {
      expect(isPendingHabitUpdateOperation(habitOperation({}))).toBe(false)
    })
  })
})
