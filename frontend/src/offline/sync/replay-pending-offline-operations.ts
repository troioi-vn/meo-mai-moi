import type { QueryClient } from '@tanstack/react-query'
import { replayPendingVaccinationCreates } from './replay-vaccination-creates'
import { replayPendingWeightOperations } from './replay-pending-weight-operations'

export async function replayPendingOfflineOperations(queryClient: QueryClient): Promise<void> {
  await replayPendingWeightOperations(queryClient)
  await replayPendingVaccinationCreates(queryClient)
}
