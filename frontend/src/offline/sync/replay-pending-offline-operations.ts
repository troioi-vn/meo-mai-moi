import type { QueryClient } from '@tanstack/react-query'
import { replayPendingHabitDayEntries } from './replay-habit-day-entries'
import { replayPendingHabitUpdates } from './replay-habit-updates'
import { replayPendingMedicalRecordOperations } from './replay-pending-medical-record-operations'
import { replayPendingPetOperations } from './replay-pending-pet-operations'
import { replayPendingVaccinationOperations } from './replay-pending-vaccination-operations'
import { replayPendingWeightOperations } from './replay-pending-weight-operations'

/**
 * Replays queued offline operations in deterministic cross-domain order:
 * pets (creates, then updates, then status updates, then deletes) →
 * weights → vaccinations → medical records (creates, then updates, then deletes) →
 * habit metadata updates → habit day entries.
 *
 * Within each domain, operations keep store insertion order. Pet and medical record
 * creates must finish (and promote pending photos) before later domains run.
 */
export async function replayPendingOfflineOperations(queryClient: QueryClient): Promise<void> {
  await replayPendingPetOperations(queryClient)
  await replayPendingWeightOperations(queryClient)
  await replayPendingVaccinationOperations(queryClient)
  await replayPendingMedicalRecordOperations(queryClient)
  await replayPendingHabitUpdates(queryClient)
  await replayPendingHabitDayEntries(queryClient)
}
