import type { QueryClient } from '@tanstack/react-query'
import {
  getGetHabitsHabitHeatmapQueryKey,
  getGetHabitsHabitQueryKey,
  getGetHabitsQueryKey,
} from '@/api/generated/habits/habits'

export async function invalidateHabitList(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() })
}

export async function invalidateHabitDetail(queryClient: QueryClient, habitId: number) {
  await queryClient.invalidateQueries({ queryKey: getGetHabitsHabitQueryKey(habitId) })
}

export async function invalidateHabitHeatmap(queryClient: QueryClient, habitId: number) {
  await queryClient.invalidateQueries({ queryKey: getGetHabitsHabitHeatmapQueryKey(habitId) })
}

export async function invalidateHabitViews(queryClient: QueryClient, habitId: number) {
  await Promise.all([
    invalidateHabitList(queryClient),
    invalidateHabitDetail(queryClient, habitId),
    invalidateHabitHeatmap(queryClient, habitId),
  ])
}
