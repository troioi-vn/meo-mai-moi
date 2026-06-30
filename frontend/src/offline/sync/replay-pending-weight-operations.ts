import type { QueryClient } from '@tanstack/react-query'
import { replayPendingWeightCreates } from './replay-weight-creates'
import { replayPendingWeightUpdates } from './replay-weight-updates'

export async function replayPendingWeightOperations(queryClient: QueryClient): Promise<void> {
  await replayPendingWeightCreates(queryClient)
  await replayPendingWeightUpdates(queryClient)
}
