import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateVaccinationStatus,
  getUpcomingVaccinations,
  isActiveVaccination,
  getActiveVaccinations,
  getVaccinationIntervalDays,
  calculateNextDueDate,
} from './vaccinationStatus'
import type { VaccinationRecord } from '@/api/pets'

const createVaccination = (overrides: Partial<VaccinationRecord> = {}): VaccinationRecord => ({
  id: 1,
  pet_id: 1,
  vaccine_name: 'Rabies',
  administered_at: '2024-01-01',
  due_at: null,
  notes: null,
  reminder_sent_at: null,
  completed_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('vaccinationStatus', () => {
  describe('calculateVaccinationStatus', () => {
    beforeEach(() => {
      // Mock current date to 2024-06-15
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "unknown" when no vaccinations', () => {
      expect(calculateVaccinationStatus([])).toBe('unknown')
    })

    it('returns "unknown" when no vaccinations have due dates', () => {
      const vaccinations = [
        createVaccination({ due_at: null }),
        createVaccination({ id: 2, due_at: undefined }),
      ]
      expect(calculateVaccinationStatus(vaccinations)).toBe('unknown')
    })

    it('returns "overdue" when any vaccination is past due', () => {
      const vaccinations = [
        createVaccination({ due_at: '2024-06-01' }), // Past due
        createVaccination({ id: 2, due_at: '2024-12-01' }), // Future
      ]
      expect(calculateVaccinationStatus(vaccinations)).toBe('overdue')
    })

    it('returns "due_soon" when vaccination is due within 30 days', () => {
      const vaccinations = [
        createVaccination({ due_at: '2024-06-20' }), // 5 days from now
      ]
      expect(calculateVaccinationStatus(vaccinations)).toBe('due_soon')
    })

    it('returns "up_to_date" when all vaccinations are current', () => {
      const vaccinations = [
        createVaccination({ due_at: '2024-08-01' }), // More than 30 days away
        createVaccination({ id: 2, due_at: '2024-12-01' }),
      ]
      expect(calculateVaccinationStatus(vaccinations)).toBe('up_to_date')
    })

    it('prioritizes "overdue" over "due_soon"', () => {
      const vaccinations = [
        createVaccination({ due_at: '2024-06-01' }), // Overdue
        createVaccination({ id: 2, due_at: '2024-06-20' }), // Due soon
      ]
      expect(calculateVaccinationStatus(vaccinations)).toBe('overdue')
    })
  })

  describe('getUpcomingVaccinations', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns empty array when no vaccinations', () => {
      expect(getUpcomingVaccinations([])).toEqual([])
    })

    it('filters out vaccinations without due dates', () => {
      const vaccinations = [
        createVaccination({ due_at: null }),
        createVaccination({ id: 2, due_at: '2024-07-01' }),
      ]
      const result = getUpcomingVaccinations(vaccinations)
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe(2)
    })

    it('includes vaccinations due in the future', () => {
      const vaccinations = [
        createVaccination({ due_at: '2024-07-01' }),
        createVaccination({ id: 2, due_at: '2024-12-01' }),
      ]
      const result = getUpcomingVaccinations(vaccinations)
      expect(result).toHaveLength(2)
    })

    it('includes recently overdue vaccinations (within 90 days)', () => {
      const vaccinations = [
        createVaccination({ due_at: '2024-04-01' }), // ~75 days ago, should be included
        createVaccination({ id: 2, due_at: '2024-01-01' }), // ~165 days ago, excluded
      ]
      const result = getUpcomingVaccinations(vaccinations)
      expect(result).toHaveLength(1)
      expect(result[0]?.due_at).toBe('2024-04-01')
    })

    it('sorts by due date ascending', () => {
      const vaccinations = [
        createVaccination({ id: 1, due_at: '2024-12-01' }),
        createVaccination({ id: 2, due_at: '2024-07-01' }),
        createVaccination({ id: 3, due_at: '2024-09-01' }),
      ]
      const result = getUpcomingVaccinations(vaccinations)
      expect(result.map((v) => v.id)).toEqual([2, 3, 1])
    })

    it('excludes completed vaccinations', () => {
      const vaccinations = [
        createVaccination({ id: 1, due_at: '2024-07-01', completed_at: '2024-06-10T00:00:00Z' }),
        createVaccination({ id: 2, due_at: '2024-08-01' }),
      ]
      const result = getUpcomingVaccinations(vaccinations)
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe(2)
    })
  })

  describe('isActiveVaccination', () => {
    it('returns true for vaccination with null completed_at', () => {
      const vaccination = createVaccination({ completed_at: null })
      expect(isActiveVaccination(vaccination)).toBe(true)
    })

    it('returns true for vaccination with undefined completed_at', () => {
      const vaccination = createVaccination({ completed_at: undefined })
      expect(isActiveVaccination(vaccination)).toBe(true)
    })

    it('returns false for vaccination with completed_at set', () => {
      const vaccination = createVaccination({ completed_at: '2024-06-10T00:00:00Z' })
      expect(isActiveVaccination(vaccination)).toBe(false)
    })
  })

  describe('getActiveVaccinations', () => {
    it('filters out completed vaccinations', () => {
      const vaccinations = [
        createVaccination({ id: 1, completed_at: null }),
        createVaccination({ id: 2, completed_at: '2024-06-10T00:00:00Z' }),
        createVaccination({ id: 3, completed_at: null }),
      ]
      const result = getActiveVaccinations(vaccinations)
      expect(result).toHaveLength(2)
      expect(result.map((v) => v.id)).toEqual([1, 3])
    })
  })

  describe('calculateVaccinationStatus with completed records', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('ignores completed vaccinations when calculating status', () => {
      const vaccinations = [
        createVaccination({ id: 1, due_at: '2024-06-01', completed_at: '2024-06-10T00:00:00Z' }), // Completed, would be overdue
        createVaccination({ id: 2, due_at: '2024-08-01' }), // Active, up to date
      ]
      expect(calculateVaccinationStatus(vaccinations)).toBe('up_to_date')
    })

    it('returns unknown if all vaccinations are completed', () => {
      const vaccinations = [
        createVaccination({ id: 1, due_at: '2024-06-01', completed_at: '2024-06-10T00:00:00Z' }),
        createVaccination({ id: 2, due_at: '2024-07-01', completed_at: '2024-06-12T00:00:00Z' }),
      ]
      expect(calculateVaccinationStatus(vaccinations)).toBe('unknown')
    })
  })

  describe('getVaccinationIntervalDays', () => {
    it('returns null if administered_at is missing', () => {
      const vaccination = createVaccination({ administered_at: '', due_at: '2025-01-01' })
      expect(getVaccinationIntervalDays(vaccination)).toBe(null)
    })

    it('returns null if due_at is missing', () => {
      const vaccination = createVaccination({ administered_at: '2024-01-01', due_at: null })
      expect(getVaccinationIntervalDays(vaccination)).toBe(null)
    })

    it('calculates interval correctly for 1 year', () => {
      const vaccination = createVaccination({
        administered_at: '2024-01-01',
        due_at: '2025-01-01',
      })
      expect(getVaccinationIntervalDays(vaccination)).toBe(366) // 2024 is a leap year
    })

    it('calculates interval correctly for 6 months', () => {
      const vaccination = createVaccination({
        administered_at: '2024-01-01',
        due_at: '2024-07-01',
      })
      expect(getVaccinationIntervalDays(vaccination)).toBe(182)
    })
  })

  describe('calculateNextDueDate', () => {
    it('calculates next due date correctly', () => {
      const result = calculateNextDueDate('2024-06-15', 365)
      expect(result).toBe('2025-06-15')
    })

    it('calculates next due date for 30 days interval', () => {
      const result = calculateNextDueDate('2024-06-15', 30)
      expect(result).toBe('2024-07-15')
    })
  })
})
