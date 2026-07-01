import type { QueryClient } from '@tanstack/react-query'
import { replayPendingVaccinationCreates } from './replay-vaccination-creates'
import { replayPendingVaccinationDeletes } from './replay-vaccination-deletes'
import { replayPendingVaccinationUpdates } from './replay-vaccination-updates'

export async function replayPendingVaccinationOperations(queryClient: QueryClient): Promise<void> {
  await replayPendingVaccinationCreates(queryClient)
  await replayPendingVaccinationUpdates(queryClient)
  await replayPendingVaccinationDeletes(queryClient)
}
