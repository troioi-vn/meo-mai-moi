import type { Habit, HabitDaySummary } from '@/api/generated/model'
import type { HabitDayEntriesPayload } from '@/offline/operations'
import type { OfflineOperation } from '@/offline/operations/types'
import { isHabitDayEntriesPayload } from '@/offline/operations/habit-predicates'

const PROJECTABLE_OPERATION_STATUSES = new Set<OfflineOperation['status']>([
  'pending',
  'syncing',
  'failed',
  'conflicted',
])

export interface ProjectedHabitUpdate {
  habitId: number
  data: Record<string, unknown>
}

function summarizeDayEntries(
  entries: HabitDayEntriesPayload['entries'],
  valueType: Habit['value_type']
): Pick<HabitDaySummary, 'entry_count' | 'display_value' | 'normalized_intensity'> {
  const currentEntries = entries.filter((entry) => entry.value_int !== null)
  const entryCount = currentEntries.length

  if (entryCount === 0) {
    return {
      entry_count: 0,
      display_value: null,
      normalized_intensity: 0,
    }
  }

  if (valueType === 'yes_no') {
    return {
      entry_count: entryCount,
      display_value: 1,
      normalized_intensity: 1,
    }
  }

  const values = currentEntries
    .map((entry) => entry.value_int)
    .filter((value): value is number => typeof value === 'number')
  const average = values.reduce((sum, value) => sum + value, 0) / values.length

  return {
    entry_count: entryCount,
    display_value: average,
    normalized_intensity: Math.min(1, Math.max(0, average / 10)),
  }
}

export function projectHabitHeatmapDays(
  serverDays: HabitDaySummary[],
  pendingDayOperations: OfflineOperation[],
  habit: Pick<Habit, 'id' | 'value_type'>
): HabitDaySummary[] {
  const habitId = habit.id
  if (!habitId) {
    return serverDays
  }

  const dayByDate = new Map(serverDays.map((day) => [day.date ?? '', day]))

  for (const operation of pendingDayOperations) {
    if (
      operation.entityType !== 'habit' ||
      operation.operation !== 'update' ||
      !PROJECTABLE_OPERATION_STATUSES.has(operation.status)
    ) {
      continue
    }

    if (!isHabitDayEntriesPayload(operation.payload)) {
      continue
    }

    if (operation.payload.habitId !== habitId) {
      continue
    }

    const { date, entries } = operation.payload
    const summary = summarizeDayEntries(entries, habit.value_type)
    const existing = dayByDate.get(date)

    dayByDate.set(date, {
      ...(existing ?? { date }),
      date,
      ...summary,
    })
  }

  return Array.from(dayByDate.values())
}

export function projectHabit(
  serverHabit: Habit,
  pendingUpdate: ProjectedHabitUpdate | null
): Habit {
  if (!pendingUpdate) {
    return serverHabit
  }

  return {
    ...serverHabit,
    ...pendingUpdate.data,
  } as Habit
}
