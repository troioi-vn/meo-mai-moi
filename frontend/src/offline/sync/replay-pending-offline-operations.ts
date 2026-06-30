import type { QueryClient } from '@tanstack/react-query'
import { replayPendingVaccinationOperations } from './replay-pending-vaccination-operations'
import { replayPendingWeightOperations } from './replay-pending-weight-operations'

export async function replayPendingOfflineOperations(queryClient: QueryClient): Promise<void> {
  await replayPendingWeightOperations(queryClient)
  await replayPendingVaccinationOperations(queryClient)
}
