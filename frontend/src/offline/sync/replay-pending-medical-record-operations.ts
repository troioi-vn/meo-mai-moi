import type { QueryClient } from '@tanstack/react-query'
import { replayPendingMedicalRecordCreates } from './replay-medical-record-creates'

export async function replayPendingMedicalRecordOperations(
  queryClient: QueryClient
): Promise<void> {
  await replayPendingMedicalRecordCreates(queryClient)
}
