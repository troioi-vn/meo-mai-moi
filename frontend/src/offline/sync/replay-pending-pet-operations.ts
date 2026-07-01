import type { QueryClient } from '@tanstack/react-query'
import { replayPendingPetCreates } from './replay-pet-creates'
import { replayPendingPetDeletes } from './replay-pet-deletes'
import { replayPendingPetStatusUpdates } from './replay-pet-status-updates'
import { replayPendingPetUpdates } from './replay-pet-updates'

export async function replayPendingPetOperations(queryClient: QueryClient): Promise<void> {
  await replayPendingPetCreates(queryClient)
  await replayPendingPetUpdates(queryClient)
  await replayPendingPetStatusUpdates(queryClient)
  await replayPendingPetDeletes(queryClient)
}
