import { describe, expect, it } from 'vite-plus/test'
import type { HabitDaySummary } from '@/api/generated/model'
import type { OfflineOperation } from '@/offline/operations/types'
import { projectHabitHeatmapDays } from './habits'

const habit = { id: 5, value_type: 'yes_no' as const }

const serverDays: HabitDaySummary[] = [
  { date: '2026-04-08', entry_count: 0, display_value: null, normalized_intensity: 0 },
  { date: '2026-04-09', entry_count: 1, display_value: 1, normalized_intensity: 1 },
]

function dayOperation(
  date: string,
  entries: { pet_id: number; value_int: number | null }[],
  status: OfflineOperation['status'] = 'pending'
): OfflineOperation {
  return {
    id: `op-${date}`,
    idempotencyKey: `idem-${date}`,
    entityType: 'habit',
    entityId: habit.id,
    operation: 'update',
    payload: {
      habitId: habit.id,
      date,
      entries,
    },
    status,
    attempts: 0,
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('projectHabitHeatmapDays', () => {
  it('merges pending day entries onto server heatmap rows', () => {
    const projected = projectHabitHeatmapDays(
      serverDays,
      [dayOperation('2026-04-08', [{ pet_id: 1, value_int: 1 }])],
      habit
    )

    const pendingDay = projected.find((day) => day.date === '2026-04-08')
    expect(pendingDay).toMatchObject({
      entry_count: 1,
      display_value: 1,
      normalized_intensity: 1,
    })
  })

  it('replaces an existing server day with the pending day payload', () => {
    const projected = projectHabitHeatmapDays(
      serverDays,
      [dayOperation('2026-04-09', [{ pet_id: 1, value_int: null }])],
      habit
    )

    const clearedDay = projected.find((day) => day.date === '2026-04-09')
    expect(clearedDay).toMatchObject({
      entry_count: 0,
      display_value: null,
      normalized_intensity: 0,
    })
  })

  it('keeps failed day entries projected for recovery', () => {
    const projected = projectHabitHeatmapDays(
      [],
      [dayOperation('2026-04-10', [{ pet_id: 1, value_int: 1 }], 'failed')],
      habit
    )

    expect(projected).toEqual([
      {
        date: '2026-04-10',
        entry_count: 1,
        display_value: 1,
        normalized_intensity: 1,
      },
    ])
  })
})
