import { api } from '@/api/axios'
import type { Habit, HabitDayEntry } from '@/api/generated/model'

export interface HabitDayEntriesResponse {
  habit: Habit
  date: string
  entries: HabitDayEntry[]
}

export interface HabitDayEntriesUpsertBody {
  entries: {
    pet_id: number
    value_int: number | null
  }[]
}

export function getHabitDayEntries(habitId: number, date: string) {
  return api.get<HabitDayEntriesResponse>(`/habits/${String(habitId)}/entries/${date}`)
}

export function putHabitDayEntries(habitId: number, date: string, data: HabitDayEntriesUpsertBody) {
  return api.put<HabitDayEntriesResponse>(`/habits/${String(habitId)}/entries/${date}`, data)
}
