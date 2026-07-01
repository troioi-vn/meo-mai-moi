import { updateOperation, type OfflineOperation } from '@/offline/operations'
import { classifyOperationReplayError, replayFailureStatus } from './replay-errors'

export async function handleReplayOperationError(
  operation: OfflineOperation,
  error: unknown
): Promise<void> {
  const classification = classifyOperationReplayError(error, operation)
  const attempts = operation.attempts + 1
  const status = replayFailureStatus(classification)

  await updateOperation(operation.id, {
    status,
    attempts,
    lastError: classification.message,
    conflictMetadata: status === 'conflicted' ? classification.conflictMetadata : undefined,
  })
}
