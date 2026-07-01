import { describe, expect, it, vi, beforeEach } from 'vite-plus/test'
import { QueryClient } from '@tanstack/react-query'
import { replayPendingOfflineOperations } from './replay-pending-offline-operations'

vi.mock('./replay-pending-weight-operations', () => ({
  replayPendingWeightOperations: vi.fn(),
}))
vi.mock('./replay-pending-vaccination-operations', () => ({
  replayPendingVaccinationOperations: vi.fn(),
}))
vi.mock('./replay-pending-medical-record-operations', () => ({
  replayPendingMedicalRecordOperations: vi.fn(),
}))
vi.mock('./replay-habit-updates', () => ({
  replayPendingHabitUpdates: vi.fn(),
}))
vi.mock('./replay-habit-day-entries', () => ({
  replayPendingHabitDayEntries: vi.fn(),
}))

import { replayPendingWeightOperations } from './replay-pending-weight-operations'
import { replayPendingVaccinationOperations } from './replay-pending-vaccination-operations'
import { replayPendingMedicalRecordOperations } from './replay-pending-medical-record-operations'
import { replayPendingHabitUpdates } from './replay-habit-updates'
import { replayPendingHabitDayEntries } from './replay-habit-day-entries'

describe('replayPendingOfflineOperations', () => {
  const queryClient = new QueryClient()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('replays domains in deterministic order', async () => {
    const order: string[] = []

    vi.mocked(replayPendingWeightOperations).mockImplementation(async () => {
      order.push('weights')
    })
    vi.mocked(replayPendingVaccinationOperations).mockImplementation(async () => {
      order.push('vaccinations')
    })
    vi.mocked(replayPendingMedicalRecordOperations).mockImplementation(async () => {
      order.push('medical_records')
    })
    vi.mocked(replayPendingHabitUpdates).mockImplementation(async () => {
      order.push('habit_updates')
    })
    vi.mocked(replayPendingHabitDayEntries).mockImplementation(async () => {
      order.push('habit_day_entries')
    })

    await replayPendingOfflineOperations(queryClient)

    expect(order).toEqual([
      'weights',
      'vaccinations',
      'medical_records',
      'habit_updates',
      'habit_day_entries',
    ])
  })
})
