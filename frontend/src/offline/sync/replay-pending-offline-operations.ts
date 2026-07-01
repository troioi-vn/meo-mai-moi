import type { QueryClient } from '@tanstack/react-query'
import { replayPendingHabitDayEntries } from './replay-habit-day-entries'
import { replayPendingHabitUpdates } from './replay-habit-updates'
import { replayPendingMedicalRecordOperations } from './replay-pending-medical-record-operations'
import { replayPendingVaccinationOperations } from './replay-pending-vaccination-operations'
import { replayPendingWeightOperations } from './replay-pending-weight-operations'

/**
 * Replays queued offline operations in deterministic cross-domain order:
 * weights → vaccinations → medical records (creates, then updates, then deletes) →
 * habit metadata updates → habit day entries.
 *
 * Within each domain, operations keep store insertion order. Medical record creates
 * must finish (and promote pending photos) before later domains run.
 */
export async function replayPendingOfflineOperations(queryClient: QueryClient): Promise<void> {
  await replayPendingWeightOperations(queryClient)
  await replayPendingVaccinationOperations(queryClient)
  await replayPendingMedicalRecordOperations(queryClient)
  await replayPendingHabitUpdates(queryClient)
  await replayPendingHabitDayEntries(queryClient)
}
