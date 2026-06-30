import type { QueryClient } from '@tanstack/react-query'
import { replayPendingMedicalRecordCreates } from './replay-medical-record-creates'
import { replayPendingMedicalRecordDeletes } from './replay-medical-record-deletes'
import { replayPendingMedicalRecordUpdates } from './replay-medical-record-updates'

export async function replayPendingMedicalRecordOperations(
  queryClient: QueryClient
): Promise<void> {
  await replayPendingMedicalRecordCreates(queryClient)
  await replayPendingMedicalRecordUpdates(queryClient)
  await replayPendingMedicalRecordDeletes(queryClient)
}
