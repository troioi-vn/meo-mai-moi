import type { VaccinationRecord } from '@/api/pets'

export type VaccinationStatus = 'up_to_date' | 'overdue' | 'due_soon' | 'unknown'

/**
 * Calculate the overall vaccination status for a pet based on their vaccination records.
 * - "overdue": At least one vaccination has a due_at date in the past
 * - "due_soon": At least one vaccination is due within the next 30 days
 * - "up_to_date": All vaccinations are current (no overdue, none due soon)
 * - "unknown": No vaccinations with due dates recorded
 */
export function calculateVaccinationStatus(vaccinations: VaccinationRecord[]): VaccinationStatus {
  if (vaccinations.length === 0) {
    return 'unknown'
  }

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let hasOverdue = false
  let hasDueSoon = false
  let hasAnyDueDate = false

  for (const v of vaccinations) {
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
 * sorted by due date ascending
 */
export function getUpcomingVaccinations(vaccinations: VaccinationRecord[]): VaccinationRecord[] {
  const now = new Date()
  // Show vaccinations that are due in the future or were due in the last 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  return vaccinations
    .filter((v) => {
      if (!v.due_at) return false
      const dueDate = new Date(v.due_at)
      return dueDate >= ninetyDaysAgo
    })
    .sort((a, b) => {
      const dateA = new Date(a.due_at!)
      const dateB = new Date(b.due_at!)
      return dateA.getTime() - dateB.getTime()
    })
}

