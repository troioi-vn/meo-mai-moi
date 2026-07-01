import type { OperationConflictMetadata } from '@/offline/operations/types'

export type OperationReplayErrorKind = 'retryable' | 'conflict' | 'validation' | 'auth' | 'failed'

export interface OperationReplayErrorClassification {
  kind: OperationReplayErrorKind
  message: string
  conflictMetadata?: OperationConflictMetadata
}

export function withBaseVersion(
  body: Record<string, unknown>,
  baseVersion?: string
): Record<string, unknown> {
  if (!baseVersion) {
    return body
  }

  return {
    ...body,
    base_version: baseVersion,
  }
}
