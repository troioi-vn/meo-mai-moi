import type { OfflineOperation } from './types'

export interface HabitDayEntriesPayload {
  habitId: number
  date: string
  entries: {
    pet_id: number
    value_int: number | null
  }[]
}

export interface HabitUpdatePayload {
  kind: 'habit-update'
  habitId: number
  data: Record<string, unknown>
}

export function isHabitDayEntriesPayload(payload: unknown): payload is HabitDayEntriesPayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as HabitDayEntriesPayload
  return (
    typeof candidate.habitId === 'number' &&
    Number.isFinite(candidate.habitId) &&
    candidate.habitId > 0 &&
    typeof candidate.date === 'string' &&
    candidate.date.length > 0 &&
    Array.isArray(candidate.entries) &&
    candidate.entries.every(
      (entry) =>
        typeof entry.pet_id === 'number' &&
        Number.isFinite(entry.pet_id) &&
        entry.pet_id > 0 &&
        (entry.value_int === null || typeof entry.value_int === 'number')
    )
  )
}

export function isPendingHabitDayEntriesOperation(
  operation: OfflineOperation,
  habitId?: number | string
): boolean {
  if (
    operation.entityType !== 'habit' ||
    operation.operation !== 'update' ||
    operation.status !== 'pending' ||
    !isHabitDayEntriesPayload(operation.payload)
  ) {
    return false
  }

  if (arguments.length < 2 || habitId === undefined) {
    return true
  }

  return String(operation.payload.habitId) === String(habitId)
}

export function isPendingHabitDayEntriesOperationForDate(
  operation: OfflineOperation,
  habitId: number,
  date: string
): boolean {
  return (
    isPendingHabitDayEntriesOperation(operation, habitId) &&
    isHabitDayEntriesPayload(operation.payload) &&
    operation.payload.date === date
  )
}

export function isHabitUpdatePayload(payload: unknown): payload is HabitUpdatePayload {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as {
    kind?: unknown
    habitId?: unknown
    data?: unknown
  }
  return (
    candidate.kind === 'habit-update' &&
    typeof candidate.habitId === 'number' &&
    Number.isFinite(candidate.habitId) &&
    candidate.habitId > 0 &&
    Boolean(candidate.data) &&
    typeof candidate.data === 'object' &&
    !Array.isArray(candidate.data)
  )
}

export function isPendingHabitUpdateOperation(
  operation: OfflineOperation,
  habitId?: number | string
): boolean {
  if (
    operation.entityType !== 'habit' ||
    operation.operation !== 'update' ||
    operation.status !== 'pending' ||
    !isHabitUpdatePayload(operation.payload)
  ) {
    return false
  }

  if (arguments.length < 2 || habitId === undefined) {
    return true
  }

  return String(operation.payload.habitId) === String(habitId)
}
