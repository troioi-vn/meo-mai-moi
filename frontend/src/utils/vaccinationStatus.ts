import type { VaccinationRecord } from '@/api/generated/model'

export type VaccinationStatusType = 'up_to_date' | 'overdue' | 'due_soon' | 'unknown'
// Type alias for compatibility with VaccinationStatusBadge component
export type VaccinationStatus = VaccinationStatusType

/**
 * Check if a vaccination record is active (not completed).
 */
export function isActiveVaccination(v: VaccinationRecord): boolean {
  return v.completed_at === null || v.completed_at === undefined
}

/**
 * Filter to only active (non-completed) vaccination records.
 */
export function getActiveVaccinations<T extends VaccinationRecord>(vaccinations: T[]): T[] {
  return vaccinations.filter(isActiveVaccination)
}

/**
 * Calculate the overall vaccination status for a pet based on their vaccination records.
 * Only considers active (non-completed) vaccination records.
 * - "overdue": At least one vaccination has a due_at date in the past
 * - "due_soon": At least one vaccination is due within the next 30 days
 * - "up_to_date": All vaccinations are current (no overdue, none due soon)
 * - "unknown": No vaccinations with due dates recorded
 */
export function calculateVaccinationStatus(
  vaccinations: VaccinationRecord[]
): VaccinationStatusType {
  // Only consider active records
  const activeVaccinations = getActiveVaccinations(vaccinations)

  if (activeVaccinations.length === 0) {
    return 'unknown'
  }

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let hasOverdue = false
  let hasDueSoon = false
  let hasAnyDueDate = false

  for (const v of activeVaccinations) {
    if (!v.due_at) continue
    hasAnyDueDate = true

    const dueDate = new Date(v.due_at)

    if (dueDate < now) {
      hasOverdue = true
    } else if (dueDate <= thirtyDaysFromNow) {
      hasDueSoon = true
    }
  }

  if (!hasAnyDueDate) {
    return 'unknown'
  }

  if (hasOverdue) {
    return 'overdue'
  }

  if (hasDueSoon) {
    return 'due_soon'
  }

  return 'up_to_date'
}

/**
 * Get upcoming vaccinations (those with a due_at date in the future or recently overdue)
 * sorted by due date ascending. Only includes active (non-completed) records.
 */
export function getUpcomingVaccinations<T extends VaccinationRecord>(vaccinations: T[]): T[] {
  const now = new Date()
  // Show vaccinations that are due in the future or were due in the last 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  return vaccinations
    .filter((v) => {
      // Only include active (non-completed) records
      if (!isActiveVaccination(v)) return false
      if (!v.due_at) return false
      const dueDate = new Date(v.due_at)
      return dueDate >= ninetyDaysAgo
    })
    .sort((a, b) => {
      const dateA = new Date(a.due_at ?? 0).getTime()
      const dateB = new Date(b.due_at ?? 0).getTime()
      return dateA - dateB
    })
}

/**
 * Calculate the interval in days between administered_at and due_at.
 * Returns null if either date is missing.
 */
export function getVaccinationIntervalDays(v: VaccinationRecord): number | null {
  if (!v.administered_at || !v.due_at) return null
  const administered = new Date(v.administered_at ?? 0)
  const due = new Date(v.due_at ?? 0)
  const diffMs = due.getTime() - administered.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calculate the next due date based on a new administered date and the original interval.
 */
export function calculateNextDueDate(newAdministeredAt: string, intervalDays: number): string {
  const administered = new Date(newAdministeredAt)
  const nextDue = new Date(administered.getTime() + intervalDays * 24 * 60 * 60 * 1000)
  return nextDue.toISOString().split('T')[0] ?? ''
}
