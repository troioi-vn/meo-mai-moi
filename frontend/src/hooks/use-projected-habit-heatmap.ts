import { useMemo } from 'react'
import type { Habit, HabitDaySummary } from '@/api/generated/model'
import { isHabitDayEntriesPayload } from '@/offline/operations/habit-predicates'
import { projectHabitHeatmapDays } from '@/offline/projections'
import { useOfflineOperationsSnapshot } from '@/hooks/use-offline-operation-markers'

export function useProjectedHabitHeatmap(
  habit: Pick<Habit, 'id' | 'value_type'> | null | undefined,
  serverDays: HabitDaySummary[]
): HabitDaySummary[] {
  const operations = useOfflineOperationsSnapshot()

  return useMemo(() => {
    if (!habit?.id) {
      return serverDays
    }

    const pendingDayOperations = operations.filter(
      (operation) =>
        operation.entityType === 'habit' &&
        isHabitDayEntriesPayload(operation.payload) &&
        operation.payload.habitId === habit.id
    )

    return projectHabitHeatmapDays(serverDays, pendingDayOperations, habit)
  }, [habit, operations, serverDays])
}
